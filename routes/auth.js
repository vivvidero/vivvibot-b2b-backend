require('dotenv').config();
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db/db');
const verifyToken = require('../middleware/verifyToken');
const hubspot = require('@hubspot/api-client');

const router = express.Router();

// Ruta para obtener las incidences desde la base de datos
router.get('/data', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM incidence');
    const incidences = result.rows.reduce((acc, row) => {
      acc[row.area] = row.incidence;
      return acc;
    }, {});

    res.json(incidences);
  } catch (err) {
    console.error('Error al obtener incidences:', err);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// Rutas de autenticación (registro e inicio de sesión)
router.post('/register', async (req, res) => {
  let { username, password } = req.body;

  try {
    // Convertir el nombre de usuario a minúsculas
    username = username.toLowerCase();

    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.query('INSERT INTO users (username, password, onboarding) VALUES ($1, $2, $3)', [username, hashedPassword, false]);
    res.status(201).json({ message: 'Usuario registrado exitosamente' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

//Ruta para realizar el login
router.post('/login', async (req, res) => {
  let { username, password } = req.body;

  try {
    // Convertir el nombre de usuario a minúsculas
    username = username.toLowerCase();

    const result = await pool.query('SELECT id, password, onboarding FROM users WHERE username = $1', [username]);

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Usuario no encontrado' });
    }

    const user = result.rows[0];
    const storedPassword = user.password;
    const isMatch = await bcrypt.compare(password, storedPassword);

    if (isMatch) {
      const payload = { id: user.id, username, onboarding: user.onboarding };
      const token = jwt.sign(payload, process.env.SECRET_KEY, { expiresIn: '1d' });

      res.status(200).json({ message: 'Login exitoso', token, onboarding: user.onboarding, user_id: user.id });
    } else {
      res.status(401).json({ message: 'Contraseña incorrecta' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

//Ruta para obtener el estado de onboarding
router.get('/onboarding', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await pool.query('SELECT onboarding FROM users WHERE id = $1', [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    res.status(200).json({ onboarding: result.rows[0].onboarding });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

//Ruta para actualizar el estado de onboarding
router.post('/onboarding', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id; // Obtener el ID del usuario desde el token
    await pool.query('UPDATE users SET onboarding = TRUE WHERE id = $1', [userId]);

    res.status(200).json({ message: 'Onboarding completed updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error updating onboarding status' });
  }
});

// Crear un cliente para interactuar con la API de HubSpot
const hubspotClient = new hubspot.Client({ accessToken: process.env.HUBSPOT_ACCESS_TOKEN });

// Ruta para guardar datos del comprador
router.post('/buyer', verifyToken, async (req, res) => {
  const { name, email, phone, location } = req.body;

  try {
    // Validar que todos los campos estén presentes en la solicitud
    if (!name || !email || !phone || !location) {
      return res.status(400).json({ success: false, errorMessage: "Todos los campos son obligatorios" });
    }

    const contactId = email;
    const properties = ["firstname", "lastname"];
    const propertiesWithHistory = undefined;
    const associations = undefined;
    const archived = false;
    const idProperty = "email";

    let apiResponse;
    try {
      apiResponse = await hubspotClient.crm.contacts.basicApi.getById(
        contactId,
        properties,
        propertiesWithHistory,
        associations,
        archived,
        idProperty
      );
    } catch (error) {
      apiResponse = false;
    }

    try {
      // Insertar los datos en HubSpot
      if (apiResponse.id) {
        // El contacto existe en HubSpot, actualizamos las propiedades
        const contactId = apiResponse.id;
        const properties = {
          firstname: name,
          phone: phone,
          city: location,
          source: 'Vivvibot-B2B'
        };
        await hubspotClient.crm.contacts.basicApi.update(contactId, { properties });
      } else {
        // El contacto no existe en HubSpot, lo creamos
        const hubspotContact = {
          properties: {
            firstname: name,
            email: email,
            phone: phone,
            city: location,
            source: 'Vivvibot-B2B'
          }
        };
        await hubspotClient.crm.contacts.basicApi.create(hubspotContact);
      }

      // Enviamos la respuesta después de todas las operaciones
      res.status(201).json({ message: 'Client created successfully' });
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: 'Server error' });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Server error' });
  }
});



module.exports = router;
