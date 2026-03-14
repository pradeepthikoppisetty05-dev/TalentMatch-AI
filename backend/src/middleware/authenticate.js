import jwt from "jsonwebtoken";

/**
 * Middleware that verifies the JWT in the Authorization header.
 * Attaches the decoded payload to req.user on success.
 *
 * Usage: router.post("/protected", authenticate, handler)
 */
export function authenticate(req, res, next) {
  const authHeader = req.headers["authorization"];

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Access denied. No token provided." });
  }

  const token = authHeader.slice(7); // strip "Bearer "

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, name, email, iat, exp }
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Session expired. Please log in again." });
    }
    return res.status(401).json({ error: "Invalid token." });
  }
}