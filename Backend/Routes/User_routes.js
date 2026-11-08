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
const Cards = require('../Models/Cards');
//const mongoose = require('mongoose')

// === CREATE === 
routerUser.post('/', (req, res) => {
    console.log("Guardando usuario...");
    // Información que va a tener nuestro nuevo registro
    if (req.body.pass != req.body.confirm_pass){
        res.status(400).send("Passwords missmatch!");
    }else{
    let hash = bcrypt.hashSync(req.body.pass, 2);
    console.log("Contraseña cifrada: ", hash);
    let newUser = {
        nombre: req.body.nombre,
        correo: req.body.correo,
        pass: hash, 
        UMK: req.body.UMK
    };
    // A partir de la información y el modelo, hacemos un usuario
    let user = User(newUser);


    // Guardamos el usuario en la BD (OJO, es asíncrono)
    user.save().then((doc) => {
        console.log("Usuario creado: " + doc);
        res.json({
            message: "Usario creado exitosamente", 
            user: doc
        });
    });
    }
});

// === READ ===

routerUser.get('/profile', verifyToken, (req, res) => {
    // 1. Identificar al usuario
    // Asumimos que el frontend enviará el ID en el query, por ejemplo: /api/users/profile?id=<userId>
    const userId = req.query.id; 
    
    if (!userId) {
        return res.status(400).json({ message: "ID de usuario requerido." });
    }

    console.log(`Consultando perfil para ID: ${userId}`);

    // 2. Buscar al usuario por ID
    User.findById(userId)
        .select('-pass -UMK') // Evita enviar datos sensibles como la contraseña y UMK
        .then(function (doc) {
            if (!doc) {
                return res.status(404).json({ message: "Usuario no encontrado." });
            }
            res.send(doc); // Devuelve el objeto de usuario (incluye nombre, correo, contadores, etc.)
            console.log(doc);
        })
        .catch((err) => {
            console.error(err);
            res.status(500).send("Error al consultar el perfil.");
        });
});

routerUser.get('/', (req, res) => {
    console.log("Consultando usuarios...");
    let mail = req.query.correo;
    console.log(mail);
    User.find({
        correo: {$regex: mail},
    }).then(function (docs) {
        res.send(docs);
        console.log(docs);
    }).catch((err) => console.log(err));
});

// === UPDATE ===
// routerUser.put('/', verifyToken, async (req, res) => {
//     console.log("Actualizando información...");
//     let user_name = req.body.nombre;
//     let user_id = req.body.id;
//     console.log(user_id);
//     let user_pass = req.body.pass;
//     let n_pass = req.body.n_pass;
//     let n_images = req.body.n_images;
//     let n_cards = req.body.n_cards;
//     let n_notes = req.body.n_notes;
//     let UMK_wp = req.body.UMK?.wrapped;
//     let object_to_update = {};
//     let flag_updated_nombre = false;

//      if (user_name !== undefined) {
//         object_to_update.nombre = user_name;
//         flag_updated_nombre = true;
//     }

//     if (user_pass !== undefined){
//         object_to_update.pass = user_pass;
//         flag_updated_nombre = true;
//     }

//     if (n_pass !== undefined) {
//         object_to_update.Numero_pass = n_pass; 
//         flag_updated_nombre = true;
//     }

//     if (n_images !== undefined) {
//         object_to_update.Numero_img = n_images;
//         flag_updated_nombre = true;
//     }

//     if (n_cards !== undefined) {
//         object_to_update.Numero_tarjetas = n_cards;
//         flag_updated_nombre = true;
//     }

//     if (n_notes !== undefined) {
//         object_to_update.Numero_notes = n_notes;
//         flag_updated_nombre = true;
//     }

//     if (UMK_wp !== undefined) {
//         // Solo actualizamos el wrapped dentro de UMK
//         object_to_update["UMK.wrapped"] = UMK_wp;
//         flag_updated_nombre = true;
//     }

//     // ==== Fin de IFs ====

//     if (flag_updated_nombre) {
//         console.log(object_to_update);
//         console.table(object_to_update);
//         User.findByIdAndUpdate(user_id, object_to_update, { new: true })
//             .then((doc) => {
//                 console.log("Usuario actualizado");
//                 console.log(doc);
//                 res.send(doc);
//             })
//             .catch((err) => {
//                 console.log("Error al actualizar:", err);
//                 res.status(500).send("Error al actualizar usuario");
//             });
//     } else {
//         res.send("No se ha actualizado");
//     }
// });

routerUser.put('/', verifyToken, async (req, res) => {
    console.log("Actualizando información...");
    let user_id = req.body.id;

    if (!user_id) {
        return res.status(400).json({ error: "ID requerido" });
    }

    let object_to_update = {};
    let updated = false;

    // --- Actualizar nombre ---
    if (req.body.nombre !== undefined) {
        object_to_update.nombre = req.body.nombre;
        updated = true;
    }

    // --- ACTUALIZAR PASSWORD (ya viene hasheada desde FRONT) ---
    if (req.body.pass !== undefined) {
        const newHash = bcrypt.hashSync(req.body.pass, 10);
        object_to_update.pass = newHash;
        updated = true;
    }

    // --- updates contadores ---
    if (req.body.n_pass !== undefined) {
        object_to_update.Numero_pass = req.body.n_pass;
        updated = true;
    }

    if (req.body.n_images !== undefined) {
        object_to_update.Numero_img = req.body.n_images;
        updated = true;
    }

    if (req.body.n_cards !== undefined) {
        object_to_update.Numero_tarjetas = req.body.n_cards;
        updated = true;
    }

    if (req.body.n_notes !== undefined) {
        object_to_update.Numero_notes = req.body.n_notes;
        updated = true;
    }

    // --- ACTUALIZAR UMK COMPLETA ---
    if (req.body.UMK !== undefined) {
        object_to_update["UMK.wrapped"] = req.body.UMK.wrapped;
        object_to_update["UMK.salt"] = req.body.UMK.salt;
        object_to_update["UMK.iteration"] = req.body.UMK.iteration;
        updated = true;
    }

    if (!updated) {
        return res.status(400).json({ error: "No hay cambios para actualizar" });
    }

    User.findByIdAndUpdate(user_id, object_to_update, { new: true })
        .then(doc => {
            console.log("Usuario actualizado:");
            console.log(doc);
            res.json(doc);
        })
        .catch(err => {
            console.log("Error al actualizar:", err);
            res.status(500).json({ error: "Error al actualizar usuario" });
        });
});

// === DELETE === 
// routerUser.delete('/', (req, res) => {
//     let id = req.body.id;

//     User.findByIdAndDelete(id).then((doc) => {
//         console.log("Usuario eliminado");
//         res.send(doc);
//     }).catch((err) => console.log(err));
// });


// === DELETE DEL USUARIO COMPLETO === 
routerUser.delete('/:id', async (req, res) => {
    const id = req.params.id;
    console.log("=== INICIO DELETE USER ===");
    console.log("ID recibido:", id);

    try {
        console.log("1. Buscando usuario...");
        const user = await User.findById(id);
        console.log("Usuario encontrado:", user ? "SÍ" : "NO");
        
        if (!user) {
            return res.status(404).json({ error: "Usuario no encontrado" });
        }

        console.log("2. Eliminando notas...");
        await Notes.deleteMany({ User_id: id });
        
        console.log("3. Eliminando passwords...");
        await Password.deleteMany({ User_id: id });
        
        console.log("4. Eliminando stego...");
        await Image.deleteMany({ User_id: id });

        console.log("5. Eliminando Cards...");
        await Card.deleteMany({ User_id: id });
        
        console.log("6. Eliminando usuario...");
        await User.findByIdAndDelete(id);
        
        console.log("✓ Todo eliminado correctamente");
        res.status(200).json({ message: "Usuario eliminado correctamente" });

    } catch (err) {
        console.error("❌ ERROR:", err);
        res.status(500).json({
            error: "Error interno al eliminar usuario",
            details: err.message
        });
    }
});

// === LOGIN === 
routerUser.post('/login', (req, res) => {
    let mail = req.body.correo;
    let pass = req.body.pass;
    console.log("Correo: ", mail);
    User.find({
        correo: {$regex: mail},
    }).then(function (docs) {
        let correct_pass = bcrypt.compareSync(pass, docs[0].pass);
        console.log("Pass correcto: ", correct_pass);
        if(correct_pass){
            //res.send(docs);
            console.log(docs);
            const secret_key = require('../config').jwtSecret;
            const token = jwt.sign({mail}, secret_key, {expiresIn: '1h'});
            console.log("UMK: ", docs[0].UMK);
            console.log("Token: ", token);
            res.json({
                token: token, 
                UMK: docs[0].UMK,
                user_id: docs[0]._id
            });
        }else{
            res.status(401).send("Error al inciar sesión");
        }
    }).catch((err) => console.log(err));


})

routerUser.put('/updatePlan', (req, res) => {
    User.findByIdAndUpdate(
        req.body.id,
        { Is_free: false },
        { new: true }
    )
    .then(user => res.json(user))
    .catch(err => res.status(500).json(err));
});

module.exports = routerUser;