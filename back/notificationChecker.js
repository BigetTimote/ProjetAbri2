const cron = require('node-cron');
const mysql = require('mysql2');
const webpush = require('web-push');

const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10
});

webpush.setVapidDetails(
    'mailto:admin@abri.local',
    process.env.PUBLIC_VAPID_KEY,
    process.env.PRIVATE_VAPID_KEY
);

module.exports = (wss) => {
    console.log("--- JOB NOTIFICATION MINUTE : ACTIF ---");
    
    // S'exécute toutes les minutes
    cron.schedule('* * * * *', () => {
        // On cherche les sessions où date_fin est NULL (session en cours)
        const sql = `
            SELECT ups.user_id, ups.subscription_data, 
            TIMESTAMPDIFF(MINUTE, cs.date_debut, NOW()) as mins_ecoulees
            FROM Consommation_Session cs
            JOIN user_push_subscriptions ups ON cs.id_utilisateur = ups.user_id
            WHERE cs.date_fin IS NULL
        `;
        
        db.query(sql, (err, results) => {
            if (err) {
                console.error("Erreur recherche notifications:", err.message);
                return;
            }
            
            if (results.length > 0) {
                results.forEach(row => {
                    try {
                        const subscription = JSON.parse(row.subscription_data);
                        const payload = JSON.stringify({
                            title: "Session en cours ⏱️",
                            body: `Vous êtes connecté depuis ${row.mins_ecoulees} minute(s).`,
                            icon: "/logo192.png",
                            badge: "/logo-badge.png",
                            // Le "tag" permet de remplacer la notif précédente au lieu d'en créer une nouvelle
                            tag: "session-status", 
                            // "renotify: false" permet de mettre à jour le texte sans faire vibrer le tel à chaque fois
                            renotify: false,
                            silent: true 
                        });
                        
                        webpush.sendNotification(subscription, payload)
                            .then(() => {
                                console.log(`📬 Update envoyée à user ${row.user_id} (${row.mins_ecoulees} min)`);
                            })
                            .catch(err => {
                                console.error(`Erreur push user ${row.user_id}:`, err.message);
                                if (err.statusCode === 410) {
                                    db.query('DELETE FROM user_push_subscriptions WHERE user_id=?', [row.user_id]);
                                }
                            });
                    } catch (parseErr) {
                        console.error(`Erreur parsing subscription user ${row.user_id}`);
                    }
                });
            }
        });
    }, { timezone: "Europe/Paris" });
};