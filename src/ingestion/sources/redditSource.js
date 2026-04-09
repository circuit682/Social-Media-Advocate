const { BaseSource } = require("./baseSource");

class RedditSource extends BaseSource {
  constructor({ userAgent }) {
    super("reddit");
    this.userAgent = userAgent;
  }

  async fetchRecentPosts({ subreddit = "learnprogramming", limit = 10 }) {
    const url = new URL(`https://www.reddit.com/r/${subreddit}/new.json`);
    url.searchParams.set("limit", String(Math.min(limit, 100)));

    const response = await fetch(url, {
      headers: {
        "User-Agent": this.userAgent
      }
    });

    if (!response.ok) {
      throw new Error(`Reddit API error: ${response.status}`);
    }

    const data = await response.json();
    const children = data?.data?.children || [];

    return children.map((entry) => ({
      post_id: entry.data.id,
      author_id: entry.data.author,
      handle: entry.data.author,
      id: entry.data.id,
      username: entry.data.author,
      text: `${entry.data.title || ""} ${entry.data.selftext || ""}`.trim(),
      timestamp: new Date(entry.data.created_utc * 1000).toISOString(),
      created_at: new Date(entry.data.created_utc * 1000).toISOString(),
      platform: "reddit",
      externalLinks: (entry.data.url_overridden_by_dest && [entry.data.url_overridden_by_dest]) || [],
      language: "en",
      profileGeo: "",
      behavior: {}
    }));
  }
}

module.exports = { RedditSource };
