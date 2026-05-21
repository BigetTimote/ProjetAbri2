#ifndef API_CLIENT_H
#define API_CLIENT_H

#include <QString>
#include <QNetworkAccessManager>
#include <QNetworkRequest>
#include <QNetworkReply>
#include <QJsonDocument>
#include <QJsonObject>
#include <QJsonArray>

class ApiClient : public QObject
{
    Q_OBJECT

public:
    ApiClient(const QString &baseUrl);
    ~ApiClient();

    // Enregistrer un nouvel utilisateur (Trame 3: A2B3C4D5E6F7)
    bool RegisterUser(const QString &nom, const QString &prenom, const QString &classe, 
      const QString &badge_uid, const QString &password);

    // Modifier un utilisateur (Trame 1: AABBCCDDEEFF)
    bool ModifyUserByBadge(const QString &badge_uid, const QString &nom, const QString &prenom,
      const QString &password = "");

    // Modifier un utilisateur par ID (Trame 1: AABBCCDDEEFF)
    bool ModifyUserById(const QString &userId, const QString &nom, const QString &prenom,
      const QString &classe = "", const QString &password = "");

    // Chercher un utilisateur par badge (Trame 4: A3B4C5D6E7F8)
    bool GetUserByBadge(const QString &badge_uid, QString &nom, QString &prenom, QString &classe);

    // Vérifier si un badge existe déjà
    bool CheckBadgeExists(const QString &badge_uid);

    // Supprimer un utilisateur (Trame 2: A1B2C3D4E5F6)
    bool DeleteUser(const QString &userId, const QString &token = "");

    // Récupérer tous les utilisateurs (Trame 4: A3B4C5D6E7F8)
    bool GetAllUsers(const QString &token, QJsonArray &users);

    // Getters pour les résultats
    QString GetLastError() const { return lastError; }
    QJsonObject GetLastResponse() const { return lastResponse; }
    QString GetJWTToken() const { return jwtToken; }

private:
    QNetworkAccessManager *networkManager;
    QString baseUrl;
    QString lastError;
    QJsonObject lastResponse;
    QString jwtToken;

    // Méthode générique pour faire une requête
    QJsonObject MakeRequest(const QString &method, const QString &endpoint,
     const QJsonObject &data, const QString &customSecret = "");

public slots:
    void OnReplyFinished(QNetworkReply *reply);
};

#endif // API_CLIENT_H
