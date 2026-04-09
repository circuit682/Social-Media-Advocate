const { BaseSource } = require("./baseSource");

class XSource extends BaseSource {
  constructor({ bearerToken }) {
    super("x");
    this.bearerToken = bearerToken;
  }

  async fetchRecentPosts({ query = "tutor OR assignment", limit = 10 }) {
    if (!this.bearerToken) {
      throw new Error("X_BEARER_TOKEN missing");
    }

    const url = new URL("https://api.twitter.com/2/tweets/search/recent");
    url.searchParams.set("query", query);
    url.searchParams.set("max_results", String(Math.min(limit, 100)));
    url.searchParams.set("tweet.fields", "created_at,author_id,lang,text");
    url.searchParams.set("expansions", "author_id");
    url.searchParams.set("user.fields", "username,name,location");

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.bearerToken}`
      }
    });

    if (!response.ok) {
      throw new Error(`X API error: ${response.status}`);
    }

    const data = await response.json();
    const users = data?.includes?.users || [];
    const usersById = new Map(users.map((u) => [u.id, u]));

    const posts = (data.data || []).map((item) => ({
      post_id: item.id,
      authorId: item.author_id,
      author_id: item.author_id,
      id: item.id,
      handle: usersById.get(item.author_id)?.username || item.author_id,
      username: usersById.get(item.author_id)?.username || item.author_id,
      handleSnapshot: usersById.get(item.author_id)?.username || item.author_id,
      text: item.text,
      timestamp: item.created_at,
      created_at: item.created_at,
      profileGeo: usersById.get(item.author_id)?.location || "",
      language: item.lang || "",
      platform: "x"
    }));

    return posts;
  }
}

module.exports = { XSource };
