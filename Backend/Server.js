const config = require('./config');
const express = require('express');
const router = require('./Routes/api');
const path = require('path')
const app = express();
const port = config.port;
const cors = require('cors');
const mongoose = require('mongoose');

// Frontend
app.use(express.static(path.join(__dirname, '../Frontend')));

// Middlewares
app.use(cors({
    methods: ['GET','POST','DELETE','UPDATE','PUT','PATCH']
}));
app.use(express.json());

// Conexión a Mondongo
let mongoConnection = config.mongoUri;
let db = mongoose.connection;
db.on('connecting', () => {
    console.log("Conectando...");
    console.log(mongoose.connection.readyState);
});
db.on('connected', () => {
    console.log("¡Conectado exitosamente!");
    console.log(mongoose.connection.readyState);
});

mongoose.connect(mongoConnection);

// Rutas API
app.use(router);

app.use('/uploads', express.static('uploads'));


// Inicio de server
app.listen(port, ()=> {
    console.log(`ZeroLock corriendo en el puerto ${port}!`);
});