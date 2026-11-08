const config = require('./config');
const express = require('express');
const router = require('./Routes/api');
const path = require('path')
const app = express();
const port = config.port;
const cors = require('cors');
const mongoose = require('mongoose');

// Frontend (solo para desarrollo local; en AWS lo sirve CloudFront desde S3).
// Se replica la misma estructura que en el bucket: vistas en la raíz,
// y las carpetas Assets y Controllers a un lado.
const frontendDir = path.join(__dirname, '../Frontend');
app.use(express.static(path.join(frontendDir, 'Views')));
app.use('/Assets', express.static(path.join(frontendDir, 'Assets')));
app.use('/Controllers', express.static(path.join(frontendDir, 'Controllers')));

// Middlewares
app.use(cors({
    methods: ['GET','POST','DELETE','UPDATE','PUT','PATCH']
}));
app.use(express.json());

// Conexión a la base de datos
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
db.on('error', (err) => {
    console.error("Error de conexión a la base de datos:", err.message);
});

mongoose.connect(mongoConnection).catch((err) => {
    console.error("No se pudo conectar a la base de datos:", err.message);
});

// Health check para el Target Group del ALB.
// Responde 200 mientras el proceso esté vivo e informa el estado de la BD.
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    });
});

// Rutas API (CloudFront manda todo lo de /api/* al ALB)
app.use('/api', router);


// Inicio de server
app.listen(port, ()=> {
    console.log(`ZeroLock corriendo en el puerto ${port}!`);
});
