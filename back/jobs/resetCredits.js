const cron = require('node-cron');
const mysql = require('mysql2');

const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10
});

module.exports = () => {
    console.log("--- INITIALISATION DU JOB CRON : OK ---");


    cron.schedule('0 2 * * 1', () => { 
        resetLogic();
    }, { timezone: "Europe/Paris" });

    function resetLogic() {
        const maintenant = new Date().toLocaleString();
        console.log(`[${maintenant}] Tentative de reset des crédits...`);

        const sql = "UPDATE users SET credit_temps = 600 WHERE is_admin = 0";

        db.query(sql, (err, result) => {
            if (err) {
                console.error("Erreur SQL dans le Cron :", err.message);
            } else {
                console.log(`Succès : ${result.affectedRows} utilisateurs réinitialisés.`);
            }
        });
    }
};