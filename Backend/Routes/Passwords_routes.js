const express = require('express');
const router = express.Router();

// Modelos de Mongo
const Card = require('../Models/Cards');
const Password = require('../Models/Passwords');
const User = require('../Models/User');

// Middleware de autenticación
const verifyToken = require('./authMiddleware');

//
// ===== TARJETAS BANCARIAS =====
//   URL base: /passwords/cards
//

// Obtener todas las tarjetas DEL USUARIO AUTENTICADO
router.get('/cards', verifyToken, async (req, res) => {
    try {
        const userId = req.query.user_id;

        if (!userId) {
            return res.status(400).json({ error: 'user_id es requerido' });
        }

        const cards = await Card.find({ User_id: userId });
        res.json(cards);
    } catch (err) {
        console.error('Error al obtener tarjetas:', err);
        res.status(500).json({ error: 'Error al obtener tarjetas' });
    }
});

// Crear una nueva tarjeta
router.post('/cards', verifyToken, async (req, res) => {
    try {
        const { nombreTarjeta, titular, numeroTarjeta, vencimiento, cvv, user_id } = req.body;
        console.log("Data recibida")
        console.log(req.body)
        if (!user_id) {
            return res.status(400).json({ error: 'user_id es requerido' });
        }

        const nuevaCard = new Card({
            User_id: user_id,
            nombreTarjeta,
            titular,
            numeroTarjeta,
            vencimiento,
            cvv,
        });

        const guardada = await nuevaCard.save();

        // INCREMENTAR CONTADOR DE TARJETAS
        await User.findByIdAndUpdate(
            user_id,
            { $inc: { Numero_tarjetas: 1 } }
        );

        res.status(201).json(guardada);
    } catch (err) {
        console.error('Error al crear tarjeta:', err);
        res.status(500).json({ error: 'Error al crear tarjeta' });
    }
});

// Actualizar una tarjeta
router.put('/cards/:id', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;

        const actualizada = await Card.findByIdAndUpdate(id, req.body, {
            new: true,
        });

        if (!actualizada) {
            return res.status(404).json({ error: 'Tarjeta no encontrada' });
        }

        res.json(actualizada);
    } catch (err) {
        console.error('Error al actualizar tarjeta:', err);
        res.status(500).json({ error: 'Error al actualizar tarjeta' });
    }
});

// Eliminar una tarjeta
router.delete('/cards/:id', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;

        const eliminada = await Card.findByIdAndDelete(id);

        if (!eliminada) {
            return res.status(404).json({ error: 'Tarjeta no encontrada' });
        }

        // 🔥 DECREMENTAR CONTADOR DE TARJETAS
        await User.findByIdAndUpdate(
            eliminada.User_id,
            { $inc: { Numero_tarjetas: -1 } }
        );

        res.json({ message: 'Tarjeta eliminada correctamente' });
    } catch (err) {
        console.error('Error al eliminar tarjeta:', err);
        res.status(500).json({ error: 'Error al eliminar tarjeta' });
    }
});


//
// ===== CONTRASEÑAS DE SITIOS =====
//   URL base: /passwords/sites
//

// Obtener todas las contraseñas DEL USUARIO AUTENTICADO
router.get('/sites', verifyToken, async (req, res) => {
    try {
        const userId = req.query.user_id;

        if (!userId) {
            return res.status(400).json({ error: 'user_id es requerido' });
        }

        const passwords = await Password.find({ User_id: userId });
        res.json(passwords);
    } catch (err) {
        console.error('Error al obtener contraseñas:', err);
        res.status(500).json({ error: 'Error al obtener contraseñas' });
    }
});

// Crear una nueva contraseña de sitio
router.post('/sites', verifyToken, async (req, res) => {
    try {
        const { sitio, usuario, password, url, user_id } = req.body;

        if (!user_id) {
            return res.status(400).json({ error: 'user_id es requerido' });
        }
        console.log("Password data recibida")
        console.log(req.body)
        const nuevaPassword = new Password({
            User_id: user_id,
            sitio,
            usuario,
            password,
            url,
        });

        const guardada = await nuevaPassword.save();

        // INCREMENTAR CONTADOR DE CONTRASEÑAS
        await User.findByIdAndUpdate(
            user_id,
            { $inc: { Numero_pass: 1 } }
        );

        res.status(201).json(guardada);
    } catch (err) {
        console.error('Error al crear contraseña:', err);
        res.status(500).json({ error: 'Error al crear contraseña' });
    }
});

// Actualizar una contraseña
router.put('/sites/:id', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;

        const actualizada = await Password.findByIdAndUpdate(id, req.body, {
            new: true,
        });

        if (!actualizada) {
            return res.status(404).json({ error: 'Contraseña no encontrada' });
        }

        res.json(actualizada);
    } catch (err) {
        console.error('Error al actualizar contraseña:', err);
        res.status(500).json({ error: 'Error al actualizar contraseña' });
    }
});

// Eliminar una contraseña
router.delete('/sites/:id', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;

        const eliminada = await Password.findByIdAndDelete(id);

        if (!eliminada) {
            return res.status(404).json({ error: 'Contraseña no encontrada' });
        }

        // DECREMENTAR CONTADOR DE CONTRASEÑAS
        await User.findByIdAndUpdate(
            eliminada.User_id,
            { $inc: { Numero_pass: -1 } }
        );

        res.json({ message: 'Contraseña eliminada correctamente' });
    } catch (err) {
        console.error('Error al eliminar contraseña:', err);
        res.status(500).json({ error: 'Error al eliminar contraseña' });
    }
});

module.exports = router;