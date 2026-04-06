const router = require('express').Router();
const {
    getAllUsers,
    getUserById,
    updateUser,
    deleteUser,
    updateRole,
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { updateUserSchema } = require('../validations/userValidation');

router.use(protect); // all user routes require login

// Admin-only: list all users (used for task assignment dropdown)
router.get('/', authorize('admin'), getAllUsers);

// Admin-only: manage specific user
router
    .route('/:id')
    .get(authorize('admin'), getUserById)
    .put(authorize('admin'), validate(updateUserSchema), updateUser)
    .delete(authorize('admin'), deleteUser);

// Admin-only: change role
router.patch('/:id/role', authorize('admin'), updateRole);

module.exports = router;