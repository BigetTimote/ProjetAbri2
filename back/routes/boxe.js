const express = require('express');
const router = express.Router();
// On récupère la connexion db depuis server.js ou on la redéfinit
const mysql = require('mysql2');
const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
});

router.put('/update-box/:id', (req, res) => {
    const boxId = req.params.id;
    const nouvelEtat = req.body.etat; 

    if (nouvelEtat === undefined) {
        return res.status(400).json({ error: "L'état est manquant" });
    }

    const sql = "UPDATE boxes SET etat = ? WHERE id = ?";
    
    db.query(sql, [nouvelEtat, boxId], (err, result) => {
        if (err) return res.status(500).json({ error: "Erreur BDD" });

        // RÉCUPÉRATION DU SERVEUR WS
        const wss = req.app.get('wss');

        // DIFFUSION À TOUS LES CLIENTS
        wss.clients.forEach((client) => {
            if (client.readyState === 1) { // 1 = OPEN
                client.send(JSON.stringify({ 
                    type: 'BOX_UPDATE', 
                    id: boxId, 
                    etat: nouvelEtat 
                }));
            }
        });
        
        console.log(`📡 WS : Box ${boxId} actualisée`);
        res.json({ success: true });
    });
});

module.exports = router;