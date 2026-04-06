const User = require('../models/User');
const Task = require('../models/Task');
const asyncHandler = require('../middleware/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

// GET /api/users  — admin only, returns all users (no passwords)
exports.getAllUsers = asyncHandler(async (req, res) => {
    const users = await User.find().select('-password').lean();
    res.status(200).json({ success: true, count: users.length, data: users });
});

// GET /api/users/:id
exports.getUserById = asyncHandler(async (req, res, next) => {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return next(new ErrorResponse('User not found', 404));
    res.status(200).json({ success: true, data: user });
});

// PUT /api/users/:id  — admin updates name/email
exports.updateUser = asyncHandler(async (req, res, next) => {
    const { name, email } = req.body;
    const user = await User.findByIdAndUpdate(
        req.params.id,
        { name, email },
        { new: true, runValidators: true }
    ).select('-password');
    if (!user) return next(new ErrorResponse('User not found', 404));
    res.status(200).json({ success: true, data: user });
});

// DELETE /api/users/:id  — admin deletes user + reassigns tasks
exports.deleteUser = asyncHandler(async (req, res, next) => {
    const user = await User.findById(req.params.id);
    if (!user) return next(new ErrorResponse('User not found', 404));

    // Unassign all tasks belonging to this user
    await Task.updateMany({ assignee: user._id }, { $unset: { assignee: '' } });

    await user.deleteOne();
    res.status(200).json({ success: true, data: {} });
});

// PATCH /api/users/:id/role  — admin changes role
exports.updateRole = asyncHandler(async (req, res, next) => {
    const { role } = req.body;
    if (!['user', 'admin'].includes(role))
        return next(new ErrorResponse('Invalid role', 400));

    const user = await User.findByIdAndUpdate(
        req.params.id,
        { role },
        { new: true }
    ).select('-password');
    if (!user) return next(new ErrorResponse('User not found', 404));
    res.status(200).json({ success: true, data: user });
});