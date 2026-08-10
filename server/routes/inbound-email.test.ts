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

const emailPayload = {
  fromEmail: "jane@example.com",
  fromName: "Jane Doe",
  subject: "I never received my refund",
  body: "I was charged twice and never got my money back.",
};

describe("POST /api/inbound-email", () => {
  it("creates the ticket and queues it for classification when no category is given", async () => {
    createMock.mockResolvedValueOnce({ id: 1, ...emailPayload, category: null });
    sendMock.mockResolvedValueOnce("job-1");

    const res = await postInboundEmail(emailPayload);

    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ ticket: { id: 1, ...emailPayload, category: null } });
    expect(sendMock).toHaveBeenCalledWith("classify-ticket", {
      ticketId: 1,
      subject: emailPayload.subject,
      body: emailPayload.body,
    });
  });

  it("does not queue classification for a ticket that already has a category", async () => {
    createMock.mockResolvedValueOnce({ id: 2, ...emailPayload, category: "GENERAL_QUESTION" });

    const res = await postInboundEmail({ ...emailPayload, category: "GENERAL_QUESTION" });

    expect(res.status).toBe(201);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("still responds successfully if queuing the classification job fails", async () => {
    createMock.mockResolvedValueOnce({ id: 3, ...emailPayload, category: null });
    sendMock.mockRejectedValueOnce(new Error("queue unavailable"));

    const res = await postInboundEmail(emailPayload);

    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ ticket: { id: 3, ...emailPayload, category: null } });
  });
});
