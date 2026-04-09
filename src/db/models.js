const mongoose = require("mongoose");

const leadSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, index: true },
    platform: { type: String, required: true },
    postId: { type: String, required: true },
    excerpt: { type: String, required: true, maxlength: 200 },
    intentScore: { type: Number, required: true, index: true },
    tier: { type: String, enum: ["green", "yellow", "red"], required: true },
    riskFlag: { type: String, default: null },
    status: {
      type: String,
      enum: ["new", "queued", "contacted", "converted", "disallowed"],
      default: "new"
    },
    geo: { type: String, default: "" },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
  },
  { timestamps: true }
);

leadSchema.index({ createdAt: -1 });
leadSchema.index({ platform: 1, postId: 1 }, { unique: true });

const outreachLogSchema = new mongoose.Schema(
  {
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: "Lead", required: true },
    message: { type: String, required: true },
    mode: { type: String, enum: ["auto", "queue", "manual"], required: true },
    sentAt: { type: Date, default: null },
    queuedAt: { type: Date, default: null },
    containsPricing: { type: Boolean, default: false },
    priceEstimateUsd: { type: Number, default: 0 }
  },
  { timestamps: true }
);

outreachLogSchema.index({ createdAt: -1 });

const flagSchema = new mongoose.Schema(
  {
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: "Lead", required: true },
    flagType: { type: String, required: true },
    details: { type: String, default: "" },
    severity: { type: String, enum: ["low", "medium", "high"], required: true }
  },
  { timestamps: true }
);

flagSchema.index({ leadId: 1, createdAt: -1 });

const userInteractionSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, index: true },
    platform: { type: String, required: true },
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: "Lead", required: true },
    interactionType: {
      type: String,
      enum: ["comment", "dm", "follow", "save", "ethics_redirect"],
      required: true
    },
    channel: { type: String, enum: ["auto", "queue", "manual"], required: true }
  },
  { timestamps: true }
);

userInteractionSchema.index({ username: 1, platform: 1, createdAt: -1 });

const Lead = mongoose.model("Lead", leadSchema, "leads");
const OutreachLog = mongoose.model("OutreachLog", outreachLogSchema, "outreach_logs");
const Flag = mongoose.model("Flag", flagSchema, "flags");
const UserInteraction = mongoose.model("UserInteraction", userInteractionSchema, "users_interactions");

module.exports = {
  Lead,
  OutreachLog,
  Flag,
  UserInteraction
};
