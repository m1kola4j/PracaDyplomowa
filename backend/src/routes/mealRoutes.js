const express = require('express');
const { authMiddleware } = require('../middleware/authMiddleware');
const { getMealsByDate, createMeal, deleteMeal } = require('../controllers/mealController');
const { addItemToMeal, updateMealItem, removeMealItem } = require('../controllers/mealItemController');

const router = express.Router();

// Wszystkie endpointy wymagają autoryzacji
router.use(authMiddleware);

// Posiłki
router.get('/date/:date', getMealsByDate);  // Pobierz posiłki na dany dzień
router.post('/', createMeal);                // Utwórz posiłek
router.delete('/:id', deleteMeal);           // Usuń posiłek

// Produkty w posiłkach (meal_items)
router.post('/items', addItemToMeal);        // Dodaj produkt do posiłku
router.put('/items/:id', updateMealItem);    // Zmień ilość produktu
router.delete('/items/:id', removeMealItem); // Usuń produkt z posiłku

module.exports = router;











