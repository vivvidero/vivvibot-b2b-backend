const express = require('express');
const verifyToken = require('../middleware/verifyToken');
const pool = require('../db/db');

const router = express.Router();

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

const saveCalculations = async (userId, clientId, results) => {
  const client = await pool.connect();
  try {
    await Promise.all(
      Object.keys(results).map(async (area) => {
        if (area !== 'total' && results[area].cost !== 'Area no hallada en la base de datos') {
          console.log(`Saving calculation: userId=${userId}, clientId=${clientId}, area=${area}, squareMeters=${results[area].squareMeters}, cost=${results[area].cost}`);
          await client.query(
            'INSERT INTO calculations (user_id, client_id, area, square_meters, cost) VALUES ($1, $2, $3, $4, $5)',
            [userId, clientId, area, results[area].squareMeters, results[area].cost]
          );
        }
      })
    );
  } catch (err) {
    console.error('Error saving calculations:', err);
    throw err;
  } finally {
    client.release();
  }
};

// Actualiza la ruta para el cálculo de costos
router.post('/calculate', verifyToken, async (req, res) => {
  const { clientId, square_meters } = req.body;

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

    console.log(`Calculated results: ${JSON.stringify(results)}`);

    // Guardar los cálculos en la base de datos
    await saveCalculations(userId, clientId, results);

    res.json(results);
  } catch (error) {
    console.error('Error calculating costs:', error);
    res.status(500).json({ error: 'Error calculating costs' });
  }
});


module.exports = router;
