const express = require('express');
const dgram   = require('dgram');

// ─────────────────────────────────────────────
// Classe : Client UDP pour communiquer avec IPLAB
// ─────────────────────────────────────────────
class ClientIPLAB {
    #ip;
    #port;
    #timeoutMs;

    constructor(ip, port = 30302, timeoutMs = 3000) {
        this.#ip        = ip;
        this.#port      = port;
        this.#timeoutMs = timeoutMs;
    }

    envoyerCommande(commande) {
        return new Promise((resolve, reject) => {
            const client  = dgram.createSocket('udp4');
            const message = Buffer.from(commande);

            const timer = setTimeout(() => {
                client.close();
                reject(new Error(`[IPLAB] Timeout pour la commande "${commande}"`));
            }, this.#timeoutMs);

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

            client.send(message, 0, message.length, this.#port, this.#ip, (err) => {
                if (err) {
                    clearTimeout(timer);
                    client.close();
                    reject(err);
                }
            });
        });
    }
}

// ─────────────────────────────────────────────
// Classe : Représente un Box (emplacement vélo)
// ─────────────────────────────────────────────
class Box {
    #numero;
    #relais;
    #deuxiemePassage;

    constructor(numero, relais) {
        this.#numero          = numero;
        this.#relais          = relais;   // ex: [1, 2, 3]
        this.#deuxiemePassage = false;
    }

    get numero()          { return this.#numero; }
    get relais()          { return [...this.#relais]; }
    get gache()           { return this.#relais[0]; }
    get autresRelais()    { return this.#relais.slice(1); }
    get estDeuxiemePassage() { return this.#deuxiemePassage; }

    marquerPremierPassage()   { this.#deuxiemePassage = false; }
    marquerDeuxiemePassage()  { this.#deuxiemePassage = true; }
    reinitialiser()           { this.#deuxiemePassage = false; }
}

// ─────────────────────────────────────────────
// Classe : Gestionnaire de tous les Box + logique relais
// ─────────────────────────────────────────────
class GestionnaireRelais {
    #client;
    #boxes;

    constructor(clientIPLAB) {
        this.#client = clientIPLAB;
        this.#boxes  = new Map([
            [1, new Box(1, [1, 2, 3])],
            [2, new Box(2, [4, 5, 6])],
            [3, new Box(3, [7, 8])]
        ]);
    }

    getBox(numero) {
        return this.#boxes.get(numero) ?? null;
    }

    async ouvrirRelais(boxNumero) {
        const box = this.getBox(boxNumero);

        if (!box) {
            console.warn(`[RELAIS] Box inconnu : ${boxNumero} — aucun relais activé`);
            return 'BOX_INCONNU';
        }

        // 1er passage : l'utilisateur entre son vélo → tout ouvrir
        if (!box.estDeuxiemePassage) {
            for (const r of box.relais) {
                try {
                    const reponse = await this.#client.envoyerCommande(`SR${r}`);
                    console.log(`[IPLAB] Relais ${r} activé, réponse : ${reponse}`);
                } catch (err) {
                    console.error(`[IPLAB] Erreur à l'ouverture du relais ${r} :`, err.message);
                }
            }

            box.marquerDeuxiemePassage();
            return 'OUVERTURE_TOTALE';

        // 2ème passage : l'utilisateur sort son vélo → gâche seule + fermer le reste
        } else {
            try {
                const reponse = await this.#client.envoyerCommande(`SR${box.gache}`);
                console.log(`[IPLAB] Relais ${box.gache} (Gâche) activé, réponse : ${reponse}`);
            } catch (err) {
                console.error(`[IPLAB] Erreur à l'ouverture de la gâche ${box.gache} :`, err.message);
            }

            for (const r of box.autresRelais) {
                try {
                    const reponse = await this.#client.envoyerCommande(`CR${r}`);
                    console.log(`[IPLAB] Relais ${r} fermé, réponse : ${reponse}`);
                } catch (err) {
                    console.error(`[IPLAB] Erreur à la fermeture du relais ${r} :`, err.message);
                }
            }

            box.reinitialiser();
            return 'OUVERTURE_GACHE_SEULE';
        }
    }

    async envoyerRefus(boxNumero) {
        const box    = this.getBox(boxNumero);
        const relais = box ? box.relais : [1];

        console.log(`[RELAIS] Refus — Fermeture des relais ${relais.join(', ')}${boxNumero ? ` (box ${boxNumero})` : ' (défaut)'}`);

        for (const r of relais) {
            try {
                await this.#client.envoyerCommande(`CR${r}`);
                console.log(`[IPLAB] Relais ${r} fermé (suite au refus)`);
            } catch (err) {
                console.error(`[IPLAB] Erreur à la fermeture du relais ${r} :`, err.message);
            }
        }

        if (box) box.reinitialiser();
    }

    async lireStatutRelais(numeroRelais) {
        const reponse = await this.#client.envoyerCommande(`GR${numeroRelais}`);
        return reponse === '1' ? 'ACTIF' : 'INACTIF';
    }
}

// ─────────────────────────────────────────────
// Classe : Routeur Express pour l'API relais
// ─────────────────────────────────────────────
class RouteurRelais {
    #gestionnaire;
    router;

    constructor(gestionnaire) {
        this.#gestionnaire = gestionnaire;
        this.router        = express.Router();
        this.#initialiserRoutes();
    }

    #initialiserRoutes() {
        this.router.post('/open',   this.#handleOpen.bind(this));
        this.router.get('/status',  this.#handleStatus.bind(this));
    }

    async #handleOpen(req, res) {
        const boxNumero = req.body?.box;

        if (!this.#gestionnaire.getBox(boxNumero)) {
            return res.status(400).json({
                success: false,
                error: `Box invalide : ${boxNumero}. Valeurs acceptées : 1, 2, 3`
            });
        }

        try {
            const actionEffectuee = await this.#gestionnaire.ouvrirRelais(boxNumero);
            res.json({
                success: true,
                action:  actionEffectuee,
                message: `Action traitée pour le box ${boxNumero} : ${actionEffectuee}`
            });
        } catch (err) {
            console.error('[RELAIS] Erreur :', err.message);
            res.status(500).json({
                success: false,
                error: 'Erreur lors de la communication avec la carte relais'
            });
        }
    }

    async #handleStatus(req, res) {
        const r = parseInt(req.query.relais) || 1;
        try {
            const statut  = await this.#gestionnaire.lireStatutRelais(r);
            const reponse = await this.#gestionnaire.lireStatutRelais(r);
            res.json({
                success:        true,
                [`relais${r}`]: statut,
                raw:            reponse
            });
        } catch (err) {
            res.status(503).json({ success: false, error: err.message });
        }
    }
}

// ─────────────────────────────────────────────
// Instanciation & export
// ─────────────────────────────────────────────
const clientIPLAB    = new ClientIPLAB(process.env.IPLAB_IP);
const gestionnaire   = new GestionnaireRelais(clientIPLAB);
const routeurRelais  = new RouteurRelais(gestionnaire);

module.exports                          = routeurRelais.router;
module.exports.ouvrirRelais1            = (data) => gestionnaire.ouvrirRelais(data?.box);
module.exports.envoyerRefus             = (data) => gestionnaire.envoyerRefus(data?.box);
module.exports.envoyerCommandeIPLAB     = (cmd)  => clientIPLAB.envoyerCommande(cmd);