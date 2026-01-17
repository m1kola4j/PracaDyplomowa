const db = require('../config/db');

// Pobierz statystyki dla dashboardu
async function getDashboardStats(req, res, next) {
  try {
    const usersCount = await db.query('SELECT COUNT(*) FROM users');
    const productsCount = await db.query('SELECT COUNT(*) FROM products');
    const tipsCount = await db.query('SELECT COUNT(*) FROM tips WHERE is_active = true');
    const mealsCount = await db.query('SELECT COUNT(*) FROM meals');
    
    res.json({
      stats: {
        users: parseInt(usersCount.rows[0].count),
        products: parseInt(productsCount.rows[0].count),
        tips: parseInt(tipsCount.rows[0].count),
        meals: parseInt(mealsCount.rows[0].count),
      }
    });
  } catch (err) {
    next(err);
  }
}

// Pobierz liste wszystkich uzytkownikow
async function getAllUsers(req, res, next) {
  try {
    const result = await db.query(
      `SELECT id, username, email, role, gender, age_years, created_at
       FROM users
       ORDER BY created_at DESC`
    );
    res.json({ users: result.rows });
  } catch (err) {
    next(err);
  }
}

// Pobierz pojedynczego uzytkownika
async function getUserById(req, res, next) {
  try {
    const { id } = req.params;
    const result = await db.query(
      `SELECT id, username, email, role, gender, age_years, height_cm, weight_kg,
              activity_level, goal_type, daily_kcal_target, daily_steps_target,
              daily_protein_target_g, daily_carbs_target_g, daily_fat_target_g, created_at
       FROM users
       WHERE id = $1`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Uzytkownik nie znaleziony' });
    }
    
    res.json({ user: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

// Aktualizuj role uzytkownika
async function updateUserRole(req, res, next) {
  try {
    const { id } = req.params;
    const { role } = req.body;
    
    if (!role || !['user', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Nieprawidlowa rola' });
    }
    
    // Nie pozwol adminowi zmieniac swojej roli
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ message: 'Nie mozesz zmienic swojej wlasnej roli' });
    }
    
    const result = await db.query(
      `UPDATE users SET role = $1 WHERE id = $2 RETURNING id, username, email, role`,
      [role, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Uzytkownik nie znaleziony' });
    }
    
    res.json({ user: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

// Usun uzytkownika
async function deleteUser(req, res, next) {
  try {
    const { id } = req.params;
    
    // Nie pozwol adminowi usunac siebie
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ message: 'Nie mozesz usunac swojego konta' });
    }
    
    // Usun powiazane dane
    await db.query('DELETE FROM meal_items WHERE meal_id IN (SELECT id FROM meals WHERE user_id = $1)', [id]);
    await db.query('DELETE FROM meals WHERE user_id = $1', [id]);
    await db.query('DELETE FROM steps_log WHERE user_id = $1', [id]);
    await db.query('DELETE FROM product_favorites WHERE user_id = $1', [id]);
    await db.query('DELETE FROM products WHERE added_by_user_id = $1', [id]);
    
    const result = await db.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Uzytkownik nie znaleziony' });
    }
    
    res.json({ message: 'Uzytkownik usuniety' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getDashboardStats,
  getAllUsers,
  getUserById,
  updateUserRole,
  deleteUser,
};







