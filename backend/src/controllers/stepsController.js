const db = require('../config/db');

// Zapis lub aktualizacja liczby kroków dla danego dnia
async function addOrUpdateSteps(req, res, next) {
  try {
    const userId = req.user.id;
    const { date, steps } = req.body;

    if (!date || steps === undefined) {
      return res
        .status(400)
        .json({ message: 'Brak daty lub liczby kroków' });
    }

    const stepsNumber = Number(steps);
    if (!Number.isFinite(stepsNumber) || stepsNumber < 0) {
      return res
        .status(400)
        .json({ message: 'Liczba kroków musi być nieujemną liczbą' });
    }

    // Sprawdź, czy istnieje już wpis dla user_id + log_date
    const existing = await db.query(
      'SELECT id FROM steps_log WHERE user_id = $1 AND log_date = $2',
      [userId, date]
    );

    if (existing.rows.length > 0) {
      const result = await db.query(
        `UPDATE steps_log
         SET steps = $1
         WHERE id = $2
         RETURNING id, user_id, log_date, steps, created_at`,
        [stepsNumber, existing.rows[0].id]
      );
      return res.json({ stepsLog: result.rows[0] });
    }

    const result = await db.query(
      `INSERT INTO steps_log (user_id, log_date, steps)
       VALUES ($1, $2, $3)
       RETURNING id, user_id, log_date, steps, created_at`,
      [userId, date, stepsNumber]
    );

    return res.status(201).json({ stepsLog: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

// Pobranie liczby kroków dla konkretnej daty
async function getStepsByDate(req, res, next) {
  try {
    const userId = req.user.id;
    const { date } = req.params;

    if (!date) {
      return res.status(400).json({ message: 'Brak daty' });
    }

    const result = await db.query(
      `SELECT id, user_id, log_date, steps, created_at
       FROM steps_log
       WHERE user_id = $1 AND log_date = $2`,
      [userId, date]
    );

    if (result.rows.length === 0) {
      // Brak wpisu – zwracamy 0 kroków, aby frontend nie musiał specjalnie obsługiwać braku danych
      return res.json({ stepsLog: null, steps: 0 });
    }

    return res.json({ stepsLog: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

// (opcjonalnie) pobranie kroków z zakresu dat, np. do statystyk
async function getStepsRange(req, res, next) {
  try {
    const userId = req.user.id;
    const { from, to } = req.query;

    if (!from || !to) {
      return res
        .status(400)
        .json({ message: 'Brak zakresu dat (from, to)' });
    }

    const result = await db.query(
      `SELECT id, user_id, log_date, steps, created_at
       FROM steps_log
       WHERE user_id = $1
         AND log_date BETWEEN $2 AND $3
       ORDER BY log_date ASC`,
      [userId, from, to]
    );

    return res.json({ items: result.rows });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  addOrUpdateSteps,
  getStepsByDate,
  getStepsRange,
};



