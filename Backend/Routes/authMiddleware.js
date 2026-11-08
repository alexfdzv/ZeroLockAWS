const jwt = require('jsonwebtoken');

// La llave se lee de la variable de entorno JWT_SECRET (ver config.js)
const secret_key = require('../config').jwtSecret;

function verifyToken(req, res, next) {
    // 1. Obtener el token de la cabecera de la petición
    // El formato esperado es: Authorization: Bearer <token>
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            message: 'Acceso denegado. No se proporcionó Token.'
        });
    }

    const token = authHeader.split(' ')[1]; // Extrae el token de "Bearer <token>"

    // 2. Verificar el token
    try {
        const decoded = jwt.verify(token, secret_key);
        // Los tokens deben incluir el id del usuario (los emite /api/login)
        if (!decoded.id) {
            return res.status(401).json({ message: 'Token inválido o expirado.' });
        }
        // { id, mail } del usuario autenticado
        req.user = decoded;
        next(); // Continúa con la siguiente función (el controlador de la ruta)
    } catch (err) {
        return res.status(401).json({
            message: 'Token inválido o expirado.'
        });
    }
}

// Verifica que el id recibido sea el del usuario dueño del token.
// Evita que un usuario consulte o modifique datos de otro.
function isSelf(req, userId) {
    return Boolean(userId) && String(userId) === String(req.user.id);
}

function forbidden(res) {
    return res.status(403).json({ error: 'No tienes permiso para acceder a este recurso' });
}

module.exports = verifyToken;
module.exports.isSelf = isSelf;
module.exports.forbidden = forbidden;
