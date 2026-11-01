const { Sequelize } = require('sequelize');
require('dotenv').config();

let sequelize;

// For production, use DATABASE_URL
if (process.env.NODE_ENV === 'production') {
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    },
    logging: false, // Disable logging in production
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  });
} else {
  // For development, use local MySQL
  sequelize = new Sequelize(
    process.env.DB_NAME || 'cafeapp',
    process.env.DB_USER || 'root',
    process.env.DB_PASSWORD || '',
    {
      host: process.env.DB_HOST || 'localhost',
      dialect: 'mysql',
      logging: process.env.DB_LOG_SQL === 'true' ? console.log : false
    }
  );
}

module.exports = sequelize;