const express = require('express');
const db = require('../config/db');
const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const productRoutes = require('./productRoutes');
const mealRoutes = require('./mealRoutes');
const stepsRoutes = require('./stepsRoutes');
const favoritesRoutes = require('./favoritesRoutes');
const tipsRoutes = require('./tipsRoutes');
const adminRoutes = require('./adminRoutes');

const router = express.Router();

router.get('/health', async (req, res, next) => {
  try {
    const result = await db.query('SELECT NOW() AS now');
    res.json({ status: 'ok', time: result.rows[0].now });
  } catch (err) {
    next(err);
  }
});

router.use('/auth', authRoutes);

router.use('/user', userRoutes);

router.use('/products', productRoutes);

router.use('/meals', mealRoutes);

router.use('/steps', stepsRoutes);

router.use('/favorites', favoritesRoutes);

router.use('/tips', tipsRoutes);

router.use('/admin', adminRoutes);

module.exports = router;
