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
        default: Date.now // se evalúa en cada documento (new Date() fijaba la fecha al arrancar)
    },
    description: {
        type: String,
        required: true
    }
});

// Exportamos el modelo para poder usarlo en otros archivos. 
module.exports = mongoose.model('image', imageSchema);


