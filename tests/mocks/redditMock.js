function buildRedditMockPosts() {
  return [
    {
      post_id: "r-1",
      author_id: "abc",
      handle: "redditor",
      text: "This assignment is killing me",
      timestamp: "2026-04-09T10:00:00Z",
      platform: "reddit",
      profileGeo: "Toronto, CA",
      language: "en",
      externalLinks: []
    }
  ];
}

module.exports = {
  buildRedditMockPosts
};
