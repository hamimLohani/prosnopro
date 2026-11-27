import crypto from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const PREFIX = "v1";

function getEncryptionKey(): Buffer {
  const raw = process.env.AI_ENCRYPTION_KEY?.trim() ?? "";
  if (!raw) {
    throw new Error(
      "AI_ENCRYPTION_KEY is not configured on the server. Generate one with `openssl rand -hex 32`.",
    );
  }
  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    return Buffer.from(raw, "hex");
  }
  return crypto.createHash("sha256").update(raw, "utf8").digest();
}

export function isEncryptionConfigured(): boolean {
  return Boolean(process.env.AI_ENCRYPTION_KEY?.trim());
}

export function maskApiKey(rawKey: string): string {
  const trimmed = rawKey.trim();
  if (trimmed.length <= 4) {
    return "••••";
  }
  return `••••${trimmed.slice(-4)}`;
}

export function encryptSecret(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${PREFIX}:${iv.toString("base64")}:${authTag.toString("base64")}:${encrypted.toString("base64")}`;
}

export function decryptSecret(payload: string): string {
  const parts = payload.split(":");
  if (parts.length !== 4 || parts[0] !== PREFIX) {
    throw new Error("Invalid encrypted key format.");
  }
  const key = getEncryptionKey();
  const iv = Buffer.from(parts[1], "base64");
  const authTag = Buffer.from(parts[2], "base64");
  const encrypted = Buffer.from(parts[3], "base64");

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString("utf8");
}
