// Backend/Routes/Profile_routes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const User = require('../Models/User');

// Configuración de multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadsDir = path.join(__dirname, '..', 'uploads', 'profile');
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const filename = `profile_${Date.now()}${ext}`;
        cb(null, filename);
    }
});

const upload = multer({ 
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }
});

// SUBIR IMAGEN
router.post('/upload', upload.single('photo'), async (req, res) => {
    try {
        const userId = req.body.user_id;

        console.log('📥 Recibiendo upload para user_id:', userId);

        if (!userId) {
            return res.status(400).json({ error: "No se proporcionó user_id" });
        }

        if (!req.file) {
            return res.status(400).json({ error: "No se envió archivo" });
        }

        const filePath = `/uploads/profile/${req.file.filename}`;

        console.log('💾 Intentando guardar en BD:', filePath);

        // ⭐ CAMBIO: profileImage → profileImg
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { profileImg: filePath },  // ← CAMBIO AQUÍ
            { new: true }
        );

        if (!updatedUser) {
            console.error('❌ Usuario no encontrado:', userId);
            return res.status(404).json({ error: "Usuario no encontrado" });
        }

        console.log('✅ Usuario actualizado:', updatedUser.nombre);
        console.log('✅ profileImg guardado:', updatedUser.profileImg);

        res.json({
            success: true,
            message: "Foto actualizada",
            path: filePath
        });

    } catch (error) {
        console.error('❌ Error completo:', error);
        res.status(500).json({ error: error.message });
    }
});

// OBTENER IMAGEN
router.get('/image', async (req, res) => {
    try {
        const userId = req.query.user_id;

        console.log('🔍 Buscando imagen para user_id:', userId);

        if (!userId) {
            return res.status(400).json({ error: "No se proporcionó user_id" });
        }

        const user = await User.findById(userId);

        if (!user) {
            console.error('❌ Usuario no encontrado:', userId);
            return res.status(404).json({ error: "Usuario no encontrado" });
        }

        console.log('👤 Usuario encontrado:', user.nombre);
        console.log('🖼️ profileImg en BD:', user.profileImg);

        res.json({
            success: true,
            profileImage: user.profileImg || null  // ← CAMBIO: user.profileImg
        });

    } catch (error) {
        console.error('❌ Error completo:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;