import assert from "node:assert/strict";
import test from "node:test";
import { decryptSecret, encryptSecret, maskApiKey } from "../src/lib/crypto.ts";

test("AES-256-GCM encryption roundtrips and detects tampering", () => {
  process.env.AI_ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

  const original = "AIzaSyDemoTeacherApiKey1234567890";
  const c1 = encryptSecret(original);
  const c2 = encryptSecret(original);

  assert.notEqual(c1, c2, "Random IV should produce distinct ciphertexts");
  assert.equal(decryptSecret(c1), original);
  assert.equal(decryptSecret(c2), original);

  // Tamper with auth tag / ciphertext
  const parts = c1.split(":");
  parts[3] = Buffer.from("tampered").toString("base64");
  assert.throws(() => decryptSecret(parts.join(":")));

  assert.equal(maskApiKey(original), "••••7890");
});
