const { Sequelize, DataTypes } = require('sequelize');
require('dotenv').config();

let sequelize;

// Use MYSQL_URL if available (production), otherwise use individual credentials
if (process.env.MYSQL_URL) {
  sequelize = new Sequelize(process.env.MYSQL_URL, {
    dialect: 'mysql',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    }
  });
} else {
  sequelize = new Sequelize(
    process.env.DB_NAME || 'cafeapp',
    process.env.DB_USER || 'root',
    process.env.DB_PASSWORD || '', {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      dialect: 'mysql'
    }
  );
module.exports = sequelize 
