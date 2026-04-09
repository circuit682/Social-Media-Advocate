const { XSource } = require("./sources/xSource");
const { RedditSource } = require("./sources/redditSource");
const { RedditOAuthSource } = require("./sources/redditOAuthSource");

function createSourceRegistry(env) {
  const sources = new Map();

  sources.set("x", new XSource({ bearerToken: env.xBearerToken }));
  sources.set("reddit", new RedditSource({ userAgent: env.redditUserAgent }));
  sources.set(
    "reddit_oauth",
    new RedditOAuthSource({
      clientId: env.redditClientId,
      clientSecret: env.redditClientSecret,
      userAgent: env.redditUserAgent
    })
  );

  return {
    list: () => Array.from(sources.keys()),
    get: (sourceName) => sources.get((sourceName || "").toLowerCase())
  };
}

module.exports = {
  createSourceRegistry
};
