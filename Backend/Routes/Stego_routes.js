const express = require('express');
const routerStego = express.Router();
const Image = require('../Models/Images');
const User = require('../Models/User');
const multer = require("multer");
const path = require("path");
const storage = require("../storage");
const verifyToken = require('./authMiddleware');
const { isSelf, forbidden } = require('./authMiddleware');

// Límite de imágenes del plan FREE
const FREE_IMAGES_LIMIT = 3;

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
const upload = multer({
  storage: imageStorage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10 MB
});

//CREATE
routerStego.post(
  "/",
  verifyToken,
  upload.single("image"),
  // upload.single([
  //   { name: "image", maxCount: 1 }
  //   { name: "text", maxCount: 1 }
  // ]),
  (req, res) => {
    if (!isSelf(req, req.body.user_id)) {
      return forbidden(res);
    }
    if (!req.file || !req.body.text) {
      return res.status(400).json({ error: "Se requieren la imagen y el texto" });
    }

    User.findById(req.body.user_id)
      .then(async user => {
        if (!user) {
          return res.status(404).json({ error: "Usuario no encontrado" });
        }

        // FREE PLAN VALIDATION
        if (user.Is_free) {
          const count = await Image.countDocuments({ user_id: req.body.user_id });

          if (count >= FREE_IMAGES_LIMIT) {
            return res.status(403).json({
              error: "Límite de imágenes alcanzado",
              message: `Tu plan FREE solo permite ${FREE_IMAGES_LIMIT} imágenes`
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
routerStego.get('/', verifyToken, async (req, res) => {
    try {
        const Userid = req.query.User_id;
        if (!Userid) {
            return res.status(400).json({ error: "El user ID es requerido" });
        }
        if (!isSelf(req, Userid)) {
            return forbidden(res);
        }
        const docs = await Image.find({ user_id: Userid });
        res.json(docs);
    } catch (err) {
        console.error("Error al consultar las imágenes:", err.message);
        res.status(500).json({ error: "Error al obtener imágenes" });
    }
});

// === UPDATE (solo imágenes propias) ===
routerStego.put('/:id', verifyToken, async (req, res) => {
    try {
        const object_to_update = {};
        if (req.body.nombre !== undefined) {
            object_to_update.prettyname = req.body.nombre;
        }
        if (req.body.Descripción !== undefined) {
            object_to_update.description = req.body.Descripción;
        }
        if (Object.keys(object_to_update).length === 0) {
            return res.status(400).json({ error: "No hay datos para actualizar" });
        }

        const doc = await Image.findOneAndUpdate(
            { _id: req.params.id, user_id: req.user.id },
            object_to_update,
            { new: true }
        );
        if (!doc) {
            return res.status(404).json({ error: "Imagen no encontrada" });
        }
        res.json(doc);
    } catch (err) {
        console.error("Error al actualizar la imagen:", err.message);
        res.status(500).json({ error: "Error al actualizar la imagen" });
    }
});

//DELETE (solo imágenes propias)
routerStego.delete('/:id', verifyToken, async (req, res) => {
    try {
        const doc = await Image.findOneAndDelete({ _id: req.params.id, user_id: req.user.id });
        if (!doc) {
            return res.status(404).json({ error: "Imagen no encontrada" });
        }

        // Borrar el archivo de S3
        try {
            await storage.deleteFile(doc.fullname);
        } catch (err) {
            console.error("No se pudo borrar la imagen del almacenamiento:", err.message);
        }

        // Decrementar el contador sin bajar de 0
        await User.findOneAndUpdate(
            { _id: doc.user_id, Numero_img: { $gt: 0 } },
            { $inc: { Numero_img: -1 } }
        );

        return res.json({
            message: "Imagen eliminada!",
            note: doc
        });
    } catch (err) {
        console.error("Error al eliminar", err.message);
        return res.status(500).json({ error: "Error al eliminar la imagen" });
    }
});

//DATA EXTRACTION (solo imágenes propias)
routerStego.get('/extract/:id', verifyToken, async (req, res) => {
    try {
        const doc = await Image.findOne({ _id: req.params.id, user_id: req.user.id });
        if (!doc) {
            return res.status(404).json({ error: "Imagen no encontrada" });
        }
        const steggy = require("steggy");
        // Leer la imagen desde S3
        const { buffer } = await storage.readFile(doc.fullname);
        const revealed = steggy.reveal()(buffer);

        res.json({
            message: "Texto extraído correctamente",
            text: revealed.toString('utf8')
        });
    } catch (err) {
        console.error("Error al extraer el texto:", err.message);
        res.status(500).json({ error: "Error al extraer el texto" });
    }
});

module.exports = routerStego;
