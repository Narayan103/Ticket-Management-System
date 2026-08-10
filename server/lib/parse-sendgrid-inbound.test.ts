import { describe, expect, it } from "bun:test";
import { parseSendGridInboundPayload } from "./parse-sendgrid-inbound";

describe("parseSendGridInboundPayload", () => {
  it("extracts name and email from a quoted display name", () => {
    const result = parseSendGridInboundPayload({
      from: '"Jane Doe" <jane@example.com>',
      subject: "Help with my order",
      text: "My order hasn't arrived yet.",
    });

    expect(result.fromName).toBe("Jane Doe");
    expect(result.fromEmail).toBe("jane@example.com");
    expect(result.subject).toBe("Help with my order");
    expect(result.body).toBe("My order hasn't arrived yet.");
    expect(result.bodyHtml).toBeUndefined();
  });

  it("extracts name and email from an unquoted display name", () => {
    const result = parseSendGridInboundPayload({ from: "Jane Doe <jane@example.com>", subject: "Hi", text: "" });

    expect(result.fromName).toBe("Jane Doe");
    expect(result.fromEmail).toBe("jane@example.com");
  });

  it("falls back to the bare email as the name when there's no display name", () => {
    const result = parseSendGridInboundPayload({ from: "jane@example.com", subject: "Hi", text: "" });

    expect(result.fromName).toBe("jane@example.com");
    expect(result.fromEmail).toBe("jane@example.com");
  });

  it("passes through the html field when present", () => {
    const result = parseSendGridInboundPayload({
      from: "jane@example.com",
      subject: "Hi",
      text: "plain",
      html: "<p>plain</p>",
    });

    expect(result.bodyHtml).toBe("<p>plain</p>");
  });

  it("falls back to a placeholder subject when missing", () => {
    const result = parseSendGridInboundPayload({ from: "jane@example.com", subject: "", text: "" });

    expect(result.subject).toBe("(no subject)");
  });

  it("truncates fields that exceed the shared schema's max lengths", () => {
    const result = parseSendGridInboundPayload({
      from: `${"a".repeat(300)} <jane@example.com>`,
      subject: "s".repeat(300),
      text: "b".repeat(2000),
      html: "h".repeat(3000),
    });

    expect(result.fromName.length).toBe(255);
    expect(result.subject.length).toBe(255);
    expect(result.body.length).toBe(1000);
    expect(result.bodyHtml?.length).toBe(2000);
  });
});
