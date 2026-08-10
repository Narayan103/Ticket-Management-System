import { afterAll, beforeAll, beforeEach, describe, expect, it, mock } from "bun:test";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";

const findUniqueMock = mock<(...args: unknown[]) => Promise<unknown>>();
const findManyMock = mock<(...args: unknown[]) => Promise<unknown>>();
const countMock = mock<(...args: unknown[]) => Promise<unknown>>();
const generateTextMock = mock<(...args: unknown[]) => Promise<unknown>>();

mock.module("../db", () => ({
  db: { ticket: { findUnique: findUniqueMock, findMany: findManyMock, count: countMock } },
}));

mock.module("ai", () => ({
  generateText: generateTextMock,
  // Also stub generateObject: mock.module replaces the whole "ai" module for the
  // entire test run, and inbound-email.test.ts's router needs this export too.
  generateObject: mock<(...args: unknown[]) => Promise<unknown>>(),
}));

mock.module("@ai-sdk/google", () => ({
  google: mock(() => "mocked-model"),
}));

mock.module("../require-auth", () => ({
  requireAuth: (req: { user?: unknown }, _res: unknown, next: () => void) => {
    req.user = { id: "agent-1", name: "Agent Smith" };
    next();
  },
}));

let server: Server;
let baseUrl: string;

beforeAll(async () => {
  const express = (await import("express")).default;
  const { ticketsRouter } = await import("./tickets");

  const app = express();
  app.use(express.json());
  app.use("/api/tickets", ticketsRouter);
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
  findUniqueMock.mockReset();
  findManyMock.mockReset();
  countMock.mockReset();
  generateTextMock.mockReset();
});

function postPolishReply(ticketId: string | number, body: unknown) {
  return fetch(`${baseUrl}/api/tickets/${ticketId}/polish-reply`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/tickets/:id/polish-reply", () => {
  it("returns 400 for a non-integer ticket id", async () => {
    const res = await postPolishReply("abc", { body: "thanks for reaching out" });

    expect(res.status).toBe(400);
    expect(generateTextMock).not.toHaveBeenCalled();
  });

  it("returns 400 when the draft reply is empty", async () => {
    const res = await postPolishReply(1, { body: "   " });

    expect(res.status).toBe(400);
    expect(findUniqueMock).not.toHaveBeenCalled();
    expect(generateTextMock).not.toHaveBeenCalled();
  });

  it("returns 404 when the ticket does not exist", async () => {
    findUniqueMock.mockResolvedValueOnce(null);

    const res = await postPolishReply(999, { body: "thanks for reaching out" });

    expect(res.status).toBe(404);
    expect(generateTextMock).not.toHaveBeenCalled();
  });

  it("polishes the draft, addressing the customer by first name only and signing as Code with Narayan Support", async () => {
    findUniqueMock.mockResolvedValueOnce({
      subject: "Refund request",
      body: "I never received my refund from last week.",
      fromName: "Jane Doe",
    });
    generateTextMock.mockResolvedValueOnce({
      text: "Hi Jane,\n\nApologies for the delay...\n\nBest,\nCode with Narayan Support",
    });

    const res = await postPolishReply(42, { body: "will refund u soon, sry for delay" });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ body: "Hi Jane,\n\nApologies for the delay...\n\nBest,\nCode with Narayan Support" });

    expect(findUniqueMock).toHaveBeenCalledWith({
      where: { id: 42 },
      select: { subject: true, body: true, fromName: true },
    });

    expect(generateTextMock).toHaveBeenCalledTimes(1);
    const [call] = generateTextMock.mock.calls[0] as [{ prompt: string; system: string }];
    expect(call.prompt).toContain("Customer's name: Jane\n");
    expect(call.prompt).not.toContain("Jane Doe");
    expect(call.prompt).toContain("Customer's ticket subject: Refund request");
    expect(call.prompt).toContain("Customer's message: I never received my refund from last week.");
    expect(call.prompt).toContain("Agent's draft reply to polish:\nwill refund u soon, sry for delay");
    expect(call.system).toContain("addressing the customer by the first name");
    expect(call.system).toContain("Code with Narayan Support");
    expect(call.system).toContain("professional, customer-friendly tone");
  });

  it("trims the draft reply before sending it to the model", async () => {
    findUniqueMock.mockResolvedValueOnce({ subject: "Hi", body: "hello", fromName: "Sam" });
    generateTextMock.mockResolvedValueOnce({ text: "polished" });

    await postPolishReply(1, { body: "  thanks!  " });

    const [call] = generateTextMock.mock.calls[0] as [{ prompt: string }];
    expect(call.prompt).toContain("Agent's draft reply to polish:\nthanks!");
  });
});

function postSummarize(ticketId: string | number) {
  return fetch(`${baseUrl}/api/tickets/${ticketId}/summarize`, { method: "POST" });
}

describe("POST /api/tickets/:id/summarize", () => {
  it("returns 400 for a non-integer ticket id", async () => {
    const res = await postSummarize("abc");

    expect(res.status).toBe(400);
    expect(generateTextMock).not.toHaveBeenCalled();
  });

  it("returns 404 when the ticket does not exist", async () => {
    findUniqueMock.mockResolvedValueOnce(null);

    const res = await postSummarize(999);

    expect(res.status).toBe(404);
    expect(generateTextMock).not.toHaveBeenCalled();
  });

  it("summarizes the ticket body and reply thread in order", async () => {
    findUniqueMock.mockResolvedValueOnce({
      subject: "Refund request",
      body: "I never received my refund from last week.",
      fromName: "Jane Doe",
      replies: [
        { body: "Looking into this now.", senderType: "AGENT", author: { name: "Agent Smith" } },
        { body: "Thank you!", senderType: "CUSTOMER", author: null },
      ],
    });
    generateTextMock.mockResolvedValueOnce({ text: "Jane is waiting on a refund; agent is investigating." });

    const res = await postSummarize(42);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ summary: "Jane is waiting on a refund; agent is investigating." });

    expect(findUniqueMock).toHaveBeenCalledWith({
      where: { id: 42 },
      select: {
        subject: true,
        body: true,
        fromName: true,
        replies: {
          orderBy: { createdAt: "asc" },
          select: { body: true, senderType: true, author: { select: { name: true } } },
        },
      },
    });

    expect(generateTextMock).toHaveBeenCalledTimes(1);
    const [call] = generateTextMock.mock.calls[0] as [{ prompt: string; system: string }];
    expect(call.prompt).toContain("Ticket subject: Refund request");
    expect(call.prompt).toContain("Jane Doe (customer): I never received my refund from last week.");
    expect(call.prompt).toContain("Agent Smith (agent): Looking into this now.");
    expect(call.prompt).toContain("Jane Doe (customer): Thank you!");
    expect(call.system).toContain("summarize customer support ticket conversations");
  });

  it("regenerates the summary on every call", async () => {
    findUniqueMock.mockResolvedValueOnce({ subject: "Hi", body: "hello", fromName: "Sam", replies: [] });
    generateTextMock.mockResolvedValueOnce({ text: "First summary" });
    const first = await postSummarize(1);
    expect(await first.json()).toEqual({ summary: "First summary" });

    findUniqueMock.mockResolvedValueOnce({ subject: "Hi", body: "hello", fromName: "Sam", replies: [] });
    generateTextMock.mockResolvedValueOnce({ text: "Second summary" });
    const second = await postSummarize(1);
    expect(await second.json()).toEqual({ summary: "Second summary" });

    expect(generateTextMock).toHaveBeenCalledTimes(2);
  });
});

function getTickets(query = "") {
  return fetch(`${baseUrl}/api/tickets${query}`);
}

describe("GET /api/tickets", () => {
  it("excludes NEW and PROCESSING tickets by default", async () => {
    findManyMock.mockResolvedValueOnce([]);
    countMock.mockResolvedValueOnce(0);

    await getTickets();

    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ status: { notIn: ["NEW", "PROCESSING"] } }) }),
    );
    expect(countMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ status: { notIn: ["NEW", "PROCESSING"] } }) }),
    );
  });

  it("shows only the requested status when a status filter is given, including NEW/PROCESSING", async () => {
    findManyMock.mockResolvedValueOnce([]);
    countMock.mockResolvedValueOnce(0);

    await getTickets("?status=PROCESSING");

    expect(findManyMock).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ status: "PROCESSING" }) }));
  });

  it("combines a status filter with other filters", async () => {
    findManyMock.mockResolvedValueOnce([]);
    countMock.mockResolvedValueOnce(0);

    await getTickets("?status=OPEN&category=REFUND_REQUEST");

    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ status: "OPEN", category: "REFUND_REQUEST" }) }),
    );
  });
});
