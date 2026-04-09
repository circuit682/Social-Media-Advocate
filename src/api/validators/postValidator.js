const { z } = require("zod");

const postSchema = z
  .object({
    id: z.string().min(1).optional(),
    post_id: z.string().min(1).optional(),
    username: z.string().min(1).optional(),
    text: z.string().min(1),
    created_at: z.string().min(1).optional(),
    timestamp: z.string().min(1).optional(),
    author_id: z.string().optional(),
    handle: z.string().optional(),
    externalLinks: z.array(z.string()).optional(),
    hasAttachments: z.boolean().optional(),
    language: z.string().optional(),
    profileGeo: z.string().optional()
  })
  .superRefine((value, ctx) => {
    if (!value.id && !value.post_id) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "post id is required" });
    }

    if (!value.created_at && !value.timestamp) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "timestamp is required" });
    }
  });

const ingestPayloadSchema = z.object({
  platform: z.string().min(1),
  posts: z.array(postSchema).min(1)
});

function validateIngestPayload(req, res, next) {
  const result = ingestPayloadSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      error: "invalid_ingest_payload",
      details: result.error.issues.map((issue) => issue.message)
    });
  }

  req.body = result.data;
  return next();
}

module.exports = {
  validateIngestPayload
};
