
const express = require('express');
const router = express.Router();
const mysql = require('mysql2/promise');
const { notifyArduino } = require('./arduino');

const dbConfig = {
    host: '172.29.17.49',
    port: 3306,
    user: 'root',
    password: 'root',
    database: 'Abri'
};

const pool = mysql.createPool(dbConfig);

router.get('/', async (req, res) => {
    const rawId = req.query.id || "";
    const cardId = rawId.toUpperCase();

    if (req.query.away === '1') {
        return res.status(200).send('<root><releaseId>1</releaseId></root>');
    }

    res.set('Content-Type', 'text/xml');

    console.log(`[INFO] Requête reçue pour le badge : ${cardId}`);

    try {
        const [rows] = await pool.execute(
            'SELECT * FROM users WHERE badge_uid = ?',
            [cardId]
        );

        if (rows.length > 0) {
            const user = rows[0];
            console.log(`[ACCES OK] Utilisateur reconnu : ${user.prenom} ${user.nom}`);

            if (user.credit_temps <= 0 && user.is_admin === 0) {
                console.log(`[REFUS] Crédit temps épuisé pour ${user.prenom} ${user.nom}`);
                
                console.log(`[NOTIFICATION ARDUINO] Envoi - Crédit épuisé pour ${user.prenom} ${user.nom}`);
                
                notifyArduino({
                    access: 'denied',
                    badge: cardId,
                    user: `${user.prenom} ${user.nom}`,
                    credit: user.credit_temps,
                    reason: 'Crédit temps épuisé',
                    timestamp: new Date().toISOString()
                }).then(() => {
                    console.log(`[ARDUINO] ✓ Notification refus envoyée avec succès`);
                }).catch(err => {
                    console.error('[ARDUINO] ✗ Erreur notification:', err);
                });

                return res.status(401).send(`
                    <root>
                        <buzz>2</buzz>
                        <ledr>10,5,2</ledr>
                        <releaseId>1</releaseId>
                    </root>
                `);
            }

            console.log(`[NOTIFICATION ARDUINO] Envoi pour ${user.prenom} ${user.nom}`);
            
            notifyArduino({
                access: 'granted',
                badge: cardId,
                user: `${user.prenom} ${user.nom}`,
                credit: user.credit_temps,
                is_admin: user.is_admin,
                timestamp: new Date().toISOString()
            }).then(() => {
                console.log(`[ARDUINO] ✓ Notification envoyée avec succès`);
            }).catch(err => {
                console.error('[ARDUINO] ✗ Erreur notification:', err);
            });

            res.status(200).send(`
                <root>
                    <buzz>1</buzz>
                    <ledg>20,0,1</ledg>
                    <open>1</open>
                    <releaseId>1</releaseId>
                </root>
            `);

        } else {
            console.log(`[ACCES REFUSÉ] Badge inconnu : ${cardId} - Pas de notification Arduino`);
           
            res.status(401).send(`
                <root>
                    <buzz>2</buzz>
                    <ledr>10,5,2</ledr>
                    <releaseId>1</releaseId>
                </root>
            `);
        }

    } catch (error) {
        console.error('[ERREUR BDD] Problème de connexion ou de requête :', error);
        
        
        res.status(500).send('<root><buzz>3</buzz><ledr>10,5,3</ledr></root>');
    }
});

module.exports = router;
