import { afterAll, beforeAll, beforeEach, describe, expect, it, mock } from "bun:test";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";

const createMock = mock<(...args: unknown[]) => Promise<unknown>>();
const updateMock = mock<(...args: unknown[]) => Promise<unknown>>();
const generateObjectMock = mock<(...args: unknown[]) => Promise<unknown>>();

mock.module("../db", () => ({
  db: { ticket: { create: createMock, update: updateMock } },
}));

mock.module("ai", () => ({
  generateObject: generateObjectMock,
  // Also stub generateText: mock.module replaces the whole "ai" module for the
  // entire test run, and tickets.test.ts's router needs this export too.
  generateText: mock<(...args: unknown[]) => Promise<unknown>>(),
}));

mock.module("@ai-sdk/google", () => ({
  google: mock(() => "mocked-model"),
}));

mock.module("../require-webhook-secret", () => ({
  requireWebhookSecret: (_req: unknown, _res: unknown, next: () => void) => next(),
}));

let server: Server;
let baseUrl: string;

beforeAll(async () => {
  const express = (await import("express")).default;
  const { inboundEmailRouter } = await import("./inbound-email");

  const app = express();
  app.use(express.json());
  app.use("/api/inbound-email", inboundEmailRouter);
  app.use((_err: unknown, _req: unknown, res: { status: (code: number) => { json: (body: unknown) => void } }) => {
    res.status(500).json({ error: "Internal server error" });
  });

  server = app.listen(0);
  const { port } = server.address() as AddressInfo;
  baseUrl = `http://localhost:${port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

beforeEach(() => {
  createMock.mockReset();
  updateMock.mockReset();
  generateObjectMock.mockReset();
});

function postInboundEmail(body: unknown) {
  return fetch(`${baseUrl}/api/inbound-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const emailPayload = {
  fromEmail: "jane@example.com",
  fromName: "Jane Doe",
  subject: "I never received my refund",
  body: "I was charged twice and never got my money back.",
};

describe("POST /api/inbound-email", () => {
  it("creates the ticket and responds without waiting for classification to finish", async () => {
    createMock.mockResolvedValueOnce({ id: 1, ...emailPayload, category: null });
    let resolveClassification!: (value: { object: string }) => void;
    generateObjectMock.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveClassification = resolve;
      }),
    );

    const res = await postInboundEmail(emailPayload);

    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ ticket: { id: 1, ...emailPayload, category: null } });
    // The response above already arrived even though this resolves only now.
    expect(updateMock).not.toHaveBeenCalled();

    resolveClassification({ object: "REFUND_REQUEST" });
    await Promise.resolve();
    await Promise.resolve();

    expect(updateMock).toHaveBeenCalledWith({ where: { id: 1 }, data: { category: "REFUND_REQUEST" } });
  });

  it("does not classify a ticket that already has a category", async () => {
    createMock.mockResolvedValueOnce({ id: 2, ...emailPayload, category: "GENERAL_QUESTION" });

    const res = await postInboundEmail({ ...emailPayload, category: "GENERAL_QUESTION" });

    expect(res.status).toBe(201);
    await Promise.resolve();
    expect(generateObjectMock).not.toHaveBeenCalled();
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("still responds successfully if classification fails", async () => {
    createMock.mockResolvedValueOnce({ id: 3, ...emailPayload, category: null });
    generateObjectMock.mockRejectedValueOnce(new Error("model unavailable"));

    const res = await postInboundEmail(emailPayload);

    expect(res.status).toBe(201);
    await Promise.resolve();
    await Promise.resolve();
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("passes the ticket subject and body to the classifier", async () => {
    createMock.mockResolvedValueOnce({ id: 4, ...emailPayload, category: null });
    generateObjectMock.mockResolvedValueOnce({ object: "TECHNICAL_QUESTION" });

    await postInboundEmail(emailPayload);
    await Promise.resolve();
    await Promise.resolve();

    expect(generateObjectMock).toHaveBeenCalledTimes(1);
    const [call] = generateObjectMock.mock.calls[0] as [{ prompt: string; output: string; enum: string[] }];
    expect(call.prompt).toContain(`Subject: ${emailPayload.subject}`);
    expect(call.prompt).toContain(`Body: ${emailPayload.body}`);
    expect(call.output).toBe("enum");
    expect(call.enum).toEqual(["GENERAL_QUESTION", "TECHNICAL_QUESTION", "REFUND_REQUEST", "UNCLASSIFIED"]);
  });

  it("leaves the ticket unclassified when the model can't confidently pick a category", async () => {
    createMock.mockResolvedValueOnce({ id: 5, ...emailPayload, category: null });
    generateObjectMock.mockResolvedValueOnce({ object: "UNCLASSIFIED" });

    const res = await postInboundEmail(emailPayload);

    expect(res.status).toBe(201);
    await Promise.resolve();
    await Promise.resolve();
    expect(updateMock).not.toHaveBeenCalled();
  });
});
