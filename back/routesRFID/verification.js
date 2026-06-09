const express = require('express');
const mysql = require('mysql2/promise');
const moment = require('moment');
const { ouvrirRelais1, envoyerRefus } = require('./relais');

// ═══════════════════════════════════════════════════════════════
// COUCHE DOMAINE — Les entités et leurs comportements naturels
// Ce sont les "vrais objets" du monde réel, sans aucune dépendance
// technique (pas de DB, pas d'HTTP, pas d'Arduino)
// ═══════════════════════════════════════════════════════════════

class User {
    constructor({ id, prenom, nom, badge_uid, credit_temps, is_admin }) {
        this.id = id;
        this.prenom = prenom;
        this.nom = nom;
        this.badgeUid = badge_uid;
        this.creditTemps = credit_temps;
        this.isAdmin = is_admin === 1;
    }

    get fullName() {
        return `${this.prenom} ${this.nom}`;
    }

    hasCredit() {
        return this.isAdmin || this.creditTemps > 0;
    }

    decrementCredit() {
        if (!this.isAdmin) {
            this.creditTemps -= 1;
        }
    }
}

class Box {
    static ETAT_LIBRE   = 'LIBRE';
    static ETAT_OCCUPE  = 'OCCUPE';

    constructor({ id, numero, etat, user_id_actuel }) {
        this.id           = id;
        this.numero       = numero;
        this.etat         = etat;
        this.userIdActuel = user_id_actuel;
    }

    get isOccupied() {
        return this.etat === Box.ETAT_OCCUPE;
    }

    get isFree() {
        return this.etat === Box.ETAT_LIBRE;
    }

    assignTo(userId) {
        this.etat         = Box.ETAT_OCCUPE;
        this.userIdActuel = userId;
    }

    release() {
        this.etat         = Box.ETAT_LIBRE;
        this.userIdActuel = null;
    }
}

class Session {
    static DELAI_ENTRE_DEPOTS_HEURES = 25;

    constructor({ id_session, id_utilisateur, id_box, date_debut, date_fin = null }) {
        this.id          = id_session;
        this.userId      = id_utilisateur;
        this.boxId       = id_box;
        this.dateDebut   = moment(date_debut);
        this.dateFin     = date_fin ? moment(date_fin) : null;
    }

    get isActive() {
        return this.dateFin === null;
    }

    get durationMinutes() {
        const fin = this.dateFin || moment();
        return Math.ceil(fin.diff(this.dateDebut, 'minutes', true));
    }

    close() {
        this.dateFin = moment();
        return this.dateFin;
    }

    // Règle métier : peut-on déposer après cette session ?
    canDepotAfter() {
        if (!this.dateFin) return true;
        const heuresDepuis = moment().diff(this.dateDebut, 'hours', true);
        return heuresDepuis >= Session.DELAI_ENTRE_DEPOTS_HEURES;
    }

    nextAllowedDepotAt() {
        return this.dateDebut.clone().add(Session.DELAI_ENTRE_DEPOTS_HEURES, 'hours');
    }
}

// ═══════════════════════════════════════════════════════════════
// COUCHE INFRASTRUCTURE — Accès à la base de données
// Les repositories savent lire/écrire en DB mais ne contiennent
// aucune règle métier. Ils retournent des entités du domaine.
// ═══════════════════════════════════════════════════════════════

class Database {
    constructor(config) {
        this.pool = mysql.createPool(config);
    }

    async getConnection() {
        return this.pool.getConnection();
    }
}

class UserRepository {
    constructor(connection) {
        this.conn = connection;
    }

    async findByBadge(badgeUid) {
        const [rows] = await this.conn.execute(
            'SELECT * FROM users WHERE badge_uid = ?',
            [badgeUid]
        );
        return rows.length > 0 ? new User(rows[0]) : null;
    }

    async save(user) {
        await this.conn.execute(
            'UPDATE users SET credit_temps = ? WHERE id = ?',
            [user.creditTemps, user.id]
        );
    }
}

class BoxRepository {
    constructor(connection) {
        this.conn = connection;
    }

    async findOccupiedByUser(userId) {
        const [rows] = await this.conn.execute(
            'SELECT * FROM boxes WHERE user_id_actuel = ? AND etat = "OCCUPE"',
            [userId]
        );
        return rows.length > 0 ? new Box(rows[0]) : null;
    }

    async findFirstFree() {
        const [rows] = await this.conn.execute(
            'SELECT * FROM boxes WHERE etat = "LIBRE" LIMIT 1'
        );
        return rows.length > 0 ? new Box(rows[0]) : null;
    }

    async save(box) {
        await this.conn.execute(
            'UPDATE boxes SET etat = ?, user_id_actuel = ? WHERE id = ?',
            [box.etat, box.userIdActuel, box.id]
        );
    }
}

class SessionRepository {
    constructor(connection) {
        this.conn = connection;
    }

    async findActiveByUserAndBox(userId, boxId) {
        const [rows] = await this.conn.execute(
            `SELECT * FROM Consommation_Session
             WHERE id_utilisateur = ? AND id_box = ? AND date_fin IS NULL
             ORDER BY date_debut DESC LIMIT 1`,
            [userId, boxId]
        );
        return rows.length > 0 ? new Session(rows[0]) : null;
    }

    async findLastCompletedByUser(userId) {
        const [rows] = await this.conn.execute(
            `SELECT * FROM Consommation_Session
             WHERE id_utilisateur = ? AND date_fin IS NOT NULL
             ORDER BY date_fin DESC LIMIT 1`,
            [userId]
        );
        return rows.length > 0 ? new Session(rows[0]) : null;
    }

    async findAllActive() {
        const [rows] = await this.conn.execute(`
            SELECT cs.id_session, cs.id_utilisateur, cs.id_box, cs.date_debut,
                   u.prenom, u.nom, u.credit_temps, u.is_admin, u.id
            FROM Consommation_Session cs
            JOIN users u ON u.id = cs.id_utilisateur
            WHERE cs.date_fin IS NULL
        `);
        return rows.map(row => ({
            session: new Session(row),
            user: new User({ ...row, id: row.id_utilisateur })
        }));
    }

    async create(userId, boxId) {
        const now = moment();
        const [result] = await this.conn.execute(
            'INSERT INTO Consommation_Session (id_utilisateur, id_box, date_debut) VALUES (?, ?, ?)',
            [userId, boxId, now.format('YYYY-MM-DD HH:mm:ss')]
        );
        return new Session({
            id_session:      result.insertId,
            id_utilisateur:  userId,
            id_box:          boxId,
            date_debut:      now.toDate()
        });
    }

    async save(session) {
        if (!session.isActive) {
            await this.conn.execute(
                'UPDATE Consommation_Session SET date_fin = ? WHERE id_session = ?',
                [session.dateFin.format('YYYY-MM-DD HH:mm:ss'), session.id]
            );
        }
    }
}

// ═══════════════════════════════════════════════════════════════
// COUCHE SERVICE — Les cas d'usage métier
// Un service orchestre les entités et repositories pour réaliser
// une action complète. Il ne sait rien de HTTP ou XML.
// ═══════════════════════════════════════════════════════════════

// Résultats typés retournés par les services (pas de HTTP ici)
class ScanResult {
    static ACCEPTED    = 'ACCEPTED';
    static REFUSED     = 'REFUSED';
    static ERROR       = 'ERROR';
    static FULL        = 'FULL';

    constructor(status, { user = null, box = null, reason = null } = {}) {
        this.status = status;
        this.user   = user;
        this.box    = box;
        this.reason = reason;
    }

    get isAccepted() { return this.status === ScanResult.ACCEPTED; }
}

class BadgeScanService {
    constructor(userRepo, boxRepo, sessionRepo) {
        this.userRepo    = userRepo;
        this.boxRepo     = boxRepo;
        this.sessionRepo = sessionRepo;
    }

    async scan(badgeUid) {
        // 1. L'utilisateur existe-t-il ?
        const user = await this.userRepo.findByBadge(badgeUid);
        if (!user) {
            return new ScanResult(ScanResult.REFUSED, { reason: 'BADGE_INCONNU' });
        }

        // 2. A-t-il un box en cours ? → Retrait
        const occupiedBox = await this.boxRepo.findOccupiedByUser(user.id);
        if (occupiedBox) {
            return this._processRetrait(user, occupiedBox);
        }

        // 3. Sinon → Dépôt
        return this._processDepot(user);
    }

    async _processRetrait(user, box) {
        const session = await this.sessionRepo.findActiveByUserAndBox(user.id, box.id);

        if (session) {
            session.close();
            await this.sessionRepo.save(session);
        }

        box.release();
        await this.boxRepo.save(box);

        console.log(
            `[RETRAIT] ${user.fullName} | Box n°${box.numero} | ` +
            `Durée : ${session ? session.durationMinutes : 0} min | ` +
            `Crédit restant : ${user.creditTemps} min`
        );

        return new ScanResult(ScanResult.ACCEPTED, { user, box, reason: 'RETRAIT' });
    }

    async _processDepot(user) {
        // Règle 1 : crédit suffisant ?
        if (!user.hasCredit()) {
            console.log(`[REFUS] ${user.fullName} | Crédit épuisé (${user.creditTemps} min)`);
            return new ScanResult(ScanResult.REFUSED, { user, reason: 'CREDIT_EPUISE' });
        }

        // Règle 2 : contrainte 25h
      /*  if (!user.isAdmin) {
            const lastSession = await this.sessionRepo.findLastCompletedByUser(user.id);
            if (lastSession && !lastSession.canDepotAfter()) {
                const nextDepot   = lastSession.nextAllowedDepotAt();
                const resteMin    = Math.ceil(nextDepot.diff(moment(), 'minutes', true));
                const resteH      = Math.floor(resteMin / 60);
                const resteM      = resteMin % 60;

                console.log(
                    `[REFUS] ${user.fullName} | Contrainte 25h | ` +
                    `Accès dans : ${resteH}h ${resteM}min`
                );
                return new ScanResult(ScanResult.REFUSED, { user, reason: 'DELAI_25H' });
            }
        } */

        // Règle 3 : box disponible ?
        const freeBox = await this.boxRepo.findFirstFree();
        if (!freeBox) {
            console.log(`[REFUS] ${user.fullName} | Abri complet`);
            return new ScanResult(ScanResult.FULL, { user });
        }

        // Attribution
        freeBox.assignTo(user.id);
        await this.boxRepo.save(freeBox);
        const session = await this.sessionRepo.create(user.id, freeBox.id);

        console.log(
            `[DÉPÔT] ${user.fullName} | Box n°${freeBox.numero} | ` +
            `Crédit : ${user.creditTemps} min | ` +
            `Entrée : ${session.dateDebut.format('HH:mm:ss DD/MM/YYYY')}`
        );

        return new ScanResult(ScanResult.ACCEPTED, { user, box: freeBox, reason: 'DEPOT' });
    }
}

class CreditService {
    constructor(userRepo, sessionRepo) {
        this.userRepo    = userRepo;
        this.sessionRepo = sessionRepo;
    }

    async decrementAll() {
        const activePairs = await this.sessionRepo.findAllActive();

        for (const { user } of activePairs) {
            if (user.isAdmin) continue;

            user.decrementCredit();
            await this.userRepo.save(user);

            console.log(
                `[CRÉDIT] ${user.fullName} | Crédit restant : ${user.creditTemps} min` +
                (user.creditTemps <= 0 ? ' ⚠️  CRÉDIT ÉPUISÉ' : '')
            );
        }
    }

    startScheduler(intervalMs = 60 * 1000) {
        setInterval(() => this.decrementAll(), intervalMs);
        console.log('[CRÉDIT] Planificateur démarré (intervalle : 60s)');
    }
}

// ═══════════════════════════════════════════════════════════════
// COUCHE PRÉSENTATION — Traduction HTTP / XML
// Le controller ne contient aucune logique métier.
// Il traduit la requête HTTP → appel service → réponse XML.
// ═══════════════════════════════════════════════════════════════

class XmlPresenter {
    accepted() { return '<root><buzz>1</buzz><ledg>20,0,1</ledg><open>1</open></root>'; }
    refused()  { return '<root><buzz>2</buzz><ledr>10,5,2</ledr></root>'; }
    error()    { return '<root><buzz>3</buzz></root>'; }
    away()     { return '<root><releaseId>1</releaseId></root>'; }
}

class BadgeScanController {
    constructor(database, presenter) {
        this.database  = database;
        this.presenter = presenter;
    }

    async handle(req, res) {
        const cardId = (req.query.id || '').toUpperCase();

        if (req.query.away === '1') {
            return res.status(200).send(this.presenter.away());
        }

        res.set('Content-Type', 'text/xml');
        console.log(`\n[SCAN] Badge : ${cardId} à ${moment().format('HH:mm:ss DD/MM/YYYY')}`);

        let connection;
        try {
            connection = await this.database.getConnection();

            // Instanciation des repositories avec la connexion courante
            const userRepo    = new UserRepository(connection);
            const boxRepo     = new BoxRepository(connection);
            const sessionRepo = new SessionRepository(connection);

            // Appel du service métier
            const scanService = new BadgeScanService(userRepo, boxRepo, sessionRepo);
            const result      = await scanService.scan(cardId);

            // Effets de bord : relais physique
            await this._handleRelais(cardId, result);

            // Traduction du résultat en HTTP/XML
            return this._sendResponse(res, result);

        } catch (error) {
            console.error('[ERREUR SERVEUR]', error);
            return res.status(500).send(this.presenter.error());
        } finally {
            if (connection) connection.release();
        }
    }

    async _handleRelais(cardId, result) {
        const { status, user, box, reason } = result;

        if (status === ScanResult.REFUSED || status === ScanResult.FULL) {
            await envoyerRefus({
                badge:  cardId,
                user:   user ? user.fullName : 'INCONNU',
                credit: user ? user.creditTemps : 0
            });
            return;
        }

        if (status === ScanResult.ACCEPTED) {
            const duree = reason === 'RETRAIT' ? 10000 : 5000;
            await ouvrirRelais1(
                { badge: cardId, user: user.fullName, credit: user.creditTemps, box: box.numero },
                duree
            );
        }
    }

    _sendResponse(res, result) {
        switch (result.status) {
            case ScanResult.ACCEPTED: return res.status(200).send(this.presenter.accepted());
            case ScanResult.REFUSED:  return res.status(result.reason === 'BADGE_INCONNU' ? 401 : 403)
                                                .send(this.presenter.refused());
            case ScanResult.FULL:     return res.status(503).send(this.presenter.error());
            default:                  return res.status(500).send(this.presenter.error());
        }
    }
}

// ═══════════════════════════════════════════════════════════════
// BOOTSTRAP — Assemblage et export
// ═══════════════════════════════════════════════════════════════

const database = new Database({
    host:     process.env.DB_HOST,
    port:     3306,
    user:     process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
});

// Démarrage du planificateur (avec ses propres connexions)
const startCreditScheduler = async () => {
    const connection  = await database.getConnection();
    const userRepo    = new UserRepository(connection);
    const sessionRepo = new SessionRepository(connection);
    const creditService = new CreditService(userRepo, sessionRepo);
    connection.release();
    creditService.startScheduler();
};
startCreditScheduler();

// Montage de la route
const controller = new BadgeScanController(database, new XmlPresenter());
const router = express.Router();
router.get('/', (req, res) => controller.handle(req, res));

module.exports = router;