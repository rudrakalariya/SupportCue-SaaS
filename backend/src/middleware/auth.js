const jwt = require('jsonwebtoken');
const User = require('../models/User');
const config = require('../config/env');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, config.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid token. User not found.' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error.message);
    res.status(401).json({ error: 'Invalid token.' });
  }
};

// Optional auth middleware - sets req.user if token is valid, but doesn't require it
const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (token) {
      const decoded = jwt.verify(token, config.JWT_SECRET);
      const user = await User.findById(decoded.userId);
      
      if (user) {
        req.user = user;
        console.log('Optional auth: User authenticated:', user._id);
      } else {
        console.log('Optional auth: Token provided but user not found');
      }
    } else {
      console.log('Optional auth: No token provided');
    }
    
    next();
  } catch (error) {
    console.error('Optional auth middleware error:', error.message);
    // Don't fail the request, just continue without req.user
    next();
  }
};

// Middleware to check if user is an agent
const requireAgent = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    if (req.user.role !== 'agent') {
      return res.status(403).json({ error: 'Access denied. Agent role required.' });
    }

    next();
  } catch (error) {
    console.error('Role check error:', error.message);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

// Middleware to check if user is a superuser
const requireSuperuser = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    if (req.user.role !== 'superuser') {
      return res.status(403).json({ error: 'Access denied. Superuser role required.' });
    }

    next();
  } catch (error) {
    console.error('Role check error:', error.message);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

module.exports = { auth, optionalAuth, requireAgent, requireSuperuser };
