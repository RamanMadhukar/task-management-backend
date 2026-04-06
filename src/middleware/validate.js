const ErrorResponse = require('../utils/errorResponse');

const validate = (schema) => (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false });
    if (error) {
        const message = error.details.map((d) => d.message).join(', ');
        return next(new ErrorResponse(message, 400));
    }
    next();
};

module.exports = validate;