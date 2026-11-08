const jwt = require('jsonwebtoken');

// La llave se lee de la variable de entorno JWT_SECRET (ver config.js)
const secret_key = require('../config').jwtSecret;
function verifyToken(req, res, next) {
    // 1. Obtener el token de la cabecera de la petición
    // El formato esperado es: Authorization: Bearer <token>
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(403).json({ 
            message: 'Acceso denegado. No se proporcionó Token.' 
        });
    }

    const token = authHeader.split(' ')[1]; // Extrae el token de "Bearer <token>"

    // 2. Verificar el token
    try {
        const decoded = jwt.verify(token, secret_key);
        // El payload decodificado (que contiene el correo) se añade a la request
        console.log("Todo chido");
        req.user = decoded; 
        next(); // Continúa con la siguiente función (el controlador de la ruta)
    } catch (err) {
        console.error("Error de verificación JWT:", err);
        return res.status(401).json({ 
            message: 'Token inválido o expirado.' 
        });
    }
}

module.exports = verifyToken;