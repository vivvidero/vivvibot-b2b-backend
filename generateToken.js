require('dotenv').config();
const jwt = require('jsonwebtoken');

// Función para generar un token
const generateToken = (user) => {
  // Información del usuario que se incluirá en el token
  const payload = {
    id: user.id,
    username: user.username
  };

  // Opciones del token
  const options = {
    expiresIn: '1d' // El token expirará en 1 hora
  };

  // Generar el token
  const token = jwt.sign(payload, process.env.SECRET_KEY, options);
  return token;
};

// Ejemplo de uso
const user = {
  id: 1,
  username: 'exampleUser'
};

const token = generateToken(user);
console.log('Generated Token:', token);