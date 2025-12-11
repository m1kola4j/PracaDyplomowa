const express = require('express');
const { getProfile, updateProfile, deleteAccount, getActivityLevels } = require('../controllers/userController');
const { authMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/profile', authMiddleware, getProfile);
router.put('/profile', authMiddleware, updateProfile);
router.delete('/account', authMiddleware, deleteAccount);
router.get('/activity-levels', authMiddleware, getActivityLevels);

module.exports = router;
