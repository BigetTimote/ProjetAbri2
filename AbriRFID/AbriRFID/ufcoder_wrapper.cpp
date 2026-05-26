#include "ufcoder_wrapper.h"
#include <QDebug>

uFCoderWrapper::uFCoderWrapper()
    : hModule(nullptr), pReaderOpen(nullptr), pReaderClose(nullptr),
      pGetCardIdEx(nullptr), pReaderUISignal(nullptr), isLoaded(false)
{
}

uFCoderWrapper::~uFCoderWrapper()
{
    Close();
    if(hModule) {
        FreeLibrary(hModule);
        hModule = nullptr;
    }
}

bool uFCoderWrapper::LoadDLL(const QString &dllPath)
{
    // Charger la DLL
    hModule = LoadLibraryA(dllPath.toStdString().c_str());
    if(!hModule) {
  qDebug() << "Erreur : Impossible de charger la DLL" << dllPath;
        return false;
    }

    // Récupérer les pointeurs vers les fonctions
    pReaderOpen = (PFN_ReaderOpen)GetProcAddress(hModule, "ReaderOpen");
    pReaderClose = (PFN_ReaderClose)GetProcAddress(hModule, "ReaderClose");
    pGetCardIdEx = (PFN_GetCardIdEx)GetProcAddress(hModule, "GetCardIdEx");
    pReaderUISignal = (PFN_ReaderUISignal)GetProcAddress(hModule, "ReaderUISignal");

    if(!pReaderOpen || !pReaderClose || !pGetCardIdEx) {
        qDebug() << "Erreur : Impossible de trouver les fonctions dans la DLL";
        FreeLibrary(hModule);
        hModule = nullptr;
        return false;
    }

    isLoaded = true;
    qDebug() << "DLL uFCoder chargée avec succès";
    return true;
}

bool uFCoderWrapper::Open()
{
    if(!isLoaded || !pReaderOpen) {
        qDebug() << "Erreur : DLL non chargée";
      return false;
 }

    DL_STATUS status = pReaderOpen();
    if(status != UFR_OK) {
        qDebug() << "Erreur ReaderOpen :" << status;
        return false;
    }

    qDebug() << "Lecteur RFID ouvert avec succès";
    return true;
}

bool uFCoderWrapper::Close()
{
    if(!isLoaded || !pReaderClose) {
        return false;
    }

    DL_STATUS status = pReaderClose();
    if(status != UFR_OK) {
    qDebug() << "Erreur ReaderClose :" << status;
        return false;
    }

    qDebug() << "Lecteur RFID fermé";
    return true;
}

bool uFCoderWrapper::GetCardUID(QString &uid)
{
    if(!isLoaded || !pGetCardIdEx) {
        qDebug() << "Erreur : DLL non chargée";
        return false;
    }

    unsigned char sak = 0;
    unsigned char uidBuffer[10] = {0};
    unsigned char uidSize = 0;

    DL_STATUS status = pGetCardIdEx(&sak, uidBuffer, &uidSize);
    if(status != UFR_OK) {
 // Pas de carte détectée - ce n'est pas une erreur critique
        return false;
    }

    if(uidSize == 0) {
        return false;
    }

    // Convertir le UID en hexadécimal
    QByteArray uidArray((const char*)uidBuffer, uidSize);
    uid = uidArray.toHex().toUpper();
    
    qDebug() << "UID détecté :" << uid;
    return true;
}

bool uFCoderWrapper::SignalSuccess()
{
    if(!isLoaded || !pReaderUISignal) {
        return false;
    }

  // Paramètres : light_signal_mode, beep_signal_mode
    // 1 = allumer la lumière verte, 1 = un bip court
    DL_STATUS status = pReaderUISignal(1, 1);
    return status == UFR_OK;
}
