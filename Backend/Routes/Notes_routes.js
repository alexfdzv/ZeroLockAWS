const express = require('express');
const routerNotes = express.Router();
const Notes = require('../Models/Notes');
const User = require('../Models/User');
const verifyToken = require('./authMiddleware');


// === CREATE ===  
// routerNotes.post('/', (req, res) => {
//     console.log('Guardando nota...');
//     if(!req.body.User_id || !req.body.titulo || !req.body.contenido){
//         return res.status(400).json({
//             error: "Faltan datos requeridos", 
//             required: ["User_id", "titulo", "contenido"]
//         });
//     }
    
//     let newNote = {
//         User_id: req.body.User_id, 
//         titulo: req.body.titulo, 
//         contenido: req.body.contenido
//     };

//     let note = Notes(newNote);



//     note.save()
//         .then((doc) => {
//             console.log("Nota creada! " + doc);
//             res.status(201).json({
//                 message: "Nota creada con éxito!", 
//                 note: doc
//             });
//         })
//         .catch((err) =>{
//             console.error("Error al guardar la nota" + err);
//             res.status(500).json({
//                 error: "Hubo un error interno", 
//                 details: err.message
//             });
//         });
// });

// CREATE CON LOS PLANES IMPLEMENTADOS. 
routerNotes.post('/', (req, res) => {
    console.log('Guardando nota...');

    // Validación de campos
    if (!req.body.User_id || !req.body.titulo || !req.body.contenido) {
        return res.status(400).json({
            error: "Faltan datos requeridos",
            required: ["User_id", "titulo", "contenido"]
        });
    }

    const userId = req.body.User_id;

    // Buscar al usuario 
    User.findById(userId)
        .then(user => {
            if (!user) {
                return res.status(404).json({ error: "Usuario no encontrado" });
            }

            // Verificar si es free
            if (user.Is_free) {
                // Contar notas del usuario
                Notes.countDocuments({ User_id: userId })
                    .then(count => {

                        if (count >= 5) {
                            return res.status(403).json({
                                error: "Límite de notas alcanzado",
                                message: "Tu plan FREE solo permite 5 notas"
                            });
                        }

                        // Crear la nota normalmente
                        let newNote = {
                            User_id: req.body.User_id,
                            titulo: req.body.titulo,
                            contenido: req.body.contenido
                        };

                        let note = new Notes(newNote);

                        note.save()
                            .then(doc => {
                                // Incrementar el contador de notas en el usuario FREE
                                User.findByIdAndUpdate(
                                    userId,
                                    { $inc: { Numero_notes: 1 } },
                                    { new: true }
                                )
                                .then(updatedUser => {
                                    console.log("Nota creada! ", doc);
                                    res.status(201).json({
                                        message: "Nota creada con éxito!",
                                        note: doc,
                                        numero_notes: updatedUser.Numero_notes
                                    });
                                })
                                .catch(err => {
                                    console.error("Error al actualizar contador de notas:", err);
                                    res.status(201).json({
                                        message: "Nota creada, pero ocurrió un error actualizando el contador",
                                        note: doc
                                    });
                                });
                            })
                            .catch(err => {
                                console.error("Error al guardar la nota:", err);
                                res.status(500).json({
                                    error: "Hubo un error interno",
                                    details: err.message
                                });
                            });

                    })
                    .catch(err => {
                        console.error("Error al contar notas:", err);
                        res.status(500).json({ error: "Error interno al contar notas" });
                    });

            } else {
                // Usuario premium → crear nota directo
                let newNote = {
                    User_id: req.body.User_id,
                    titulo: req.body.titulo,
                    contenido: req.body.contenido
                };

                let note = new Notes(newNote);

                note.save()
                    .then(doc => {
                        // Incrementar contador también para premium
                        User.findByIdAndUpdate(
                            userId,
                            { $inc: { Numero_notes: 1 } },
                            { new: true }
                        )
                        .then(updatedUser => {
                            console.log("Nota creada! ", doc);
                            res.status(201).json({
                                message: "Nota creada con éxito!",
                                note: doc,
                                numero_notes: updatedUser.Numero_notes
                            });
                        })
                        .catch(err => {
                            console.error("Error al actualizar contador en premium:", err);
                            res.status(201).json({
                                message: "Nota creada, pero no se pudo actualizar el contador",
                                note: doc
                            });
                        });
                    })
                    .catch(err => {
                        console.error("Error al guardar la nota:", err);
                        res.status(500).json({
                            error: "Hubo un error interno",
                            details: err.message
                        });
                    });
            }
        })
        .catch(err => {
            console.error("Error al buscar usuario:", err);
            res.status(500).json({ error: "Error interno al verificar usuario" });
        });
});


// === READ ===
routerNotes.get('/',verifyToken, (req, res) =>{
    console.log("Consultando notas");
    let Userid = req.query.User_id; 

    if(!Userid){
        return res.status(400).json({error: "El user ID es requerido"});
    }

    Notes.find({User_id: Userid})
        .sort({createdAt: -1}) // -> Esto ordena por notas más recientes primero
        .then((docs) =>{
            console.log(`Encontradas ${docs.length} notas`);
            res.json(docs);
        })
        .catch((err) =>{
            console.error("Error al consultar las notas: ", err);
            res.status(500).json({error: "Error al obtener notas"});
        });
});

// === UPDATE === 
routerNotes.put('/:id', (req, res) =>{
    console.log("Actualizando nota...", req.params.id);

    let updateData = {};

    if(req.body.titulo !== undefined){
        updateData.titulo = req.body.titulo;
    }

    if(req.body.contenido !== undefined){
        updateData.contenido = req.body.contenido;
    }

    if(Object.keys(updateData).length == 0){
        return res.status(400).json({error: "No hay datos para actualizar"});
    }

    Notes.findByIdAndUpdate(req.params.id, updateData, {new: true})
        .then((doc) => {
            if(!doc){
                return res.status(404).json({error: "Nota no encontrada"});
            }
            console.log("Nota actualizada");
            res.json({
                message: "Nota actualizada correctamente", 
                note: doc
            })
        })
});

// === DELETE ===
routerNotes.delete('/:id', async (req, res) => {
    console.log("Eliminando nota:", req.params.id);

    try {
        // Buscar la nota primero (para obtener el User_id)
        const note = await Notes.findById(req.params.id);
        if (!note) {
            return res.status(404).json({ error: "Nota no encontrada" });
        }

        const userId = note.User_id;

        // Eliminar la nota
        await Notes.findByIdAndDelete(req.params.id);
        console.log("Nota eliminada correctamente");

        // Decrementar el contador de notas del usuario (+ seguridad: nunca bajar de 0)
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $inc: { Numero_notes: -1 } },
            { new: true }
        );

        console.log("Contador actualizado. Nuevo total:", updatedUser?.Numero_notes);

        return res.json({
            message: "Nota eliminada!",
            note: note,
            numero_notes: updatedUser?.Numero_notes
        });

    } catch (err) {
        console.error("Error al eliminar nota:", err);
        return res.status(500).json({ error: "Error al eliminar la nota" });
    }
});


// Sin esta línea la cosa no jala, recuerda. 
module.exports = routerNotes;