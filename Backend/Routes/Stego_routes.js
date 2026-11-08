const express = require('express');
const routerStego = express.Router();
const Image = require('../Models/Images');
const User = require('../Models/User');
const multer = require("multer");
const path = require("path");
const storage = require("../storage");
const verifyToken = require('./authMiddleware');

// Las imágenes se reciben en memoria y se guardan en S3 (ver storage.js)
const imageStorage = multer.memoryStorage();

// const textStorage = multer.memoryStorage();

// const storage = {
//   _handleFile(req, file, cb) {
//     if (file.fieldname === "image") {
//       imageStorage._handleFile(req, file, cb);
//     } else if (file.fieldname === "text") {
//       textStorage._handleFile(req, file, cb);
//     } else {
//       cb(new Error("Unexpected field: " + file.fieldname));
//     }
//   },
//   _removeFile(req, file, cb) {
//     if (file.fieldname === "image") {
//       imageStorage._removeFile(req, file, cb);
//     } else if (file.fieldname === "text") {
//       textStorage._removeFile(req, file, cb);
//     } else {
//       cb();
//     }
//   }
// };

//const upload = multer({ storage });
const upload = multer({ storage: imageStorage });

//CREATE
routerStego.post(
  "/",
  upload.single("image"),
  // upload.single([
  //   { name: "image", maxCount: 1 }
  //   { name: "text", maxCount: 1 }
  // ]),
  (req, res) => {
    console.log("Stego request received for user with ID:", req.body.user_id);

    User.findById(req.body.user_id)
      .then(async user => {
        if (!user) {
          return res.status(404).json({ error: "Usuario no encontrado" });
        }

        // FREE PLAN VALIDATION
        if (user.Is_free) {
          const count = await Image.countDocuments({ user_id: req.body.user_id });
          console.log("Número de imágenes", count);

          if (count >= 3) {
            return res.status(403).json({
              error: "Límite de imágenes alcanzado",
              message: "Tu plan FREE solo permite 5 imágenes"
            });
          }
        }

        // ==============================
        //     STEGGY PART (safe)
        // ==============================
        try {
          const steggy = require("steggy");
          const textContent = req.body.text;
          const original = req.file.buffer;
          const concealed = steggy.conceal()(original, textContent);

          // Guardar en S3: stego/<usuario>/<timestamp>-<nombre original>
          const cleanName = path.basename(req.file.originalname);
          const filename = `stego/${req.body.user_id}/${Date.now()}-${cleanName}`;
          await storage.saveFile(filename, concealed, req.file.mimetype);

          const newImage = {
            user_id: req.body.user_id,
            fullname: filename,
            prettyname: cleanName,
            description: req.body.description
          };

          const imageDoc = await Image.create(newImage);

          // Increment counter
          const updatedUser = await User.findByIdAndUpdate(
            req.body.user_id,
            { $inc: { Numero_img: 1 } },
            { new: true }
          );

          return res.json({
            message: "Imagen creada exitosamente",
            user: updatedUser,
            image: imageDoc
          });

        } catch (err) {
          console.error(err);
          return res.status(500).json({ error: "Stego failed" });
        }
      })
      .catch(err => {
        console.error(err);
        return res.status(500).json({ error: "Error al buscar usuario" });
      });
  }
);


//READ
routerStego.get('/', verifyToken, (req, res) =>{
    console.log("Consultando imágenes");
    let Userid = req.query.User_id;

    if(!Userid){
        return res.status(400).json({error: "El user ID es requerido"});
    }

    Image.find({user_id: Userid})
        .then((docs) =>{
            console.log(`Encontradas ${docs.length} imágenes`);
            res.json(docs);
        })
        .catch((err) =>{
            console.error("Error al consultar las imágenes: ", err);
            res.status(500).json({error: "Error al obtener imágenes"});
        });
});

// === UPDATE ===
routerStego.put('/:id', (req, res) => {
    console.log("Actualizando información...");
    console.log("Data received", req.body);
    let image_name = req.body.nombre;
    let description = req.body.Descripción;

    let object_to_update = {};
    let flag_updated_nombre = false;

     if (image_name !== undefined) {
        object_to_update.prettyname = image_name;
        flag_updated_nombre = true;
    }

    if (description !== undefined){
        object_to_update.description = description;
        flag_updated_nombre = true;
    }


    // ==== Fin de IFs ====

    if (flag_updated_nombre) {
        console.log(object_to_update);
        console.table(object_to_update);
        Image.findByIdAndUpdate(req.params.id, object_to_update, { new: true })
            .then((doc) => {
                console.log("Usuario actualizado");
                console.log(doc);
                res.send(doc);
            })
            .catch((err) => {
                console.log("Error al actualizar:", err);
                res.status(500).send("Error al actualizar usuario");
            });
    } else {
        res.send("No se ha actualizado");
    }
});

//DELETE
routerStego.delete('/:id', async (req, res) => {
    try {
        console.log("Eliminando imagen", req.params.id);
        const user_id = req.query.user_id;
        console.log("Usuario ID ", user_id);
        const doc = await Image.findByIdAndDelete(req.params.id);

        if (!doc) {
            return res.status(404).json({ error: "Imagen no encontrada" });
        }

        console.log("Nombre real de la imagen a eliminar:", doc.fullname);
        // Borrar el archivo de S3
        try {
            await storage.deleteFile(doc.fullname);
            console.log("Imagen eliminada del almacenamiento");
        } catch (err) {
            console.error("No se pudo borrar la imagen del almacenamiento:", err);
        }

        // Decrement counter
        const updatedUser = await User.findByIdAndUpdate(
            user_id,
            { $inc: { Numero_img: -1 } },
            { new: true }
        );

        return res.json({
            message: "Imagen eliminada!",
            note: doc
        });
    }
    catch (err) {
        console.error("Error al eliminar", err);
        return res.status(500).json({ error: "Error al eliminar la imagen" });
    }
});


//DATA EXTRACTION
routerStego.get('/extract/:id', async (req, res) => {
    try {
        const doc = await Image.findById(req.params.id);
        if (!doc) {
            return res.status(404).json({ error: "Imagen no encontrada" });
        }
        const steggy = require("steggy");
        // Leer la imagen desde S3
        const { buffer } = await storage.readFile(doc.fullname);

        const revealed = steggy.reveal(/* optional password */)(buffer /*, encoding */)

        const hiddenText = revealed.toString('utf8');
        res.json({
            message: "Texto extraído correctamente",
            text: hiddenText
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error al extraer el texto" });
    }
});

//Importante
module.exports = routerStego;