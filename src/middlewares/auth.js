const jwt = require("jsonwebtoken");

const check_verified = (req, res, next) => {
  try {
    const { token } = req.query;
    const data = jwt.verify(token, process.env.jwt_secret);
    if (!Number(data.is_verified)) throw new Error("user belum verified");
    next();
  } catch (err) {
    return res.status(500).send(err?.message);
  }
};
module.exports = check_verified;
