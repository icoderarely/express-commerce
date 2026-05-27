const checkRole = (role) => (req, res, next) => {
  if (!req.user || req.user.role != role) {
    return res.status(400).json({ message: `Access denied: ${role} only!` });
  }

  next();
};

module.exports = checkRole;
