const { BaseSource } = require("./baseSource");

class RedditOAuthSource extends BaseSource {
  constructor({ clientId, clientSecret, userAgent }) {
    super("reddit_oauth");
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.userAgent = userAgent;
  }

  async fetchAccessToken() {
    if (!this.clientId || !this.clientSecret) {
      throw new Error("Reddit OAuth credentials missing");
    }

    const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString("base64");
    const response = await fetch("https://www.reddit.com/api/v1/access_token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": this.userAgent
      },
      body: "grant_type=client_credentials"
    });

    if (!response.ok) {
      throw new Error(`Reddit OAuth token error: ${response.status}`);
    }

    const payload = await response.json();
    return payload.access_token;
  }

  async fetchRecentPosts({ subreddit = "learnprogramming", limit = 10 }) {
    const accessToken = await this.fetchAccessToken();
    const url = new URL(`https://oauth.reddit.com/r/${subreddit}/new`);
    url.searchParams.set("limit", String(Math.min(limit, 100)));

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "User-Agent": this.userAgent
      }
    });

    if (!response.ok) {
      throw new Error(`Reddit OAuth API error: ${response.status}`);
    }

    const data = await response.json();
    const children = data?.data?.children || [];

    return children.map((entry) => ({
      id: entry.data.id,
      username: entry.data.author,
      text: `${entry.data.title || ""} ${entry.data.selftext || ""}`.trim(),
      created_at: new Date(entry.data.created_utc * 1000).toISOString(),
      platform: "reddit",
      externalLinks: (entry.data.url_overridden_by_dest && [entry.data.url_overridden_by_dest]) || [],
      profileGeo: "",
      behavior: {}
    }));
  }
}

module.exports = { RedditOAuthSource };
