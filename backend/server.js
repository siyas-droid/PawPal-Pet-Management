
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');

const db = require('./db');

const app = express();

app.use(cors());
app.use(express.json());
// Serve frontend files
app.use(express.static(path.join(__dirname, '../frontend')));

// Make uploaded pet photos accessible
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Multer configuration for pet photo uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, 'uploads'));
    },

    filename: (req, file, cb) => {
        const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueName + path.extname(file.originalname).toLowerCase());
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];

        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only JPG, PNG and WEBP images are allowed.'));
        }
    }
});

// Home route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/main.html'));
});

// Test database
app.get('/test-db', (req, res) => {
    db.query('SELECT 1 AS result', (err, results) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: 'Database query failed'
            });
        }

        res.json({
            success: true,
            message: 'PawPal database is working!',
            result: results[0]
        });
    });
});

// =====================================
// CUSTOMER REGISTRATION API
// =====================================

app.post('/api/register', async (req, res) => {
    try {
        const { full_name, email, password, phone, address } = req.body;

        if (!full_name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please enter your name, email and password.'
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                message: 'Password must contain at least 8 characters.'
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const sql = `
            INSERT INTO users
            (full_name, email, password, phone, address, role)
            VALUES (?, ?, ?, ?, ?, 'customer')
        `;

        db.query(
            sql,
            [
                full_name.trim(),
                email.trim().toLowerCase(),
                hashedPassword,
                phone || null,
                address || null
            ],
            (err, result) => {
                if (err) {
                    if (err.code === 'ER_DUP_ENTRY') {
                        return res.status(409).json({
                            success: false,
                            message: 'This email is already registered.'
                        });
                    }

                    console.error(err.message);

                    return res.status(500).json({
                        success: false,
                        message: 'Registration failed. Please try again.'
                    });
                }

                res.status(201).json({
                    success: true,
                    message: 'Your PawPal account has been created!',
                    user_id: result.insertId
                });
            }
        );

    } catch (error) {
        console.error(error.message);

        res.status(500).json({
            success: false,
            message: 'Something went wrong.'
        });
    }
});

// =====================================
// CUSTOMER LOGIN API
// =====================================

app.post('/api/login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({
            success: false,
            message: 'Please enter email and password.'
        });
    }

    const sql = `
        SELECT user_id, full_name, email, password, role, phone, address
        FROM users
        WHERE email = ?
    `;

    db.query(sql, [email.trim().toLowerCase()], async (err, results) => {
        if (err) {
            console.error(err.message);

            return res.status(500).json({
                success: false,
                message: 'Login failed. Please try again.'
            });
        }

        if (results.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password.'
            });
        }

        const user = results[0];

        const passwordMatch = await bcrypt.compare(
            password,
            user.password
        );

        if (!passwordMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password.'
            });
        }

        res.json({
            success: true,
            message: 'Login successful! Welcome to PawPal.',
            user: {
                user_id: user.user_id,
                full_name: user.full_name,
                email: user.email,
                role: user.role,
                phone: user.phone,
                address: user.address
            }
        });
    });
});

// =====================================
// MY PETS APIs
// =====================================

// Get all pets belonging to a customer
app.get('/api/pets/:userId', (req, res) => {
    const userId = Number(req.params.userId);

    if (!Number.isInteger(userId) || userId <= 0) {
        return res.status(400).json({
            success: false,
            message: 'Invalid customer ID.'
        });
    }

    const sql = 'SELECT * FROM pets WHERE user_id = ? ORDER BY pet_id DESC';

    db.query(sql, [userId], (err, results) => {
        if (err) {
            console.error(err.message);

            return res.status(500).json({
                success: false,
                message: 'Unable to load pets.'
            });
        }

        res.json({
            success: true,
            pets: results
        });
    });
});

// Add a new pet
app.post('/api/pets', (req, res) => {
    const { user_id, pet_name, species, breed, age, gender } = req.body;

    const userId = Number(user_id);

    const petAge = age === '' || age === null || age === undefined
        ? null
        : Number(age);

    if (!Number.isInteger(userId) || userId <= 0 || !pet_name || !species) {
        return res.status(400).json({
            success: false,
            message: 'Customer, pet name and species are required.'
        });
    }

    if (petAge !== null && (!Number.isInteger(petAge) || petAge < 0)) {
        return res.status(400).json({
            success: false,
            message: 'Please enter a valid pet age.'
        });
    }

    const sql = `
        INSERT INTO pets
        (user_id, pet_name, species, breed, age, gender)
        VALUES (?, ?, ?, ?, ?, ?)
    `;

    db.query(
        sql,
        [
            userId,
            pet_name.trim(),
            species,
            breed || null,
            petAge,
            gender || null
        ],
        (err, result) => {
            if (err) {
                console.error(err.message);

                return res.status(500).json({
                    success: false,
                    message: 'Unable to add pet.'
                });
            }

            res.status(201).json({
                success: true,
                message: 'Your pet was added successfully! 🐾',
                pet_id: result.insertId
            });
        }
    );
});

// Upload pet photo
app.post('/api/pets/:petId/photo', upload.single('photo'), (req, res) => {
    const petId = Number(req.params.petId);
    const userId = Number(req.body.user_id);

    if (
        !Number.isInteger(petId) || petId <= 0 ||
        !Number.isInteger(userId) || userId <= 0
    ) {
        return res.status(400).json({
            success: false,
            message: 'Invalid pet or user ID.'
        });
    }

    if (!req.file) {
        return res.status(400).json({
            success: false,
            message: 'Please select a photo.'
        });
    }

    const photoPath = '/uploads/' + req.file.filename;

    const sql = `
        UPDATE pets
        SET photo = ?
        WHERE pet_id = ? AND user_id = ?
    `;

    db.query(sql, [photoPath, petId, userId], (err, result) => {
        if (err) {
            console.error(err.message);

            return res.status(500).json({
                success: false,
                message: 'Photo upload failed.'
            });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Pet not found.'
            });
        }

        res.json({
            success: true,
            message: 'Pet photo uploaded successfully! 🐾',
            photo: photoPath
        });
    });
});

// Update a pet
app.put('/api/pets/:petId', (req, res) => {
    const petId = Number(req.params.petId);

    const {
        user_id,
        pet_name,
        species,
        breed,
        age,
        gender
    } = req.body;

    const userId = Number(user_id);

    const petAge = age === '' || age === null || age === undefined
        ? null
        : Number(age);

    if (
        !Number.isInteger(petId) || petId <= 0 ||
        !Number.isInteger(userId) || userId <= 0 ||
        !pet_name || !species
    ) {
        return res.status(400).json({
            success: false,
            message: 'Please provide valid pet details.'
        });
    }

    if (petAge !== null && (!Number.isInteger(petAge) || petAge < 0)) {
        return res.status(400).json({
            success: false,
            message: 'Please enter a valid pet age.'
        });
    }

    const sql = `
        UPDATE pets
        SET pet_name = ?, species = ?, breed = ?, age = ?, gender = ?
        WHERE pet_id = ? AND user_id = ?
    `;

    db.query(
        sql,
        [
            pet_name.trim(),
            species,
            breed || null,
            petAge,
            gender || null,
            petId,
            userId
        ],
        (err, result) => {
            if (err) {
                console.error(err.message);

                return res.status(500).json({
                    success: false,
                    message: 'Unable to update pet.'
                });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Pet not found or no changes made.'
                });
            }

            res.json({
                success: true,
                message: 'Pet details updated successfully! 🐾'
            });
        }
    );
});

// Delete a pet belonging to a customer
app.delete('/api/pets/:petId', (req, res) => {
    const petId = Number(req.params.petId);
    const userId = Number(req.body.user_id);

    if (
        !Number.isInteger(petId) || petId <= 0 ||
        !Number.isInteger(userId) || userId <= 0
    ) {
        return res.status(400).json({
            success: false,
            message: 'Invalid pet or customer ID.'
        });
    }

    const sql = 'DELETE FROM pets WHERE pet_id = ? AND user_id = ?';

    db.query(sql, [petId, userId], (err, result) => {
        if (err) {
            console.error(err.message);

            return res.status(500).json({
                success: false,
                message: 'Unable to delete pet.'
            });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Pet not found.'
            });
        }

        res.json({
            success: true,
            message: 'Pet deleted successfully.'
        });
    });
});

// =====================================
// APPOINTMENT APIs
// =====================================

// Book a grooming appointment
app.post('/api/appointments', (req, res) => {
    const {
        user_id,
        pet_id,
        service_name,
        appointment_date,
        appointment_time
    } = req.body;

    if (
        !user_id ||
        !pet_id ||
        !service_name ||
        !appointment_date ||
        !appointment_time
    ) {
        return res.status(400).json({
            message: 'Please fill in all appointment details.'
        });
    }

    const checkPetSql = `
        SELECT pet_id
        FROM pets
        WHERE pet_id = ? AND user_id = ?
    `;

    db.query(checkPetSql, [pet_id, user_id], (err, results) => {
        if (err) {
            return res.status(500).json({
                message: 'Error checking pet details.'
            });
        }

        if (results.length === 0) {
            return res.status(403).json({
                message: 'This pet does not belong to your account.'
            });
        }

        const sql = `
            INSERT INTO appointments
            (user_id, pet_id, service_name, appointment_date, appointment_time)
            VALUES (?, ?, ?, ?, ?)
        `;

        db.query(
            sql,
            [user_id, pet_id, service_name, appointment_date, appointment_time],
            (err, result) => {
                if (err) {
                    return res.status(500).json({
                        message: 'Unable to book appointment.'
                    });
                }

                res.status(201).json({
                    message: 'Grooming appointment booked successfully!',
                    appointment_id: result.insertId
                });
            }
        );
    });
});

// Get appointments for a customer
app.get('/api/appointments/:userId', (req, res) => {
    const userId = req.params.userId;

    const sql = `
        SELECT
            appointments.*,
            pets.pet_name
        FROM appointments
        JOIN pets
            ON appointments.pet_id = pets.pet_id
        WHERE appointments.user_id = ?
        ORDER BY appointments.appointment_date DESC,
                 appointments.appointment_time DESC
    `;

    db.query(sql, [userId], (err, results) => {
        if (err) {
            console.log(err.message);

            return res.status(500).json({
                message: 'Unable to load appointments.'
            });
        }

        res.json(results);
    });
});

// Cancel a grooming appointment
app.put('/api/appointments/:appointmentId/cancel', (req, res) => {
    const appointmentId = req.params.appointmentId;
    const { user_id } = req.body;

    if (!user_id) {
        return res.status(400).json({
            message: 'Customer ID is required.'
        });
    }

    const sql = `
        UPDATE appointments
        SET status = 'Cancelled'
        WHERE appointment_id = ?
        AND user_id = ?
        AND status != 'Cancelled'
    `;

    db.query(sql, [appointmentId, user_id], (err, result) => {
        if (err) {
            return res.status(500).json({
                message: 'Unable to cancel appointment.'
            });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: 'Appointment not found or already cancelled.'
            });
        }

        res.json({
            message: 'Appointment cancelled successfully!'
        });
    });
});

 // =====================================
 // DAYCARE BOOKING APIs
 // =====================================

const daycarePackages = {
    'Half Day Care': 299,
    'Full Day Care': 499,
    'Premium Care': 699
};

// Create a daycare booking
app.post('/api/daycare', (req, res) => {
    const {
        user_id, pet_id, package_name,
        booking_date, drop_time, pickup_time, instructions
    } = req.body;

    const userId = Number(user_id);
    const petId = Number(pet_id);
    const price = daycarePackages[package_name];

    if (
        !Number.isInteger(userId) || userId <= 0 ||
        !Number.isInteger(petId) || petId <= 0 ||
        !price || !booking_date || !drop_time || !pickup_time
    ) {
        return res.status(400).json({
            success: false,
            message: 'Please provide all valid booking details.'
        });
    }

    const today = new Date();
const localToday = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0')
].join('-');

if (
    !/^\d{4}-\d{2}-\d{2}$/.test(booking_date) ||
    isNaN(Date.parse(booking_date)) ||
    booking_date < localToday
) {
    return res.status(400).json({
        success: false,
        message: 'Please select a valid future booking date.'
    });
}

    const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

    if (
        !timePattern.test(drop_time) ||
        !timePattern.test(pickup_time) ||
        pickup_time <= drop_time
    ) {
        return res.status(400).json({
            success: false,
            message: 'Please select valid drop-off and pick-up times.'
        });
    }

    const duration = (
        new Date(`2000-01-01T${pickup_time}`) -
        new Date(`2000-01-01T${drop_time}`)
    ) / 3600000;

    const maxHours = package_name === 'Half Day Care' ? 4 : 8;

    if (duration > maxHours) {
        return res.status(400).json({
            success: false,
            message: `${package_name} allows a maximum of ${maxHours} hours.`
        });
    }

    const checkPet = `
        SELECT pet_id FROM pets
        WHERE pet_id = ? AND user_id = ?
    `;

    db.query(checkPet, [petId, userId], (err, results) => {
        if (err) {
            console.error(err.message);
            return res.status(500).json({
                success: false,
                message: 'Unable to verify pet details.'
            });
        }

        if (!results.length) {
            return res.status(403).json({
                success: false,
                message: 'This pet does not belong to your account.'
            });
        }

        const sql = `
            INSERT INTO daycare_bookings
            (user_id, pet_id, package_name, price, booking_date,
             drop_time, pickup_time, instructions)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;

        db.query(sql, [
            userId, petId, package_name, price,
            booking_date, drop_time, pickup_time,
            instructions || null
        ], (err, result) => {
            if (err) {
                console.error(err.message);
                return res.status(500).json({
                    success: false,
                    message: 'Unable to create daycare booking.'
                });
            }

            res.status(201).json({
                success: true,
                message: 'Daycare booking created successfully! 🐾',
                booking_id: result.insertId,
                price
            });
        });
    });
});

// Get daycare bookings for a customer
app.get('/api/daycare/:userId', (req, res) => {
    const userId = Number(req.params.userId);

    if (!Number.isInteger(userId) || userId <= 0) {
        return res.status(400).json({
            success: false,
            message: 'Invalid customer ID.'
        });
    }

    const sql = `
        SELECT d.*, p.pet_name, p.species
        FROM daycare_bookings d
        JOIN pets p ON d.pet_id = p.pet_id
        WHERE d.user_id = ?
        ORDER BY d.booking_date DESC, d.booking_id DESC
    `;

    db.query(sql, [userId], (err, results) => {
        if (err) {
            console.error(err.message);
            return res.status(500).json({
                success: false,
                message: 'Unable to load daycare bookings.'
            });
        }

        res.json({
            success: true,
            bookings: results
        });
    });
});

// =====================================
// PLACE A PET SUPPLIES ORDER
// =====================================

app.post('/api/orders', (req, res) => {
    const {
        user_id,
        customer_name,
        phone,
        delivery_address,
        payment_method,
        items
    } = req.body;

    const userId = Number(user_id);

    const productCatalogue = {
        1: { name: 'Premium Dog Food', price: 899 },
        2: { name: 'Cat Food', price: 599 },
        3: { name: 'Dog Chew Toy', price: 249 },
        4: { name: 'Plush Teddy Toy', price: 349 },
        5: { name: 'Pet Collar', price: 199 },
        6: { name: 'Pet Feeding Bowl', price: 299 },
        7: { name: 'Pet Shampoo', price: 399 },
        8: { name: 'Pet Grooming Brush', price: 249 }
    };

    const validPayments = [
        'UPI',
        'Cash on Delivery',
        'Net Banking'
    ];

    if (
        !Number.isInteger(userId) ||
        userId <= 0 ||
        !customer_name ||
        !phone ||
        !delivery_address ||
        !validPayments.includes(payment_method) ||
        !Array.isArray(items) ||
        items.length === 0
    ) {
        return res.status(400).json({
            success: false,
            message: 'Please provide all valid order details.'
        });
    }

    const orderItems = [];
    let totalAmount = 0;

    for (const item of items) {
        const productId = Number(item.id);
        const quantity = Number(item.quantity);
        const product = productCatalogue[productId];

        if (
            !product ||
            !Number.isInteger(quantity) ||
            quantity <= 0 ||
            quantity > 100
        ) {
            return res.status(400).json({
                success: false,
                message: 'Invalid product or quantity.'
            });
        }

        totalAmount += product.price * quantity;

        orderItems.push([
            product.name,
            quantity,
            product.price
        ]);
    }

    db.beginTransaction((err) => {
        if (err) {
            console.error(err.message);

            return res.status(500).json({
                success: false,
                message: 'Unable to start order.'
            });
        }

        const orderSql = `
            INSERT INTO orders
            (
                user_id,
                total_amount,
                customer_name,
                phone,
                delivery_address,
                payment_method
            )
            VALUES (?, ?, ?, ?, ?, ?)
        `;

        db.query(
            orderSql,
            [
                userId,
                totalAmount,
                customer_name.trim(),
                phone.trim(),
                delivery_address.trim(),
                payment_method
            ],
            (err, result) => {
                if (err) {
                    return db.rollback(() => {
                        console.error(err.message);

                        res.status(500).json({
                            success: false,
                            message: 'Unable to place order.'
                        });
                    });
                }

                const orderId = result.insertId;

                const itemsSql = `
                    INSERT INTO order_items
                    (order_id, product_name, quantity, price)
                    VALUES ?
                `;

                const values = orderItems.map(item => [
                    orderId,
                    item[0],
                    item[1],
                    item[2]
                ]);

                db.query(itemsSql, [values], (err) => {
                    if (err) {
                        return db.rollback(() => {
                            console.error(err.message);

                            res.status(500).json({
                                success: false,
                                message: 'Unable to save order items.'
                            });
                        });
                    }

                    db.commit((err) => {
                        if (err) {
                            return db.rollback(() => {
                                console.error(err.message);

                                res.status(500).json({
                                    success: false,
                                    message: 'Unable to complete order.'
                                });
                            });
                        }

                        res.status(201).json({
                            success: true,
                            message: 'Your PawPal order was placed successfully!',
                            order_id: orderId,
                            total_amount: totalAmount,
                            payment_method: payment_method
                        });
                    });
                });
            }
        );
    });
});

// =====================================
// GET ALL ORDERS FOR A CUSTOMER
// =====================================

app.get('/api/orders/:userId', (req, res) => {
    const userId = Number(req.params.userId);

    if (!Number.isInteger(userId) || userId <= 0) {
        return res.status(400).json({
            success: false,
            message: 'Invalid customer ID.'
        });
    }

    const sql = `
        SELECT
            o.order_id,
            o.user_id,
            o.total_amount,
            o.order_status,
            o.order_date,
            o.customer_name,
            o.phone,
            o.delivery_address,
            o.payment_method,
            oi.order_item_id,
            oi.product_name,
            oi.quantity,
            oi.price
        FROM orders o
        LEFT JOIN order_items oi
            ON o.order_id = oi.order_id
        WHERE o.user_id = ?
        ORDER BY o.order_date DESC, o.order_id DESC
    `;

    db.query(sql, [userId], (err, results) => {
        if (err) {
            console.error('Order history error:', err.message);

            return res.status(500).json({
                success: false,
                message: 'Unable to load your orders.'
            });
        }

        const orderMap = {};

        results.forEach(row => {

            if (!orderMap[row.order_id]) {
                orderMap[row.order_id] = {
                    order_id: row.order_id,
                    user_id: row.user_id,
                    total_amount: row.total_amount,
                    order_status: row.order_status,
                    order_date: row.order_date,
                    customer_name: row.customer_name,
                    phone: row.phone,
                    delivery_address: row.delivery_address,
                    payment_method: row.payment_method,
                    items: []
                };
            }

            if (row.order_item_id) {
                orderMap[row.order_id].items.push({
                    order_item_id: row.order_item_id,
                    product_name: row.product_name,
                    quantity: row.quantity,
                    price: row.price
                });
            }
        });

        res.json({
            success: true,
            orders: Object.values(orderMap)
        });
    });
});

// =====================================
// ADMIN LOGIN API
// =====================================

app.post('/api/admin/login', (req, res) => {
    const { username, password, accessPassword } = req.body;

    if (!username || !password || !accessPassword) {
        return res.status(400).json({
            success: false,
            message: 'Please enter all login details.'
        });
    }

    // Check the secret admin access password
    if (!process.env.ADMIN_ACCESS_PASSWORD) {
        return res.status(500).json({
            success: false,
            message: 'Admin access password is not configured.'
        });
    }

    if (accessPassword !== process.env.ADMIN_ACCESS_PASSWORD) {
        return res.status(401).json({
            success: false,
            message: 'Invalid admin access password.'
        });
    }

    const sql = 'SELECT * FROM admins WHERE username = ?';

    db.query(sql, [username.trim()], async (err, results) => {
        if (err) {
            console.error(err.message);

            return res.status(500).json({
                success: false,
                message: 'Login failed. Please try again.'
            });
        }

        if (!results.length) {
            return res.status(401).json({
                success: false,
                message: 'Invalid username or password.'
            });
        }

        try {
            const admin = results[0];

            const validPassword = await bcrypt.compare(
                password,
                admin.password
            );

            if (!validPassword) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid username or password.'
                });
            }

            res.json({
                success: true,
                message: 'Admin login successful!',
                admin: {
                    admin_id: admin.admin_id,
                    username: admin.username
                }
            });

        } catch (error) {
            console.error(error.message);

            res.status(500).json({
                success: false,
                message: 'Unable to complete login.'
            });
        }
    });
});

// =====================================
// ADMIN DASHBOARD STATISTICS API
// =====================================

app.get('/api/admin/dashboard-stats', (req, res) => {
    const sql = `
        SELECT
            (SELECT COUNT(*) FROM users WHERE role = 'customer') AS totalCustomers,
            (SELECT COUNT(*) FROM pets) AS totalPets,
            (SELECT COUNT(*) FROM daycare_bookings) AS totalDaycare,
            (SELECT COUNT(*) FROM appointments) AS totalGrooming,
            (SELECT COUNT(*) FROM orders) AS totalOrders
    `;

    db.query(sql, (err, results) => {
        if (err) {
            console.error('Dashboard statistics error:', err.message);
            return res.status(500).json({
                success: false,
                message: 'Unable to load dashboard statistics.'
            });
        }

        res.json({
            success: true,
            stats: results[0]
        });
    });
});

// =====================================
// ADMIN CUSTOMERS OVERVIEW API
// =====================================

app.get('/api/admin/customers-overview', (req, res) => {
    const queries = {
        customers: `
            SELECT
                u.user_id,
                u.full_name,
                u.email,
                u.phone,
                u.address,
                COUNT(DISTINCT p.pet_id) AS total_pets,
                COALESCE(
                    GROUP_CONCAT(
                        DISTINCT CONCAT(
                            p.pet_name, ' (',
                            COALESCE(p.species, 'Unknown'), ', ',
                            COALESCE(p.breed, 'Unknown'), ')'
                        )
                        SEPARATOR ', '
                    ),
                    'No pets registered'
                ) AS pet_details
            FROM users u
            LEFT JOIN pets p ON u.user_id = p.user_id
            WHERE u.role = 'customer'
            GROUP BY u.user_id
            ORDER BY u.user_id DESC
        `,
        grooming: `
            SELECT
                u.full_name, u.email, u.phone,
                p.pet_name, p.species, p.breed,
                a.service_name, a.appointment_date,
                a.appointment_time, a.status
            FROM appointments a
            JOIN users u ON a.user_id = u.user_id
            JOIN pets p ON a.pet_id = p.pet_id
            WHERE u.role = 'customer'
            ORDER BY a.appointment_date DESC
        `,
        daycare: `
            SELECT
                u.full_name, u.email, u.phone,
                p.pet_name, p.species, p.breed,
                d.package_name, d.price, d.booking_date,
                d.end_date, d.drop_time, d.pickup_time,
                d.booking_status
            FROM daycare_bookings d
            JOIN users u ON d.user_id = u.user_id
            JOIN pets p ON d.pet_id = p.pet_id
            WHERE u.role = 'customer'
            ORDER BY d.booking_date DESC
        `,
        supplies: `
            SELECT
                u.full_name, u.email, u.phone,
                o.order_id, o.order_date, o.total_amount,
                o.payment_method, o.delivery_address, o.order_status,
                oi.product_name, oi.quantity, oi.price AS item_price
            FROM orders o
            JOIN users u ON o.user_id = u.user_id
            LEFT JOIN order_items oi ON o.order_id = oi.order_id
            WHERE u.role = 'customer'
            ORDER BY o.order_date DESC
        `
    };

    const runQuery = (sql) => new Promise((resolve, reject) => {
        db.query(sql, (err, results) => {
            if (err) return reject(err);
            resolve(results);
        });
    });

    Promise.all([
        runQuery(queries.customers),
        runQuery(queries.grooming),
        runQuery(queries.daycare),
        runQuery(queries.supplies)
    ])
    .then(([customers, grooming, daycare, supplies]) => {
        res.json({
            success: true,
            customers,
            grooming,
            daycare,
            supplies
        });
    })
    .catch(err => {
        console.error('Customers overview error:', err.message);
        res.status(500).json({
            success: false,
            message: 'Unable to load customer information.'
        });
    });
});

 // =====================================
 // ADMIN DAYCARE MANAGEMENT APIs
 // =====================================

// Get all daycare bookings
app.get('/api/admin/daycare', (req, res) => {
    const sql = `
        SELECT
            d.booking_id,
            d.user_id,
            d.pet_id,
            d.package_name,
            d.price,
            d.booking_date,
            d.end_date,
            d.drop_time,
            d.pickup_time,
            d.instructions,
            d.booking_status,
            u.full_name,
            u.email,
            u.phone,
            p.pet_name,
            p.species,
            p.breed
        FROM daycare_bookings d
        JOIN users u ON d.user_id = u.user_id
        JOIN pets p ON d.pet_id = p.pet_id
        ORDER BY d.created_at DESC
    `;

    db.query(sql, (err, results) => {
        if (err) {
            console.error('Daycare loading error:', err.message);
            return res.status(500).json({
                success: false,
                message: 'Unable to load daycare bookings.'
            });
        }

        res.json({ success: true, bookings: results });
    });
});

// Update daycare booking status
app.put('/api/admin/daycare/:bookingId/status', (req, res) => {
    const bookingId = Number(req.params.bookingId);
    const { status } = req.body;

    const allowedStatuses = ['Pending', 'Confirmed', 'Cancelled'];

    if (!Number.isInteger(bookingId) || bookingId < 1 ||
        !allowedStatuses.includes(status)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid booking ID or status.'
        });
    }

    const sql = `
        UPDATE daycare_bookings
        SET booking_status = ?
        WHERE booking_id = ?
    `;

    db.query(sql, [status, bookingId], (err, result) => {
        if (err) {
            console.error('Daycare status update error:', err.message);
            return res.status(500).json({
                success: false,
                message: 'Unable to update booking status.'
            });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Booking not found.'
            });
        }

        res.json({
            success: true,
            message: 'Booking status updated successfully.'
        });
    });
});


// GET all grooming appointments for admin
app.get('/api/admin/grooming-appointments', (req, res) => {
    const sql = `
        SELECT
            a.appointment_id,
            u.full_name AS customer_name,
            u.phone,
            p.pet_name,
            a.service_name,
            a.appointment_date,
            a.appointment_time,
            a.status
        FROM appointments a
        JOIN users u ON a.user_id = u.user_id
        JOIN pets p ON a.pet_id = p.pet_id
        ORDER BY a.appointment_id DESC
    `;

    db.query(sql, (err, results) => {
        if (err) {
            console.error('Grooming appointments error:', err.message);
            return res.status(500).json({
                success: false,
                message: 'Unable to load grooming appointments.'
            });
        }

        res.json({
            success: true,
            appointments: results
        });
    });
});

// UPDATE grooming appointment status
app.put('/api/admin/grooming/:appointmentId/status', (req, res) => {
    const appointmentId = req.params.appointmentId;
    const { status } = req.body;

    const allowedStatuses = ['Pending', 'Confirmed', 'Cancelled'];

    if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid appointment status.'
        });
    }

    const sql = 'UPDATE appointments SET status = ? WHERE appointment_id = ?';

    db.query(sql, [status, appointmentId], (err, result) => {
        if (err) {
            console.error('Grooming status update error:', err.message);
            return res.status(500).json({
                success: false,
                message: 'Unable to update appointment status.'
            });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Appointment not found.'
            });
        }

        res.json({
            success: true,
            message: 'Appointment status updated successfully.'
        });
    });
});


// Get all orders for Admin
app.get('/api/admin/orders', (req, res) => {
    const sql = `
        SELECT
            o.order_id,
            o.user_id,
            o.total_amount,
            o.order_status,
            o.order_date,
            o.customer_name,
            o.phone,
            o.delivery_address,
            o.payment_method,
            oi.order_item_id,
            oi.product_name,
            oi.quantity,
            oi.price
        FROM orders o
        LEFT JOIN order_items oi ON o.order_id = oi.order_id
        ORDER BY o.order_id DESC
    `;

    db.query(sql, (err, results) => {
        if (err) {
            console.error('Admin orders error:', err.message);
            return res.status(500).json({
                success: false,
                message: 'Unable to load orders.'
            });
        }

        const ordersMap = {};

        results.forEach(row => {
            if (!ordersMap[row.order_id]) {
                ordersMap[row.order_id] = {
                    order_id: row.order_id,
                    user_id: row.user_id,
                    total_amount: row.total_amount,
                    order_status: row.order_status,
                    order_date: row.order_date,
                    customer_name: row.customer_name,
                    phone: row.phone,
                    delivery_address: row.delivery_address,
                    payment_method: row.payment_method,
                    items: []
                };
            }

            if (row.order_item_id !== null) {
                ordersMap[row.order_id].items.push({
                    product_name: row.product_name,
                    quantity: row.quantity,
                    price: row.price
                });
            }
        });

        res.json({
            success: true,
            orders: Object.values(ordersMap)
        });
    });
});


// Update order status
app.put('/api/admin/orders/:orderId/status', (req, res) => {
    const orderId = req.params.orderId;
    const { status } = req.body;

    const allowedStatuses = [
        'Pending',
        'Confirmed',
        'Shipped',
        'Delivered',
        'Cancelled'
    ];

    if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid order status.'
        });
    }

    const sql = `
        UPDATE orders
        SET order_status = ?
        WHERE order_id = ?
    `;

    db.query(sql, [status, orderId], (err, result) => {
        if (err) {
            console.error('Order status update error:', err.message);
            return res.status(500).json({
                success: false,
                message: 'Unable to update order status.'
            });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Order not found.'
            });
        }

        res.json({
            success: true,
            message: 'Order status updated successfully.'
        });
    });
});


// Get all registered pets for Admin
app.get('/api/admin/pets', (req, res) => {
    const sql = `
        SELECT
            p.pet_id,
            p.pet_name,
            p.species,
            p.breed,
            p.age,
            p.gender,
            p.photo,
            u.full_name AS owner_name,
            u.email AS owner_email,
            u.phone AS owner_phone
        FROM pets p
        LEFT JOIN users u ON p.user_id = u.user_id
        ORDER BY p.pet_id DESC
    `;

    db.query(sql, (err, results) => {
        if (err) {
            console.error('Admin pets error:', err.message);

            return res.status(500).json({
                success: false,
                message: 'Unable to load registered pets.'
            });
        }

        res.json({
            success: true,
            pets: results
        });
    });
});

 // =====================================
 // START SERVER
 // =====================================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`🐾 PawPal server running on port ${PORT}`);
});
