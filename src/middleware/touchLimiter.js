const { Lead, UserInteraction, Flag } = require("../db/models");

function createTouchLimiter(env) {
  return async function touchLimiter(req, res, next) {
    try {
      const postId = req.body?.post_id;
      if (!postId) {
        return res.status(400).json({ error: "post_id is required" });
      }

      const lead = await Lead.findOne({ postId });
      if (!lead) {
        return res.status(404).json({ error: "Lead not found" });
      }

      const touchCount = await UserInteraction.countDocuments({
        username: lead.username,
        platform: lead.platform,
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      });

      if (touchCount >= env.maxTouchesPerSevenDays) {
        await Flag.create({
          leadId: lead._id,
          flagType: "hard_stop_touch_limit",
          details: `TOUCH_LIMIT_EXCEEDED for post ${postId}`,
          severity: "high"
        });

        return res.status(429).json({ error: "TOUCH_LIMIT_EXCEEDED" });
      }

      req.lead = lead;
      req.touchCount = touchCount;
      return next();
    } catch (error) {
      return next(error);
    }
  };
}

module.exports = {
  createTouchLimiter
};
