
const express = require('express');
const router = express.Router();
const http = require('http');

const ARDUINO_CONFIG = {
    host: '172.29.18.201', 
    port: 8080,
    timeout: 5000
};

/**
 * @param {Object} accessData - Données de l'accès RFID
 */
function notifyArduino(accessData) {
    const payload = JSON.stringify(accessData);
    
    const options = {
        hostname: ARDUINO_CONFIG.host,
        port: ARDUINO_CONFIG.port,
        path: '/notify',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload)
        },
        timeout: ARDUINO_CONFIG.timeout
    };

    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                console.log(`[ARDUINO] Réponse reçue: ${data}`);
                resolve({ success: true, response: data });
            });
        });

        req.on('error', (error) => {
            console.error(`[ARDUINO] Erreur de connexion: ${error.message}`);
            reject({ success: false, error: error.message });
        });

        req.on('timeout', () => {
            req.destroy();
            console.error('[ARDUINO] Timeout de connexion');
            reject({ success: false, error: 'Timeout' });
        });

        req.write(payload);
        req.end();
    });
}

 
router.post('/test', async (req, res) => {
    const testData = {
        access: 'granted',
        badge: 'TEST1234',
        user: 'Test User',
        credit: 120,
        timestamp: new Date().toISOString()
    };

    try {
        const result = await notifyArduino(testData);
        res.json({
            success: true,
            message: 'Notification envoyée à l\'Arduino',
            result: result
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Échec de l\'envoi à l\'Arduino',
            error: error
        });
    }
});

router.get('/status', async (req, res) => {
    const pingData = {
        type: 'ping',
        timestamp: new Date().toISOString()
    };

    try {
        const result = await notifyArduino(pingData);
        res.json({
            success: true,
            message: 'Arduino accessible',
            arduino_ip: ARDUINO_CONFIG.host,
            arduino_port: ARDUINO_CONFIG.port
        });
    } catch (error) {
        res.status(503).json({
            success: false,
            message: 'Arduino non accessible',
            arduino_ip: ARDUINO_CONFIG.host,
            arduino_port: ARDUINO_CONFIG.port,
            error: error.error
        });
    }
});

module.exports = router;
module.exports.notifyArduino = notifyArduino;