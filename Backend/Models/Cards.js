const mongoose = require('mongoose');

const cardSchema = new mongoose.Schema({
    User_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'users',
        required: true
    },
    nombreTarjeta: { type: String, required: true },
    titular:       { type: String, required: true },
    numeroTarjeta: { type: String, required: true },
    vencimiento:   { type: String },
    cvv:           { type: String }
}, {
    collection: 'cards'
});

module.exports = mongoose.model('Card', cardSchema);