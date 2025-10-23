const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { testConnection } = require('./config/database');

// Routes
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const eventsRoutes = require('./routes/events');
const bracketsRoutes = require('./routes/brackets');
const teamsRoutes = require('./routes/teams');      // ✅ NEW
const playersRoutes = require('./routes/players');  // ✅ NEW
const bracketTeamRoutes = require('./routes/bracketTeams');
const statsRouter = require("./routes/stats");
const scheduleRoutes = require('./routes/schedule');
const matchesRoutes = require('./routes/matches'); // Add this
const awardsRoutes = require('./routes/awards');
const statsUsersRoutes = require('./routes/stats_users');
const roundRobinRoutes = require('./routes/roundRobinBrackets'); // Round robin

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Test database connection
testConnection();

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/brackets', bracketsRoutes);
app.use('/api/teams', teamsRoutes);        // ✅ NEW
app.use('/api/players', playersRoutes);    // ✅ NEW
app.use('/api/bracketTeams', bracketTeamRoutes);
app.use("/api/stats", statsRouter);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/matches', matchesRoutes); // Add this
app.use('/api/awards', awardsRoutes);
app.use('/api', statsUsersRoutes);
app.use('/api/round-robin', roundRobinRoutes); // For round robin

// Test route
app.get('/api/test', (req, res) => {
    res.json({ 
        message: 'Backend server is running!',
        timestamp: new Date().toISOString()
    });
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Global error handler:', error);
    res.status(500).json({
        message: 'Something went wrong!',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📊 Test your API at: http://localhost:${PORT}/api/test`);
    console.log(`📁 Uploads accessible at: http://localhost:${PORT}/uploads/`);
    console.log(`👥 Admin routes available at: http://localhost:${PORT}/api/admin/`);
    console.log(`🏀 Teams routes available at: http://localhost:${PORT}/api/teams/`);
    console.log(`👤 Players routes available at: http://localhost:${PORT}/api/players/`);
    console.log(`📈 User Stats routes available at: http://localhost:${PORT}/api/teams/stats`);
});

console.log('JWT_SECRET:', process.env.JWT_SECRET);
console.log('DB_HOST:', process.env.DB_HOST);