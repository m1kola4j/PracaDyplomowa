const express = require('express');
const { authMiddleware } = require('../middleware/authMiddleware');
const stepsController = require('../controllers/stepsController');

const router = express.Router();

// Zapis lub aktualizacja liczby kroków dla danego dnia
router.post('/', authMiddleware, stepsController.addOrUpdateSteps);

// Pobranie liczby kroków dla konkretnej daty (parametr :date w formacie YYYY-MM-DD)
router.get('/:date', authMiddleware, stepsController.getStepsByDate);

// Pobranie kroków z zakresu dat (?from=YYYY-MM-DD&to=YYYY-MM-DD)
router.get('/', authMiddleware, stepsController.getStepsRange);

module.exports = router;



