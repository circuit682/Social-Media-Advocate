class BaseSource {
  constructor(name) {
    this.name = name;
  }

  async fetchRecentPosts() {
    throw new Error("fetchRecentPosts must be implemented");
  }
}

module.exports = { BaseSource };
