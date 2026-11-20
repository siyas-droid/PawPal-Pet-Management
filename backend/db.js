
const mysql = require('mysql2');
const dotenv = require('dotenv');
const path = require('path');

// Load database settings from the .env file
dotenv.config({
    path: path.join(__dirname, '.env')
});

// Create MySQL connection
const db = mysql.createConnection({
    host: process.env.DB_HOST,
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
