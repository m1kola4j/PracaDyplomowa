const db = require('../config/db');

// Dodaj produkt do posiłku
async function addItemToMeal(req, res, next) {
  try {
    const userId = req.user.id;
    const { meal_id, product_id, quantity_g } = req.body;

    if (!meal_id || !product_id || !quantity_g) {
      return res.status(400).json({ message: 'Brak wymaganych danych (meal_id, product_id, quantity_g)' });
    }

    // Sprawdź czy posiłek należy do użytkownika
    const mealCheck = await db.query(
      `SELECT id FROM meals WHERE id = $1 AND user_id = $2`,
      [meal_id, userId]
    );

    if (mealCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Posiłek nie znaleziony' });
    }

    // Sprawdź czy produkt istnieje
    const productCheck = await db.query(
      `SELECT id, name, category, kcal_100, protein_100, carbs_100, fat_100 FROM products WHERE id = $1`,
      [product_id]
    );

    if (productCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Produkt nie znaleziony' });
    }

    const product = productCheck.rows[0];

    // Dodaj produkt do posiłku
    const result = await db.query(
      `INSERT INTO meal_items (meal_id, product_id, quantity_g, created_at)
       VALUES ($1, $2, $3, NOW())
       RETURNING id, meal_id, product_id, quantity_g, created_at`,
      [meal_id, product_id, quantity_g]
    );

    const item = result.rows[0];

    // Oblicz wartości odżywcze
    const qty = parseFloat(quantity_g);
    const kcal = Math.round((product.kcal_100 * qty / 100) * 10) / 10;
    const protein = Math.round((product.protein_100 * qty / 100) * 10) / 10;
    const carbs = Math.round((product.carbs_100 * qty / 100) * 10) / 10;
    const fat = Math.round((product.fat_100 * qty / 100) * 10) / 10;

    res.status(201).json({
      item: {
        ...item,
        product_name: product.name,
        product_brand: product.category,
        kcal_100: product.kcal_100,
        protein_100: product.protein_100,
        carbs_100: product.carbs_100,
        fat_100: product.fat_100,
        kcal,
        protein,
        carbs,
        fat,
      },
    });
  } catch (err) {
    next(err);
  }
}

// Aktualizuj ilość produktu w posiłku
async function updateMealItem(req, res, next) {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { quantity_g } = req.body;

    if (!quantity_g) {
      return res.status(400).json({ message: 'Brak ilości (quantity_g)' });
    }

    // Sprawdź czy item należy do użytkownika
    const itemCheck = await db.query(
      `SELECT mi.id, mi.product_id, m.user_id
       FROM meal_items mi
       JOIN meals m ON m.id = mi.meal_id
       WHERE mi.id = $1`,
      [id]
    );

    if (itemCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Element nie znaleziony' });
    }

    if (itemCheck.rows[0].user_id !== userId) {
      return res.status(403).json({ message: 'Brak uprawnień' });
    }

    // Aktualizuj ilość
    const result = await db.query(
      `UPDATE meal_items SET quantity_g = $1 WHERE id = $2
       RETURNING id, meal_id, product_id, quantity_g`,
      [quantity_g, id]
    );

    // Pobierz dane produktu
    const product = await db.query(
      `SELECT name, category, kcal_100, protein_100, carbs_100, fat_100 FROM products WHERE id = $1`,
      [result.rows[0].product_id]
    );

    const p = product.rows[0];
    const qty = parseFloat(quantity_g);

    res.json({
      item: {
        ...result.rows[0],
        product_name: p.name,
        product_brand: p.category,
        kcal: Math.round((p.kcal_100 * qty / 100) * 10) / 10,
        protein: Math.round((p.protein_100 * qty / 100) * 10) / 10,
        carbs: Math.round((p.carbs_100 * qty / 100) * 10) / 10,
        fat: Math.round((p.fat_100 * qty / 100) * 10) / 10,
      },
    });
  } catch (err) {
    next(err);
  }
}

// Usuń produkt z posiłku
async function removeMealItem(req, res, next) {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // Sprawdź czy item należy do użytkownika
    const itemCheck = await db.query(
      `SELECT mi.id, m.user_id
       FROM meal_items mi
       JOIN meals m ON m.id = mi.meal_id
       WHERE mi.id = $1`,
      [id]
    );

    if (itemCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Element nie znaleziony' });
    }

    if (itemCheck.rows[0].user_id !== userId) {
      return res.status(403).json({ message: 'Brak uprawnień' });
    }

    await db.query(`DELETE FROM meal_items WHERE id = $1`, [id]);

    res.json({ message: 'Produkt usunięty z posiłku' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  addItemToMeal,
  updateMealItem,
  removeMealItem,
};





