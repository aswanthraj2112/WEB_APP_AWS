import { verifyToken } from "../utils/jwtVerifier.js";

export async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Missing Authorization header" });
    }

    const token = authHeader.substring("Bearer ".length);
    const payload = await verifyToken(token);
    req.user = payload;
    req.authToken = token;
    next();
  } catch (error) {
    console.error("Authentication failed", error);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

export function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
}

export function requireAdmin(req, res, next) {
  const groups = req.user?.["cognito:groups"] || [];
  const isAdmin = Array.isArray(groups)
    ? groups.includes("admins")
    : typeof groups === "string" && groups.split(",").includes("admins");

  if (!isAdmin) {
    return res.status(403).json({ message: "Admin privileges required" });
  }
  next();
}
