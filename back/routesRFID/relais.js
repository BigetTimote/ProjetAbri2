const express = require('express');
const router  = express.Router();
const dgram   = require('dgram');

const { notifyArduino } = require('./arduino'); // réutilise la fonction existante

// ─────────────────────────────────────────────
// Configuration IPLAB-8-RLY
// ─────────────────────────────────────────────
const IPLAB_IP       = process.env.IPLAB_IP || '172.29.16.67';
const IPLAB_PORT     = 30302;   // Port UDP fixe (cf. manuel)
const CMD_TIMEOUT_MS = 3000;

// ─────────────────────────────────────────────
// IPLAB : envoi d'une commande UDP
// ─────────────────────────────────────────────
function envoyerCommandeIPLAB(commande) {
    return new Promise((resolve, reject) => {
        const client  = dgram.createSocket('udp4');
        const message = Buffer.from(commande);

        const timer = setTimeout(() => {
            client.close();
            reject(new Error(`[IPLAB] Timeout pour la commande "${commande}"`));
        }, CMD_TIMEOUT_MS);

        client.on('message', (msg) => {
            clearTimeout(timer);
            client.close();
            resolve(msg.toString().trim());
        });

        client.on('error', (err) => {
            clearTimeout(timer);
            client.close();
            reject(err);
        });

        client.send(message, 0, message.length, IPLAB_PORT, IPLAB_IP, (err) => {
            if (err) {
                clearTimeout(timer);
                client.close();
                reject(err);
            }
        });
    });
}

// ─────────────────────────────────────────────
// Envoi simultané Arduino + IPLAB
// Promise.allSettled : une erreur sur l'un
// n'empêche pas l'autre d'aboutir
// ─────────────────────────────────────────────
async function ouvrirRelais1(accessData = {}, dureeMs = 5000) {
    console.log('[RELAIS] Ouverture simultanée Arduino + IPLAB relais 1');

    const [resArduino, resIPLAB] = await Promise.allSettled([
        notifyArduino({ ...accessData, action: 'OPEN_BOX' }),
        envoyerCommandeIPLAB('SR1')
    ]);

    if (resArduino.status === 'rejected') {
        console.error('[ARDUINO] Erreur :', resArduino.reason?.error || resArduino.reason?.message);
    } else {
        console.log('[ARDUINO] Notification envoyée');
    }

    if (resIPLAB.status === 'rejected') {
        console.error('[IPLAB] Erreur :', resIPLAB.reason?.message);
    } else {
        console.log('[IPLAB] Relais 1 activé, réponse :', resIPLAB.value);
    }

    // Fermeture du relais IPLAB après dureeMs
    await new Promise(resolve => setTimeout(resolve, dureeMs));

    try {
        await envoyerCommandeIPLAB('CR1');
        console.log('[IPLAB] Relais 1 fermé');
    } catch (err) {
        console.error('[IPLAB] Erreur à la fermeture :', err.message);
    }
}

async function envoyerRefus(accessData = {}) {
    console.log('[RELAIS] Refus envoyé à Arduino + IPLAB');

    const [resArduino, resIPLAB] = await Promise.allSettled([
        notifyArduino({ ...accessData, action: 'REFUSED' }),
        envoyerCommandeIPLAB('CR1')
    ]);

    if (resArduino.status === 'rejected') {
        console.error('[ARDUINO] Erreur :', resArduino.reason?.error || resArduino.reason?.message);
    }
    if (resIPLAB.status === 'rejected') {
        console.error('[IPLAB] Erreur :', resIPLAB.reason?.message);
    }
}

// ─────────────────────────────────────────────
// Routes Express
// ─────────────────────────────────────────────

// POST /relais/open  →  ouvre le relais 1 manuellement
router.post('/open', async (req, res) => {
    const { badge, user, credit, duree } = req.body;
    try {
        // Non bloquant : on répond immédiatement au client
        ouvrirRelais1(
            { badge, user, credit, timestamp: new Date().toISOString() },
            duree || 5000
        ).catch(err => console.error('[RELAIS] Erreur async :', err.message));

        res.json({ success: true, message: 'Ouverture relais 1 en cours' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /relais/status  →  lit l'état actuel du relais 1
router.get('/status', async (req, res) => {
    try {
        const reponse = await envoyerCommandeIPLAB('GR1');
        res.json({
            success: true,
            relais1: reponse === '1' ? 'ACTIF' : 'INACTIF',
            raw: reponse
        });
    } catch (err) {
        res.status(503).json({ success: false, error: err.message });
    }
});

module.exports = router;
module.exports.ouvrirRelais1  = ouvrirRelais1;
module.exports.envoyerRefus   = envoyerRefus;
module.exports.envoyerCommandeIPLAB = envoyerCommandeIPLAB;