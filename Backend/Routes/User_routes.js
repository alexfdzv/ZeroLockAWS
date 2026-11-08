const express = require('express');
const routerUser = express.Router();
const User = require('../Models/User');
const Notes = require('../Models/Notes');
const Password = require('../Models/Passwords');
const Image = require('../Models/Images');
const Card = require('../Models/Cards');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const verifyToken = require('./authMiddleware');
const { isSelf, forbidden } = require('./authMiddleware');
const storage = require('../storage');
const { jwtSecret } = require('../config');

// Costo de bcrypt (10 es el valor recomendado por la librería)
const BCRYPT_ROUNDS = 10;

// Quita los datos sensibles antes de responder
function publicUser(doc) {
    const user = doc.toObject();
    delete user.pass;
    delete user.UMK;
    return user;
}

// === CREATE (registro) ===
routerUser.post('/', async (req, res) => {
    try {
        const { nombre, correo, pass, confirm_pass, UMK } = req.body;

        if (!nombre || !correo || !pass || !UMK) {
            return res.status(400).json({ error: "Faltan datos requeridos" });
        }
        if (pass !== confirm_pass) {
            return res.status(400).json({ error: "Las contraseñas no coinciden" });
        }

        const hash = await bcrypt.hash(pass, BCRYPT_ROUNDS);
        const user = await User.create({ nombre, correo, pass: hash, UMK });

        res.status(201).json({
            message: "Usuario creado exitosamente",
            user: publicUser(user)
        });
    } catch (err) {
        if (err.code === 11000) {
            return res.status(409).json({ error: "Ya existe una cuenta con ese correo" });
        }
        console.error("Error al crear usuario:", err.message);
        res.status(500).json({ error: "Error al crear usuario" });
    }
});

// === READ (perfil del usuario autenticado) ===
routerUser.get('/profile', verifyToken, async (req, res) => {
    try {
        const userId = req.query.id;
        if (!userId) {
            return res.status(400).json({ message: "ID de usuario requerido." });
        }
        if (!isSelf(req, userId)) {
            return forbidden(res);
        }

        const doc = await User.findById(userId).select('-pass -UMK');
        if (!doc) {
            return res.status(404).json({ message: "Usuario no encontrado." });
        }
        res.json(doc);
    } catch (err) {
        console.error("Error al consultar el perfil:", err.message);
        res.status(500).json({ message: "Error al consultar el perfil." });
    }
});

// === UPDATE (solo el propio usuario) ===
routerUser.put('/', verifyToken, async (req, res) => {
    try {
        const user_id = req.body.id;
        if (!user_id) {
            return res.status(400).json({ error: "ID requerido" });
        }
        if (!isSelf(req, user_id)) {
            return forbidden(res);
        }

        const object_to_update = {};

        if (req.body.nombre !== undefined) {
            object_to_update.nombre = req.body.nombre;
        }
        if (req.body.pass !== undefined) {
            object_to_update.pass = await bcrypt.hash(req.body.pass, BCRYPT_ROUNDS);
        }
        if (req.body.n_pass !== undefined) {
            object_to_update.Numero_pass = req.body.n_pass;
        }
        if (req.body.n_images !== undefined) {
            object_to_update.Numero_img = req.body.n_images;
        }
        if (req.body.n_cards !== undefined) {
            object_to_update.Numero_tarjetas = req.body.n_cards;
        }
        if (req.body.n_notes !== undefined) {
            object_to_update.Numero_notes = req.body.n_notes;
        }
        // Llave maestra re-envuelta (por ejemplo, al cambiar la contraseña)
        if (req.body.UMK !== undefined) {
            object_to_update["UMK.wrapped"] = req.body.UMK.wrapped;
            object_to_update["UMK.salt"] = req.body.UMK.salt;
            object_to_update["UMK.iteration"] = req.body.UMK.iteration;
        }

        if (Object.keys(object_to_update).length === 0) {
            return res.status(400).json({ error: "No hay cambios para actualizar" });
        }

        const doc = await User.findByIdAndUpdate(user_id, object_to_update, { new: true });
        if (!doc) {
            return res.status(404).json({ error: "Usuario no encontrado" });
        }
        res.json(publicUser(doc));
    } catch (err) {
        console.error("Error al actualizar usuario:", err.message);
        res.status(500).json({ error: "Error al actualizar usuario" });
    }
});

// === DELETE DEL USUARIO COMPLETO (solo el propio usuario) ===
routerUser.delete('/:id', verifyToken, async (req, res) => {
    const id = req.params.id;
    if (!isSelf(req, id)) {
        return forbidden(res);
    }

    try {
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ error: "Usuario no encontrado" });
        }

        // Borrar los archivos del usuario en S3 (imágenes y foto de perfil)
        const images = await Image.find({ user_id: id });
        const keys = images.map((img) => img.fullname);
        if (user.profileImg && user.profileImg.startsWith('profile/')) {
            keys.push(user.profileImg);
        }
        await Promise.all(keys.map((key) =>
            storage.deleteFile(key).catch((err) =>
                console.error("No se pudo borrar el archivo", key, err.message))));

        // Borrar sus datos (cada modelo usa su propio nombre de campo)
        await Notes.deleteMany({ User_id: id });
        await Password.deleteMany({ User_id: id });
        await Card.deleteMany({ User_id: id });
        await Image.deleteMany({ user_id: id });
        await User.findByIdAndDelete(id);

        res.status(200).json({ message: "Usuario eliminado correctamente" });
    } catch (err) {
        console.error("Error al eliminar usuario:", err.message);
        res.status(500).json({ error: "Error interno al eliminar usuario" });
    }
});

// === LOGIN ===
routerUser.post('/login', async (req, res) => {
    try {
        const { correo, pass } = req.body;
        if (typeof correo !== 'string' || typeof pass !== 'string') {
            return res.status(400).json({ error: "Correo y contraseña requeridos" });
        }

        // Búsqueda exacta del correo (antes era una expresión regular, lo que
        // permitía que un correo coincidiera con otro que lo contenía)
        const user = await User.findOne({ correo: correo });
        const correct_pass = user ? await bcrypt.compare(pass, user.pass) : false;

        if (!correct_pass) {
            return res.status(401).json({ error: "Correo y/o contraseña incorrectos" });
        }

        const token = jwt.sign({ mail: user.correo, id: String(user._id) }, jwtSecret, { expiresIn: '1h' });
        res.json({
            token: token,
            UMK: user.UMK,
            user_id: user._id
        });
    } catch (err) {
        console.error("Error en el login:", err.message);
        res.status(500).json({ error: "Error al iniciar sesión" });
    }
});

module.exports = routerUser;
