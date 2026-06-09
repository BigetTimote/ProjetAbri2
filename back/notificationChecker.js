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
    
    cron.schedule('* * * * *', () => {
        // On cherche les sessions où date_fin est NULL (session en cours)
        // ET où la notification n'a pas encore été envoyée (notification_sent = 0)
        const sql = `
            SELECT cs.id_session, ups.user_id, ups.subscription_data, 
            TIMESTAMPDIFF(MINUTE, cs.date_debut, NOW()) as mins_ecoulees
            FROM Consommation_Session cs
            JOIN user_push_subscriptions ups ON cs.id_utilisateur = ups.user_id
            WHERE cs.date_fin IS NULL 
            AND TIMESTAMPDIFF(MINUTE, cs.date_debut, NOW()) >= 1
            AND (cs.notification_sent = 0 OR cs.notification_sent IS NULL)
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
                            title: "Vehicule Charge !",
                            body: `Votre vehicule est chargé depuis ${row.mins_ecoulees} minute(s).`,
                            icon: "/logo192.png",
                            badge: "/logo-badge.png",
                            tag: "session-notification",
                            renotify: true,
                            requireInteraction: false
                        });
                        
                        webpush.sendNotification(subscription, payload)
                            .then(() => {
                                console.log(`Notification envoyée à user ${row.user_id} après ${row.mins_ecoulees} min`);
                                // Marquer la session comme ayant reçu la notification
                                db.query(
                                    'UPDATE Consommation_Session SET notification_sent = 1 WHERE id_session = ?',
                                    [row.id_session],
                                    (updateErr) => {
                                        if (updateErr) {
                                            console.error(`Erreur mise à jour notification_sent:`, updateErr.message);
                                        }
                                    }
                                );
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