const express = require('express');
const router = express.Router();
const mysql = require('mysql2/promise');

const dbConfig = {
    host: process.env.DB_HOST,
    port: 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
};

const pool = mysql.createPool(dbConfig);

// Stockage des événements capteur en mémoire (dernière ouverture par box et user)
let captorEvents = {};

/**
 * POST /capteur
 * Reçoit les données du capteur RFID envoyées par l'Arduino
 * Fonctionne UNIQUEMENT pour la box numéro 1
 */
router.post('/', async (req, res) => {
    console.log('[CAPTEUR RFID] Données reçues:', req.body);
    
    const { etat, source } = req.body;
    const boxId = 1; // Toujours la box 1
    
    // Récupérer la référence au serveur WebSocket
    const wss = req.app.get('wss');
    
    // Si la box est ouverte, notifier l'utilisateur de la box
    if (etat === 'ouvert') {
        try {
            const connection = await pool.getConnection();
            
            // Récupérer l'utilisateur actuellement dans la box 1
            const [boxes] = await connection.execute(
                'SELECT user_id_actuel FROM boxes WHERE numero = 1 AND etat = "OCCUPE"'
            );
            
            connection.release();
            
            if (boxes.length > 0) {
                const userId = boxes[0].user_id_actuel;
                
                // Stocker l'événement pour les clients HTTP (polling fallback)
                captorEvents[`box_${boxId}_user_${userId}`] = {
                    timestamp: Date.now(),
                    boxId: boxId,
                    userId: userId,
                    etat: etat,
                    source: source
                };
                
                // Broadcast WebSocket pour les clients en HTTP
                if (wss) {
                    wss.clients.forEach((client) => {
                        if (client.readyState === 1) { // OPEN
                            client.send(JSON.stringify({
                                type: 'BOX_OUVERT',
                                message: 'BOX OUVERT',
                                etat: etat,
                                source: source,
                                boxId: boxId,
                                userId: userId,
                                timestamp: new Date().toLocaleTimeString('fr-FR')
                            }));
                        }
                    });
                }
                console.log(`[CAPTEUR RFID] Message "BOX OUVERT" envoyé à l'utilisateur ${userId}`);
            }
        } catch (err) {
            console.error('[CAPTEUR RFID] Erreur:', err.message);
        }
    }
    
    res.json({
        success: true,
        message: 'Données reçues',
        data: req.body
    });
});

/**
 * GET /capteur/check/:boxId/:userId
 * Vérifie s'il y a eu une ouverture récente pour cet utilisateur dans cette box
 * Utilisé par les clients HTTPS en fallback
 */
router.get('/check/:boxId/:userId', (req, res) => {
    const { boxId, userId } = req.params;
    const eventKey = `box_${boxId}_user_${userId}`;
    const event = captorEvents[eventKey];
    
    if (event && Date.now() - event.timestamp < 65000) { // 65 secondes (1 min + buffer)
        // Événement trouvé et encore valide
        res.json({
            success: true,
            hasEvent: true,
            event: event
        });
        
        // Supprimer après envoi pour éviter les doublons
        delete captorEvents[eventKey];
    } else {
        res.json({
            success: true,
            hasEvent: false
        });
    }
});


module.exports = router;
