const jwt = require("jsonwebtoken");
require("dotenv").config();

/**
 * Verify a JWT Bearer token and attach the decoded user payload to req.user.
 *
 * Usage:
 * app.use("/protected", auth)
 * router.get("/me", auth, controller.getMe)
 *
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 * @param {Function} next - Express next middleware callback.
 * @returns {void}
 */
const auth = async (req, res, next) => {
  const authorizationHeader = req.headers.authorization;

  if (!authorizationHeader) {
    return res.status(401).json({ error: "Access denied, no token" });
  }

  const [scheme, token] = authorizationHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ error: "Access denied, no token" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    return next();
  } catch (err) {
    if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Invalid token" });
    }

    return res.status(401).json({ error: "Token verification failed" });
  }
};

module.exports = auth;
module.exports.auth = auth;
