require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pool = require('./db/db');
const bodyParser = require('body-parser');
const authRoutes = require('./routes/auth');
const costRoutes = require('./routes/costs');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Conexión a la base de datos
(async () => {
  try {
    const res = await pool.query('SELECT NOW()');
    console.log('Successful database connection, server time:', res.rows[0].now);
  } catch (err) {
    console.error('Error connecting to the database:', err);
    process.exit(1); // Exit with error code
  }
})();

// Usar las rutas de autenticación
app.use('/api/auth', authRoutes);

// Usar las rutas de cálculo de costos
app.use('/api/costs', costRoutes);

// Iniciar el servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
