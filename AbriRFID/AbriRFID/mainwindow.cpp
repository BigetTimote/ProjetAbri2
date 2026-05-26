#include "mainwindow.h"
#include "ui_mainwindow.h"
#include "ufcoder_wrapper.h"
#include "api_client.h"
#include <QMessageBox>
#include <QSerialPortInfo>
#include <QDebug>
#include <QStandardItemModel>
#include <QTableView>
#include <QTimer>

MainWindow::MainWindow(QWidget* parent)
    : QMainWindow(parent), ui(new Ui::MainWindow)
{
    ui->setupUi(this);
    rfidPort = new QSerialPort(this);
    rfidWrapper = new uFCoderWrapper();
    apiClient = new ApiClient("http://172.29.254.14:3000");
    useNativeRFID = false;
    selectedUserId = "";

    timerRFID = new QTimer(this);
    connect(timerRFID, &QTimer::timeout, this, &MainWindow::lireBadgeAutomatique);

    timerRefresh = new QTimer(this);
    connect(timerRefresh, &QTimer::timeout, this, &MainWindow::refreshUserTableScheduled);

    setupUserTable();
    loadUserTable();
    timerRefresh->start(5000);

    on_btnRefreshPorts_clicked();
}

MainWindow::~MainWindow() {
    timerRefresh->stop();
    if (rfidPort->isOpen()) rfidPort->close();
    if (rfidWrapper) {
    rfidWrapper->Close();
        delete rfidWrapper;
 }
    delete apiClient;
    delete ui;
}

void MainWindow::setupUserTable() {
    tableModel = new QStandardItemModel(this);
    tableModel->setHorizontalHeaderLabels(QStringList() << "id" <<"Badge UID" << "Nom" << "Prenom" << "Classe");

    ui->tableViewUsers->setModel(tableModel);
    ui->tableViewUsers->setColumnWidth(0, 60);
    ui->tableViewUsers->setColumnWidth(1, 140);
    ui->tableViewUsers->setColumnWidth(2, 140);
    ui->tableViewUsers->setColumnWidth(3, 140);
    ui->tableViewUsers->setColumnWidth(4, 140);
    ui->tableViewUsers->setSelectionBehavior(QAbstractItemView::SelectRows);
    ui->tableViewUsers->setSelectionMode(QAbstractItemView::SingleSelection);

 connect(ui->tableViewUsers->selectionModel(), &QItemSelectionModel::selectionChanged, 
         this, &MainWindow::onTableSelectionChanged);
}

void MainWindow::loadUserTable() {
    QJsonArray users;
    if (apiClient->GetAllUsers("", users)) {
        tableModel->removeRows(0, tableModel->rowCount());

      for (int i = 0; i < users.size(); ++i) {
QJsonObject user = users[i].toObject();
        QList<QStandardItem*> row;
        
        QString id = QString::number(user["id"].toInt());
      QString badgeUid = user["badge_uid"].toString();
  QString nom = user["nom"].toString();
  QString prenom = user["prenom"].toString();
        QString classe = user["classe"].toString("N/A");
  
        qDebug() << "[DEBUG] User loaded - ID:" << id << "Badge:" << badgeUid << "Nom:" << nom;
      
        row.append(new QStandardItem(id));
   row.append(new QStandardItem(badgeUid));
            row.append(new QStandardItem(nom));
  row.append(new QStandardItem(prenom));
 row.append(new QStandardItem(classe));

   tableModel->appendRow(row);
}
    }
 else {
  qDebug() << "[ERREUR] Chargement table :" << apiClient->GetLastError();
 }
}

void MainWindow::refreshUserTableScheduled() {
 loadUserTable();
}

void MainWindow::on_btnRefreshPorts_clicked() {
 ui->comboBoxPorts->clear();
    for (const QSerialPortInfo& info : QSerialPortInfo::availablePorts()) {
        ui->comboBoxPorts->addItem(info.portName());
    }
}

void MainWindow::on_btnConnectRFID_clicked() {
    if (!useNativeRFID && rfidWrapper) {
        if (rfidWrapper->LoadDLL("uFCoder-x86_64.dll")) {
         if (rfidWrapper->Open()) {
 useNativeRFID = true;
      timerRFID->start(200);
              QMessageBox::information(this, "Succes", "Lecteur uFCoder connecte");
        return;
   }
    }
    }

    if (rfidPort->isOpen()) rfidPort->close();
  rfidPort->setPortName(ui->comboBoxPorts->currentText());
    if (rfidPort->open(QIODevice::ReadWrite)) {
     useNativeRFID = false;
    timerRFID->start(200);
        QMessageBox::information(this, "Succes", "Port serie connecte");
    }
  else {
        QMessageBox::warning(this, "Erreur", "Connexion impossible");
    }
}

void MainWindow::lireBadgeAutomatique() {
    QString rawUid;
    bool cardDetected = false;

    if (useNativeRFID && rfidWrapper && rfidWrapper->IsLoaded()) {
        if (rfidWrapper->GetCardUID(rawUid)) {
            cardDetected = true;
  rfidWrapper->SignalSuccess();
        }
}
  else if (!useNativeRFID && rfidPort->isOpen() && rfidPort->bytesAvailable() > 0) {
   rawUid = rfidPort->readAll().toHex().toUpper();
        if (!rawUid.isEmpty()) cardDetected = true;
    }

    if (cardDetected && !rawUid.isEmpty()) {
        QString fullUid = "000000" + rawUid;
        if (fullUid != derniereUID) {
  derniereUID = fullUid;
            ui->lineEditBadge->setText(fullUid);
    QString nom, prenom, classe;
            if (apiClient->GetUserByBadge(fullUid, nom, prenom, classe)) {
      ui->lineEditNom->setText(nom);
ui->lineEditPrenom->setText(prenom);
   ui->lineEditClasse->setText(classe);
            }
else {
         ui->lineEditNom->clear();
   ui->lineEditPrenom->clear();
       ui->lineEditClasse->clear();
            }
        }
    }
}

void MainWindow::on_btnAjouter_clicked() {
    QString badge = ui->lineEditBadge->text().trimmed();
  QString nom = ui->lineEditNom->text().trimmed();
    QString prenom = ui->lineEditPrenom->text().trimmed();
    QString classe = ui->lineEditClasse->text().trimmed();

    if (badge.isEmpty() || nom.isEmpty() || prenom.isEmpty()) {
        QMessageBox::warning(this, "Erreur", "Champs obligatoires manquants");
        return;
  }

    // Verification de l'existence
    if (apiClient->CheckBadgeExists(badge)) {
        QMessageBox::warning(this, "Erreur", "Badge deja enregistre");
  return;
    }

    QString tempPassword = prenom.left(1).toLower() + nom.toLower();
    if (apiClient->RegisterUser(nom, prenom, classe, badge, tempPassword)) {
  loadUserTable();
        ui->lineEditBadge->clear();
        ui->lineEditNom->clear();
   ui->lineEditPrenom->clear();
        ui->lineEditClasse->clear();
        derniereUID = "";
    selectedUserId = "";
        QMessageBox::information(this, "Succes", "Utilisateur ajoute");
    }
    else {
        QMessageBox::critical(this, "Erreur", apiClient->GetLastError());
    }
}

void MainWindow::on_btnSupprimer_clicked() {
    qDebug() << "[DEBUG] Bouton Supprimer cliqué - selectedUserId:" << selectedUserId;
    
    if (selectedUserId.isEmpty()) {
        QMessageBox::warning(this, "Erreur", "Selectionnez un utilisateur dans la table");
     return;
    }

 QString badge = ui->lineEditBadge->text().trimmed();
    if (badge.isEmpty()) {
        QMessageBox::warning(this, "Erreur", "Aucun utilisateur selectionne");
 return;
    }
    
 if (QMessageBox::question(this, "Confirmation", "Supprimer : " + badge) == QMessageBox::Yes) {
        // Recuperer le JWT token
 QString token = apiClient->GetJWTToken();
  
     qDebug() << "[DELETE] Suppression de l'utilisateur ID:" << selectedUserId;

        if (apiClient->DeleteUser(selectedUserId, token)) {
 loadUserTable();
     ui->lineEditBadge->clear();
            ui->lineEditNom->clear();
      ui->lineEditPrenom->clear();
 ui->lineEditClasse->clear();
     derniereUID = "";
    selectedUserId = "";
      QMessageBox::information(this, "Succes", "Utilisateur supprime");
        }
        else {
  QMessageBox::critical(this, "Erreur", "Echec : " + apiClient->GetLastError());
     }
    }
}

void MainWindow::on_btnModifier_clicked() {
    if (selectedUserId.isEmpty()) {
        QMessageBox::warning(this, "Erreur", "Selectionnez un utilisateur dans la table");
        return;
    }

    QString nom = ui->lineEditNom->text().trimmed();
    QString prenom = ui->lineEditPrenom->text().trimmed();
    QString classe = ui->lineEditClasse->text().trimmed();

    if (nom.isEmpty() && prenom.isEmpty() && classe.isEmpty()) {
    QMessageBox::warning(this, "Erreur", "Modifiez au moins un champ");
        return;
    }

    if (QMessageBox::question(this, "Confirmation", "Modifier cet utilisateur ?") != QMessageBox::Yes) {
        return;
    }

    qDebug() << "[DEBUG] Modification - ID:" << selectedUserId << "Nom:" << nom << "Prenom:" << prenom << "Classe:" << classe;

    if (apiClient->ModifyUserById(selectedUserId, nom, prenom, classe, "")) {
     loadUserTable();
    ui->lineEditBadge->clear();
        ui->lineEditNom->clear();
     ui->lineEditPrenom->clear();
        ui->lineEditClasse->clear();
        selectedUserId = "";
        QMessageBox::information(this, "Succes", "Utilisateur modifie avec succes");
    }
    else {
      QMessageBox::critical(this, "Erreur", apiClient->GetLastError());
    }
}

void MainWindow::onTableUserClicked(const QModelIndex& index) {
    if (!index.isValid()) return;
    selectedUserId = tableModel->item(index.row(), 0)->text();// ID (colonne 0)
    ui->lineEditBadge->setText(tableModel->item(index.row(), 1)->text());      // Badge UID (colonne 1)
    ui->lineEditNom->setText(tableModel->item(index.row(), 2)->text());        // Nom (colonne 2)
    ui->lineEditPrenom->setText(tableModel->item(index.row(), 3)->text());     // Prenom (colonne 3)
  ui->lineEditClasse->setText(tableModel->item(index.row(), 4)->text());// Classe (colonne 4)
    qDebug() << "[DEBUG] User selected - ID:" << selectedUserId;
}

void MainWindow::onTableSelectionChanged(const QItemSelection &selected, const QItemSelection &deselected) {
    Q_UNUSED(deselected);
    
  if (selected.indexes().isEmpty()) {
        return;
 }
    
    QModelIndex index = selected.indexes().first();
    if (!index.isValid()) return;
    
    // Récupérer la ligne sélectionnée
    int row = index.row();
    
    selectedUserId = tableModel->item(row, 0)->text();
    ui->lineEditBadge->setText(tableModel->item(row, 1)->text());
    ui->lineEditNom->setText(tableModel->item(row, 2)->text());
    ui->lineEditPrenom->setText(tableModel->item(row, 3)->text());
    ui->lineEditClasse->setText(tableModel->item(row, 4)->text());
    
qDebug() << "[DEBUG] User selected from table - ID:" << selectedUserId << "Badge:" << ui->lineEditBadge->text();
}

void MainWindow::on_btnDocumentation_clicked() {
 QMessageBox::about(this, "Documentation", "RFID -> Qt -> Node.js -> MySQL");
}
