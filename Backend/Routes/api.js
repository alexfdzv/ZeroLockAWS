const express = require('express'); 
const path = require('path');
const routerApi = express.Router();
const routerUser = require('./User_routes');
const routerNotes = require('./Notes_routes');
const routerStego = require('./Stego_routes');
const routerPasswords = require('./Passwords_routes');
const routerHashes = require('./Hashes_routes');
const profileRoutes = require('./Profile_routes');


// Declaración de las rutas 
routerApi.get('/Login.html', (req, res) => 
  res.sendFile(path.join(__dirname, '../../Frontend/Views/Login.html'))
);
routerApi.get('/Profile.html', (req, res) => 
  res.sendFile(path.join(__dirname, '../../Frontend/Views/Profile.html'))
);
routerApi.get('/Passwords.html', (req, res) => 
  res.sendFile(path.join(__dirname, '../../Frontend/Views/Passwords.html'))
);
routerApi.get('/Notes.html', (req, res) => 
  res.sendFile(path.join(__dirname, '../../Frontend/Views/Notes.html'))
);
routerApi.get('/Stego.html', (req, res) => 
  res.sendFile(path.join(__dirname, '../../Frontend/Views/Stego.html'))
);
routerApi.get('/Hashes.html', (req, res) => 
  res.sendFile(path.join(__dirname, '../../Frontend/Views/Hashes.html'))
);

routerApi.post('/login', routerUser);

routerApi.use("/users", routerUser);

routerApi.use("/notes", routerNotes);

routerApi.use('/stego', routerStego);

routerApi.use('/hashes', routerHashes);

routerApi.use("/passwords", routerPasswords);

routerApi.use('/profile', profileRoutes);


module.exports = routerApi;