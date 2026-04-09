const crypto = require("crypto");

function buildFingerprint(platform, postId, text) {
  return crypto
    .createHash("sha256")
    .update(`${platform}:${postId}:${text || ""}`)
    .digest("hex");
}

module.exports = {
  buildFingerprint
};
