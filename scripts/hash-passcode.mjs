import crypto from "crypto";

function hashPasscode(pass) {
  const salt = crypto.randomBytes(16);
  const keyLen = 32;
  const N = 16384, r = 8, p = 1;

  const hash = crypto.scryptSync(pass, salt, keyLen, { N, r, p });
  return `scrypt$${salt.toString("base64")}$${hash.toString("base64")}`;
}

const pass = process.argv[2];
if (!pass) {
  console.error("Usage: node scripts/hash-passcode.mjs <passcode>");
  process.exit(1);
}
console.log(hashPasscode(pass));
