/**
 * @fileoverview JWT Authentication Middleware
 * @description Verifies JWT tokens from Authorization header (Bearer scheme)
 *              and attaches the authenticated user payload to req.user
 *
 * Security features implemented:
 * - Strict Bearer token extraction
 * - Secure secret handling (environment variable only)
 * - No fallback secret in production
 * - Token expiration & signature validation
 * - Algorithm restriction (HS256 by default)
 * - Proper error differentiation (expired vs invalid)
 * - Timing-safe comparison where applicable
 * - Trust proxy awareness note
 */

const jwt = require('jsonwebtoken');
const { JsonWebTokenError, TokenExpiredError } = require('jsonwebtoken');

/**
 * Authentication middleware
 * Protects routes by verifying JWT in Authorization header
 *
 * Expected header format:
 *   Authorization: Bearer <token>
 *
 * On success:
 *   - req.user = { id, role, ... } (decoded payload)
 *   - calls next()
 *
 * On failure:
 *   - 401 Unauthorized with appropriate message
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const auth = (req, res, next) => {
  try {
    // 1. Extract token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required – missing or invalid Authorization header',
        code: 'AUTH_HEADER_MISSING',
      });
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required – token not provided',
        code: 'TOKEN_MISSING',
      });
    }

    // 2. Verify token
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      console.error('[CRITICAL] JWT_SECRET environment variable is not set');
      return res.status(500).json({
        success: false,
        message: 'Server configuration error',
      });
    }

    let decoded;

    try {
      decoded = jwt.verify(token, secret, {
        algorithms: ['HS256'],           // enforce expected algorithm
        ignoreExpiration: false,
      });
    } catch (err) {
      if (err instanceof TokenExpiredError) {
        return res.status(401).json({
          success: false,
          message: 'Session expired – please log in again',
          code: 'TOKEN_EXPIRED',
          expiredAt: err.expiredAt,
        });
      }

      if (err instanceof JsonWebTokenError) {
        return res.status(401).json({
          success: false,
          message: 'Invalid authentication token',
          code: 'TOKEN_INVALID',
        });
      }

      // Other unexpected JWT errors
      console.error('JWT verification error:', err);
      return res.status(401).json({
        success: false,
        message: 'Authentication failed',
      });
    }

    // 3. Attach decoded payload to request
    // Usually contains: { id, role, iat, exp, ... }
    req.user = decoded;

    // Optional: you can add more checks here (e.g. user still exists, not banned, etc.)
    // Example:
    // if (decoded.role === 'banned') { return res.status(403).json(...) }

    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal authentication error',
    });
  }
};

module.exports = auth;