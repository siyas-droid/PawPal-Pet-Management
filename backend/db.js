
const mysql = require('mysql2');
const dotenv = require('dotenv');
const path = require('path');

// Load local database settings
dotenv.config({
    path: path.join(__dirname, '.env')
});

// Create MySQL connection
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

// Connect to MySQL
db.connect((err) => {
    if (err) {
        console.log('Database connection failed!');
        console.log(err.message);
        return;
    }

    console.log('🐾 PawPal database connected successfully!');
});

module.exports = db;
