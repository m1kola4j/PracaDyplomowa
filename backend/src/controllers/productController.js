const db = require('../config/db');

function validateProductMacrosAndCalories({ kcal_100, protein_100, carbs_100, fat_100 }) {
  const p = Number(protein_100);
  const c = Number(carbs_100);
  const f = Number(fat_100);
  const kcal = Number(kcal_100);

  if (
    [p, c, f, kcal].some((v) => Number.isNaN(v)) ||
    p < 0 || c < 0 || f < 0 || kcal < 0
  ) {
    return 'Wszystkie wartości odżywcze muszą być nieujemnymi liczbami.';
  }

  if (p > 100 || c > 100 || f > 100) {
    return 'Białko, węglowodany i tłuszcz muszą być w zakresie 0–100 g na 100 g produktu.';
  }

  if (p + c + f > 100) {
    return 'Suma białka, węglowodanów i tłuszczu nie może przekraczać 100 g na 100 g produktu.';
  }

  const kcalFromMacros = p * 4 + c * 4 + f * 9;
  const minKcal = kcalFromMacros * 0.7;
  const maxKcal = kcalFromMacros * 1.3;

  if (kcal < minKcal || kcal > maxKcal) {
    return 'Podana liczba kalorii jest niespójna z wartościami makroskładników.';
  }

  return null;
}

async function getAllProducts(req, res, next) {
  try {
    const { search, limit = 50, offset = 0 } = req.query;

    let query;
    let params;

    if (search && search.trim() !== '') {
      query = `
        SELECT id, name, category, kcal_100, protein_100, carbs_100, fat_100, added_by_user_id, is_verified, created_at
        FROM products
        WHERE LOWER(name) LIKE LOWER($1) OR LOWER(category) LIKE LOWER($1)
        ORDER BY is_verified DESC, name ASC
        LIMIT $2 OFFSET $3
      `;
      params = [`%${search.trim()}%`, parseInt(limit), parseInt(offset)];
    } else {
      query = `
        SELECT id, name, category, kcal_100, protein_100, carbs_100, fat_100, added_by_user_id, is_verified, created_at
        FROM products
        ORDER BY is_verified DESC, name ASC
        LIMIT $1 OFFSET $2
      `;
      params = [parseInt(limit), parseInt(offset)];
    }

    const result = await db.query(query, params);

    let countQuery;
    let countParams;

    if (search && search.trim() !== '') {
      countQuery = `SELECT COUNT(*) FROM products WHERE LOWER(name) LIKE LOWER($1) OR LOWER(category) LIKE LOWER($1)`;
      countParams = [`%${search.trim()}%`];
    } else {
      countQuery = `SELECT COUNT(*) FROM products`;
      countParams = [];
    }

    const countResult = await db.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    res.json({
      products: result.rows,
      total,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (err) {
    next(err);
  }
}

// Pobierz pojedynczy produkt po ID
async function getProductById(req, res, next) {
  try {
    const { id } = req.params;

    const result = await db.query(
      `SELECT id, name, category, kcal_100, protein_100, carbs_100, fat_100, added_by_user_id, is_verified, created_at
       FROM products
       WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Produkt nie znaleziony' });
    }

    res.json({ product: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

// Dodaj nowy produkt (przez użytkownika)
async function createProduct(req, res, next) {
  try {
    const userId = req.user.id;
    const { name, category, kcal_100, protein_100, carbs_100, fat_100 } = req.body;

    // Sprawdź czy użytkownik istnieje w bazie
    const userCheck = await db.query('SELECT id FROM users WHERE id = $1', [userId]);
    if (userCheck.rows.length === 0) {
      return res.status(401).json({ message: 'Sesja wygasła. Wyloguj się i zaloguj ponownie.' });
    }

    if (!name || kcal_100 === undefined || protein_100 === undefined || carbs_100 === undefined || fat_100 === undefined) {
      return res.status(400).json({ message: 'Brak wymaganych danych (nazwa, kalorie, białko, węglowodany, tłuszcz)' });
    }

    const validationError = validateProductMacrosAndCalories({
      kcal_100,
      protein_100,
      carbs_100,
      fat_100,
    });

    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const result = await db.query(
      `INSERT INTO products (name, category, kcal_100, protein_100, carbs_100, fat_100, added_by_user_id, is_verified, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, false, NOW())
       RETURNING id, name, category, kcal_100, protein_100, carbs_100, fat_100, added_by_user_id, is_verified, created_at`,
      [name, category || null, kcal_100, protein_100, carbs_100, fat_100, userId]
    );

    res.status(201).json({ product: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

// Aktualizuj produkt (tylko własne lub admin)
async function updateProduct(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    const { name, category, kcal_100, protein_100, carbs_100, fat_100 } = req.body;

    const existingProduct = await db.query('SELECT * FROM products WHERE id = $1', [id]);

    if (existingProduct.rows.length === 0) {
      return res.status(404).json({ message: 'Produkt nie znaleziony' });
    }

    const product = existingProduct.rows[0];

    if (product.added_by_user_id !== userId && userRole !== 'admin') {
      return res.status(403).json({ message: 'Brak uprawnień do edycji tego produktu' });
    }

    const updatedMacros = {
      kcal_100: kcal_100 !== undefined ? kcal_100 : product.kcal_100,
      protein_100: protein_100 !== undefined ? protein_100 : product.protein_100,
      carbs_100: carbs_100 !== undefined ? carbs_100 : product.carbs_100,
      fat_100: fat_100 !== undefined ? fat_100 : product.fat_100,
    };

    const validationError = validateProductMacrosAndCalories(updatedMacros);
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const result = await db.query(
      `UPDATE products
       SET name = COALESCE($1, name),
           category = COALESCE($2, category),
           kcal_100 = COALESCE($3, kcal_100),
           protein_100 = COALESCE($4, protein_100),
           carbs_100 = COALESCE($5, carbs_100),
           fat_100 = COALESCE($6, fat_100)
       WHERE id = $7
       RETURNING id, name, category, kcal_100, protein_100, carbs_100, fat_100, added_by_user_id, is_verified, created_at`,
      [name, category, updatedMacros.kcal_100, updatedMacros.protein_100, updatedMacros.carbs_100, updatedMacros.fat_100, id]
    );

    res.json({ product: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

// Usuń produkt (tylko własne lub admin)
async function deleteProduct(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const existingProduct = await db.query('SELECT * FROM products WHERE id = $1', [id]);

    if (existingProduct.rows.length === 0) {
      return res.status(404).json({ message: 'Produkt nie znaleziony' });
    }

    const product = existingProduct.rows[0];

    if (product.added_by_user_id !== userId && userRole !== 'admin') {
      return res.status(403).json({ message: 'Brak uprawnień do usunięcia tego produktu' });
    }

    await db.query('DELETE FROM products WHERE id = $1', [id]);

    res.json({ message: 'Produkt usunięty' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  validateProductMacrosAndCalories,
};
