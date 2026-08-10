import { beforeAll, beforeEach, describe, expect, it, mock } from "bun:test";

const replyCreateMock = mock<(...args: unknown[]) => Promise<unknown>>();
const ticketUpdateMock = mock<(...args: unknown[]) => Promise<unknown>>();
const generateObjectMock = mock<(...args: unknown[]) => Promise<unknown>>();
const sendMock = mock<(...args: unknown[]) => Promise<unknown>>();
const createQueueMock = mock<(...args: unknown[]) => Promise<unknown>>();
const workMock = mock<(...args: unknown[]) => Promise<unknown>>();

mock.module("../db", () => ({
  db: { reply: { create: replyCreateMock }, ticket: { update: ticketUpdateMock } },
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

mock.module("../queue", () => ({
  boss: { send: sendMock, createQueue: createQueueMock, work: workMock },
}));

let queueTicketAutoResolution: (typeof import("./auto-resolve-ticket"))["queueTicketAutoResolution"];
let startAutoResolveTicketWorker: (typeof import("./auto-resolve-ticket"))["startAutoResolveTicketWorker"];
let AUTO_RESOLVE_TICKET_QUEUE: (typeof import("./auto-resolve-ticket"))["AUTO_RESOLVE_TICKET_QUEUE"];

beforeAll(async () => {
  ({ queueTicketAutoResolution, startAutoResolveTicketWorker, AUTO_RESOLVE_TICKET_QUEUE } = await import("./auto-resolve-ticket"));
});

beforeEach(() => {
  replyCreateMock.mockReset();
  ticketUpdateMock.mockReset();
  generateObjectMock.mockReset();
  sendMock.mockReset();
  createQueueMock.mockReset();
  workMock.mockReset();
});

describe("queueTicketAutoResolution", () => {
  it("sends a job with the ticket id, sender name, subject, and body", async () => {
    await queueTicketAutoResolution(42, "Jane Doe", "Refund please", "I want a refund");

    expect(sendMock).toHaveBeenCalledWith(AUTO_RESOLVE_TICKET_QUEUE, {
      ticketId: 42,
      fromName: "Jane Doe",
      subject: "Refund please",
      body: "I want a refund",
    });
  });
});

describe("startAutoResolveTicketWorker", () => {
  it("creates the queue with a retry limit and registers a worker", async () => {
    await startAutoResolveTicketWorker();

    expect(createQueueMock).toHaveBeenCalledWith(AUTO_RESOLVE_TICKET_QUEUE, expect.objectContaining({ retryLimit: 2 }));
    expect(workMock).toHaveBeenCalledTimes(1);
    expect(workMock.mock.calls[0]?.[0]).toBe(AUTO_RESOLVE_TICKET_QUEUE);
  });

  it("replies and resolves the ticket when the knowledge base can confidently answer it", async () => {
    generateObjectMock.mockResolvedValueOnce({
      object: { canResolve: true, reply: "Hi Jane, here's how to reset your password..." },
    });
    await startAutoResolveTicketWorker();
    const handler = workMock.mock.calls[0]?.[1] as (jobs: unknown[]) => Promise<void>;

    await handler([{ data: { ticketId: 7, fromName: "Jane Doe", subject: "Forgot password", body: "How do I reset it?" } }]);

    expect(generateObjectMock).toHaveBeenCalledTimes(1);
    const [call] = generateObjectMock.mock.calls[0] as [{ prompt: string; system: string }];
    expect(call.prompt).toContain("Customer name: Jane Doe");
    expect(call.prompt).toContain("Subject: Forgot password");
    expect(call.prompt).toContain("Message: How do I reset it?");
    expect(call.system).toContain("Knowledge base:");
    expect(call.system).toContain("Forgot Password");
    expect(call.system).toContain("Code with Narayan Support");
    expect(call.system).toContain("professional, customer-friendly tone");
    expect(call.system).toContain("addressing the");
    expect(call.system).toContain("first name");

    expect(replyCreateMock).toHaveBeenCalledWith({
      data: { ticketId: 7, senderType: "AI", body: "Hi Jane, here's how to reset your password..." },
    });
    // First moves the ticket into PROCESSING, then RESOLVED once the model confidently answers.
    expect(ticketUpdateMock).toHaveBeenNthCalledWith(1, { where: { id: 7 }, data: { status: "PROCESSING" } });
    expect(ticketUpdateMock).toHaveBeenNthCalledWith(2, { where: { id: 7 }, data: { status: "RESOLVED" } });
  });

  it("moves the ticket to PROCESSING then back to OPEN when the model can't confidently resolve it", async () => {
    generateObjectMock.mockResolvedValueOnce({ object: { canResolve: false, reply: "" } });
    await startAutoResolveTicketWorker();
    const handler = workMock.mock.calls[0]?.[1] as (jobs: unknown[]) => Promise<void>;

    await handler([{ data: { ticketId: 8, fromName: "Sam", subject: "Chargeback", body: "I'm disputing this charge" } }]);

    expect(replyCreateMock).not.toHaveBeenCalled();
    expect(ticketUpdateMock).toHaveBeenNthCalledWith(1, { where: { id: 8 }, data: { status: "PROCESSING" } });
    expect(ticketUpdateMock).toHaveBeenNthCalledWith(2, { where: { id: 8 }, data: { status: "OPEN" } });
  });

  it("moves the ticket back to OPEN if canResolve is true but the reply is blank", async () => {
    generateObjectMock.mockResolvedValueOnce({ object: { canResolve: true, reply: "   " } });
    await startAutoResolveTicketWorker();
    const handler = workMock.mock.calls[0]?.[1] as (jobs: unknown[]) => Promise<void>;

    await handler([{ data: { ticketId: 9, fromName: "Sam", subject: "Hi", body: "hello" } }]);

    expect(replyCreateMock).not.toHaveBeenCalled();
    expect(ticketUpdateMock).toHaveBeenNthCalledWith(2, { where: { id: 9 }, data: { status: "OPEN" } });
  });

  it("moves the ticket back to OPEN and rethrows if classification fails", async () => {
    generateObjectMock.mockRejectedValueOnce(new Error("model unavailable"));
    await startAutoResolveTicketWorker();
    const handler = workMock.mock.calls[0]?.[1] as (jobs: unknown[]) => Promise<void>;

    await expect(
      handler([{ data: { ticketId: 10, fromName: "Sam", subject: "Hi", body: "hello" } }]),
    ).rejects.toThrow("model unavailable");

    expect(replyCreateMock).not.toHaveBeenCalled();
    expect(ticketUpdateMock).toHaveBeenNthCalledWith(1, { where: { id: 10 }, data: { status: "PROCESSING" } });
    expect(ticketUpdateMock).toHaveBeenNthCalledWith(2, { where: { id: 10 }, data: { status: "OPEN" } });
  });
});
