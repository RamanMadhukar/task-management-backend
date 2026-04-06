const logger = require('../utils/logger');
const ErrorResponse = require('../utils/errorResponse');

const errorHandler = (err, req, res, next) => {
    let error = { ...err, message: err.message };

    if (err.name === 'CastError')
        error = new ErrorResponse(`Resource not found`, 404);
    if (err.code === 11000)
        error = new ErrorResponse('Duplicate field value', 400);
    if (err.name === 'ValidationError')
        error = new ErrorResponse(Object.values(err.errors).map(e => e.message).join(', '), 400);
    if (err.name === 'JsonWebTokenError')
        error = new ErrorResponse('Invalid token', 401);
    if (err.name === 'TokenExpiredError')
        error = new ErrorResponse('Token expired', 401);

    logger.error(`${error.statusCode || 500} - ${error.message} - ${req.originalUrl}`);

    res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Server Error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
};

module.exports = errorHandler;