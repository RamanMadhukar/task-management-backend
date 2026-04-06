const Joi = require('joi');

exports.updateUserSchema = Joi.object({
    name: Joi.string().min(2).max(50),
    email: Joi.string().email(),
}).min(1);