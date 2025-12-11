const db = require('../config/db');
const bcrypt = require('bcrypt');

// Pobiera dane poziomu aktywności z bazy danych
async function getActivityLevelData(activityLevelCode) {
  const result = await db.query(
    'SELECT tdee_factor, steps_target FROM activity_levels WHERE code = $1',
    [activityLevelCode]
  );
  
  if (result.rows.length === 0) {
    // Fallback jeśli nie znaleziono
    return { tdee_factor: 1.2, steps_target: 7000 };
  }
  
  return result.rows[0];
}

// Oblicza cele dzienne na podstawie danych użytkownika
async function calculateTargets({
  gender,
  age_years,
  height_cm,
  weight_kg,
  activity_level,
  goal_type,
}) {
  const age = Number(age_years);
  const height = Number(height_cm);
  const weight = Number(weight_kg);

  if (!age || !height || !weight) {
    throw new Error('Nieprawidłowe dane profilu (wiek / wzrost / waga)');
  }

  // Oblicz BMR (Basal Metabolic Rate) - wzór Mifflin-St Jeor
  let bmr;
  if (gender === 'male') {
    bmr = 10 * weight + 6.25 * height - 5 * age + 5;
  } else {
    bmr = 10 * weight + 6.25 * height - 5 * age - 161;
  }

  // Pobierz współczynnik aktywności i cel kroków z bazy danych
  const activityData = await getActivityLevelData(activity_level);
  const factor = Number(activityData.tdee_factor) || 1.2;
  const dailyStepsTarget = activityData.steps_target || 7000;

  // Oblicz TDEE (Total Daily Energy Expenditure)
  let tdee = bmr * factor;

  // Modyfikuj TDEE w zależności od celu
  if (goal_type === 'lose') {
    tdee -= 400;
  } else if (goal_type === 'gain') {
    tdee += 300;
  }

  const dailyKcalTarget = Math.round(tdee / 10) * 10;

  // Rozkład makroskładników w zależności od celu
  let proteinPct, fatPct, carbsPct;

  if (goal_type === 'lose') {
    proteinPct = 0.30;
    fatPct = 0.30;
    carbsPct = 0.40;
  } else if (goal_type === 'gain') {
    proteinPct = 0.20;
    fatPct = 0.30;
    carbsPct = 0.50;
  } else {
    proteinPct = 0.25;
    fatPct = 0.25;
    carbsPct = 0.50;
  }

  const kcalProtein = dailyKcalTarget * proteinPct;
  const kcalFat = dailyKcalTarget * fatPct;
  const kcalCarbs = dailyKcalTarget * carbsPct;

  const dailyProteinTargetG = Math.round((kcalProtein / 4) * 10) / 10;
  const dailyFatTargetG = Math.round((kcalFat / 9) * 10) / 10;
  const dailyCarbsTargetG = Math.round((kcalCarbs / 4) * 10) / 10;

  return {
    dailyKcalTarget,
    dailyStepsTarget,
    dailyProteinTargetG,
    dailyCarbsTargetG,
    dailyFatTargetG,
  };
}

async function getProfile(req, res, next) {
  try {
    const userId = req.user.id;

    const result = await db.query(
      `SELECT
         id,
         email,
         username,
         gender,
         age_years,
         height_cm,
         weight_kg,
         activity_level,
         goal_type,
         daily_kcal_target,
         daily_protein_target_g,
         daily_carbs_target_g,
         daily_fat_target_g,
         daily_steps_target,
         role
       FROM users
       WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Użytkownik nie istnieje' });
    }

    res.json({ user: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

async function updateProfile(req, res, next) {
  try {
    const userId = req.user.id;
    const {
      gender,
      age_years,
      height_cm,
      weight_kg,
      activity_level,
      goal_type,
    } = req.body;

    if (
      !gender ||
      !age_years ||
      !height_cm ||
      !weight_kg ||
      !activity_level ||
      !goal_type
    ) {
      return res.status(400).json({ message: 'Brak wymaganych danych profilu' });
    }

    // Sprawdź czy podany activity_level istnieje w bazie
    const activityCheck = await db.query(
      'SELECT code FROM activity_levels WHERE code = $1',
      [activity_level]
    );
    if (activityCheck.rows.length === 0) {
      return res.status(400).json({ message: 'Nieprawidłowy poziom aktywności' });
    }

    const {
      dailyKcalTarget,
      dailyStepsTarget,
      dailyProteinTargetG,
      dailyCarbsTargetG,
      dailyFatTargetG,
    } = await calculateTargets({
      gender,
      age_years,
      height_cm,
      weight_kg,
      activity_level,
      goal_type,
    });

    const result = await db.query(
      `UPDATE users
       SET
         gender = $1,
         age_years = $2,
         height_cm = $3,
         weight_kg = $4,
         activity_level = $5,
         goal_type = $6,
         daily_kcal_target = $7,
         daily_steps_target = $8,
         daily_protein_target_g = $9,
         daily_carbs_target_g = $10,
         daily_fat_target_g = $11
       WHERE id = $12
       RETURNING
         id,
         email,
         username,
         gender,
         age_years,
         height_cm,
         weight_kg,
         activity_level,
         goal_type,
         daily_kcal_target,
         daily_protein_target_g,
         daily_carbs_target_g,
         daily_fat_target_g,
         daily_steps_target,
         role`,
      [
        gender,
        age_years,
        height_cm,
        weight_kg,
        activity_level,
        goal_type,
        dailyKcalTarget,
        dailyStepsTarget,
        dailyProteinTargetG,
        dailyCarbsTargetG,
        dailyFatTargetG,
        userId,
      ]
    );

    res.json({ user: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

// Pobierz dostępne poziomy aktywności (dla frontendu)
async function getActivityLevels(req, res, next) {
  try {
    const result = await db.query(
      'SELECT code, label_pl, description, tdee_factor, steps_target FROM activity_levels ORDER BY tdee_factor'
    );
    res.json({ activityLevels: result.rows });
  } catch (err) {
    next(err);
  }
}

// Usuń konto użytkownika
async function deleteAccount(req, res, next) {
  try {
    const userId = req.user.id;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ message: 'Hasło jest wymagane' });
    }

    // Pobierz hasło użytkownika
    const userResult = await db.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'Użytkownik nie znaleziony' });
    }

    // Sprawdź hasło
    const isMatch = await bcrypt.compare(password, userResult.rows[0].password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Nieprawidłowe hasło' });
    }

    // Usuń powiązane dane
    await db.query('DELETE FROM meal_items WHERE meal_id IN (SELECT id FROM meals WHERE user_id = $1)', [userId]);
    await db.query('DELETE FROM meals WHERE user_id = $1', [userId]);
    await db.query('DELETE FROM steps_log WHERE user_id = $1', [userId]);
    await db.query('DELETE FROM product_favorites WHERE user_id = $1', [userId]);
    await db.query('DELETE FROM products WHERE added_by_user_id = $1', [userId]);

    // Usuń konto
    await db.query('DELETE FROM users WHERE id = $1', [userId]);

    res.json({ message: 'Konto zostało usunięte' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getProfile,
  updateProfile,
  deleteAccount,
  getActivityLevels,
};
