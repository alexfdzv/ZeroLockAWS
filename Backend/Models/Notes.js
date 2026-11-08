const mongoose = require('mongoose');

// Estos son los elementos que contiene notas
let NotesSchema = mongoose.Schema({
    User_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'users', 
        required: true
    },
    titulo: {
        type: String, 
        required: true
    }, 
    contenido: {
        type: String, 
        required: true
    },
},
{
    timestamps: true
});

// Exportamos el modelo
module.exports = mongoose.model('notes', NotesSchema);
