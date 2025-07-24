const crypto = require("crypto");
function hashData(data, salt) {
  return crypto.pbkdf2Sync(data, salt, 100000, 64, "sha256").toString("hex");
}
module.exports = { hashData };
