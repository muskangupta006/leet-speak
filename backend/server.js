const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors()); // Allow frontend to make requests
app.use(express.json()); // Parse JSON bodies

// Basic API route
app.get('/api/data', (req, res) => {
    // You and your friends can expand this route to connect to a database, etc.
    res.json({
        message: 'Hello from the backend! The API is working correctly.',
        timestamp: new Date().toISOString()
    });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Backend server is running on http://localhost:${PORT}`);
    console.log(`Try accessing http://localhost:${PORT}/api/data in your browser`);
});
