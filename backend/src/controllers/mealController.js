const db = require('../config/db');

// Typy posilkow 
const MEAL_TYPES = ['breakfast', 'second_breakfast', 'lunch', 'snacks', 'dinner'];

// Pobierz posiłki użytkownika na dany dzień
async function getMealsByDate(req, res, next) {
  try {
    const userId = req.user.id;
    const { date } = req.params; // format: YYYY-MM-DD

    if (!date) {
      return res.status(400).json({ message: 'Brak daty' });
    }

    // Pobierz posiłki
    const mealsResult = await db.query(
      `SELECT id, meal_type, created_at
       FROM meals
       WHERE user_id = $1 AND meal_date = $2
       ORDER BY 
         CASE meal_type
           WHEN 'breakfast' THEN 1
           WHEN 'second_breakfast' THEN 2
           WHEN 'lunch' THEN 3
           WHEN 'snacks' THEN 4
           WHEN 'dinner' THEN 5
         END`,
      [userId, date]
    );

    // Dla każdego posiłku pobierz produkty (meal_items)
    const meals = await Promise.all(
      mealsResult.rows.map(async (meal) => {
        const itemsResult = await db.query(
          `SELECT 
             mi.id,
             mi.product_id,
             mi.quantity_g,
             p.name AS product_name,
             p.category AS product_brand,
             p.kcal_100,
             p.protein_100,
             p.carbs_100,
             p.fat_100,
             ROUND((p.kcal_100 * mi.quantity_g / 100)::numeric, 1) AS kcal,
             ROUND((p.protein_100 * mi.quantity_g / 100)::numeric, 1) AS protein,
             ROUND((p.carbs_100 * mi.quantity_g / 100)::numeric, 1) AS carbs,
             ROUND((p.fat_100 * mi.quantity_g / 100)::numeric, 1) AS fat
           FROM meal_items mi
           JOIN products p ON p.id = mi.product_id
           WHERE mi.meal_id = $1
           ORDER BY mi.created_at`,
          [meal.id]
        );

        // Oblicz sumę dla posiłku
        const totals = itemsResult.rows.reduce(
          (acc, item) => ({
            kcal: acc.kcal + parseFloat(item.kcal || 0),
            protein: acc.protein + parseFloat(item.protein || 0),
            carbs: acc.carbs + parseFloat(item.carbs || 0),
            fat: acc.fat + parseFloat(item.fat || 0),
          }),
          { kcal: 0, protein: 0, carbs: 0, fat: 0 }
        );

        return {
          ...meal,
          items: itemsResult.rows,
          totals: {
            kcal: Math.round(totals.kcal * 10) / 10,
            protein: Math.round(totals.protein * 10) / 10,
            carbs: Math.round(totals.carbs * 10) / 10,
            fat: Math.round(totals.fat * 10) / 10,
          },
        };
      })
    );

    // Oblicz sumę dzienną
    const dailyTotals = meals.reduce(
      (acc, meal) => ({
        kcal: acc.kcal + meal.totals.kcal,
        protein: acc.protein + meal.totals.protein,
        carbs: acc.carbs + meal.totals.carbs,
        fat: acc.fat + meal.totals.fat,
      }),
      { kcal: 0, protein: 0, carbs: 0, fat: 0 }
    );

    res.json({
      date,
      meals,
      dailyTotals: {
        kcal: Math.round(dailyTotals.kcal * 10) / 10,
        protein: Math.round(dailyTotals.protein * 10) / 10,
        carbs: Math.round(dailyTotals.carbs * 10) / 10,
        fat: Math.round(dailyTotals.fat * 10) / 10,
      },
    });
  } catch (err) {
    next(err);
  }
}

// Utwórz posiłek (jeśli nie istnieje na dany dzień)
async function createMeal(req, res, next) {
  try {
    const userId = req.user.id;
    const { date, meal_type } = req.body;

    if (!date || !meal_type) {
      return res.status(400).json({ message: 'Brak daty lub typu posiłku' });
    }

    if (!MEAL_TYPES.includes(meal_type)) {
      return res.status(400).json({ message: 'Nieprawidłowy typ posiłku' });
    }

    // Sprawdź czy posiłek już istnieje
    const existing = await db.query(
      `SELECT id FROM meals WHERE user_id = $1 AND meal_date = $2 AND meal_type = $3`,
      [userId, date, meal_type]
    );

    if (existing.rows.length > 0) {
      return res.json({ meal: { id: existing.rows[0].id, meal_type, date } });
    }

    // Utwórz nowy posiłek
    const result = await db.query(
      `INSERT INTO meals (user_id, meal_date, meal_type, created_at)
       VALUES ($1, $2, $3, NOW())
       RETURNING id, meal_type, meal_date, created_at`,
      [userId, date, meal_type]
    );

    res.status(201).json({ meal: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

// Usuń posiłek (i wszystkie jego produkty)
async function deleteMeal(req, res, next) {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // Sprawdź czy posiłek należy do użytkownika
    const existing = await db.query(
      `SELECT id FROM meals WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ message: 'Posiłek nie znaleziony' });
    }

    // Usuń produkty z posiłku
    await db.query(`DELETE FROM meal_items WHERE meal_id = $1`, [id]);

    // Usuń posiłek
    await db.query(`DELETE FROM meals WHERE id = $1`, [id]);

    res.json({ message: 'Posiłek usunięty' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getMealsByDate,
  createMeal,
  deleteMeal,
  MEAL_TYPES,
};
