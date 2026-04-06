const Task = require('../models/Task');
const asyncHandler = require('../middleware/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

exports.getTasks = asyncHandler(async (req, res) => {
    const { status, priority, search, sortBy = 'dueDate', order = 'asc', page = 1, limit = 10 } = req.query;

    const matchStage = req.user.role === 'admin' ? {} : { assignee: req.user._id };
    if (status) matchStage.status = status;
    if (priority) matchStage.priority = priority;
    if (search) matchStage.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
    ];

    const pipeline = [
        { $match: matchStage },
        { $lookup: { from: 'users', localField: 'assignee', foreignField: '_id', as: 'assigneeData' } },
        { $lookup: { from: 'users', localField: 'createdBy', foreignField: '_id', as: 'creatorData' } },
        {
            $addFields: {
                assignee: { $arrayElemAt: ['$assigneeData', 0] },
                createdBy: { $arrayElemAt: ['$creatorData', 0] },
            }
        },
        { $project: { 'assignee.password': 0, 'createdBy.password': 0, assigneeData: 0, creatorData: 0 } },
        { $sort: { [sortBy]: order === 'asc' ? 1 : -1 } },
        {
            $facet: {
                data: [{ $skip: (page - 1) * limit }, { $limit: parseInt(limit) }],
                total: [{ $count: 'count' }],
            }
        },
    ];

    const [result] = await Task.aggregate(pipeline);
    res.status(200).json({
        success: true,
        data: result.data,
        pagination: { page: parseInt(page), limit: parseInt(limit), total: result.total[0]?.count || 0 },
    });
});

exports.createTask = asyncHandler(async (req, res) => {
    req.body.createdBy = req.user._id;
    if (req.user.role !== 'admin') req.body.assignee = req.user._id;
    const task = await Task.create(req.body);
    res.status(201).json({ success: true, data: task });
});

exports.updateTask = asyncHandler(async (req, res, next) => {
    let task = await Task.findById(req.params.id);
    if (!task) return next(new ErrorResponse('Task not found', 404));
    const isOwner = task.createdBy.toString() === req.user._id.toString();
    if (!isOwner && req.user.role !== 'admin')
        return next(new ErrorResponse('Not authorized to update this task', 403));
    if (req.body.assignee && req.user.role !== 'admin')
        return next(new ErrorResponse('Only admins can reassign tasks', 403));
    task = await Task.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    res.status(200).json({ success: true, data: task });
});

exports.deleteTask = asyncHandler(async (req, res, next) => {
    const task = await Task.findById(req.params.id);
    if (!task) return next(new ErrorResponse('Task not found', 404));
    if (task.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin')
        return next(new ErrorResponse('Not authorized', 403));
    await task.deleteOne();
    res.status(200).json({ success: true, data: {} });
});

exports.getTaskStats = asyncHandler(async (req, res) => {
    const matchStage = req.user.role === 'admin' ? {} : { assignee: req.user._id };
    const stats = await Task.aggregate([
        { $match: matchStage },
        { $group: { _id: '$status', count: { $sum: 1 } } },
        { $project: { status: '$_id', count: 1, _id: 0 } },
    ]);
    res.status(200).json({ success: true, data: stats });
});