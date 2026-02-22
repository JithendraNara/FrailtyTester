const express = require('express');
const cors = require('cors');
const path = require('path');
const routes = require('./routes/mainRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// CORS configuration - use ALLOWED_ORIGINS env var, fail-safe to empty (no wildcard)
const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : [];
const corsOptions = {
  origin: allowedOrigins.length > 0 ? allowedOrigins : false,
  credentials: allowedOrigins.length > 0,
  optionsSuccessStatus: 200
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// Serve static files from the React build folder
app.use(express.static(path.join(__dirname, '../dist')));

// Use the routes defined in routes.js
app.use('/', routes);

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port: http://localhost:${PORT}`);
});
