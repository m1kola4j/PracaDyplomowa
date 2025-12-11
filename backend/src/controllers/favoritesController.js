const db = require('../config/db');

// Pobierz ulubione produkty uzytkownika
async function getFavorites(req, res, next) {
  try {
    const userId = req.user.id;
    
    const result = await db.query(
      `SELECT p.id, p.name, p.category, p.kcal_100, p.protein_100, p.carbs_100, p.fat_100, pf.created_at as favorited_at
       FROM product_favorites pf
       JOIN products p ON pf.product_id = p.id
       WHERE pf.user_id = $1
       ORDER BY pf.created_at DESC`,
      [userId]
    );
    
    res.json({ favorites: result.rows });
  } catch (err) {
    next(err);
  }
}

// Pobierz liste ID ulubionych produktow (do szybkiego sprawdzania)
async function getFavoriteIds(req, res, next) {
  try {
    const userId = req.user.id;
    
    const result = await db.query(
      'SELECT product_id FROM product_favorites WHERE user_id = $1',
      [userId]
    );
    
    const ids = result.rows.map(row => row.product_id);
    res.json({ favoriteIds: ids });
  } catch (err) {
    next(err);
  }
}

// Dodaj do ulubionych
async function addFavorite(req, res, next) {
  try {
    const userId = req.user.id;
    const { productId } = req.params;
    
    // Sprawdz czy produkt istnieje
    const product = await db.query('SELECT id FROM products WHERE id = $1', [productId]);
    if (product.rows.length === 0) {
      return res.status(404).json({ message: 'Produkt nie znaleziony' });
    }
    
    // Sprawdz czy juz nie jest w ulubionych
    const existing = await db.query(
      'SELECT id FROM product_favorites WHERE user_id = $1 AND product_id = $2',
      [userId, productId]
    );
    
    if (existing.rows.length > 0) {
      return res.status(400).json({ message: 'Produkt juz jest w ulubionych' });
    }
    
    await db.query(
      'INSERT INTO product_favorites (user_id, product_id) VALUES ($1, $2)',
      [userId, productId]
    );
    
    res.status(201).json({ message: 'Dodano do ulubionych' });
  } catch (err) {
    next(err);
  }
}

// Usun z ulubionych
async function removeFavorite(req, res, next) {
  try {
    const userId = req.user.id;
    const { productId } = req.params;
    
    const result = await db.query(
      'DELETE FROM product_favorites WHERE user_id = $1 AND product_id = $2 RETURNING id',
      [userId, productId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Produkt nie byl w ulubionych' });
    }
    
    res.json({ message: 'Usunieto z ulubionych' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getFavorites,
  getFavoriteIds,
  addFavorite,
  removeFavorite,
};





