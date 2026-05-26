#ifndef MAINWINDOW_H
#define MAINWINDOW_H

#include <QMainWindow>
#include <QtSql>
#include <QSerialPort>
#include <QTimer>
#include <QStandardItemModel>
#include <QTableView>
#include "ufcoder_wrapper.h"
#include "api_client.h"

QT_BEGIN_NAMESPACE
namespace Ui { class MainWindow; }
QT_END_NAMESPACE

class MainWindow : public QMainWindow
{
    Q_OBJECT

public:
    MainWindow(QWidget *parent = nullptr);
    ~MainWindow();

private slots:
    void on_btnAjouter_clicked();
    void on_btnModifier_clicked();
    void on_btnSupprimer_clicked();
    void on_btnConnectRFID_clicked();
    void on_btnRefreshPorts_clicked();
    void on_btnDocumentation_clicked();
    void lireBadgeAutomatique(); // La fonction de scrutation (Polling)
    void refreshUserTableScheduled(); // Rafraîchir la table programmé
    void onTableUserClicked(const QModelIndex &index); // Sélectionner un utilisateur dans la table
    void onTableSelectionChanged(const QItemSelection &selected, const QItemSelection &deselected); // Nouveau slot pour la sélection

private:
    Ui::MainWindow *ui;
    QSerialPort *rfidPort;
    QTimer *timerRFID;
    QTimer *timerRefresh; // Timer pour rafraîchir la liste
    QString derniereUID; // Pour mémoriser le dernier badge lu
    QString selectedUserId; // Stocke l'ID de l'utilisateur sélectionné
    QByteArray rfidBuffer; // Buffer pour accumuler les données du lecteur
    uFCoderWrapper *rfidWrapper; // Wrapper pour l'API uFCoder
    bool useNativeRFID; // Flag pour choisir entre API native ou port série
    ApiClient *apiClient; // Client pour les APIs
    QStandardItemModel *tableModel; // Modèle pour la table des utilisateurs

    void loadUserTable();
    void setupUserTable(); // Initialiser la table
};
#endif