const mongoose = require('mongoose');

let imageSchema = mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'users', 
        required: true
    },
    fullname: {
        type: String,
        required: true
    },
    prettyname: {
        type: String,
        required: true
    },
    creation: {
        type: Date,
        required: true,
        default: new Date()
    },
    description: {
        type: String,
        required: true
    }
});

// Creamos el modelo (nombre, esquema)
let Image = mongoose.model('image', imageSchema);

// Exportamos el modelo para poder usarlo en otros archivos. 
module.exports = mongoose.model('image', imageSchema);


