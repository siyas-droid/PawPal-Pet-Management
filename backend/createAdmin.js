
const readline = require('readline');
const bcrypt = require('bcryptjs');
const db = require('./db');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.question('Enter admin username: ', username => {
    rl.question('Enter admin password: ', async password => {
        if (!username.trim() || password.length < 8) {
            console.log('Username is required and password must be at least 8 characters.');
            rl.close();
            db.end();
            return;
        }

        try {
            const hashedPassword = await bcrypt.hash(password, 10);

            db.query(
                'INSERT INTO admins (username, password) VALUES (?, ?)',
                [username.trim(), hashedPassword],
                (err) => {
                    if (err) {
                        console.log('Unable to create admin:', err.message);
                    } else {
                        console.log('Admin account created successfully! 🐾');
                    }

                    rl.close();
                    db.end();
                }
            );
        } catch (error) {
            console.log('Error:', error.message);
            rl.close();
            db.end();
        }
    });
});
