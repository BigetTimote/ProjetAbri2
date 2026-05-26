#ifndef UFCODER_WRAPPER_H
#define UFCODER_WRAPPER_H

#include <windows.h>
#include <QString>
#include <QByteArray>

// Définitions des codes de résultat
typedef long DL_STATUS;
typedef unsigned long* ufr_handle;

// Codes d'état
#define UFR_OK 0

// Types de cartes
#define DL_NTAG_203 0x05
#define DL_NTAG_213 0x08
#define DL_NTAG_215 0x09
#define DL_NTAG_216 0x0A
#define DL_MIFARE_CLASSIC_1K 0x21
#define DL_MIFARE_CLASSIC_4K 0x22

// Déclarations des fonctions de la DLL
extern "C" {
    typedef DL_STATUS (__stdcall *PFN_ReaderOpen)();
  typedef DL_STATUS (__stdcall *PFN_ReaderClose)();
    typedef DL_STATUS (__stdcall *PFN_GetCardIdEx)(
        unsigned char* pSak,
     unsigned char* aucUid,
unsigned char* pUidSize
    );
    typedef DL_STATUS (__stdcall *PFN_ReaderUISignal)(unsigned char light, unsigned char beep);
}

class uFCoderWrapper
{
private:
    HMODULE hModule;
    PFN_ReaderOpen pReaderOpen;
    PFN_ReaderClose pReaderClose;
    PFN_GetCardIdEx pGetCardIdEx;
    PFN_ReaderUISignal pReaderUISignal;
    bool isLoaded;

public:
    uFCoderWrapper();
    ~uFCoderWrapper();

    // Charger la DLL
    bool LoadDLL(const QString &dllPath);
    
    // Ouvrir la connexion au lecteur
    bool Open();
    
    // Fermer la connexion
    bool Close();
    
    // Lire l'UID d'une carte
    bool GetCardUID(QString &uid);
    
    // Signaler au lecteur (son/lumière)
    bool SignalSuccess();
    
    // Vérifier si la DLL est chargée
    bool IsLoaded() const { return isLoaded; }
};

#endif // UFCODER_WRAPPER_H
