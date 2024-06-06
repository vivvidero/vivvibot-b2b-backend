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

// Guardar los calculos en la BD
const saveCalculations = async (userId, results) => {
  const client = await pool.connect();
  try {
    await Promise.all(
      Object.keys(results).map(async (area) => {
        if (area !== 'total' && results[area].cost !== 'Area no hallada en la base de datos') {
          console.log(`Saving calculation: userId=${userId}, area=${area}, squareMeters=${results[area].squareMeters}, cost=${results[area].cost}`);
          await client.query(
            'INSERT INTO calculations (user_id, area, square_meters, cost) VALUES ($1, $2, $3, $4)',
            [userId, area, results[area].squareMeters, results[area].cost]
          );
        }
      })
    );
  } catch (err) {
    console.error('Error guardando los cálculos:', err);
    throw err;
  } finally {
    client.release();
  }
};

// Ruta para calcular los espacios
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

    console.log(`Calculated results: ${JSON.stringify(results)}`);

    // Guardar los cálculos en la base de datos
    await saveCalculations(userId, results);

    res.json(results);
  } catch (error) {
    console.error('Error calculando costos:', error);
    res.status(500).json({ error: 'Error calculando costos' });
  }
});

//Ruta para guardar el presupuesto del cliente
router.post('/budget', verifyToken, async (req, res) => {
  const { budget } = req.body;
  const userId = req.user.id;

  console.log(budget);

  if (!budget) {
    return res.status(400).json({ message: 'Presupuesto inválido' });
  }

  try {
    const date = new Date();
    const formattedDate = date.toISOString().slice(0, 19).replace('T', ' '); 
    const result = await pool.query(
      'INSERT INTO remodelation_budget (user_id, budget, created_at) VALUES ($1, $2, $3) RETURNING *',
      [userId, parseInt(budget), formattedDate]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error al guardar el presupuesto de remodelación:', err);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

module.exports = router;
