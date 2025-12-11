const db = require('../config/db');

// Kategorie porad
const TIP_CATEGORIES = ['nutrition', 'activity', 'goals', 'hydration'];

// Pobierz wszystkie aktywne porady (dla uzytkownikow)
async function getAllTips(req, res, next) {
  try {
    const result = await db.query(
      `SELECT id, title, content, category, created_at
       FROM tips
       WHERE is_active = true
       ORDER BY created_at DESC`
    );
    res.json({ tips: result.rows });
  } catch (err) {
    next(err);
  }
}

// Pobierz porady z konkretnej kategorii
async function getTipsByCategory(req, res, next) {
  try {
    const { category } = req.params;
    
    if (!TIP_CATEGORIES.includes(category)) {
      return res.status(400).json({ message: 'Nieprawidlowa kategoria' });
    }
    
    const result = await db.query(
      `SELECT id, title, content, category, created_at
       FROM tips
       WHERE category = $1 AND is_active = true
       ORDER BY created_at DESC`,
      [category]
    );
    res.json({ tips: result.rows });
  } catch (err) {
    next(err);
  }
}

// Pobierz losowa porade
async function getRandomTip(req, res, next) {
  try {
    const result = await db.query(
      `SELECT id, title, content, category
       FROM tips
       WHERE is_active = true
       ORDER BY RANDOM()
       LIMIT 1`
    );
    
    if (result.rows.length === 0) {
      return res.json({ tip: null });
    }
    
    res.json({ tip: result.rows[0] });
  } catch (err) {
    next(err);
  }
}


// Pobierz wszystkie porady (wlacznie z nieaktywnymi) - dla admina
async function getAllTipsAdmin(req, res, next) {
  try {
    const result = await db.query(
      `SELECT id, title, content, category, is_active, created_at, updated_at
       FROM tips
       ORDER BY created_at DESC`
    );
    res.json({ tips: result.rows });
  } catch (err) {
    next(err);
  }
}

// Pobierz pojedyncza porade - dla admina
async function getTipById(req, res, next) {
  try {
    const { id } = req.params;
    const result = await db.query(
      `SELECT id, title, content, category, is_active, created_at, updated_at
       FROM tips
       WHERE id = $1`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Porada nie znaleziona' });
    }
    
    res.json({ tip: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

// Dodaj nowa porade - dla admina
async function createTip(req, res, next) {
  try {
    const { title, content, category, is_active = true } = req.body;
    
    if (!title || !content || !category) {
      return res.status(400).json({ message: 'Tytul, tresc i kategoria sa wymagane' });
    }
    
    if (!TIP_CATEGORIES.includes(category)) {
      return res.status(400).json({ message: 'Nieprawidlowa kategoria' });
    }
    
    const result = await db.query(
      `INSERT INTO tips (title, content, category, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       RETURNING id, title, content, category, is_active, created_at, updated_at`,
      [title, content, category, is_active]
    );
    
    res.status(201).json({ tip: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

// Aktualizuj porade - dla admina
async function updateTip(req, res, next) {
  try {
    const { id } = req.params;
    const { title, content, category, is_active } = req.body;
    
    // Sprawdz czy porada istnieje
    const existing = await db.query('SELECT id FROM tips WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ message: 'Porada nie znaleziona' });
    }
    
    if (category && !TIP_CATEGORIES.includes(category)) {
      return res.status(400).json({ message: 'Nieprawidlowa kategoria' });
    }
    
    const result = await db.query(
      `UPDATE tips
       SET title = COALESCE($1, title),
           content = COALESCE($2, content),
           category = COALESCE($3, category),
           is_active = COALESCE($4, is_active),
           updated_at = NOW()
       WHERE id = $5
       RETURNING id, title, content, category, is_active, created_at, updated_at`,
      [title, content, category, is_active, id]
    );
    
    res.json({ tip: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

// Usun porade - dla admina
async function deleteTip(req, res, next) {
  try {
    const { id } = req.params;
    
    const result = await db.query(
      'DELETE FROM tips WHERE id = $1 RETURNING id',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Porada nie znaleziona' });
    }
    
    res.json({ message: 'Porada usunieta' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAllTips,
  getTipsByCategory,
  getRandomTip,
  getAllTipsAdmin,
  getTipById,
  createTip,
  updateTip,
  deleteTip,
  TIP_CATEGORIES,
};





