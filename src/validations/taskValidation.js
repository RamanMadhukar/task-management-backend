const Joi = require('joi');

exports.createTaskSchema = Joi.object({
    title: Joi.string().min(2).max(100).required(),
    description: Joi.string().max(1000).allow('', null),
    status: Joi.string().valid('todo', 'in-progress', 'review', 'done').default('todo'),
    priority: Joi.string().valid('low', 'medium', 'high', 'critical').default('medium'),
    assignee: Joi.string().hex().length(24).allow(null),  // MongoDB ObjectId
    dueDate: Joi.date().iso().min('now').allow(null),
    tags: Joi.array().items(Joi.string().max(30)).max(10),
});

exports.updateTaskSchema = Joi.object({
    title: Joi.string().min(2).max(100),
    description: Joi.string().max(1000).allow('', null),
    status: Joi.string().valid('todo', 'in-progress', 'review', 'done'),
    priority: Joi.string().valid('low', 'medium', 'high', 'critical'),
    assignee: Joi.string().hex().length(24).allow(null),
    dueDate: Joi.date().iso().allow(null),
    tags: Joi.array().items(Joi.string().max(30)).max(10),
}).min(1); // at least one field required for update