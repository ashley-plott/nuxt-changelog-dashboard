import crypto from 'node:crypto';

function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 });
  return `s1$${salt.toString("base64")}$${hash.toString("base64")}`;
}
function verifyPassword(password, stored) {
  const [tag, saltB64, hashB64] = stored.split("$");
  if (tag !== "s1") return false;
  const salt = Buffer.from(saltB64, "base64");
  const hash = Buffer.from(hashB64, "base64");
  const test = crypto.scryptSync(password, salt, hash.length, { N: 16384, r: 8, p: 1 });
  return crypto.timingSafeEqual(test, hash);
}

export { hashPassword as h, verifyPassword as v };
//# sourceMappingURL=auth.mjs.map
