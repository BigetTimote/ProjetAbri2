const express = require('express');
const router = express.Router();
const mysql = require('mysql2/promise');
const moment = require('moment');
const axios = require('axios');

// --- Importation des méthodes de l'étudiant 1 (relais.js) ---
const { ouvrirRelais1, envoyerRefus } = require('./relais');

const ARDUINO_IP = 'http://172.29.18.201:8080';

const dbConfig = {
    host: process.env.DB_HOST,
    port: 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
};

const pool = mysql.createPool(dbConfig);

// Variable pour stocker la référence au serveur WebSocket
let wss = null;

// ─────────────────────────────────────────────
// Fonction pour envoyer les commandes à l'Arduino
// ─────────────────────────────────────────────
async function piloterArduino(action, data) {
    try {
        await axios.post(`${ARDUINO_IP}/control`, {
            action: action,
            box: data.box || 0,
            user: data.user || "Inconnu",
            credit: data.credit || 0
        }, { timeout: 3000 });
    } catch (err) {
        console.error("[ARDUINO] Erreur de communication:", err.message);
    }
}

// ─────────────────────────────────────────────
// Route principale : scan de badge
// ─────────────────────────────────────────────
router.get('/', async (req, res) => {
    // Récupérer la référence à wss si disponible
    if (!wss && req.app.get('wss')) {
        wss = req.app.get('wss');
    }

    const rawId = req.query.id || "";
    const cardId = rawId.toUpperCase();

    if (req.query.away === '1') {
        return res.status(200).send('<root><releaseId>1</releaseId></root>');
    }

    res.set('Content-Type', 'text/xml');
    console.log(`\n[SCAN] Badge : ${cardId} à ${moment().format('HH:mm:ss DD/MM/YYYY')}`);

    let connection;
    try {
        connection = await pool.getConnection();

        // 1. Vérifier si l'utilisateur existe
        const [users] = await connection.execute('SELECT * FROM users WHERE badge_uid = ?', [cardId]);
        if (users.length === 0) {
            console.log(`[REFUS] Badge inconnu : ${cardId}`);
            piloterArduino('REFUSE', { user: "INCONNU" });
            // Appel de l'API étudiant 1 : refus relais
            await envoyerRefus({ badge: cardId, user: "INCONNU" });
            return res.status(401).send('<root><buzz>2</buzz><ledr>10,5,2</ledr></root>');
        }

        const user = users[0];
        const userName = `${user.prenom} ${user.nom}`;

        // 2. Vérifier si l'utilisateur a déjà un box (Mode RETRAIT)
        const [activeBoxes] = await connection.execute(
            'SELECT * FROM boxes WHERE user_id_actuel = ? AND etat = "OCCUPE"',
            [user.id]
        );

        if (activeBoxes.length > 0) {
            // ── MODE RETRAIT ──────────────────────────────────────────
            const box = activeBoxes[0];

            // Récupérer la session active
            const [sessions] = await connection.execute(
                `SELECT * FROM Consommation_Session
                 WHERE id_utilisateur = ? AND id_box = ? AND date_fin IS NULL
                 ORDER BY date_debut DESC LIMIT 1`,
                [user.id, box.id]
            );

            let nouveauCredit = user.credit_temps;
            let dureeMinutes = 0;

            if (sessions.length > 0) {
                const debut = moment(sessions[0].date_debut);
                const fin = moment();
                dureeMinutes = Math.ceil(fin.diff(debut, 'minutes', true));

                nouveauCredit = user.credit_temps;

                await connection.execute(
                    'UPDATE Consommation_Session SET date_fin = ? WHERE id_session = ?',
                    [fin.format('YYYY-MM-DD HH:mm:ss'), sessions[0].id_session]
                );
            }

            // Libération du box
            await connection.execute(
                'UPDATE boxes SET etat = "LIBRE", user_id_actuel = NULL WHERE id = ?',
                [box.id]
            );

            console.log(
                `[RETRAIT] ${userName} récupère son véhicule | ` +
                `Box n°${box.numero} | ` +
                `Durée d'occupation : ${dureeMinutes} min | ` +
                `Crédit restant : ${nouveauCredit} min`
            );

            piloterArduino('OPEN_BOX', { box: box.numero, user: user.prenom, credit: nouveauCredit });

            // Appel de l'API étudiant 1 : ouverture relais + fermeture automatique après 5s
            await ouvrirRelais1(
                { badge: cardId, user: userName, credit: nouveauCredit, box: box.numero },
                10000
            );

            return res.status(200).send('<root><buzz>1</buzz><ledg>20,0,1</ledg><open>1</open></root>');

        } else {
            // ── MODE DÉPÔT ────────────────────────────────────────────

            // Vérification du crédit (sauf admin)
            if (user.credit_temps <= 0 && user.is_admin === 0) {
                console.log(
                    `[REFUS] ${userName} | Raison : crédit épuisé (${user.credit_temps} min)`
                );
                piloterArduino('REFUSE', { user: user.prenom, credit: user.credit_temps });
                // Appel de l'API étudiant 1 : refus relais
                await envoyerRefus({ badge: cardId, user: userName, credit: user.credit_temps });
                return res.status(403).send('<root><buzz>2</buzz><ledr>10,5,2</ledr></root>');
            }
            
            // ── Contrainte des 25 heures ──────────────────────────────
            /* Vérifier si l'utilisateur a fait un retrait il y a moins de 25h
            const [lastSessions] = await connection.execute(
                `SELECT * FROM Consommation_Session
                 WHERE id_utilisateur = ? AND date_fin IS NOT NULL
                 ORDER BY date_fin DESC LIMIT 1`,
                [user.id]
            );

            if (lastSessions.length > 0 && user.is_admin === 0) {
                const dernierDepot = moment(lastSessions[0].date_debut);
                const now = moment();
                const heuresDepuis = now.diff(dernierDepot, 'hours', true);
                const DELAI_25H = 25;

                if (heuresDepuis < DELAI_25H) {
                    const dateAutorisee = dernierDepot.clone().add(DELAI_25H, 'hours');
                    const resteMinutes = Math.ceil(dateAutorisee.diff(now, 'minutes', true));
                    const resteHeures = Math.floor(resteMinutes / 60);
                    const resteMin = resteMinutes % 60;

                    console.log(
                        `[REFUS] ${userName} | Raison : contrainte 25h non respectée | ` +
                        `Dernier dépôt : ${dernierDepot.format('HH:mm DD/MM/YYYY')} | ` +
                        `Accès autorisé à partir de : ${dateAutorisee.format('HH:mm DD/MM/YYYY')} | ` +
                        `Temps restant : ${resteHeures}h ${resteMin}min`
                    );
                    piloterArduino('REFUSE', { user: user.prenom, credit: user.credit_temps });
                    await envoyerRefus({ badge: cardId, user: userName, credit: user.credit_temps });
                    return res.status(403).send('<root><buzz>2</buzz><ledr>10,5,2</ledr></root>');
                }
            }
                */

            // Vérifier s'il reste des boxes libres
            const [freeBoxes] = await connection.execute(
                'SELECT * FROM boxes WHERE etat = "LIBRE" LIMIT 1'
            );
            if (freeBoxes.length === 0) {
                console.log(`[REFUS] ${userName} | Raison : aucun box disponible (abri complet)`);
                piloterArduino('ERROR', { user: "COMPLET" });
                return res.status(503).send('<root><buzz>3</buzz></root>');
            }

            const box = freeBoxes[0];
            const now = moment();

            // Attribution du box
            await connection.execute(
                'UPDATE boxes SET etat = "OCCUPE", user_id_actuel = ? WHERE id = ?',
                [user.id, box.id]
            );
            await connection.execute(
                'INSERT INTO Consommation_Session (id_utilisateur, id_box, date_debut) VALUES (?, ?, ?)',
                [user.id, box.id, now.format('YYYY-MM-DD HH:mm:ss')]
            );

            console.log(
                `[DÉPÔT] ${userName} | ` +
                `Box attribué : n°${box.numero} | ` +
                `Crédit actuel : ${user.credit_temps} min | ` +
                `Heure d'entrée : ${now.format('HH:mm:ss DD/MM/YYYY')}`
            );

            piloterArduino('OPEN_BOX', { box: box.numero, user: user.prenom, credit: user.credit_temps });

            // Appel de l'API étudiant 1 : ouverture relais + fermeture automatique après 5s
            await ouvrirRelais1(
                { badge: cardId, user: userName, credit: user.credit_temps, box: box.numero },
                5000
            );

            return res.status(200).send('<root><buzz>1</buzz><ledg>20,0,1</ledg><open>1</open></root>');
        }

    } catch (error) {
        console.error('[ERREUR SERVEUR]', error);
        res.status(500).send('<root><buzz>3</buzz></root>');
    } finally {
        if (connection) connection.release();
    }
});

// ─────────────────────────────────────────────
// TÂCHE PLANIFIÉE : Décrémentation du crédit toutes les minutes
// ─────────────────────────────────────────────
setInterval(async () => {
    let connection;
    try {
        connection = await pool.getConnection();

        // Récupérer toutes les sessions actives (box occupé, session ouverte)
        const [activeSessions] = await connection.execute(`
            SELECT cs.id_session, cs.id_utilisateur, cs.id_box, cs.date_debut,
                   u.prenom, u.nom, u.credit_temps, u.is_admin, u.id
            FROM Consommation_Session cs
            JOIN users u ON u.id = cs.id_utilisateur
            WHERE cs.date_fin IS NULL
        `);

        if (activeSessions.length === 0) return;

        const now = moment();

        for (const session of activeSessions) {
            if (session.is_admin === 1) continue; // Les admins ne consomment pas de crédit

            const nouveauCredit = session.credit_temps - 1;
            await connection.execute(
                'UPDATE users SET credit_temps = ? WHERE id = ?',
                [nouveauCredit, session.id_utilisateur]
            );

            console.log(
                `[CRÉDIT] ${session.prenom} ${session.nom} | Box n°${session.id_box} | ` +
                `Crédit restant : ${nouveauCredit} min` +
                (nouveauCredit <= 0 ? ' ⚠️  CRÉDIT ÉPUISÉ' : '')
            );

            // Notifier tous les clients WebSocket connectés
            if (wss) {
                wss.clients.forEach((client) => {
                    if (client.readyState === 1) { // OPEN
                        client.send(JSON.stringify({
                            type: 'CREDIT_UPDATE',
                            user_id: session.id_utilisateur,
                            nom: session.nom,
                            prenom: session.prenom,
                            credit_temps: nouveauCredit,
                            timestamp: now.format('HH:mm:ss')
                        }));
                    }
                });
            }
        }
    } catch (err) {
        console.error('[CRÉDIT INTERVAL] Erreur :', err.message);
    } finally {
        if (connection) connection.release();
    }
}, 60 * 1000); // toutes les 60 secondes

module.exports = router;