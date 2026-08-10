import { describe, expect, it, mock } from "bun:test";

const setApiKeyMock = mock<(...args: unknown[]) => void>();
const sendMock = mock<(...args: unknown[]) => Promise<unknown>>();

mock.module("@sendgrid/mail", () => ({
  default: { setApiKey: setApiKeyMock, send: sendMock },
}));

// mock.module replaces the whole "../env" module for the entire test run (shared across every
// test file that transitively imports env.ts), so every key any other file's real import chain
// needs must be provided here too — not just the ones this file cares about.
mock.module("../env", () => ({
  CLIENT_URL: "http://localhost:5173",
  INBOUND_EMAIL_WEBHOOK_SECRET: "the-real-secret",
  GOOGLE_GENERATIVE_AI_API_KEY: "test-google-key",
  SENDGRID_API_KEY: "test-api-key",
  SENDGRID_FROM_EMAIL: "support@example.com",
}));

const { sendTicketReplyEmail } = await import("./send-email");

describe("sendTicketReplyEmail", () => {
  it("sends with the configured from address and a threaded subject", async () => {
    await sendTicketReplyEmail({ to: "jane@example.com", subject: "Refund request", body: "We've refunded you." });

    expect(sendMock).toHaveBeenCalledWith({
      to: "jane@example.com",
      from: "support@example.com",
      subject: "Re: Refund request",
      text: "We've refunded you.",
    });
  });

  it("doesn't double-prefix a subject that already starts with Re:", async () => {
    await sendTicketReplyEmail({ to: "jane@example.com", subject: "Re: Refund request", body: "Following up." });

    expect(sendMock).toHaveBeenCalledWith(expect.objectContaining({ subject: "Re: Refund request" }));
  });

  it("matches a lowercase re: prefix case-insensitively", async () => {
    await sendTicketReplyEmail({ to: "jane@example.com", subject: "re: Refund request", body: "Following up." });

    expect(sendMock).toHaveBeenCalledWith(expect.objectContaining({ subject: "re: Refund request" }));
  });
});
