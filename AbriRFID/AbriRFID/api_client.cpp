#include "api_client.h"
#include <QNetworkRequest>
#include <QUrl>
#include <QJsonDocument>
#include <QJsonObject>
#include <QJsonArray>
#include <QDebug>
#include <QEventLoop>
#include <QTimer>

ApiClient::ApiClient(const QString &baseUrl)
 : baseUrl(baseUrl), lastError(""), jwtToken("")
{
    networkManager = new QNetworkAccessManager(this);
    connect(networkManager, &QNetworkAccessManager::finished, this, &ApiClient::OnReplyFinished);
}

ApiClient::~ApiClient()
{
}

QJsonObject ApiClient::MakeRequest(const QString &method, const QString &endpoint,
     const QJsonObject &data, const QString &customSecret)
{
    QUrl url(baseUrl + endpoint);
    QNetworkRequest request(url);
    request.setHeader(QNetworkRequest::ContentTypeHeader, "application/json");

    // Ajouter le secret d'authentification
    if (!customSecret.isEmpty()) {
    request.setRawHeader("x-app-secret", customSecret.toUtf8());
        qDebug() << "Trame:" << customSecret;
    }

    // Ajouter le token JWT si disponible
    if (!jwtToken.isEmpty()) {
        request.setRawHeader("Authorization", ("Bearer " + jwtToken).toUtf8());
        qDebug() << "JWT attache";
    }

    QJsonDocument doc(data);
    QByteArray jsonData = doc.toJson();

    QNetworkReply *reply = nullptr;

    if (method == "GET") {
        reply = networkManager->get(request);
    qDebug() << "GET" << endpoint;
    } else if (method == "POST") {
        reply = networkManager->post(request, jsonData);
        qDebug() << "POST" << endpoint;
    } else if (method == "PUT") {
        reply = networkManager->put(request, jsonData);
     qDebug() << "PUT" << endpoint;
    } else if (method == "DELETE") {
        reply = networkManager->deleteResource(request);
  qDebug() << "DELETE" << endpoint;
    }

    // Attendre la réponse
    QEventLoop loop;
  QTimer timer;
  timer.setSingleShot(true);
    connect(&timer, &QTimer::timeout, &loop, &QEventLoop::quit);
    connect(reply, &QNetworkReply::finished, &loop, &QEventLoop::quit);
  
    timer.start(5000);
    loop.exec();

    // Vérifier si le timeout s'est déclenché
    if (timer.isActive()) {
        timer.stop();
    } else {
        lastError = "Delai d'attente depasse (5s)";
      qDebug() << "Timeout:" << lastError;
        if (reply) reply->deleteLater();
        return QJsonObject();
    }

    if (reply->error() != QNetworkReply::NoError) {
        lastError = "Erreur connexion : " + reply->errorString();
        qDebug() << "Erreur:" << lastError;
      reply->deleteLater();
     return QJsonObject();
  }

QByteArray responseData = reply->readAll();
    reply->deleteLater();

    qDebug() << "Reponse brute:" << responseData;

    QJsonDocument responseDoc = QJsonDocument::fromJson(responseData);
    
    // Si c'est un array, le convertir en objet avec clé "__array"
    if (responseDoc.isArray()) {
        qDebug() << "Array detecte, conversion en objet";
   QJsonObject wrapper;
        wrapper["__array"] = responseDoc.array();
      lastResponse = wrapper;
        return wrapper;
    }
    
    // Sinon, c'est un objet
    if (!responseDoc.isObject()) {
        lastError = "Reponse invalide";
        qDebug() << "Reponse non JSON:" << responseData;
    return QJsonObject();
    }

    lastResponse = responseDoc.object();
    qDebug() << "Succes";
    return lastResponse;
}

bool ApiClient::RegisterUser(const QString &nom, const QString &prenom, const QString &classe,
    const QString &badge_uid, const QString &password)
{
    QJsonObject data;
    data["nom"] = nom;
    data["prenom"] = prenom;
    data["classe"] = classe;
    data["badge_uid"] = badge_uid;
  data["password"] = password;

    qDebug() << "[API] RegisterUser - badge:" << badge_uid;

    QJsonObject response = MakeRequest("POST", "/api/register", data, "A2B3C4D5E6F7");

    if (response.isEmpty()) {
   qDebug() << "[API] Erreur : Reponse vide";
        return false;
    }

    if (response.contains("message")) {
        qDebug() << "[API] Succes :" << response["message"];
        return true;
    }

    lastError = response.value("error").toString("Erreur inconnue");
    qDebug() << "[API] Erreur API :" << lastError;
    return false;
}

bool ApiClient::ModifyUserByBadge(const QString &badge_uid, const QString &nom, const QString &prenom,
    const QString &password)
{
    QJsonObject data;
    if (!nom.isEmpty()) data["nom"] = nom;
    if (!prenom.isEmpty()) data["prenom"] = prenom;
    if (!password.isEmpty()) data["password"] = password;
    data["badge"] = badge_uid;

  qDebug() << "[API] ModifyUserByBadge - badge:" << badge_uid;

QJsonObject response = MakeRequest("PUT", "/api/modify/user/" + badge_uid, data, "AABBCCDDEEFF");

    qDebug() << "[API] Reponse :" << QJsonDocument(response).toJson();

    if (response.isEmpty()) {
        qDebug() << "[API] Erreur : Reponse vide";
      return false;
    }

    if (response.value("success").toBool()) {
     if (response.contains("token")) {
  jwtToken = response["token"].toString();
     qDebug() << "[API] JWT recu et sauvegarde";
        }
   qDebug() << "[API] Modification reussie";
        return true;
    }

    lastError = response.value("error").toString("Erreur inconnue");
    qDebug() << "[API] Erreur API :" << lastError;
    return false;
}

bool ApiClient::ModifyUserById(const QString &userId, const QString &nom, const QString &prenom,
    const QString &classe, const QString &password)
{
    QJsonObject data;
    if (!nom.isEmpty()) data["nom"] = nom;
    if (!prenom.isEmpty()) data["prenom"] = prenom;
  if (!classe.isEmpty()) data["classe"] = classe;
    if (!password.isEmpty()) data["password"] = password;

    qDebug() << "[API] ModifyUserById - userId:" << userId << "Data:" << QJsonDocument(data).toJson();

    QJsonObject response = MakeRequest("PUT", "/api/modify/user/" + userId, data, "AABBCCDDEEFF");

 qDebug() << "[API] Reponse :" << QJsonDocument(response).toJson();

    if (response.isEmpty()) {
        qDebug() << "[API] Erreur : Reponse vide";
 return false;
    }

    if (response.value("success").toBool()) {
      if (response.contains("token")) {
        jwtToken = response["token"].toString();
      qDebug() << "[API] JWT recu et sauvegarde";
      }
        qDebug() << "[API] Modification reussie";
        return true;
    }

    lastError = response.value("error").toString("Erreur inconnue");
    qDebug() << "[API] Erreur API :" << lastError;
    return false;
}

bool ApiClient::GetUserByBadge(const QString &badge_uid, QString &nom, QString &prenom, QString &classe)
{
    QJsonObject appSecret;
    QJsonObject response = MakeRequest("GET", "/api/user", appSecret, "A3B4C5D6E7F8");

    if (response.isEmpty()) {
        return false;
    }

    QJsonArray usersArray;
    
    // Vérifier si c'est un array wrappé
  if (response.contains("__array")) {
     usersArray = response["__array"].toArray();
     qDebug() << "[API] GetUserByBadge - Array detecte avec" << usersArray.size() << "utilisateurs";
    }
    // Vérifier si c'est un objet avec clé "users"
    else if (response.contains("users")) {
        usersArray = response["users"].toArray();
    }

    for (int i = 0; i < usersArray.size(); ++i) {
    QJsonObject user = usersArray[i].toObject();
  if (user["badge_uid"].toString() == badge_uid) {
    nom = user["nom"].toString();
            prenom = user["prenom"].toString();
            if (user.contains("classe")) {
      classe = user["classe"].toString();
     }
      qDebug() << "[API] Utilisateur trouve :" << nom << prenom;
          return true;
     }
    }

    lastError = "Badge non trouve";
    qDebug() << "[API] Badge non trouve :" << badge_uid;
    return false;
}

bool ApiClient::DeleteUser(const QString &userId, const QString &token)
{
    // Utiliser le token fourni ou le JWT stocké
    QString tokenToUse = !token.isEmpty() ? token : jwtToken;
    
    if (tokenToUse.isEmpty()) {
        tokenToUse = token;
  }
  
    // Construire l'URL et la requête
    QUrl url(baseUrl + "/api/delete/user/" + userId);
    QNetworkRequest request(url);
    request.setHeader(QNetworkRequest::ContentTypeHeader, "application/json");
request.setRawHeader("x-app-secret", "A1B2C3D4E5F6");
    request.setRawHeader("Authorization", ("Bearer " + tokenToUse).toUtf8());
    
    qDebug() << "[DELETE] Suppression avec token JWT";
    
    QNetworkReply *reply = networkManager->deleteResource(request);
    
    // Attendre la réponse
    QEventLoop loop;
    QTimer timer;
    timer.setSingleShot(true);
    connect(&timer, &QTimer::timeout, &loop, &QEventLoop::quit);
 connect(reply, &QNetworkReply::finished, &loop, &QEventLoop::quit);
    
    timer.start(5000);
    loop.exec();

    if (!timer.isActive()) {
        lastError = "Timeout - Serveur inaccessible";
        qDebug() << "[DELETE] Timeout";
        if (reply) reply->deleteLater();
  return false;
    }
    timer.stop();

  if (reply->error() != QNetworkReply::NoError) {
     lastError = "Erreur connexion : " + reply->errorString();
        qDebug() << "[DELETE] Erreur: " << lastError;
    reply->deleteLater();
        return false;
 }

    QByteArray responseData = reply->readAll();
    reply->deleteLater();

    qDebug() << "[DELETE] Reponse: " << responseData;

    QJsonDocument responseDoc = QJsonDocument::fromJson(responseData);
    if (!responseDoc.isObject()) {
        lastError = "Reponse invalide";
  qDebug() << "[DELETE] Reponse non JSON";
   return false;
    }

    QJsonObject responseObj = responseDoc.object();
    
    if (responseObj.value("success").toBool()) {
        qDebug() << "[DELETE] Suppression reussie";
    return true;
    }

    lastError = responseObj.value("error").toString("Erreur inconnue");
    qDebug() << "[DELETE] Erreur API: " << lastError;
    return false;
}

bool ApiClient::GetAllUsers(const QString &token, QJsonArray &users)
{
    if (!token.isEmpty()) {
        jwtToken = token;
    }
    
    QJsonObject data;
    QJsonObject response = MakeRequest("GET", "/api/user", data, "A3B4C5D6E7F8");

    qDebug() << "[API] GetAllUsers - Reponse :" << QJsonDocument(response).toJson();

    if (response.isEmpty()) {
     qDebug() << "[API] Reponse vide";
        lastError = "Reponse vide du serveur";
        return false;
    }

    // Vérifier si c'est un array wrappé (depuis MakeRequest)
    if (response.contains("__array")) {
        users = response["__array"].toArray();
        qDebug() << "[API] Array detecte avec" << users.size() << "utilisateurs";
        return true;
    }

    // Vérifier si c'est un objet avec clé "users"
    if (response.contains("users")) {
        users = response["users"].toArray();
    qDebug() << "[API] Objet avec cle 'users' recu avec" << users.size() << "utilisateurs";
   return true;
    }

    // Aucun format reconnu
    lastError = "Format de reponse invalide";
    qDebug() << "[API] Format non reconnu. Reponse :" << QJsonDocument(response).toJson();
    return false;
}

bool ApiClient::CheckBadgeExists(const QString &badge_uid)
{
    QString nom, prenom, classe;
    return GetUserByBadge(badge_uid, nom, prenom, classe);
}

void ApiClient::OnReplyFinished(QNetworkReply *reply)
{
    reply->deleteLater();
}    