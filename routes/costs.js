const express = require('express');
const pool = require('../db/db');
const verifyToken = require('../middleware/verifyToken');
const router = express.Router();

// Obtener los costos desde la base de datos
const getCosts = async () => {
  const client = await pool.connect();
  try {
    const res = await client.query('SELECT area, price FROM costs');
    const costs = {};
    res.rows.forEach(row => {
      costs[row.area] = row.price;
    });
    return costs;
  } finally {
    client.release();
  }
};

// Guardar los cálculos en la base de datos
const saveCalculations = async (userId, calculations) => {
  const client = await pool.connect();
  try {
    const queryText = 'INSERT INTO calculations (user_id, area, square_meters, cost, timestamp) VALUES ($1, $2, $3, $4, NOW()::TIMESTAMP(0))';
    for (const area in calculations) {
      if (area !== 'total') {
        const { squareMeters, cost } = calculations[area];
        await client.query(queryText, [userId, area, squareMeters, Number(cost.toFixed(2))]);
      }
    }
  } finally {
    client.release();
  }
};

router.post('/calculate', verifyToken, async (req, res) => {
  const { square_meters } = req.body;

  try {
    const costs = await getCosts();
    const userId = req.user.id;
    const results = {};
    let total = 0;

    for (const area in square_meters) {
      if (costs[area]) {
        const cost = costs[area] * square_meters[area];
        results[area] = {
          squareMeters: square_meters[area],
          cost: Number(cost.toFixed(2))
        };
        total += cost;
      } else {
        results[area] = {
          squareMeters: square_meters[area],
          cost: "Area no hallada en la base de datos"
        };
      }
    }

    results['total'] = Number(total.toFixed(2));

    // Guardar los cálculos en la base de datos
    await saveCalculations(userId, results);

    res.json(results);
  } catch (error) {
    res.status(500).json({ error: 'Error calculando costos' });
  }
});

module.exports = router;


