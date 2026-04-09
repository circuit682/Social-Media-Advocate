const { Lead, OutreachLog, UserInteraction } = require("../db/models");

async function applyRetention({ leadsRetentionDays, logsRetentionDays }) {
  const now = Date.now();
  const leadCutoff = new Date(now - leadsRetentionDays * 24 * 60 * 60 * 1000);
  const logCutoff = new Date(now - logsRetentionDays * 24 * 60 * 60 * 1000);

  const [leadResult, logResult, interactionResult] = await Promise.all([
    Lead.deleteMany({ createdAt: { $lt: leadCutoff } }),
    OutreachLog.deleteMany({ createdAt: { $lt: logCutoff } }),
    UserInteraction.deleteMany({ createdAt: { $lt: logCutoff } })
  ]);

  return {
    leadsDeleted: leadResult.deletedCount || 0,
    logsDeleted: logResult.deletedCount || 0,
    interactionsDeleted: interactionResult.deletedCount || 0
  };
}

async function deleteOnRequest(username) {
  const leads = await Lead.find({ username }).select("_id");
  const leadIds = leads.map((lead) => lead._id);

  const [leadResult, logResult, interactionResult] = await Promise.all([
    Lead.deleteMany({ username }),
    OutreachLog.deleteMany({ leadId: { $in: leadIds } }),
    UserInteraction.deleteMany({ username })
  ]);

  return {
    username,
    leadsDeleted: leadResult.deletedCount || 0,
    logsDeleted: logResult.deletedCount || 0,
    interactionsDeleted: interactionResult.deletedCount || 0
  };
}

module.exports = {
  applyRetention,
  deleteOnRequest
};
