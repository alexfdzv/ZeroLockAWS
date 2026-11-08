const mongoose = require('mongoose');

let userSchema = mongoose.Schema({
    nombre: {
        type: String,
        required: true
    },
    correo: {
        type: String,
        required: true,
        unique: true
    },
    pass: {
        type: String,
        required: true
    },
    profileImg: {
        type: String,
        default: null
    },
    Numero_tarjetas: {
        type: Number,
        default: 0,
        required: true
    },
    Numero_pass: {
        type: Number,
        default: 0,
        required: true
    },
    Numero_img: {
        type: Number,
        default: 0,
        required: true
    },
    Numero_notes: {
        type: Number,
        default: 0,
        required: true
    },
    UMK: {
        wrapped: {type: String, required: true}, 
        salt: {type: String, required: true}, 
        iteration: {type: Number, required: true}
    }, 
    Is_free: {
        type: Boolean, 
        required: true, 
        default: true
    }
});

// Creamos el modelo (nombre, esquema)
let User = mongoose.model('users', userSchema);

// Exportamos el modelo para poder usarlo en otros archivos. 
module.exports = mongoose.model('users', userSchema);