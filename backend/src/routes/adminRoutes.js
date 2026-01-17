const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authMiddleware, adminOnly } = require('../middleware/authMiddleware');

// Wszystkie endpointy wymagaja bycia adminem
router.use(authMiddleware);
router.use(adminOnly);

router.get('/stats', adminController.getDashboardStats);
router.get('/users', adminController.getAllUsers);
router.get('/users/:id', adminController.getUserById);
router.put('/users/:id/role', adminController.updateUserRole);
router.delete('/users/:id', adminController.deleteUser);

module.exports = router;







