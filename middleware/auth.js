import jwt from 'jsonwebtoken';

const verifyToken = (req, res, next) => {
  const token =
    req.cookies?.token ||
    req.body.token ||
    req.query.token ||
    req.headers['x-access-token'] ||
    req.headers?.authorization?.split(' ')[1] ||
    req.headers?.Authorization?.split(' ')[1];

  if (!token) {
    return res.status(403).send({
      success: false,
      message: 'A token is required for authentication',
    });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user_id = decoded.user_id;
  } catch (err) {
    return res
      .status(401)
      .send({ success: false, error: err.message, message: 'invalid token' });
  }
  return next();
};

export default verifyToken;
