const express = require('express'); 
const routerApi = express.Router();
const routerUser = require('./User_routes');
const routerNotes = require('./Notes_routes');
const routerStego = require('./Stego_routes');
const routerPasswords = require('./Passwords_routes');
const routerHashes = require('./Hashes_routes');
const profileRoutes = require('./Profile_routes');


// Rutas de la API (se montan bajo /api en Server.js)
routerApi.post('/login', routerUser);

routerApi.use("/users", routerUser);

routerApi.use("/notes", routerNotes);

routerApi.use('/stego', routerStego);

routerApi.use('/hashes', routerHashes);

routerApi.use("/passwords", routerPasswords);

routerApi.use('/profile', profileRoutes);


module.exports = routerApi;