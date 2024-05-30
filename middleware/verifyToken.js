const jwt = require('jsonwebtoken');

function verifyToken(req, res, next) {
  const token = req.headers['authorization'];

  console.log('Token recibido:', token); // Imprimir el token recibido

  if (!token) {
    return res.status(401).json({ message: 'Token no proporcionado' });
  }

  const tokenParts = token.split(' ');
  const tokenValue = tokenParts[1];

  // Verificar el token utilizando la variable de entorno SECRET_KEY
  jwt.verify(tokenValue, process.env.SECRET_KEY, (err, decoded) => {
    if (err) {
      // Verificar si res es un objeto válido antes de llamar a res.status
      if (res && res.status) {
        return res.status(403).json({ message: 'Token inválido' });
      } else {
        // Si res no es un objeto válido, simplemente llamamos a next con el error
        return next(err);
      }
    }
    // Si el token es válido, adjunta el usuario decodificado al objeto de solicitud
    req.user = decoded;
    next();
  });
}

module.exports = verifyToken;
