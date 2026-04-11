const request = require("supertest");
const mockXMock = require("../mocks/xMock");
const mockRedditMock = require("../mocks/redditMock");

const mockEnqueueIngestionJob = jest.fn();
const mockEnqueueOutreachJob = jest.fn();
const mockEnqueueReviewJob = jest.fn();
const mockScoreLead = jest.fn();
const mockPlanOutreach = jest.fn();
const mockIngestLead = jest.fn();

jest.mock("../../src/queues/ingestionQueue", () => ({
  enqueueIngestionJob: (...args) => mockEnqueueIngestionJob(...args)
}));

jest.mock("../../src/queues/outreachQueue", () => ({
  enqueueOutreachJob: (...args) => mockEnqueueOutreachJob(...args),
  enqueueReviewJob: (...args) => mockEnqueueReviewJob(...args)
}));

jest.mock("../../src/queues/queueClient", () => ({
  getQueueHealth: jest.fn(async () => ({ queue: "up" }))
}));

jest.mock("../../src/services/outreachService", () => ({
  scoreLead: (...args) => mockScoreLead(...args),
  planOutreach: (...args) => mockPlanOutreach(...args)
}));

jest.mock("../../src/services/leadService", () => ({
  ingestLead: (...args) => mockIngestLead(...args)
}));

jest.mock("../../src/middleware/touchLimiter", () => ({
  createTouchLimiter: () => (_req, _res, next) => next()
}));

jest.mock("../../src/ingestion/sourceRegistry", () => ({
  createSourceRegistry: () => ({
    get: jest.fn((source) => {
      if (source === "x") {
        return {
          fetchRecentPosts: jest.fn(async () => mockXMock.buildXMockPosts())
        };
      }

      if (source === "reddit") {
        return {
          fetchRecentPosts: jest.fn(async () => mockRedditMock.buildRedditMockPosts())
        };
      }

      return null;
    })
  })
}));

describe("pipeline integration", () => {
  let app;

  beforeAll(() => {
    const { createApp } = require("../../src/app");
    app = createApp();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockEnqueueIngestionJob.mockResolvedValue({ id: "ingest-job-1" });
    mockEnqueueOutreachJob.mockResolvedValue({ id: "outreach-job-1" });
    mockEnqueueReviewJob.mockResolvedValue({ id: "review-job-1" });
    mockScoreLead.mockResolvedValue({
      postId: "post-1",
      intentScore: 85,
      riskFlag: null,
      recommendedAction: "dm"
    });
    mockIngestLead.mockResolvedValue({ ingestedCount: 1 });
  });

  test("runs test ingestion endpoint", async () => {
    const response = await request(app).get("/test-ingest");

    expect(response.statusCode).toBe(200);
    expect(response.body.ingestedCount).toBe(1);
    expect(mockIngestLead).toHaveBeenCalledWith(
      expect.objectContaining({
        post_id: expect.stringMatching(/^test-ingest-/),
        author_id: "123",
        handle: "@student123",
        text: "I need urgent help with my assignment",
        platform: "x",
        timestamp: expect.any(Date)
      })
    );
  });

  test("rejects invalid ingestion payload", async () => {
    const response = await request(app).post("/ingest/posts").send({ platform: "x" });

    expect(response.statusCode).toBe(400);
    expect(response.body.error).toBe("invalid_ingest_payload");
  });

  test("queues valid ingestion payload", async () => {
    const response = await request(app)
      .post("/ingest/posts")
      .send({
        platform: "x",
        posts: [
          {
            post_id: "x-1",
            handle: "user123",
            text: "Need help with statistics assignment",
            timestamp: "2026-04-09T10:00:00Z"
          }
        ]
      });

    expect(response.statusCode).toBe(200);
    expect(response.body.status).toBe("queued");
    expect(mockEnqueueIngestionJob).toHaveBeenCalled();
  });

  test("queues fetched source posts", async () => {
    const response = await request(app)
      .post("/ingest/fetch")
      .send({ source: "x", params: { limit: 1 } });

    expect(response.statusCode).toBe(200);
    expect(response.body.queue_status).toBe("queued");
    expect(mockEnqueueIngestionJob).toHaveBeenCalled();
  });

  test("scores post through process endpoint", async () => {
    const response = await request(app).post("/process/score").send({ post_id: "post-1" });

    expect(response.statusCode).toBe(200);
    expect(response.body.intent_score).toBe(85);
    expect(mockScoreLead).toHaveBeenCalledWith("post-1");
  });

  test("routes eligible decision to outreach queue", async () => {
    mockPlanOutreach.mockResolvedValue({
      lead: { tier: "green", status: "new" },
      blocked: false,
      requiresHumanReview: false,
      reviewReasons: [],
      payload: {
        postId: "post-1",
        templateBased: true,
        includesPricing: false,
        priceEstimateUsd: 0
      }
    });

    const response = await request(app).post("/outreach/send").send({ post_id: "post-1" });

    expect(response.statusCode).toBe(200);
    expect(response.body.queue).toBe("outreach");
    expect(mockEnqueueOutreachJob).toHaveBeenCalled();
  });

  test("routes disallowed or review decision to review queue", async () => {
    mockPlanOutreach.mockResolvedValue({
      lead: { tier: "red", status: "disallowed" },
      blocked: true,
      requiresHumanReview: true,
      reviewReasons: ["disallowed_or_monitor_only"],
      payload: {
        postId: "post-2",
        templateBased: true,
        includesPricing: false,
        priceEstimateUsd: 0
      }
    });

    const response = await request(app).post("/outreach/send").send({ post_id: "post-2" });

    expect(response.statusCode).toBe(200);
    expect(response.body.queue).toBe("review");
    expect(mockEnqueueReviewJob).toHaveBeenCalled();
  });
});
