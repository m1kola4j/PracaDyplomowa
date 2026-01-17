const express = require('express');
const router = express.Router();
const tipsController = require('../controllers/tipsController');
const { authMiddleware, adminOnly } = require('../middleware/authMiddleware');

// Publiczne endpointy (dla wszystkich zalogowanych)
router.get('/', authMiddleware, tipsController.getAllTips);
router.get('/random', authMiddleware, tipsController.getRandomTip);
router.get('/category/:category', authMiddleware, tipsController.getTipsByCategory);

// Endpointy tylko dla admina
router.get('/admin/all', authMiddleware, adminOnly, tipsController.getAllTipsAdmin);
router.get('/admin/:id', authMiddleware, adminOnly, tipsController.getTipById);
router.post('/admin', authMiddleware, adminOnly, tipsController.createTip);
router.put('/admin/:id', authMiddleware, adminOnly, tipsController.updateTip);
router.delete('/admin/:id', authMiddleware, adminOnly, tipsController.deleteTip);

module.exports = router;







