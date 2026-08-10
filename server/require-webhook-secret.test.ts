import { describe, expect, it, mock } from "bun:test";

// mock.module replaces the whole "./env" module for the entire test run (shared across every
// test file that transitively imports env.ts), so every key any other file's real import chain
// needs must be provided here too — not just the one this file cares about.
mock.module("./env", () => ({
  CLIENT_URL: "http://localhost:5173",
  INBOUND_EMAIL_WEBHOOK_SECRET: "the-real-secret",
  GOOGLE_GENERATIVE_AI_API_KEY: "test-google-key",
  SENDGRID_API_KEY: "test-sendgrid-key",
  SENDGRID_FROM_EMAIL: "support@example.com",
}));

const { requireWebhookSecret } = await import("./require-webhook-secret");

function fakeReq(opts: { authorization?: string; secret?: string }) {
  return {
    header: (name: string) => (name.toLowerCase() === "authorization" ? opts.authorization : undefined),
    query: opts.secret === undefined ? {} : { secret: opts.secret },
  } as unknown as Parameters<typeof requireWebhookSecret>[0];
}

function fakeRes() {
  const res = {
    statusCode: undefined as number | undefined,
    body: undefined as unknown,
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    json(body: unknown) {
      res.body = body;
    },
  };
  return res as unknown as Parameters<typeof requireWebhookSecret>[1] & typeof res;
}

describe("requireWebhookSecret", () => {
  it("calls next() when the Authorization header has the correct Bearer secret", () => {
    const next = mock(() => {});
    requireWebhookSecret(fakeReq({ authorization: "Bearer the-real-secret" }), fakeRes(), next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("calls next() when only a matching ?secret= query param is given (SendGrid Inbound Parse can't set headers)", () => {
    const next = mock(() => {});
    requireWebhookSecret(fakeReq({ secret: "the-real-secret" }), fakeRes(), next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("prefers the Authorization header over the query param when both are present", () => {
    const next = mock(() => {});
    requireWebhookSecret(fakeReq({ authorization: "Bearer the-real-secret", secret: "wrong" }), fakeRes(), next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("401s when neither the header nor the query param is provided", () => {
    const next = mock(() => {});
    const res = fakeRes();
    requireWebhookSecret(fakeReq({}), res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({ error: "Unauthorized" });
  });

  it("401s when the query param secret is wrong", () => {
    const next = mock(() => {});
    const res = fakeRes();
    requireWebhookSecret(fakeReq({ secret: "wrong" }), res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
  });
});
