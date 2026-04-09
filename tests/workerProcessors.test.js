jest.mock("../src/services/outreachService", () => ({
  sendOutreach: jest.fn(async () => ({ status: "sent" })),
  queueForHumanReview: jest.fn(async () => ({ status: "queued" }))
}));

jest.mock("../src/services/leadService", () => ({
  ingestPosts: jest.fn(async () => ({ ingestedCount: 1 }))
}));

const { processOutreachJob, processReviewJob, processIngestionJob } = require("../src/workers/workerProcessors");
const { sendOutreach, queueForHumanReview } = require("../src/services/outreachService");
const { ingestPosts } = require("../src/services/leadService");

describe("worker processors", () => {
  const logger = { info: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("processes outreach jobs", async () => {
    const job = { id: "job-1", data: { postId: "p1" } };
    const env = { maxTouchesPerSevenDays: 3 };

    const result = await processOutreachJob(job, env, logger);

    expect(result.status).toBe("sent");
    expect(sendOutreach).toHaveBeenCalledWith(job.data, env);
  });

  test("processes review jobs", async () => {
    const job = { id: "job-2", data: { postId: "p2" } };

    const result = await processReviewJob(job, logger);

    expect(result.status).toBe("queued");
    expect(queueForHumanReview).toHaveBeenCalledWith(job.data);
  });

  test("processes ingestion jobs", async () => {
    const job = {
      id: "job-3",
      data: { platform: "x", posts: [], maxExcerptLength: 200 }
    };

    const result = await processIngestionJob(job, logger);

    expect(result.ingestedCount).toBe(1);
    expect(ingestPosts).toHaveBeenCalledWith(job.data);
  });
});
