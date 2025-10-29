const { Sequelize, DataTypes } = require('sequelize');
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
  sequelize = new Sequelize('cafeapp', 'root', '', {
    host: 'localhost',
    dialect: 'mysql',
    logging: console.log
  });
}

module.exports = sequelize;