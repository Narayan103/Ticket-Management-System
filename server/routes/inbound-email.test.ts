import { afterAll, beforeAll, beforeEach, describe, expect, it, mock } from "bun:test";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";

const createMock = mock<(...args: unknown[]) => Promise<unknown>>();
const sendMock = mock<(...args: unknown[]) => Promise<unknown>>();

mock.module("../db", () => ({
  db: { ticket: { create: createMock } },
}));

mock.module("../queue", () => ({
  boss: {
    send: sendMock,
    // Also stub createQueue/work: mock.module replaces the whole "../queue" module for the
    // entire test run, and classify-ticket.test.ts's worker registration needs these too.
    createQueue: mock<(...args: unknown[]) => Promise<unknown>>(),
    work: mock<(...args: unknown[]) => Promise<unknown>>(),
  },
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
  sendMock.mockReset();
});

function postInboundEmail(body: unknown) {
  return fetch(`${baseUrl}/api/inbound-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function postSendGridInboundEmail(fields: Record<string, string>) {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) form.append(key, value);
  return fetch(`${baseUrl}/api/inbound-email`, { method: "POST", body: form });
}

const emailPayload = {
  fromEmail: "jane@example.com",
  fromName: "Jane Doe",
  subject: "I never received my refund",
  body: "I was charged twice and never got my money back.",
};

describe("POST /api/inbound-email", () => {
  it("queues classification and auto-resolution when no category is given", async () => {
    createMock.mockResolvedValueOnce({ id: 1, ...emailPayload, category: null });
    sendMock.mockResolvedValue("job-1");

    const res = await postInboundEmail(emailPayload);

    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ ticket: { id: 1, ...emailPayload, category: null } });
    expect(sendMock).toHaveBeenCalledWith("classify-ticket", {
      ticketId: 1,
      subject: emailPayload.subject,
      body: emailPayload.body,
    });
    expect(sendMock).toHaveBeenCalledWith("auto-resolve-ticket", {
      ticketId: 1,
      fromName: emailPayload.fromName,
      subject: emailPayload.subject,
      body: emailPayload.body,
    });
  });

  it("queues only auto-resolution for a ticket that already has a category", async () => {
    createMock.mockResolvedValueOnce({ id: 2, ...emailPayload, category: "GENERAL_QUESTION" });
    sendMock.mockResolvedValue("job-2");

    const res = await postInboundEmail({ ...emailPayload, category: "GENERAL_QUESTION" });

    expect(res.status).toBe(201);
    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(sendMock).toHaveBeenCalledWith("auto-resolve-ticket", expect.anything());
  });

  it("still responds successfully if queuing classification fails", async () => {
    createMock.mockResolvedValueOnce({ id: 3, ...emailPayload, category: null });
    sendMock.mockImplementation((...args: unknown[]) =>
      args[0] === "classify-ticket" ? Promise.reject(new Error("queue unavailable")) : Promise.resolve("job-3"),
    );

    const res = await postInboundEmail(emailPayload);

    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ ticket: { id: 3, ...emailPayload, category: null } });
  });

  it("still responds successfully if queuing auto-resolution fails", async () => {
    createMock.mockResolvedValueOnce({ id: 4, ...emailPayload, category: null });
    sendMock.mockImplementation((...args: unknown[]) =>
      args[0] === "auto-resolve-ticket" ? Promise.reject(new Error("queue unavailable")) : Promise.resolve("job-4"),
    );

    const res = await postInboundEmail(emailPayload);

    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ ticket: { id: 4, ...emailPayload, category: null } });
  });

  it("accepts a real SendGrid Inbound Parse multipart/form-data payload", async () => {
    createMock.mockResolvedValueOnce({
      id: 5,
      fromEmail: "jane@example.com",
      fromName: "Jane Doe",
      subject: "I never received my refund",
      body: "I was charged twice.",
      category: null,
    });
    sendMock.mockResolvedValue("job-5");

    const res = await postSendGridInboundEmail({
      from: '"Jane Doe" <jane@example.com>',
      subject: "I never received my refund",
      text: "I was charged twice.",
      html: "<p>I was charged twice.</p>",
    });

    expect(res.status).toBe(201);
    expect(createMock).toHaveBeenCalledWith({
      data: {
        subject: "I never received my refund",
        fromEmail: "jane@example.com",
        fromName: "Jane Doe",
        body: "I was charged twice.",
        bodyHtml: "<p>I was charged twice.</p>",
        category: undefined,
      },
    });
  });
});
