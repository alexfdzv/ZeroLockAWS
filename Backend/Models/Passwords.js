const mongoose = require('mongoose');

const passwordSchema = new mongoose.Schema({
    User_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'users',
        required: true
    },
    sitio:    { type: String, required: true },
    usuario:  { type: String, required: true },
    password: { type: String, required: true },
    url:      { type: String, required: true }
}, {
    collection: 'passwords'
});

module.exports = mongoose.model('Password', passwordSchema);