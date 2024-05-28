require('dotenv').config();
const express = require('express');
const pool = require('./db/db');
const bodyParser = require('body-parser');
const authRoutes = require('./routes/auth');

const app = express();
app.use(bodyParser.json());

// Conexión a la base de datos
(async () => {
    try {
      const res = await pool.query('SELECT NOW()');
      console.log('Conexión a la base de datos exitosa, hora del servidor:', res.rows[0].now);
    } catch (err) {
      console.error('Error al conectar con la base de datos:', err);
      process.exit(1); // Salir con código de error
    }
  })();

// Usar las rutas de autenticación
app.use('/api', authRoutes);

// Iniciar el servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});