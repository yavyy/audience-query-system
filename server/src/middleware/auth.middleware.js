import { User } from '../models/users.model.js'
import { verifyAccessToken } from '../utils/tokenUtils.js';

const verifyJWT = async (req, res, next) => {
  try {
    let token;

    if (req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken
    }

    if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1]
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route. No token provided.'
      })
    }

    // Verify token
    const decoded = verifyAccessToken(token)

    if (decoded.type !== 'access') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token type'
      })
    }

    // Get user from token
    req.user = await User.findById(decoded.id);

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!req.user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'User account is inactive'
      })
    }

    next()
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route',
      error: error.message
    })
  }
}

const grantAccess = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role ${req.user.role} is not authorized to access this route`
      })
    }
    next();
  }
}

export {
  verifyJWT,
  grantAccess
}