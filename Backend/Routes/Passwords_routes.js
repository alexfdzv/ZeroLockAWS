const express = require('express');
const router = express.Router();

// Modelos de Mongo
const Card = require('../Models/Cards');
const Password = require('../Models/Passwords');
const User = require('../Models/User');

// Middleware de autenticación
const verifyToken = require('./authMiddleware');
const { isSelf, forbidden } = require('./authMiddleware');

// Todas las rutas requieren sesión
router.use(verifyToken);

// Toma solo los campos permitidos del body (evita que se cambie, por
// ejemplo, el dueño del registro al editarlo)
function pick(body, fields) {
    const result = {};
    for (const field of fields) {
        if (body[field] !== undefined) {
            result[field] = body[field];
        }
    }
    return result;
}

const CARD_FIELDS = ['nombreTarjeta', 'titular', 'numeroTarjeta', 'vencimiento', 'cvv'];
const SITE_FIELDS = ['sitio', 'usuario', 'password', 'url'];

// Decrementa un contador del usuario sin bajar de 0
function decrementCounter(userId, field) {
    return User.findOneAndUpdate(
        { _id: userId, [field]: { $gt: 0 } },
        { $inc: { [field]: -1 } }
    );
}

//
// ===== TARJETAS BANCARIAS =====
//   URL base: /api/passwords/cards
//

// Obtener todas las tarjetas del usuario autenticado
router.get('/cards', async (req, res) => {
    try {
        const userId = req.query.user_id;
        if (!userId) {
            return res.status(400).json({ error: 'user_id es requerido' });
        }
        if (!isSelf(req, userId)) {
            return forbidden(res);
        }
        const cards = await Card.find({ User_id: userId });
        res.json(cards);
    } catch (err) {
        console.error('Error al obtener tarjetas:', err.message);
        res.status(500).json({ error: 'Error al obtener tarjetas' });
    }
});

// Crear una nueva tarjeta
router.post('/cards', async (req, res) => {
    try {
        const { user_id } = req.body;
        if (!user_id) {
            return res.status(400).json({ error: 'user_id es requerido' });
        }
        if (!isSelf(req, user_id)) {
            return forbidden(res);
        }

        const guardada = await Card.create({ User_id: user_id, ...pick(req.body, CARD_FIELDS) });
        await User.findByIdAndUpdate(user_id, { $inc: { Numero_tarjetas: 1 } });

        res.status(201).json(guardada);
    } catch (err) {
        console.error('Error al crear tarjeta:', err.message);
        res.status(500).json({ error: 'Error al crear tarjeta' });
    }
});

// Actualizar una tarjeta propia
router.put('/cards/:id', async (req, res) => {
    try {
        const actualizada = await Card.findOneAndUpdate(
            { _id: req.params.id, User_id: req.user.id },
            pick(req.body, CARD_FIELDS),
            { new: true }
        );
        if (!actualizada) {
            return res.status(404).json({ error: 'Tarjeta no encontrada' });
        }
        res.json(actualizada);
    } catch (err) {
        console.error('Error al actualizar tarjeta:', err.message);
        res.status(500).json({ error: 'Error al actualizar tarjeta' });
    }
});

// Eliminar una tarjeta propia
router.delete('/cards/:id', async (req, res) => {
    try {
        const eliminada = await Card.findOneAndDelete({ _id: req.params.id, User_id: req.user.id });
        if (!eliminada) {
            return res.status(404).json({ error: 'Tarjeta no encontrada' });
        }
        await decrementCounter(eliminada.User_id, 'Numero_tarjetas');
        res.json({ message: 'Tarjeta eliminada correctamente' });
    } catch (err) {
        console.error('Error al eliminar tarjeta:', err.message);
        res.status(500).json({ error: 'Error al eliminar tarjeta' });
    }
});

//
// ===== CONTRASEÑAS DE SITIOS =====
//   URL base: /api/passwords/sites
//

// Obtener todas las contraseñas del usuario autenticado
router.get('/sites', async (req, res) => {
    try {
        const userId = req.query.user_id;
        if (!userId) {
            return res.status(400).json({ error: 'user_id es requerido' });
        }
        if (!isSelf(req, userId)) {
            return forbidden(res);
        }
        const passwords = await Password.find({ User_id: userId });
        res.json(passwords);
    } catch (err) {
        console.error('Error al obtener contraseñas:', err.message);
        res.status(500).json({ error: 'Error al obtener contraseñas' });
    }
});

// Crear una nueva contraseña de sitio
router.post('/sites', async (req, res) => {
    try {
        const { user_id } = req.body;
        if (!user_id) {
            return res.status(400).json({ error: 'user_id es requerido' });
        }
        if (!isSelf(req, user_id)) {
            return forbidden(res);
        }

        const guardada = await Password.create({ User_id: user_id, ...pick(req.body, SITE_FIELDS) });
        await User.findByIdAndUpdate(user_id, { $inc: { Numero_pass: 1 } });

        res.status(201).json(guardada);
    } catch (err) {
        console.error('Error al crear contraseña:', err.message);
        res.status(500).json({ error: 'Error al crear contraseña' });
    }
});

// Actualizar una contraseña propia
router.put('/sites/:id', async (req, res) => {
    try {
        const actualizada = await Password.findOneAndUpdate(
            { _id: req.params.id, User_id: req.user.id },
            pick(req.body, SITE_FIELDS),
            { new: true }
        );
        if (!actualizada) {
            return res.status(404).json({ error: 'Contraseña no encontrada' });
        }
        res.json(actualizada);
    } catch (err) {
        console.error('Error al actualizar contraseña:', err.message);
        res.status(500).json({ error: 'Error al actualizar contraseña' });
    }
});

// Eliminar una contraseña propia
router.delete('/sites/:id', async (req, res) => {
    try {
        const eliminada = await Password.findOneAndDelete({ _id: req.params.id, User_id: req.user.id });
        if (!eliminada) {
            return res.status(404).json({ error: 'Contraseña no encontrada' });
        }
        await decrementCounter(eliminada.User_id, 'Numero_pass');
        res.json({ message: 'Contraseña eliminada correctamente' });
    } catch (err) {
        console.error('Error al eliminar contraseña:', err.message);
        res.status(500).json({ error: 'Error al eliminar contraseña' });
    }
});

module.exports = router;
