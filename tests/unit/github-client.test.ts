import { describe, it, expect } from "vitest";
import { verifyWebhookSignature } from "@/lib/github/client";
import crypto from "crypto";

describe("verifyWebhookSignature", () => {
  const secret = "test-webhook-secret";

  it("returns true for valid signature", () => {
    const payload = '{"action":"push"}';
    const signature = `sha256=${crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex")}`;

    expect(verifyWebhookSignature(payload, signature, secret)).toBe(true);
  });

  it("returns false for invalid signature", () => {
    const payload = '{"action":"push"}';
    const signature = "sha256=invalid_signature_that_is_64_chars_long_abcdefghijklmnopqrstu";

    expect(verifyWebhookSignature(payload, signature, secret)).toBe(false);
  });

  it("returns false for tampered payload", () => {
    const originalPayload = '{"action":"push"}';
    const tamperedPayload = '{"action":"delete"}';
    const signature = `sha256=${crypto
      .createHmac("sha256", secret)
      .update(originalPayload)
      .digest("hex")}`;

    expect(verifyWebhookSignature(tamperedPayload, signature, secret)).toBe(
      false,
    );
  });
});
