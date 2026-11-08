// app.post('/api/users', (req, res) => {
//     console.log("Guardando usuario...");
//     // Información que va a tener nuestro nuevo registro
//     let newUser = {
//         nombre: req.body.nombre,
//         correo: req.body.correo,
//         pass: req.body.pass, 
//         UMK: req.body.UMK
//     };
//     // A partir de la información y el modelo, hacemos un usuario
//     let user = User(newUser);
//     // Guardamos el usuario en la BD (OJO, es asíncrono)
//     user.save().then((doc) => {
//         console.log("Usuario creado: " + doc);
//         res.send('Usuario creado exitosamente: ' + doc);
//     });
// });

// app.get('/api/users', (req, res) => {
//     console.log("Consultando usuarios...");
//     let user_name = req.query.nombre;
//     console.log(user_name);
//     User.find({
//         nombre: {$regex: user_name},
//         sexo: "H"
//     }).then(function (docs) {
//         res.send(docs);
//         console.log(docs);
//     }).catch((err) => console.log(err));
// });

// app.put('/api/users', (req, res) => {
//     console.log("Actualizando información...");
//     let user_id = req.body.id;
//     let user_name = req.body.nombre;
//     let user_mail = req.body.correo;
//     let user_age = req.body.edad;
//     let object_to_update = {};
//     let flag_updated_nombre = false;

//     if(user_name != undefined)
//     {
//         object_to_update.nombre = user_name;
//         flag_updated_nombre = true;
//     }
//     if(user_mail != undefined)
//     {
//         object_to_update.correo = user_mail;
//         flag_updated_nombre = true;
//     }
//     if(user_age != undefined)
//     {
//         object_to_update.edad = user_age;
//         flag_updated_nombre = true;
//     }

//     if(flag_updated_nombre)
//     {
//         console.log(object_to_update)
//         User.findByIdAndUpdate(user_id, object_to_update, {new: true}).then((doc) => {
//             console.log("Usuario actualizado");
//             console.log(doc);
//             res.send(doc);
//         }).catch((err) => console.log(err));
//     }
//     else
//     {
//         res.send("No se ha actualizado");
//     }
// });

// //AGREGA AQUÍ EL DELETE
// app.delete('/api/users', (req, res) => {
//     let id = req.body.id;

//     User.findByIdAndDelete(id).then((doc) => {
//         console.log("Usuario eliminado");
//         res.send(doc);
//     }).catch((err) => console.log(err));
// })

// app.listen(port, () => {
//     console.log("Aplicación de ejemplo corriendo en puerto " + port);
// });