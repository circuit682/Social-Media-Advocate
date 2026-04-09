const { resolveAdminRoleFromToken } = require("../src/api/adminAuth");

describe("admin auth role resolution", () => {
  const env = {
    systemAdminToken: "system-token",
    humanAdminToken: "human-token"
  };

  test("resolves SYSTEM token", () => {
    expect(resolveAdminRoleFromToken("system-token", env)).toBe("SYSTEM");
  });

  test("resolves HUMAN token", () => {
    expect(resolveAdminRoleFromToken("human-token", env)).toBe("HUMAN");
  });

  test("rejects unknown token", () => {
    expect(resolveAdminRoleFromToken("bad-token", env)).toBeNull();
  });
});
