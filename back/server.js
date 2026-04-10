require('dotenv').config();
const express = require('express');
const http = require('http'); 
const path = require('path');
const { WebSocketServer } = require('ws'); 
const mysql = require('mysql2');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
});

app.use(express.json());

// CORS Headers
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
});

app.set('wss', wss);
app.use('/register', require('./routes/register'));
app.use('/login', require('./routes/login'));
app.use('/api/solde', require('./routes/solde'));
app.use('/logout', require('./routes/logout'));
app.use('/api/users', require('./routes/users'));
app.use('/log', require('./routesRFID/verification'));
app.use('/ard', require('./routesRFID/arduino'));
app.use('/api/modify', require('./routesApp/modify'));
app.use('/api/delete', require('./routesApp/delete'));
app.use('/api/notification', require('./notification'));
const boxesRoutes = require('./routes/boxes');
const boxesRoute = require('./routes/boxe');

app.use('/api/boxes', boxesRoutes);
app.use('/api', boxesRoute);

app.use(express.static(path.resolve(__dirname, '..')));

wss.on('connection', (ws) => {
    console.log('Client connecté en temps réel');
    
    ws.on('message', (message) => {
        console.log('Reçu du client:', message.toString());
    });

    const interval = setInterval(() => {
        ws.send(JSON.stringify({ type: 'UPDATE_TIME', message: 'Mise à jour du solde...' }));
    }, 10000);

    ws.on('close', () => clearInterval(interval));
});

require('./jobs/resetCredits')();
require('./notificationChecker')(wss);

server.listen(3000, () => {
    console.log("=== SERVEUR + WS OK SUR PORT 3000 ===");
});
