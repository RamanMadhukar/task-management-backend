const User = require('../models/User');
const asyncHandler = require('../middleware/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

const sendTokenResponse = (user, statusCode, res) => {
    const token = user.getSignedJwt();
    const options = {
        expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000),
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
    };
    res.status(statusCode).cookie('token', token, options).json({
        success: true, token,
        user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
};

exports.register = asyncHandler(async (req, res) => {
    const { name, email, password, role } = req.body;
    const user = await User.create({ name, email, password, role });
    sendTokenResponse(user, 201, res);
});

exports.login = asyncHandler(async (req, res, next) => {
    const { email, password } = req.body;
    if (!email || !password) return next(new ErrorResponse('Provide email and password', 400));
    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.matchPassword(password)))
        return next(new ErrorResponse('Invalid credentials', 401));
    sendTokenResponse(user, 200, res);
});

exports.logout = asyncHandler(async (req, res) => {
    res.cookie('token', 'none', { expires: new Date(Date.now() + 5000), httpOnly: true });
    res.status(200).json({ success: true, message: 'Logged out' });
});

exports.getMe = asyncHandler(async (req, res) => {
    res.status(200).json({ success: true, user: req.user });
});