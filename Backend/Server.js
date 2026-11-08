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

// Si la BD no está disponible al arrancar (por ejemplo, DocumentDB detenido),
// se reintenta cada 5 segundos en lugar de quedarse sin conexión.
function connectWithRetry() {
    mongoose.connect(mongoConnection).catch((err) => {
        console.error("No se pudo conectar a la base de datos, reintentando en 5 s:", err.message);
        setTimeout(connectWithRetry, 5000);
    });
}
connectWithRetry();

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

// Manejo de errores: responde JSON en lugar de dejar la petición colgada
// (por ejemplo, un archivo demasiado grande o un id con formato inválido)
app.use((err, req, res, next) => {
    if (err.name === 'MulterError') {
        return res.status(400).json({ error: `Archivo no válido: ${err.message}` });
    }
    if (err.name === 'CastError') {
        return res.status(400).json({ error: 'Identificador inválido' });
    }
    console.error('Error no controlado:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
});

// Evita que una promesa rechazada sin manejar detenga todo el servidor
process.on('unhandledRejection', (reason) => {
    console.error('Promesa rechazada sin manejar:', reason);
});


// Inicio de server
app.listen(port, ()=> {
    console.log(`ZeroLock corriendo en el puerto ${port}!`);
});
