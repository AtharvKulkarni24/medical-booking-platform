// Usage: app.use("/api/labs", authenticateToken, authorizeRole("lab"), labRoutes);

const authorizeRole = (...allowedRoles) => {
  return (req, res, next) => {
    
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: "Authentication required.",
      });
    }

    if (!allowedRoles.includes(req.user.userType)) {
      return res.status(403).json({
        success: false,
        error: `Access denied. This action requires one of the following accounts: ${allowedRoles.join(", ")}.`,
      });
    }

    next();
  };
};

module.exports = { authorizeRole };