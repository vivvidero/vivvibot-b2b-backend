const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db/db');

const router = express.Router();

// Ruta para obtener las incidences desde la base de datos
router.get('/data', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM incidence');
    const incidences = result.rows.reduce((acc, row) => {
      acc[row.area] = row.incidence;
      return acc;
    }, {});

    //console.log('Incidencias obtenidas:', incidences);

    res.json(incidences);
  } catch (err) {
    console.error('Error al obtener incidences:', err);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// Rutas de autenticación (registro e inicio de sesión)
router.post('/register', async (req, res) => {
  const { username, password } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.query('INSERT INTO users (username, password) VALUES ($1, $2)', [username, hashedPassword]);
    res.status(201).json({ message: 'Usuario registrado exitosamente' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const result = await pool.query('SELECT id, password FROM users WHERE username = $1', [username]);

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Usuario no encontrado' });
    }

    const user = result.rows[0];
    const storedPassword = user.password;
    const isMatch = await bcrypt.compare(password, storedPassword);

    if (isMatch) {
      const payload = { id: user.id, username };
      const token = jwt.sign(payload, process.env.SECRET_KEY, { expiresIn: '1h' });

      res.status(200).json({ message: 'Login exitoso', token });
    } else {
      res.status(401).json({ message: 'Contraseña incorrecta' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

module.exports = router;

