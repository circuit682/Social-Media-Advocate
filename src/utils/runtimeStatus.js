const fs = require("fs");
const path = require("path");

const statusDir = path.join(process.cwd(), "runtime");
const statusFile = path.join(statusDir, "status.json");

function defaultStatus() {
  return {
    lastSmokeTestAt: null,
    lastSmokeTestJobs: null,
    lastProcessedJobs: {
      ingestion: null,
      outreach: null,
      review: null
    },
    updatedAt: null
  };
}

function ensureStatusFile() {
  if (!fs.existsSync(statusDir)) {
    fs.mkdirSync(statusDir, { recursive: true });
  }

  if (!fs.existsSync(statusFile)) {
    fs.writeFileSync(statusFile, JSON.stringify(defaultStatus(), null, 2));
  }
}

function readRuntimeStatus() {
  try {
    ensureStatusFile();
    const raw = fs.readFileSync(statusFile, "utf8");
    return JSON.parse(raw);
  } catch (_error) {
    return defaultStatus();
  }
}

function writeRuntimeStatus(status) {
  ensureStatusFile();
  fs.writeFileSync(statusFile, JSON.stringify(status, null, 2));
}

function updateRuntimeStatus(patch) {
  const current = readRuntimeStatus();
  const next = {
    ...current,
    ...patch,
    lastProcessedJobs: {
      ...current.lastProcessedJobs,
      ...(patch.lastProcessedJobs || {})
    },
    updatedAt: new Date().toISOString()
  };

  writeRuntimeStatus(next);
  return next;
}

module.exports = {
  readRuntimeStatus,
  updateRuntimeStatus
};
