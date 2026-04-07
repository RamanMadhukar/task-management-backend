const express = require('express');
const morgan = require('morgan');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');
const errorHandler = require('./middleware/errorHandler');
const logger = require('./utils/logger');

const app = express();

app.set('trust proxy', 1);

// Security headers
app.use(helmet());

// CORS
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
}));

// Rate limiting with proper configuration for proxy
const standardRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 2000,
    standardHeaders: true, // Return rate limit info in headers
    legacyHeaders: false, // Disable X-RateLimit-* headers
    message: 'Too many requests from this IP, please try again later.',
});

const authRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 2000,
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Too many authentication attempts, please try again later.',
    skipSuccessfulRequests: true, // Don't count successful auth requests
});

// Apply rate limiting
app.use('/api/auth', authRateLimit);
app.use('/api', standardRateLimit);

// Body parsers
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Sanitize NoSQL injection
app.use(mongoSanitize());

// HTTP logging
app.use(morgan('combined', { stream: { write: msg => logger.http(msg.trim()) } }));

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/tasks', require('./routes/taskRoutes'));
app.use('/api/users', require('./routes/userRoutes'));

// Health check
app.get('/health', (req, res) => res.json({
    status: 'ok',
    env: process.env.NODE_ENV,
    clientIp: req.ip // This will now show the real client IP, not Render's proxy IP
}));

// Test endpoint to verify IP detection
app.get('/api/debug/ip', (req, res) => {
    res.json({
        ip: req.ip,
        ips: req.ips,
        headers: {
            'x-forwarded-for': req.headers['x-forwarded-for'],
            'x-real-ip': req.headers['x-real-ip']
        }
    });
});

app.use(errorHandler);

module.exports = app;