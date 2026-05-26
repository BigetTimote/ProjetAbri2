const express = require('express');
const router  = express.Router();
const dgram   = require('dgram');

// ─────────────────────────────────────────────
// Configuration IPLAB-8-RLY
// ─────────────────────────────────────────────
const IPLAB_IP       = process.env.IPLAB_IP;
const IPLAB_PORT     = 30302;
const CMD_TIMEOUT_MS = 3000;

// ─────────────────────────────────────────────
//    box → relais
//  Box 1 → Relais 1, 2, 3 (1 = gâche)
//  Box 2 → Relais 4, 5, 6 (4 = gâche)
//  Box 3 → Relais 7, 8    (7 = gâche)
// ─────────────────────────────────────────────
const BOX_RELAIS = {
    1: [1, 2, 3],
    2: [4, 5, 6],
    3: [7, 8]
};

// ─────────────────────────────────────────────
// État des box (false = 1er passage, true = 2ème passage)
// ─────────────────────────────────────────────
const etatsBox = {
    1: false,
    2: false,
    3: false
};

// ─────────────────────────────────────────────
// IPLAB : commande UDP
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
// Contrôle Relais IPLAB
// ─────────────────────────────────────────────
async function ouvrirRelais1(data = {}) {
    const boxNumero = data.box;
    const relais    = BOX_RELAIS[boxNumero];

    if (!relais) {
        console.warn(`[RELAIS] Box inconnu : ${boxNumero} — aucun relais activé`);
        return 'BOX_INCONNU';
    }

    const estDeuxiemePassage = etatsBox[boxNumero];

   // l'utilisateur entre son vélo
    if (!estDeuxiemePassage) {
        for (const r of relais) {
            try {
                const reponse = await envoyerCommandeIPLAB(`SR${r}`);
                console.log(`[IPLAB] Relais ${r} activé, réponse : ${reponse}`);
            } catch (err) {
                console.error(`[IPLAB] Erreur à l'ouverture du relais ${r} :`, err.message);
            }
        }
        
        etatsBox[boxNumero] = true;
        return 'OUVERTURE_TOTALE';

    } else {
        // l'utilisateur sort son vélo
        const gache = relais[0];
        const autresRelais = relais.slice(1);
    
        try {
            const reponse = await envoyerCommandeIPLAB(`SR${gache}`);
            console.log(`[IPLAB] Relais ${gache} (Gâche) activé, réponse : ${reponse}`);
        } catch (err) {
            console.error(`[IPLAB] Erreur à l'ouverture de la gâche ${gache} :`, err.message);
        }

        // fermer les autres relais du box
        for (const r of autresRelais) {
            try {
                const reponse = await envoyerCommandeIPLAB(`CR${r}`);
                console.log(`[IPLAB] Relais ${r} fermé, réponse : ${reponse}`);
            } catch (err) {
                console.error(`[IPLAB] Erreur à la fermeture du relais ${r} :`, err.message);
            }
        }

        // Réinitialise l'état pour le prochain client
        etatsBox[boxNumero] = false;
        return 'OUVERTURE_GACHE_SEULE';
    }
}

async function envoyerRefus(data = {}) {
    const boxNumero = data.box;
    const relais    = BOX_RELAIS[boxNumero] || [1];

    console.log(`[RELAIS] Refus — Fermeture des relais ${relais.join(', ')}${boxNumero ? ` (box ${boxNumero})` : ' (défaut)'}`);

    for (const r of relais) {
        try {
            await envoyerCommandeIPLAB(`CR${r}`);
            console.log(`[IPLAB] Relais ${r} fermé (suite au refus)`);
        } catch (err) {
            console.error(`[IPLAB] Erreur à la fermeture du relais ${r} :`, err.message);
        }
    }
    
    if (boxNumero && etatsBox[boxNumero] !== undefined) {
        etatsBox[boxNumero] = false;
    }
}

// ─────────────────────────────────────────────
// Routes Express
// ─────────────────────────────────────────────
router.post('/open', async (req, res) => {
    const boxNumero = req.body?.box;
    
    if (!BOX_RELAIS[boxNumero]) {
        return res.status(400).json({ success: false, error: `Box invalide : ${boxNumero}. Valeurs acceptées : 1, 2, 3` });
    }

    try {
        const actionEffectuee = await ouvrirRelais1({ box: boxNumero, user: 'API' });
        
        res.json({ 
            success: true, 
            action: actionEffectuee,
            message: `Action traitée pour le box ${boxNumero} : ${actionEffectuee}` 
        });
    } catch (err) {
        console.error('[RELAIS] Erreur :', err.message);
        res.status(500).json({ success: false, error: "Erreur lors de la communication avec la carte relais" });
    }
});

// GET etat d'un relais
router.get('/status', async (req, res) => {
    const r = parseInt(req.query.relais) || 1;
    try {
        const reponse = await envoyerCommandeIPLAB(`GR${r}`);
        res.json({
            success: true,
            [`relais${r}`]: reponse === '1' ? 'ACTIF' : 'INACTIF',
            raw: reponse
        });
    } catch (err) {
        res.status(503).json({ success: false, error: err.message });
    }
});

module.exports = router;
module.exports.ouvrirRelais1        = ouvrirRelais1;
module.exports.envoyerRefus         = envoyerRefus;
module.exports.envoyerCommandeIPLAB = envoyerCommandeIPLAB;