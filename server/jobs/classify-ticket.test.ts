import { beforeAll, beforeEach, describe, expect, it, mock } from "bun:test";

const updateMock = mock<(...args: unknown[]) => Promise<unknown>>();
const generateObjectMock = mock<(...args: unknown[]) => Promise<unknown>>();
const sendMock = mock<(...args: unknown[]) => Promise<unknown>>();
const createQueueMock = mock<(...args: unknown[]) => Promise<unknown>>();
const workMock = mock<(...args: unknown[]) => Promise<unknown>>();

mock.module("../db", () => ({
  db: { ticket: { update: updateMock } },
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

let queueTicketClassification: (typeof import("./classify-ticket"))["queueTicketClassification"];
let startClassifyTicketWorker: (typeof import("./classify-ticket"))["startClassifyTicketWorker"];
let CLASSIFY_TICKET_QUEUE: (typeof import("./classify-ticket"))["CLASSIFY_TICKET_QUEUE"];

beforeAll(async () => {
  ({ queueTicketClassification, startClassifyTicketWorker, CLASSIFY_TICKET_QUEUE } = await import("./classify-ticket"));
});

beforeEach(() => {
  updateMock.mockReset();
  generateObjectMock.mockReset();
  sendMock.mockReset();
  createQueueMock.mockReset();
  workMock.mockReset();
});

describe("queueTicketClassification", () => {
  it("sends a job with the ticket id, subject, and body", async () => {
    await queueTicketClassification(42, "Refund please", "I want a refund");

    expect(sendMock).toHaveBeenCalledWith(CLASSIFY_TICKET_QUEUE, {
      ticketId: 42,
      subject: "Refund please",
      body: "I want a refund",
    });
  });
});

describe("startClassifyTicketWorker", () => {
  it("creates the queue with a retry limit and registers a worker", async () => {
    await startClassifyTicketWorker();

    expect(createQueueMock).toHaveBeenCalledWith(CLASSIFY_TICKET_QUEUE, expect.objectContaining({ retryLimit: 2 }));
    expect(workMock).toHaveBeenCalledTimes(1);
    expect(workMock.mock.calls[0]?.[0]).toBe(CLASSIFY_TICKET_QUEUE);
  });

  it("classifies the ticket and updates its category", async () => {
    generateObjectMock.mockResolvedValueOnce({ object: "TECHNICAL_QUESTION" });
    await startClassifyTicketWorker();
    const handler = workMock.mock.calls[0]?.[1] as (jobs: unknown[]) => Promise<void>;

    await handler([{ data: { ticketId: 7, subject: "Help", body: "It's broken" } }]);

    expect(generateObjectMock).toHaveBeenCalledTimes(1);
    const [call] = generateObjectMock.mock.calls[0] as [{ prompt: string; output: string; enum: string[] }];
    expect(call.prompt).toContain("Subject: Help");
    expect(call.prompt).toContain("Body: It's broken");
    expect(call.output).toBe("enum");
    expect(call.enum).toEqual(["GENERAL_QUESTION", "TECHNICAL_QUESTION", "REFUND_REQUEST", "UNCLASSIFIED"]);
    expect(updateMock).toHaveBeenCalledWith({ where: { id: 7 }, data: { category: "TECHNICAL_QUESTION" } });
  });

  it("leaves the ticket unclassified when the model can't confidently pick a category", async () => {
    generateObjectMock.mockResolvedValueOnce({ object: "UNCLASSIFIED" });
    await startClassifyTicketWorker();
    const handler = workMock.mock.calls[0]?.[1] as (jobs: unknown[]) => Promise<void>;

    await handler([{ data: { ticketId: 8, subject: "??", body: "???" } }]);

    expect(updateMock).not.toHaveBeenCalled();
  });
});
