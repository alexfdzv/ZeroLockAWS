// Backend/Routes/Profile_routes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const User = require('../Models/User');
const storage = require('../storage');

// La foto se recibe en memoria y se guarda en S3 (ver storage.js)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }
});

// Ruta pública de la foto de un usuario (la sirve el backend leyendo de S3,
// porque el bucket es privado). "v" evita que el navegador muestre una foto vieja.
function photoUrl(userId, key) {
    return `/api/profile/photo?user_id=${userId}&v=${encodeURIComponent(path.basename(key))}`;
}

// La foto solo cuenta si está guardada en el almacenamiento nuevo (S3)
function hasStoredPhoto(user) {
    return Boolean(user.profileImg) && user.profileImg.startsWith('profile/');
}

// SUBIR IMAGEN
router.post('/upload', upload.single('photo'), async (req, res) => {
    try {
        const userId = req.body.user_id;

        if (!userId) {
            return res.status(400).json({ error: "No se proporcionó user_id" });
        }

        if (!req.file) {
            return res.status(400).json({ error: "No se envió archivo" });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: "Usuario no encontrado" });
        }

        // Guardar en S3: profile/<usuario>/profile_<timestamp>.<ext>
        const ext = path.extname(req.file.originalname);
        const key = `profile/${userId}/profile_${Date.now()}${ext}`;
        await storage.saveFile(key, req.file.buffer, req.file.mimetype);

        // Borrar la foto anterior para no acumular archivos
        if (hasStoredPhoto(user)) {
            storage.deleteFile(user.profileImg).catch((err) =>
                console.error('No se pudo borrar la foto anterior:', err.message));
        }

        await User.findByIdAndUpdate(userId, { profileImg: key });

        res.json({
            success: true,
            message: "Foto actualizada",
            path: photoUrl(userId, key)
        });

    } catch (error) {
        console.error('Error al subir la foto:', error);
        res.status(500).json({ error: error.message });
    }
});

// OBTENER LA RUTA DE LA IMAGEN
router.get('/image', async (req, res) => {
    try {
        const userId = req.query.user_id;

        if (!userId) {
            return res.status(400).json({ error: "No se proporcionó user_id" });
        }

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ error: "Usuario no encontrado" });
        }

        res.json({
            success: true,
            profileImage: hasStoredPhoto(user) ? photoUrl(userId, user.profileImg) : null
        });

    } catch (error) {
        console.error('Error al obtener la foto:', error);
        res.status(500).json({ error: error.message });
    }
});

// DEVOLVER LA IMAGEN (leída desde S3)
router.get('/photo', async (req, res) => {
    try {
        const userId = req.query.user_id;
        if (!userId) {
            return res.status(400).json({ error: "No se proporcionó user_id" });
        }

        const user = await User.findById(userId);
        if (!user || !hasStoredPhoto(user)) {
            return res.status(404).json({ error: "Foto no encontrada" });
        }

        const { buffer, contentType } = await storage.readFile(user.profileImg);
        res.set('Content-Type', contentType || 'image/jpeg');
        res.set('Cache-Control', 'private, max-age=300');
        res.send(buffer);

    } catch (error) {
        console.error('Error al leer la foto:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
