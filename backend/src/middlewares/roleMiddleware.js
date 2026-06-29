// Role-based authorization middleware
// Usage: app.use("/api/labs", authorizeRole("lab"), labRoutes);

const authorizeRole = (...allowedRoles) => {
  return (req, res, next) => {
    // Ensure user is authenticated first (authenticateToken should run before this)
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: "Authentication required.",
      });
    }

    // Check if user's role is in the allowed roles
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Access denied. This resource requires one of the following roles: ${allowedRoles.join(", ")}. Your role: ${req.user.role}`,
      });
    }

    // User has required role, proceed
    next();
  };
};

module.exports = { authorizeRole };
