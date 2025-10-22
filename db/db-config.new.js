const { Sequelize, DataTypes } = require('sequelize');
require('dotenv').config();

let sequelize;

// Use MYSQL_URL if available (production), otherwise use individual credentials
if (process.env.MYSQL_URL) {
  sequelize = new Sequelize(process.env.MYSQL_URL, {
    dialect: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    }
  });
} else {
  sequelize = new Sequelize(
    process.env.DB_NAME ,
    process.env.DB_USER,
    process.env.DB_PASSWORD , {
      host: process.env.DB_HOST ,
      port: process.env.DB_PORT,
      dialect: 'mysql'
    }
  );
}

module.exports = sequelize;