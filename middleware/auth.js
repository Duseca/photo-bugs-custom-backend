import jwt from "jsonwebtoken";

const verifyToken = (req, res, next) => {
  try {
    // Pick token from common places
    const token =
      req.headers.authorization?.split(" ")[1] ||
      req.cookies?.token ||
      req.body.token ||
      req.query.token;

    if (!token) {
      return res.status(403).json({
        success: false,
        message: "Token required for authentication",
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user_id = decoded.user_id;

    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
      error: err.message,
    });
  }
};

export default verifyToken;
