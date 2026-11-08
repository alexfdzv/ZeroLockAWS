const express = require('express');
const routerNotes = express.Router();
const Notes = require('../Models/Notes');
const User = require('../Models/User');
const verifyToken = require('./authMiddleware');
const { isSelf, forbidden } = require('./authMiddleware');

// Límite de notas del plan FREE
const FREE_NOTES_LIMIT = 5;

// Todas las rutas de notas requieren sesión
routerNotes.use(verifyToken);

// === CREATE ===
routerNotes.post('/', async (req, res) => {
    try {
        const { User_id, titulo, contenido } = req.body;

        if (!User_id || !titulo || !contenido) {
            return res.status(400).json({
                error: "Faltan datos requeridos",
                required: ["User_id", "titulo", "contenido"]
            });
        }
        if (!isSelf(req, User_id)) {
            return forbidden(res);
        }

        const user = await User.findById(User_id);
        if (!user) {
            return res.status(404).json({ error: "Usuario no encontrado" });
        }

        // Plan FREE: máximo 5 notas
        if (user.Is_free) {
            const count = await Notes.countDocuments({ User_id });
            if (count >= FREE_NOTES_LIMIT) {
                return res.status(403).json({
                    error: "Límite de notas alcanzado",
                    message: `Tu plan FREE solo permite ${FREE_NOTES_LIMIT} notas`
                });
            }
        }

        const doc = await Notes.create({ User_id, titulo, contenido });
        const updatedUser = await User.findByIdAndUpdate(
            User_id,
            { $inc: { Numero_notes: 1 } },
            { new: true }
        );

        res.status(201).json({
            message: "Nota creada con éxito!",
            note: doc,
            numero_notes: updatedUser?.Numero_notes
        });
    } catch (err) {
        console.error("Error al guardar la nota:", err.message);
        res.status(500).json({ error: "Hubo un error interno" });
    }
});

// === READ ===
routerNotes.get('/', async (req, res) => {
    try {
        const Userid = req.query.User_id;
        if (!Userid) {
            return res.status(400).json({ error: "El user ID es requerido" });
        }
        if (!isSelf(req, Userid)) {
            return forbidden(res);
        }

        const docs = await Notes.find({ User_id: Userid })
            .sort({ createdAt: -1 }); // Notas más recientes primero
        res.json(docs);
    } catch (err) {
        console.error("Error al consultar las notas:", err.message);
        res.status(500).json({ error: "Error al obtener notas" });
    }
});

// === UPDATE (solo notas propias) ===
routerNotes.put('/:id', async (req, res) => {
    try {
        const updateData = {};
        if (req.body.titulo !== undefined) {
            updateData.titulo = req.body.titulo;
        }
        if (req.body.contenido !== undefined) {
            updateData.contenido = req.body.contenido;
        }
        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ error: "No hay datos para actualizar" });
        }

        const doc = await Notes.findOneAndUpdate(
            { _id: req.params.id, User_id: req.user.id },
            updateData,
            { new: true }
        );
        if (!doc) {
            return res.status(404).json({ error: "Nota no encontrada" });
        }

        res.json({
            message: "Nota actualizada correctamente",
            note: doc
        });
    } catch (err) {
        console.error("Error al actualizar la nota:", err.message);
        res.status(500).json({ error: "Error al actualizar la nota" });
    }
});

// === DELETE (solo notas propias) ===
routerNotes.delete('/:id', async (req, res) => {
    try {
        const note = await Notes.findOneAndDelete({ _id: req.params.id, User_id: req.user.id });
        if (!note) {
            return res.status(404).json({ error: "Nota no encontrada" });
        }

        // Decrementar el contador sin bajar de 0
        const updatedUser = await User.findOneAndUpdate(
            { _id: note.User_id, Numero_notes: { $gt: 0 } },
            { $inc: { Numero_notes: -1 } },
            { new: true }
        );

        res.json({
            message: "Nota eliminada!",
            note: note,
            numero_notes: updatedUser?.Numero_notes
        });
    } catch (err) {
        console.error("Error al eliminar nota:", err.message);
        res.status(500).json({ error: "Error al eliminar la nota" });
    }
});

module.exports = routerNotes;
