const router = require('express').Router();
const {
    getTasks,
    createTask,
    updateTask,
    deleteTask,
    getTaskStats,
} = require('../controllers/taskController');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createTaskSchema, updateTaskSchema } = require('../validations/taskValidation');

router.use(protect);

router
    .route('/')
    .get(getTasks)
    .post(validate(createTaskSchema), createTask);

router
    .route('/:id')
    .put(validate(updateTaskSchema), updateTask)
    .delete(deleteTask);

router.get('/stats/summary', getTaskStats);

module.exports = router;