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

// Configurer web-push
webpush.setVapidDetails(
    'mailto:admin@abri.local',
    process.env.PUBLIC_VAPID_KEY,
    process.env.PRIVATE_VAPID_KEY
);

module.exports = (wss) => {
    console.log("--- JOB NOTIFICATION PUSH: OK ---");
    
    cron.schedule('* * * * *', () => {
        const sql = `
            SELECT ups.user_id, ups.subscription_data, 
            TIMESTAMPDIFF(MINUTE, ups.created_at, NOW()) as mins
            FROM user_push_subscriptions ups 
            WHERE ups.notification_sent = 0 
            AND TIMESTAMPDIFF(MINUTE, ups.created_at, NOW()) >= 120
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
                            title: "⏰ Votre session a dépassé 2 heures",
                            body: `Durée de session: ${row.mins} minutes`,
                            icon: "/logo192.png",
                            badge: "/logo-badge.png",
                            tag: "session-notification",
                            requireInteraction: true
                        });
                        
                        webpush.sendNotification(subscription, payload)
                            .then(() => {
                                console.log(`📬 Notification envoyée à user ${row.user_id}`);
                                db.query(
                                    'UPDATE user_push_subscriptions SET notification_sent=1, notification_sent_at=NOW() WHERE user_id=?',
                                    [row.user_id]
                                );
                            })
                            .catch(err => {
                                console.error(`Erreur push user ${row.user_id}:`, err.message);
                                if (err.statusCode === 410) {
                                    db.query('DELETE FROM user_push_subscriptions WHERE user_id=?', [row.user_id]);
                                }
                            });
                    } catch (parseErr) {
                        console.error(`Erreur parsing subscription user ${row.user_id}:`, parseErr.message);
                    }
                });
            }
        });
    }, { timezone: "Europe/Paris" });
};
