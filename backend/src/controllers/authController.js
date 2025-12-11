const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const db = require('../config/db');

dotenv.config();

const SALT_ROUNDS = 10;

function generateToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
  );
}

async function register(req, res, next) {
  try {
    const { email, password, username } = req.body;

    if (!email || !password || !username) {
      return res.status(400).json({ message: 'Brak wymaganych danych' });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: 'Hasło musi mieć minimum 8 znaków' });
    }

    const existing = await db.query(
      'SELECT id FROM users WHERE email = $1 OR username = $2',
      [email, username]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({
        message: 'Użytkownik z takim email lub username już istnieje',
      });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const insertQuery = `
      INSERT INTO users (
        email,
        password_hash,
        username,
        role,
        created_at
      )
      VALUES ($1, $2, $3, 'user', NOW())
      RETURNING
        id,
        email,
        username,
        role,
        gender,
        age_years,
        height_cm,
        weight_kg,
        activity_level,
        goal_type,
        daily_kcal_target,
        daily_steps_target,
        daily_protein_target_g,
        daily_carbs_target_g,
        daily_fat_target_g;
    `;

    const result = await db.query(insertQuery, [email, passwordHash, username]);
    const user = result.rows[0];

    const token = generateToken(user);

    res.status(201).json({ token, user });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Podaj email i hasło' });
    }

    const result = await db.query(
      `SELECT
         id,
         email,
         username,
         password_hash,
         gender,
         age_years,
         height_cm,
         weight_kg,
         activity_level,
         goal_type,
         daily_kcal_target,
         daily_steps_target,
         daily_protein_target_g,
         daily_carbs_target_g,
         daily_fat_target_g,
         role
       FROM users
       WHERE email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Nieprawidłowy email lub hasło' });
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);

    if (!valid) {
      return res.status(401).json({ message: 'Nieprawidłowy email lub hasło' });
    }

    delete user.password_hash;

    const token = generateToken(user);
    res.json({ token, user });
  } catch (err) {
    next(err);
  }
}


async function me(req, res, next) {
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
         daily_steps_target,
         daily_protein_target_g,
         daily_carbs_target_g,
         daily_fat_target_g,
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

module.exports = { register, login, me };
