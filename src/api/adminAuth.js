function resolveAdminRoleFromToken(token, env) {
  if (!token) {
    return null;
  }

  if (env.systemAdminToken && token === env.systemAdminToken) {
    return "SYSTEM";
  }

  if (env.humanAdminToken && token === env.humanAdminToken) {
    return "HUMAN";
  }

  return null;
}

function extractToken(req) {
  const explicit = req.header("x-admin-token");
  if (explicit) {
    return explicit;
  }

  const auth = req.header("authorization") || "";
  if (auth.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim();
  }

  return "";
}

function requireInternalAdmin(env, allowedRoles) {
  return function internalAdminMiddleware(req, res, next) {
    const internalKey = req.header("x-internal-key");
    if (!env.internalApiKey || internalKey !== env.internalApiKey) {
      return res.status(403).json({ error: "internal access denied" });
    }

    const token = extractToken(req);
    const role = resolveAdminRoleFromToken(token, env);

    if (!role) {
      return res.status(401).json({ error: "invalid admin token" });
    }

    if (!allowedRoles.includes(role)) {
      return res.status(403).json({ error: "insufficient admin role" });
    }

    req.adminRole = role;
    return next();
  };
}

module.exports = {
  requireInternalAdmin,
  resolveAdminRoleFromToken
};
