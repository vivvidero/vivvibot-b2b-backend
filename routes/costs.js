const express = require('express');
const pool = require('../db/db');
const verifyToken = require('../middleware/verifyToken'); // Importar el middleware
const router = express.Router();

// Obtener los costos desde la base de datos
const getCosts = async () => {
  const client = await pool.connect();
  try {
    const res = await client.query('SELECT area, price FROM costs');
    const costs = {};
    res.rows.forEach(row => {
      costs[row.area] = Math.round(row.price); // Redondear al valor más cercano
    });
    return costs;
  } finally {
    client.release();
  }
};

// Ruta POST para calcular los costos
router.post('/calculate', verifyToken, async (req, res) => {
  const { square_meters } = req.body;

  try {
    const costs = await getCosts();
    const results = {};
    let total = 0;

    for (const area in square_meters) {
      if (costs[area]) {
        const cost = costs[area] * square_meters[area];
        results[area] = cost;
        total += cost;
      } else {
        results[area] = "Area not found in database";
      }
    }

    results['total'] = total;
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: 'Error calculating costs' });
  }
});

module.exports = router;
