import "server-only";
import crypto from "crypto";

export async function verifyPasscode(pass: string, stored: string): Promise<boolean> {
  // stored format: scrypt$<saltB64>$<hashB64>
  const parts = stored.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;

  const salt = Buffer.from(parts[1], "base64");
  const expected = Buffer.from(parts[2], "base64");
  if (salt.length === 0 || expected.length === 0) return false;

  const keyLen = expected.length;
  const N = 16384, r = 8, p = 1;

  let derived: Buffer;
  try {
    derived = await new Promise<Buffer>((resolve, reject) => {
      crypto.scrypt(pass, salt, keyLen, { N, r, p }, (err, buf) => {
        if (err) reject(err);
        else resolve(buf as Buffer);
      });
    });
  } catch {
    return false;
  }

  if (derived.length !== expected.length) return false;
  return crypto.timingSafeEqual(derived, expected);
}
