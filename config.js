require('dotenv').config();

const config = {
  allowedOrigins: process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',') 
    : ['http://localhost:3000'],
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development'
};

module.exports = config;