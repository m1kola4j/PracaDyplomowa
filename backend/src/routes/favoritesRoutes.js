const express = require('express');
const router = express.Router();
const favoritesController = require('../controllers/favoritesController');
const { authMiddleware } = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.get('/', favoritesController.getFavorites);
router.get('/ids', favoritesController.getFavoriteIds);
router.post('/:productId', favoritesController.addFavorite);
router.delete('/:productId', favoritesController.removeFavorite);

module.exports = router;

