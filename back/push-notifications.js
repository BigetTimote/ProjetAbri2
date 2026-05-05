/**
 * Push Notifications Manager - Version Intégrale
 * Assurez-vous que sw.js est bien à la racine du projet (/var/www/html/sw.js)
 */

const PUSH_CONFIG = {
    // Utilise l'URL actuelle du navigateur pour éviter les erreurs CORS
    apiUrl: window.location.origin, 
    vapidPublicKey: 'BH45O60UHJ1QTZvCQeHHw0z3rA5_nRVpGljj1M9jfGKbae0e-6v-BwtD46aBYqfCiQBmDeqAP6Jz_UDe0FwTAVo',
    swPath: '/sw.js' 
};

// --- UTILITAIRES ---

function urlBase64ToUint8Array(base64String) {
    try {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
            .replace(/\-/g, '+')
            .replace(/_/g, '/');
        const rawData = window.atob(base64);
        return new Uint8Array([...rawData].map(char => char.charCodeAt(0)));
    } catch (e) {
        console.error('❌ Erreur conversion VAPID:', e);
        return null;
    }
}

// --- CŒUR DU SYSTÈME ---

async function initPushNotifications() {
    console.log('🔧 Initialisation des Push Notifications...');
    console.log('🌐 Context sécurisé :', window.isSecureContext ? 'OUI ✅' : 'NON ❌');

    // 1. Vérifications de compatibilité
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.error('❌ Les notifications Push ne sont pas supportées par ce navigateur.');
        return;
    }

    try {
        // 2. Enregistrement du Service Worker avec Scope Racine
        console.log('📝 Enregistrement du Service Worker sur :', PUSH_CONFIG.swPath);
        const registration = await navigator.serviceWorker.register(PUSH_CONFIG.swPath, {
            scope: '/' 
        });
        
        // Attendre que le SW soit prêt
        await navigator.serviceWorker.ready;
        console.log('✅ SERVICE WORKER OPÉRATIONNEL !');

        // 3. Gestion de la souscription existante
        let subscription = await registration.pushManager.getSubscription();
        
        if (subscription) {
            console.log('✅ Souscription existante trouvée.');
            await savePushSubscription(subscription);
            startSessionMonitoring();
            return;
        }

        // 4. Demande de permission
        console.log('📋 Demande de permission à l\'utilisateur...');
        const permission = await Notification.requestPermission();
        
        if (permission !== 'granted') {
            console.error('❌ Permission de notification refusée.');
            return;
        }

        // 5. Création de la nouvelle souscription
        console.log('📋 Création de l\'abonnement Push...');
        const vapidArray = urlBase64ToUint8Array(PUSH_CONFIG.vapidPublicKey);
        
        subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: vapidArray
        });
        
        console.log('✅ Nouvel abonnement Push créé avec succès.');
        await savePushSubscription(subscription);
        startSessionMonitoring();

    } catch (error) {
        console.error('❌ ÉCHEC CRITIQUE PUSH :', error.message);
        if (error.name === 'SecurityError') {
            console.warn('💡 Conseil : Vérifiez que vous êtes bien en HTTPS ou que le Flag Chrome est actif.');
        }
    }
}

// --- COMMUNICATIONS SERVEUR ---

async function savePushSubscription(subscription) {
    const token = localStorage.getItem('token');
    if (!token) {
        console.warn('⚠️ Envoi annulé : Aucun token trouvé dans le localStorage.');
        return;
    }

    try {
        console.log('📤 Envoi de la souscription au backend...');
        const response = await fetch(`${PUSH_CONFIG.apiUrl}/api/notification/subscribe`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ subscription: subscription.toJSON() })
        });

        if (response.ok) {
            console.log('✅ Souscription synchronisée avec le serveur.');
        } else {
            const errorData = await response.json();
            console.error('❌ Erreur serveur lors de la souscription :', errorData);
        }
    } catch (error) {
        console.error('❌ Erreur réseau lors de l\'envoi :', error);
    }
}

// --- MONITORING ---

function startSessionMonitoring() {
    console.log('⏱️ Monitoring de session activé (toutes les 5 min).');
    // Vérification immédiate puis intervalle
    checkSessionStatus();
    setInterval(checkSessionStatus, 5 * 60 * 1000);
}

async function checkSessionStatus() {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
        const response = await fetch(`${PUSH_CONFIG.apiUrl}/api/notification/session-info`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const data = await response.json();
            if (data.session_active) {
                const mins = data.time_remaining_minutes;
                if (mins <= 30 && mins > 0) console.warn(`⚠️ Attention : ${mins} min restantes.`);
                if (data.notification_sent) console.log('📬 Notification déjà déclenchée par le serveur.');
            }
        }
    } catch (error) {
        console.error('❌ Erreur monitoring session :', error);
    }
}

// --- NETTOYAGE / LOGOUT ---

async function removePushSubscription() {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
        await fetch(`${PUSH_CONFIG.apiUrl}/api/notification/unsubscribe`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        console.log('✅ Souscription supprimée du serveur.');
    } catch (error) {
        console.error('❌ Erreur lors de la désinscription serveur:', error);
    }

    if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (let registration of registrations) {
            await registration.unregister();
            console.log('🗑️ Service Worker supprimé.');
        }
    }
}

// --- INITIALISATION AU CHARGEMENT ---

document.addEventListener('DOMContentLoaded', () => {
    console.log('🔍 Module Push-notifications chargé.');
    
    const checkAndInit = () => {
        const token = localStorage.getItem('token');
        if (token) {
            console.log('✅ Utilisateur connecté, lancement du Push...');
            initPushNotifications();
            return true;
        }
        return false;
    };

    if (!checkAndInit()) {
        console.log('ℹ️ En attente de connexion pour initialiser le Push...');
        // On surveille le localStorage si le login arrive plus tard
        const authWaiter = setInterval(() => {
            if (checkAndInit()) clearInterval(authWaiter);
        }, 1000);
        
        // Timeout après 1 minute
        setTimeout(() => clearInterval(authWaiter), 60000);
    }
});