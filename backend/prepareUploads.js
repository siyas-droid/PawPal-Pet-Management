const fs = require('fs');
const path = require('path');

const uploadsPath = path.join(__dirname, 'uploads');
fs.mkdirSync(uploadsPath, { recursive: true });

require('./server');
