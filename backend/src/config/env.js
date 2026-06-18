require('dotenv').config();

module.exports = {
  PORT: process.env.PORT || 5000,
  MONGO_URI: process.env.MONGO_URI || 'mongodb://localhost:27017/support_platform',
  JWT_SECRET: process.env.JWT_SECRET || 'fallback_jwt_secret_for_development',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  GEMINI_BASE_URL: 'https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent',
  NODE_ENV: process.env.NODE_ENV || 'development'
};
