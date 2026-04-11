const axios = require("axios");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.resolve(__dirname, "../../.env"), override: true });

const { env } = require("../config/env");

function resolveBearerToken(rawToken) {
  const token = String(rawToken || "").trim();

  if (!token) {
    return "";
  }

  try {
    return decodeURIComponent(token);
  } catch (_error) {
    return token;
  }
}

async function testX() {
  const bearerToken = resolveBearerToken(env.xBearerToken);
  const endpoint = process.env.X_TEST_ENDPOINT || "https://api.twitter.com/2/users/by/username/TwitterDev";

  if (!bearerToken) {
    throw new Error("X_BEARER_TOKEN is required");
  }

  const response = await axios.get(endpoint, {
    headers: {
      Authorization: `Bearer ${bearerToken}`
    },
    timeout: 15000
  });

  console.log(JSON.stringify(response.data, null, 2));
}

testX().catch((error) => {
  const status = error.response?.status;
  const message = error.response?.data || error.message;
  process.stderr.write(
    status ? `X test failed (${status}): ${JSON.stringify(message, null, 2)}\n` : `X test failed: ${error.message}\n`
  );
  process.exit(1);
});