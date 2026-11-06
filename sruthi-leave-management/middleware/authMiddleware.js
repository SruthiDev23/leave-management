const security = require('../utils/security');

/**
 * Verify JWT / Auth Token Middleware
 */
function requireAuth(req, res, next) {
  let token = null;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.query && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. Please log in to continue.'
    });
  }

  const decoded = security.verifyToken(token);
  if (!decoded) {
    return res.status(401).json({
      success: false,
      message: 'Session expired or invalid token. Please log in again.'
    });
  }

  req.user = decoded;
  next();
}

/**
 * Require Administrator role
 */
function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access forbidden. Administrator privileges required.'
      });
    }
    next();
  });
}

/**
 * Require Employee role (or Admin)
 */
function requireEmployee(req, res, next) {
  requireAuth(req, res, () => {
    next();
  });
}

module.exports = {
  requireAuth,
  requireAdmin,
  requireEmployee
};
