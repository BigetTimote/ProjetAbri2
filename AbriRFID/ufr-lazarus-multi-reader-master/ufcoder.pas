unit ufcoder;

interface

{$LIBRARYPATH /usr/lib; }
const
   {$IFDEF Windows}
     {$CALLING stdcall}
       libdll='uFCoder-x86.dll';
     {$ELSE}
   {$IFDEF Linux}
     {$CALLING cdecl}
     {$IFDEF CPU64}
           libdll='libuFCoder-x86_64.so';
       {$ELSE}
         {$IFDEF CPU32}
           libdll='libuFCoder-x86.so';
         {$ENDIF}
     {$ENDIF}
   {$ENDIF}
  {$ENDIF}

const
  MIFARE_CLASSIC_1k   = $08;
  MF1ICS50            = $08;
  SLE66R35            = $88;
  MIFARE_CLASSIC_4k   = $18;
  MF1ICS70            = $18;
  MIFARE_CLASSIC_MINI = $09;
  MF1ICS20            = $09;

const
  MIFARE_AUTHENT1A    = $60;
  MIFARE_AUTHENT1B    = $61;
  DL_OK               = $00;
  KEY_INDEX           = $00;
  FORMAT_SIGN         = $00;

  //DLOGIC CARD TYPE
    const  DL_MIFARE_ULTRALIGHT		      =	 $01;
    const  DL_MIFARE_ULTRALIGHT_EV1_11	      =	 $02;
    const  DL_MIFARE_ULTRALIGHT_EV1_21	      =	 $03;
    const  DL_MIFARE_ULTRALIGHT_C	      =	 $04;
    const  DL_NTAG_203		              =  $05;
    const  DL_NTAG_210			      =  $06;
    const  DL_NTAG_212		              =  $07;
    const  DL_NTAG_213		              =  $08;
    const  DL_NTAG_215			      =  $09;
    const  DL_NTAG_216			      =  $0A;

    const  DL_MIFARE_MINI		      =  $20;
    const  DL_MIFARE_CLASSIC_1K	              =  $21;
    const  DL_MIFARE_CLASSIC_4K		      =  $22;
    const  DL_MIFARE_PLUS_S_2K		      =  $23;
    const  DL_MIFARE_PLUS_S_4K		      =  $24;
    const  DL_MIFARE_PLUS_X_2K		      =  $25;
    const  DL_MIFARE_PLUS_X_4K		      =  $26;
    const  DL_MIFARE_DESFIRE		      =  $27;
    const  DL_MIFARE_DESFIRE_EV1_2K	      =  $28;
    const  DL_MIFARE_DESFIRE_EV1_4K           =  $29;
    const  DL_MIFARE_DESFIRE_EV1_8K	      =  $2A;

    //--- sectors and max bytes ---
    const
      MAX_SECTORS_1k           = 16;
      MAX_SECTORS_4k           = 40;

      USER_PAGES_NTAG_203      = 36;
      USER_PAGES_NTAG_213      = 36;
      USER_PAGES_NTAG_215      = 126;
      USER_PAGES_NTAG_216      = 222;
      USER_PAGES_ULTRALIGHT    = 12;
      USER_PAGES_ULTRALIGHT_C  = 36;
      USER_PAGES_ULTRALIGHT_EV1_11 = 12;



      MAX_BYTES_NTAG_203       = 144;
      MAX_BYTES_NTAG_213       = 144;
      MAX_BYTES_NTAG_215       = 504;
      MAX_BYTES_NTAG_216       = 888;
      MAX_BYTES_ULTRALIGHT     = 48;
      MAX_BYTES_ULTRALIGHT_C   = 144;
      MAX_BYTES_ULTRALIGHT_EV1_11 = 48;
      MAX_BYTES_CLASSIC_1K     = 752;
      MAX_BYTES_CLASSIC_4k     = 3440;

      TOTAL_PAGES_NTAG_203     = 42;
      TOTAL_PAGES_NTAG_213     = 45;
      TOTAL_PAGES_NTAG_215     = 135;
      TOTAL_PAGES_NTAG_216     = 226;
      TOTAL_PAGES_ULTRALIGHT   = 16;
      TOTAL_PAGES_ULTRALIGHT_C = 44; //48 with 4 write only pages
      TOTAL_PAGES_ULTRALIGHT_EV1_11 = 16;

      MAX_BYTES_TOTAL_NTAG_203     = 168;
      MAX_BYTES_TOTAL_NTAG_213     = 180;
      MAX_BYTES_TOTAL_NTAG_215     = 540;
      MAX_BYTES_TOTAL_NTAG_216     = 904;
      MAX_BYTES_TOTAL_ULTRALIGHT   = 64;
      MAX_BYTES_TOTAL_ULTRALIGHT_C = 176;//192  with 4 write only pages
      MAX_BYTES_TOTAL_ULTRALIGHT_EV1_11  = 64;
      MAX_BYTES_TOTAL_CLASSIC_1K   = 1024;
      MAX_BYTES_TOTAL_CLASSIC_4K   = 4096;
type
  DL_STATUS = LongInt;
  ufr_handle  = ^PlongWord;
  c_string = PAnsiChar;
  Ptr_c_string = ^c_string;


function ReaderOpen: DL_STATUS stdcall;

function ReaderReset: DL_STATUS stdcall;

function ReaderClose: DL_STATUS stdcall;

function ReaderSoftRestart: DL_STATUS stdcall;

function GetReaderType(const lpulReaderType: PLongInt): DL_STATUS stdcall;

function GetReaderSerialNumber(const lpulSerialNumber: PLongInt): DL_STATUS  stdcall ;

function ReaderUISignal(light_signal_mode: Byte;beep_signal_mode: Byte): DL_STATUS  stdcall;

function GetCardId(var lpucCardType: Byte;var lpulCardSerial: LongInt): DL_STATUS  stdcall;
//******************************************************************
function GetCardIdExM( hand: PlongWord;
                              lpuSak:PByte;
                      aucUid:PByte;
                      lpucUidSize:PByte): DL_STATUS  stdcall;
function GetCardIdEx( lpuSak:PByte;
                      aucUid:PByte;
                      lpucUidSize:PByte): DL_STATUS  stdcall;

function GetDlogicCardType(var pCardType:Byte):DL_STATUS ;
function GetDlogicCardTypeM(hand: PlongWord;var pCardType:Byte):DL_STATUS ;

//******************************************************************
function LinearRead(aucData:PByte;
                    usLinearAddress: Word;
                    usDataLength: Word;
                    var lpusBytesReturned: Word;
                    ucKeyMode: Byte;
                    ucReaderKeyIndex: Byte): DL_STATUS stdcall;

function LinRowRead(aucData:PByte;
                    usLinearAddress: Word;
                    usDataLength: Word;
                    var lpusBytesReturned: Word;
                    ucKeyMode: Byte;
                    ucReaderKeyIndex: Byte): DL_STATUS stdcall;

function LinearWrite(const aucData:PByte;
                     usLinearAddress: Word;
                     usDataLength: Word;
                     var lpusBytesWritten: Word;
                     ucKeyMode: Byte;
                     ucReaderKeyIndex: Byte): DL_STATUS  stdcall;

function LinearFormatCard(const new_key_A: PByte;
                          blocks_access_bits: Byte;
                          sector_trailers_access_bits: Byte;
                          sector_trailers_byte9: Byte;
                          const new_key_B: PByte;
                          var SectorsFormatted:Byte;
                          auth_mode: Byte;
                          key_index: Byte): DL_STATUS stdcall;

function ReaderKeysLock(const bPassword:PByte):DL_STATUS stdcall;
function ReaderKeysUnlock(const bPassword:PByte):DL_STATUS stdcall;


function ReaderKeyWrite(const aucKey:PByte;ucKeyIndex: Byte): DL_STATUS  stdcall;

function ReadUserData(aucData:PByte): DL_STATUS  stdcall;

function WriteUserData(const aucData: PByte): DL_STATUS  stdcall;



function BlockRead(data:PByte;
                   block_address: Byte;
                   auth_mode: Byte;
                   key_index: Byte): DL_STATUS stdcall;


function BlockWrite(const data: Pointer;
                    block_address: Byte;
                    auth_mode: Byte;
                    key_index: Byte): DL_STATUS  stdcall;


function BlockInSectorRead(data:PByte;
                           sector_address: Byte;
                           block_in_sector_address: Byte;
                           auth_mode: Byte;
                           key_index: Byte): DL_STATUS  stdcall;


function BlockInSectorWrite(const data: PByte;
                            sector_address: Byte;
                            block_in_sector_address: Byte;
                            auth_mode: Byte;
                            key_index: Byte): DL_STATUS stdcall;


function SectorTrailerWrite(addressing_mode: Byte;
                            address: Byte;
                            const new_key_A: PByte;
                            block0_access_bits: Byte;
                            block1_access_bits: Byte;
                            block2_access_bits: Byte;
                            sector_trailer_access_bits: Byte;
                            sector_trailer_byte9:Byte;
                            const new_key_B: PByte;
                            auth_mode:Byte;
                            key_index:Byte): DL_STATUS  stdcall;

function SectorTrailerWriteUnsafe(addressing_mode: Byte;
                                  address: Byte;
                                  const sector_trailer: PByte;
                                  auth_mode: Byte;
                                  key_index: Byte): DL_STATUS stdcall;


function ValueBlockRead(value:PLongint;
                        var value_addr: Byte;
                        block_address: Byte;
                        auth_mode: Byte;
                        key_index: Byte): DL_STATUS stdcall;


function ValueBlockInSectorRead(value:PLongint;
                                var value_addr: Byte;
                                sector_address: Byte;
                                block_in_sector_address: Byte;
                                auth_mode: Byte;
                                key_index: Byte): DL_STATUS stdcall;


function ValueBlockWrite(value: LongInt;
                         value_addr: Byte;
                         block_address: Byte;
                         auth_mode: Byte;
                         key_index: Byte): DL_STATUS  stdcall;


function ValueBlockInSectorWrite(value: LongInt;
                                 value_addr: Byte;
                                 sector_address: Byte;
                                 block_in_sector_address: Byte;
                                 auth_mode: Byte;
                                 key_index: Byte): DL_STATUS stdcall;


function ValueBlockIncrement(increment_value: LongInt;
                             block_address: Byte;
                             auth_mode: Byte;
                             key_index: Byte): DL_STATUS  stdcall;


function ValueBlockInSectorIncrement(increment_value: LongInt;
                                     sector_address: Byte;
                                     block_in_sector_address: Byte;
                                     auth_mode: Byte;
                                     key_index: Byte): DL_STATUS stdcall;


function ValueBlockDecrement(decrement_value:LongInt;
                             block_address: Byte;
                             auth_mode: Byte;
                             key_index: Byte): DL_STATUS stdcall ;


function ValueBlockInSectorDecrement(decrement_value: LongInt;
                                     sector_address: Byte;
                                     block_in_sector_address: Byte;
                                     auth_mode: Byte;
                                     key_index: Byte): DL_STATUS stdcall;


function BlockRead_AKM1(data:PByte;
                        block_address: Byte;
                        auth_mode: Byte): DL_STATUS stdcall;


function BlockWrite_AKM1(const data: PByte;
                         block_address: Byte;
                         auth_mode: Byte): DL_STATUS  stdcall;


function BlockInSectorRead_AKM1(data:PByte;
                                sector_address: Byte;
                                block_in_sector_address: Byte;
                                auth_mode: Byte): DL_STATUS  stdcall;


function BlockInSectorWrite_AKM1(const data: PByte;
                                 sector_address: Byte;
                                 block_in_sector_address: Byte;
                                 auth_mode: Byte): DL_STATUS  stdcall;


function LinearRead_AKM1(data:PByte;
                         linear_address: Word;
                         length: Word;
                         var bytes_returned: Word;
                         auth_mode: Byte): DL_STATUS stdcall;


function LinearWrite_AKM1(const data: PByte;
                          linear_address: Word;
                          length: Word;
                          var bytes_written: Word;
                          auth_mode: Byte): DL_STATUS  stdcall;


function LinearFormatCard_AKM1(const new_key_A: PByte;
                               blocks_access_bits: Byte;
                               sector_trailers_access_bits: Byte;
                               sector_trailers_byte9: Byte;
                               const new_key_B: PByte;
                               var sector_formatted:Byte;
                               auth_mode: Byte): DL_STATUS stdcall;


function SectorTrailerWrite_AKM1(addressing_mode: Byte;
                                 address: Byte;
                                 const new_key_A: PByte;
                                 block0_access_bits: Byte;
                                 block1_access_bits: Byte;
                                 block2_access_bits: Byte;
                                 sector_trailer_access_bits: Byte;
                                 sector_trailer_byte9:Byte;
                                 const new_key_B: PByte;
                                 auth_mode:Byte): DL_STATUS  stdcall;

function SectorTrailerWriteUnsafe_AKM1(addressing_mode: Byte;
                                       address: Byte;
                                       const sector_trailer: PByte;
                                       auth_mode: Byte): DL_STATUS  stdcall;


function ValueBlockRead_AKM1(value: PLongInt;
                             var value_addr: Byte;
                             block_address: Byte;
                             auth_mode: Byte): DL_STATUS  stdcall;


function ValueBlockInSectorRead_AKM1(value:PLongInt;
                                     var value_addr: Byte;
                                     sector_address: Byte;
                                     block_in_sector_address: Byte;
                                     auth_mode: Byte): DL_STATUS stdcall;


function ValueBlockWrite_AKM1(value: LongInt;
                              value_addr: Byte;
                              block_address: Byte;
                              auth_mode: Byte): DL_STATUS stdcall;


function ValueBlockInSectorWrite_AKM1(value: LongInt;
                                      value_addr: Byte;
                                      sector_address: Byte;
                                      block_address: Byte;
                                      auth_mode: Byte): DL_STATUS  stdcall;


function ValueBlockIncrement_AKM1(increment_value: LongInt;
                                  block_address: Byte;
                                  auth_mode: Byte): DL_STATUS stdcall;


function ValueBlockInSectorIncrement_AKM1(increment_value: LongInt;
                                          sector_address: Byte;
                                          block_in_sector_address: Byte;
                                          auth_mode: Byte): DL_STATUS  stdcall;


function ValueBlockDecrement_AKM1(decrement_value: LongInt;
                                  block_address: Byte;
                                  auth_mode: Byte): DL_STATUS stdcall;


function ValueBlockInSectorDecrement_AKM1(decrement_value: LongInt;
                                          sector_address: Byte;
                                          block_in_sector_address: Byte;
                                          auth_mode: Byte): DL_STATUS stdcall;


function BlockRead_AKM2(data:PByte;
                        block_address: Byte;
                        auth_mode: Byte): DL_STATUS  stdcall;


function BlockWrite_AKM2(const data: PByte;
                         block_address: Byte;
                         auth_mode: Byte): DL_STATUS  stdcall;


function BlockInSectorRead_AKM2(data:PByte;
                                sector_address: Byte;
                                block_in_sector_address: Byte;
                                auth_mode: Byte): DL_STATUS stdcall  ;


function BlockInSectorWrite_AKM2(const data: PByte;
                                 sector_address: Byte;
                                 block_in_sector_address: Byte;
                                 auth_mode: Byte): DL_STATUS stdcall;


function LinearRead_AKM2(data: PByte;
                         linear_address: Word;
                         length: Word;
                         var bytes_returned: Word;
                         auth_mode: Byte): DL_STATUS stdcall;


function LinearWrite_AKM2(const data: PByte;
                          linear_address: Word;
                          length: Word;
                          var bytes_written: Word;
                          auth_mode: Byte): DL_STATUS  stdcall;


function LinearFormatCard_AKM2(const new_key_A: PByte;
                               blocks_access_bits: Byte;
                               sector_trailers_access_bits: Byte;
                               sector_trailers_byte9: Byte;
                               const new_key_B: PByte;
                               var sector_formatted:Byte;
                               auth_mode: Byte): DL_STATUS  stdcall;


function SectorTrailerWrite_AKM2(addressing_mode: Byte;
                                 address: Byte;
                                 const new_key_A: PByte;
                                 block0_access_bits: Byte;
                                 block1_access_bits: Byte;
                                 block2_access_bits: Byte;
                                 sector_trailer_access_bits: Byte;
                                 sector_trailer_byte9:Byte;
                                 const new_key_B: PByte;
                                 auth_mode:Byte): DL_STATUS  stdcall  ;

function SectorTrailerWriteUnsafe_AKM2(addressing_mode: Byte;
                                       address: Byte;
                                       const sector_trailer: PByte;
                                       auth_mode: Byte): DL_STATUS  stdcall;


function ValueBlockRead_AKM2(value: pLongInt;
                             var value_addr: Byte;
                             block_address: Byte;
                             auth_mode: Byte): DL_STATUS  stdcall;


function ValueBlockInSectorRead_AKM2(value:PLongInt;
                                     var value_addr: Byte;
                                     sector_address: Byte;
                                     block_in_sector_address: Byte;
                                     auth_mode: Byte): DL_STATUS stdcall;


function ValueBlockWrite_AKM2(value: LongInt;
                              value_addr: Byte;
                              block_address: Byte;
                              auth_mode: Byte): DL_STATUS  stdcall;


function ValueBlockInSectorWrite_AKM2(value: LongInt;
                                      value_addr: Byte;
                                      sector_address: Byte;
                                      block_address: Byte;
                                      auth_mode: Byte): DL_STATUS  stdcall;


function ValueBlockIncrement_AKM2(increment_value:LongInt;
                                  block_address: Byte;
                                  auth_mode: Byte): DL_STATUS stdcall;


function ValueBlockInSectorIncrement_AKM2(increment_value: LongInt;
                                          sector_address: Byte;
                                          block_in_sector_address: Byte;
                                          auth_mode: Byte): DL_STATUS stdcall;


function ValueBlockDecrement_AKM2(decrement_value:LongInt;
                                  block_address: Byte;
                                  auth_mode: Byte): DL_STATUS stdcall;


function ValueBlockInSectorDecrement_AKM2(decrement_value: LongInt;
                                          sector_address: Byte;
                                          block_in_sector_address: Byte;
                                          auth_mode: Byte): DL_STATUS stdcall;


function BlockRead_PK(data:PByte;
                      block_address: Byte;
                      auth_mode: Byte;
                      const key: PByte): DL_STATUS  stdcall;


function BlockWrite_PK(const data: PByte;
                       block_address: Byte;
                       auth_mode: Byte;
                       const key: PByte): DL_STATUS  stdcall;


function BlockInSectorRead_PK(data:PByte;
                              sector_address: Byte;
                              block_in_sector_address: Byte;
                              auth_mode: Byte;
                              const key: PByte): DL_STATUS  stdcall;


function BlockInSectorWrite_PK(const data: PByte;
                               sector_address: Byte;
                               block_in_sector_address: Byte;
                               auth_mode: Byte;
                               const key: PByte): DL_STATUS  stdcall;


function LinearRead_PK(data:PByte;
                       linear_address: Word;
                       length: Word;
                       var bytes_returned: Word;
                       auth_mode: Byte;
                       const key:PByte): DL_STATUS  stdcall;

function LinRowRead_PK(data:PByte;
                       linear_address: Word;
                       length: Word;
                       var bytes_returned: Word;
                       auth_mode: Byte;
                       const key:PByte): DL_STATUS  stdcall;

function LinearWrite_PK(const data: PByte;
                        linear_address: Word;
                        length: Word;
                        var bytes_written: Word;
                        auth_mode: Byte;
                        const key: PByte): DL_STATUS stdcall;


function LinearFormatCard_PK(const new_key_A: PByte;
                             blocks_access_bits: Byte;
                             sector_trailers_access_bits: Byte;
                             sector_trailers_byte9: Byte;
                             const new_key_B: PByte;
                             var sector_formatted:Byte;
                             auth_mode: Byte;
                             const key:PByte): DL_STATUS stdcall;

function SectorTrailerWrite_PK(addressing_mode: Byte;
                               address: Byte;
                               const new_key_A: PByte;
                               block0_access_bits: Byte;
                               block1_access_bits: Byte;
                               block2_access_bits: Byte;
                               sector_trailer_access_bits: Byte;
                               sector_trailer_byte9:Byte;
                               const new_key_B:PByte;
                               auth_mode: Byte;
                               const key: PByte): DL_STATUS stdcall;

function SectorTrailerWriteUnsafe_PK(addressing_mode: Byte;
                                     address: Byte;
                                     const sector_trailer: PByte;
                                     auth_mode: Byte;
                                     const key: PByte): DL_STATUS  stdcall;


function ValueBlockRead_PK(value:PLongInt;
                           var value_addr: Byte;
                           block_address: Byte;
                           auth_mode: Byte;
                           const key: PByte): DL_STATUS stdcall;


function ValueBlockInSectorRead_PK(value: PLongInt;
                                   var value_addr: Byte;
                                   sector_address: Byte;
                                   block_in_sector_address: Byte;
                                   auth_mode: Byte;
                                   const key: PByte): DL_STATUS stdcall;


function ValueBlockWrite_PK(value: LongInt;
                            value_addr: Byte;
                            block_address: Byte;
                            auth_mode: Byte;
                            const key: PByte): DL_STATUS  stdcall;


function ValueBlockInSectorWrite_PK(value:LongInt;
                                    value_addr: Byte;
                                    sector_address: Byte;
                                    block_address: Byte;
                                    auth_mode: Byte;
                                    const key: PByte): DL_STATUS  stdcall;


function ValueBlockIncrement_PK(increment_value:LongInt;
                                block_address: Byte;
                                auth_mode: Byte;
                                const key: PByte): DL_STATUS  stdcall;


function ValueBlockInSectorIncrement_PK(increment_value: LongInt;
                                        sector_address: Byte;
                                        block_in_sector_address: Byte;
                                        auth_mode: Byte;
                                        const key: PByte): DL_STATUS  stdcall;


function ValueBlockDecrement_PK(decrement_value:LongInt;
                                block_address: Byte;
                                auth_mode: Byte;
                                const key: PByte): DL_STATUS stdcall;


function ValueBlockInSectorDecrement_PK(decrement_value: LongInt;
                                        sector_address: Byte;
                                        block_in_sector_address: Byte;
                                        auth_mode: Byte;
                                        const key: PByte): DL_STATUS  stdcall;


function GetReaderHardwareVersion(const bMajor:Pbyte;
                                  const bMinor:Pbyte): DL_STATUS  stdcall;

function GetReaderFirmwareVersion(const bMajor:Pbyte;
                                  const bMinor:Pbyte): DL_STATUS  stdcall;
function UFR_Status2String(const status:DL_STATUS):PAnsiChar stdcall;
function GetDllVersion(): LongInt stdcall;
function GetBuildNumber(const build:Pbyte):DL_STATUS stdcall;
function UfrRedLightControl(light_status:integer):DL_STATUS stdcall;
function CardType2String(var Ctype : Byte):Ansistring ;
function MaxTotalBytes(bCardType: Byte): integer;

    function  MaxBytes(bCardType:Byte):integer;inline;
    function  MaxBlocks(bCardType:Byte) :Integer; inline;
    function bintoAscii(const bin: array of byte): String;
    function bintostr(const bin: array of byte): string;
    function BytesPerBlock(bCardType: Byte): Integer;

function    ReaderList_UpdateAndGetCount(NumberOfDevices: Pinteger):DL_STATUS stdcall;
function    ReaderOpenM(hand: ufr_handle): DL_STATUS stdcall;
function    ReaderList_OpenByIndex(index: integer; tmp_hnd: ufr_handle): DL_STATUS stdcall;

function    ReaderList_GetInformation( //
		hand: ufr_handle ;//assigned Handle
		DeviceSerialNumber : Ptr_c_string; //// device serial number
		DeviceType : Pinteger; //// device type - device identification in AIS database
		DeviceFWver : Pinteger; //// version of firmware
		DeviceCommID : Pinteger; //// device identification number (master)
		DeviceCommSpeed : Pinteger; //// communication speed
		DeviceCommFTDISerial :Ptr_c_string; //// FTDI COM port identification
		DeviceCommFTDIDescription : Ptr_c_String; //// FTDI COM port description
		DeviceIsOpened : PLongint; //// is Device opened
		DeviceStatus : PLongInt//// actual device status
): DL_STATUS stdcall;

function ReaderList_Destroy(hand: PlongWord ): DL_STATUS stdcall;
function ReaderCloseM(hand: PlongWord ): DL_STATUS stdcall;

////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////

implementation
function    ReaderList_UpdateAndGetCount(NumberOfDevices: PInteger):DL_STATUS stdcall; external libdll;
function    ReaderOpenM(hand: ufr_handle): DL_STATUS stdcall; external libdll;
function    ReaderList_OpenByIndex(index: integer; tmp_hnd: ufr_handle): DL_STATUS stdcall;external libdll;
function    ReaderList_GetInformation( //
		hand: ufr_handle ;//assigned Handle
		DeviceSerialNumber : Ptr_c_string; //// device serial number
		DeviceType : Pinteger; //// device type - device identification in AIS database
		DeviceFWver : Pinteger; //// version of firmware
		DeviceCommID : Pinteger; //// device identification number (master)
		DeviceCommSpeed : Pinteger; //// communication speed
		DeviceCommFTDISerial :Ptr_c_string; //// FTDI COM port identification
		DeviceCommFTDIDescription : Ptr_c_string; //// FTDI COM port description
		DeviceIsOpened : PLongInt; //// is Device opened
		DeviceStatus : PLongInt//// actual device status
): DL_STATUS stdcall; external libdll;
function ReaderList_Destroy(hand: PlongWord ): DL_STATUS stdcall;external libdll;
function ReaderCloseM(hand: PlongWord ): DL_STATUS stdcall;external libdll;
function CardType2String(var Ctype : Byte):Ansistring;
begin
 case Ctype of
 $01 : result :='MIFARE_ULTRALIGHT'         ;
 $02 : result :='MIFARE_ULTRALIGHT_EV1_11'  ;
 $03 : result :='MIFARE_ULTRALIGHT_EV1_21'  ;
 $04 : result :='MIFARE_ULTRALIGHT_C'       ;
 $05 : result :='NTAG_203'                  ;
 $06 : result :='NTAG_210'                  ;
 $07 : result :='NTAG_212'                  ;
 $08 : result :='NTAG_213'                  ;
 $09 : result :='NTAG_215'                  ;
 $0A : result :='NTAG_216'                  ;
 $20 : result :='MIFARE_MINI'               ;
 $21 : result :='MIFARE_CLASSIC_1K'         ;
 $22 : result :='MIFARE_CLASSIC_4K'         ;
 $23 : result :='MIFARE_PLUS_S_2K'          ;
 $24 : result :='MIFARE_PLUS_S_4K'          ;
 $25 : result :='MIFARE_PLUS_X_2K'          ;
 $26 : result :='MIFARE_PLUS_X_4K'          ;
 $27 : result :='MIFARE_DESFIRE'            ;
 $28 : result :='MIFARE_DESFIRE_EV1_2K'     ;
 $29 : result :='MIFARE_DESFIRE_EV1_4K'     ;
 $2A : result :='MIFARE_DESFIRE_EV1_8K'     ;
 $2B..$FF : result :='UNKOWN';
 end;

end;



function ReaderOpen:DL_STATUS;stdcall;external libdll;
function ReaderReset:DL_STATUS;stdcall; external libdll;
function ReaderClose:DL_STATUS;stdcall; external libdll;
function ReaderSoftRestart:DL_STATUS;stdcall; external libdll;
function GetReaderType(const lpulReaderType: PLongInt):DL_STATUS;stdcall; external  libdll;
function GetReaderSerialNumber(const lpulSerialNumber: PLongInt):DL_STATUS;stdcall; external libdll;
function ReaderUISignal(light_signal_mode: Byte;beep_signal_mode: Byte):DL_STATUS;stdcall; external libdll;
function GetCardId(var lpucCardType: Byte;var lpulCardSerial: LongInt):DL_STATUS;stdcall; external libdll;

function GetCardIdEx(lpuSak:PByte;
	 	     aucUid:PByte;
                      lpucUidSize:PByte):DL_STATUS;stdcall; external libdll;
function GetCardIdExM( hand: PlongWord;
                      lpuSak:PByte;
	 	     aucUid:PByte;
                      lpucUidSize:PByte):DL_STATUS;stdcall; external libdll;
function GetDlogicCardType(var pCardType:Byte):DL_STATUS ;external libdll;
function GetDlogicCardTypeM(hand: PlongWord;var pCardType:Byte):DL_STATUS ;external libdll;
function ReaderKeyWrite(const aucKey:PByte;ucKeyIndex: Byte):DL_STATUS;stdcall; external libdll;


function LinearRead(aucData:PByte;
                    usLinearAddress: Word;
                    usDataLength: Word;
                    var lpusBytesReturned: Word;
                    ucKeyMode: Byte;
                    ucReaderKeyIndex: Byte): DL_STATUS stdcall;external libdll;
function LinRowRead(aucData:PByte;
                    usLinearAddress: Word;
                    usDataLength: Word;
                    var lpusBytesReturned: Word;
                    ucKeyMode: Byte;
                    ucReaderKeyIndex: Byte): DL_STATUS stdcall;external libdll;


function LinearWrite(const aucData:PByte;
                     usLinearAddress: Word;
                     usDataLength: Word;
                     var lpusBytesWritten: Word;
                     ucKeyMode: Byte;
                     ucReaderKeyIndex: Byte):DL_STATUS;stdcall; external libdll;

function LinearFormatCard(const new_key_A: PByte;
                          blocks_access_bits: Byte;
                          sector_trailers_access_bits: Byte;
                          sector_trailers_byte9: Byte;
                          const new_key_B: PByte;
                          var SectorsFormatted:Byte;
                          auth_mode: Byte;
                          key_index: Byte): DL_STATUS ;stdcall;external libdll;

function ReaderKeysLock(const bPassword:PByte):DL_STATUS stdcall;external libdll;
function ReaderKeysUnlock(const bPassword:PByte):DL_STATUS stdcall;external libdll;



function ReadUserData(aucData:PByte): DL_STATUS  stdcall;external libdll;

function WriteUserData(const aucData: PByte): DL_STATUS  stdcall;external libdll;



function BlockRead(data:PByte;
                   block_address: Byte;
                   auth_mode: Byte;
                   key_index: Byte): DL_STATUS stdcall;external libdll;


function BlockWrite(const data: Pointer;
                    block_address: Byte;
                    auth_mode: Byte;
                    key_index: Byte): DL_STATUS  stdcall; external libdll;


function BlockInSectorRead(data:PByte;
                           sector_address: Byte;
                           block_in_sector_address: Byte;
                           auth_mode: Byte;
                           key_index: Byte): DL_STATUS  stdcall;external libdll;


function BlockInSectorWrite(const data: PByte;
                            sector_address: Byte;
                            block_in_sector_address: Byte;
                            auth_mode: Byte;
                            key_index: Byte): DL_STATUS stdcall;external libdll;


function SectorTrailerWrite(addressing_mode: Byte;
                            address: Byte;
                            const new_key_A: PByte;
                            block0_access_bits: Byte;
                            block1_access_bits: Byte;
                            block2_access_bits: Byte;
                            sector_trailer_access_bits: Byte;
                            sector_trailer_byte9:Byte;
                            const new_key_B: PByte;
                            auth_mode:Byte;
                            key_index:Byte): DL_STATUS  stdcall;external libdll;

function SectorTrailerWriteUnsafe(addressing_mode: Byte;
                                  address: Byte;
                                  const sector_trailer: PByte;
                                  auth_mode: Byte;
                                  key_index: Byte): DL_STATUS stdcall;external libdll;


function ValueBlockRead(value: PLongint;
                        var value_addr: Byte;
                        block_address: Byte;
                        auth_mode: Byte;
                        key_index: Byte): DL_STATUS stdcall;external libdll;


function ValueBlockInSectorRead(value:PLongint;
                                var value_addr: Byte;
                                sector_address: Byte;
                                block_in_sector_address: Byte;
                                auth_mode: Byte;
                                key_index: Byte): DL_STATUS stdcall;external libdll;


function ValueBlockWrite(value: LongInt;
                         value_addr: Byte;
                         block_address: Byte;
                         auth_mode: Byte;
                         key_index: Byte): DL_STATUS  stdcall;external libdll;


function ValueBlockInSectorWrite(value: LongInt;
                                 value_addr: Byte;
                                 sector_address: Byte;
                                 block_in_sector_address: Byte;
                                 auth_mode: Byte;
                                 key_index: Byte): DL_STATUS stdcall;external libdll;


function ValueBlockIncrement(increment_value: LongInt;
                             block_address: Byte;
                             auth_mode: Byte;
                             key_index: Byte): DL_STATUS  stdcall;external libdll;


function ValueBlockInSectorIncrement(increment_value: LongInt;
                                     sector_address: Byte;
                                     block_in_sector_address: Byte;
                                     auth_mode: Byte;
                                     key_index: Byte): DL_STATUS stdcall;external libdll;


function ValueBlockDecrement(decrement_value:LongInt;
                             block_address: Byte;
                             auth_mode: Byte;
                             key_index: Byte): DL_STATUS stdcall ;external libdll;


function ValueBlockInSectorDecrement(decrement_value: LongInt;
                                     sector_address: Byte;
                                     block_in_sector_address: Byte;
                                     auth_mode: Byte;
                                     key_index: Byte): DL_STATUS stdcall;external libdll;


function BlockRead_AKM1(data:PByte;
                        block_address: Byte;
                        auth_mode: Byte): DL_STATUS stdcall;external libdll;


function BlockWrite_AKM1(const data: PByte;
                         block_address: Byte;
                         auth_mode: Byte): DL_STATUS  stdcall;external libdll;


function BlockInSectorRead_AKM1(data:PByte;
                                sector_address: Byte;
                                block_in_sector_address: Byte;
                                auth_mode: Byte): DL_STATUS  stdcall;external libdll;


function BlockInSectorWrite_AKM1(const data: PByte;
                                 sector_address: Byte;
                                 block_in_sector_address: Byte;
                                 auth_mode: Byte): DL_STATUS  stdcall;external libdll;


function LinearRead_AKM1(data:PByte;
                         linear_address: Word;
                         length: Word;
                         var bytes_returned: Word;
                         auth_mode: Byte): DL_STATUS stdcall;external libdll;


function LinearWrite_AKM1(const data: PByte;
                          linear_address: Word;
                          length: Word;
                          var bytes_written: Word;
                          auth_mode: Byte): DL_STATUS  stdcall;external libdll;


function LinearFormatCard_AKM1(const new_key_A: PByte;
                               blocks_access_bits: Byte;
                               sector_trailers_access_bits: Byte;
                               sector_trailers_byte9: Byte;
                               const new_key_B: PByte;
                               var sector_formatted:Byte;
                               auth_mode: Byte): DL_STATUS stdcall;external libdll;


function SectorTrailerWrite_AKM1(addressing_mode: Byte;
                                 address: Byte;
                                 const new_key_A: PByte;
                                 block0_access_bits: Byte;
                                 block1_access_bits: Byte;
                                 block2_access_bits: Byte;
                                 sector_trailer_access_bits: Byte;
                                 sector_trailer_byte9:Byte;
                                 const new_key_B: PByte;
                                 auth_mode:Byte): DL_STATUS  stdcall;external libdll;

function SectorTrailerWriteUnsafe_AKM1(addressing_mode: Byte;
                                       address: Byte;
                                       const sector_trailer: PByte;
                                       auth_mode: Byte): DL_STATUS  stdcall;external libdll;


function ValueBlockRead_AKM1(value: PLongInt;
                             var value_addr: Byte;
                             block_address: Byte;
                             auth_mode: Byte): DL_STATUS  stdcall;external libdll;


function ValueBlockInSectorRead_AKM1(value:PLongInt;
                                     var value_addr: Byte;
                                     sector_address: Byte;
                                     block_in_sector_address: Byte;
                                     auth_mode: Byte): DL_STATUS stdcall;external libdll;


function ValueBlockWrite_AKM1(value: LongInt;
                              value_addr: Byte;
                              block_address: Byte;
                              auth_mode: Byte): DL_STATUS stdcall;external libdll;


function ValueBlockInSectorWrite_AKM1(value: LongInt;
                                      value_addr: Byte;
                                      sector_address: Byte;
                                      block_address: Byte;
                                      auth_mode: Byte): DL_STATUS  stdcall;external libdll;


function ValueBlockIncrement_AKM1(increment_value: LongInt;
                                  block_address: Byte;
                                  auth_mode: Byte): DL_STATUS stdcall;external libdll;


function ValueBlockInSectorIncrement_AKM1(increment_value: LongInt;
                                          sector_address: Byte;
                                          block_in_sector_address: Byte;
                                          auth_mode: Byte): DL_STATUS  stdcall;external libdll;


function ValueBlockDecrement_AKM1(decrement_value: LongInt;
                                  block_address: Byte;
                                  auth_mode: Byte): DL_STATUS stdcall;external libdll;

function ValueBlockInSectorDecrement_AKM1(decrement_value: LongInt;
                                          sector_address: Byte;
                                          block_in_sector_address: Byte;
                                          auth_mode: Byte): DL_STATUS stdcall;external libdll;


function BlockRead_AKM2(data:PByte;
                        block_address: Byte;
                        auth_mode: Byte): DL_STATUS  stdcall;external libdll;


function BlockWrite_AKM2(const data: PByte;
                         block_address: Byte;
                         auth_mode: Byte): DL_STATUS  stdcall;external libdll;


function BlockInSectorRead_AKM2(data:PByte;
                                sector_address: Byte;
                                block_in_sector_address: Byte;
                                auth_mode: Byte): DL_STATUS stdcall;external libdll;


function BlockInSectorWrite_AKM2(const data: PByte;
                                 sector_address: Byte;
                                 block_in_sector_address: Byte;
                                 auth_mode: Byte): DL_STATUS stdcall;external libdll;


function LinearRead_AKM2(data: PByte;
                         linear_address: Word;
                         length: Word;
                         var bytes_returned: Word;
                         auth_mode: Byte): DL_STATUS stdcall;external libdll;


function LinearWrite_AKM2(const data: PByte;
                          linear_address: Word;
                          length: Word;
                          var bytes_written: Word;
                          auth_mode: Byte): DL_STATUS  stdcall;external libdll;


function LinearFormatCard_AKM2(const new_key_A: PByte;
                               blocks_access_bits: Byte;
                               sector_trailers_access_bits: Byte;
                               sector_trailers_byte9: Byte;
                               const new_key_B: PByte;
                               var sector_formatted:Byte;
                               auth_mode: Byte): DL_STATUS  stdcall;external libdll;


function SectorTrailerWrite_AKM2(addressing_mode: Byte;
                                 address: Byte;
                                 const new_key_A: PByte;
                                 block0_access_bits: Byte;
                                 block1_access_bits: Byte;
                                 block2_access_bits: Byte;
                                 sector_trailer_access_bits: Byte;
                                 sector_trailer_byte9:Byte;
                                 const new_key_B: PByte;
                                 auth_mode:Byte): DL_STATUS  stdcall  ;external libdll;

function SectorTrailerWriteUnsafe_AKM2(addressing_mode: Byte;
                                       address: Byte;
                                       const sector_trailer: PByte;
                                       auth_mode: Byte): DL_STATUS  stdcall;external libdll;


function ValueBlockRead_AKM2(value: PLongInt;
                             var value_addr: Byte;
                             block_address: Byte;
                             auth_mode: Byte): DL_STATUS  stdcall;external libdll;


function ValueBlockInSectorRead_AKM2(value:PLongInt;
                                     var value_addr: Byte;
                                     sector_address: Byte;
                                     block_in_sector_address: Byte;
                                     auth_mode: Byte): DL_STATUS stdcall;external libdll;


function ValueBlockWrite_AKM2(value: LongInt;
                              value_addr: Byte;
                              block_address: Byte;
                              auth_mode: Byte): DL_STATUS  stdcall;external libdll;


function ValueBlockInSectorWrite_AKM2(value: LongInt;
                                      value_addr: Byte;
                                      sector_address: Byte;
                                      block_address: Byte;
                                      auth_mode: Byte): DL_STATUS  stdcall;external libdll;


function ValueBlockIncrement_AKM2(increment_value:LongInt;
                                  block_address: Byte;
                                  auth_mode: Byte): DL_STATUS stdcall;external libdll;


function ValueBlockInSectorIncrement_AKM2(increment_value: LongInt;
                                          sector_address: Byte;
                                          block_in_sector_address: Byte;
                                          auth_mode: Byte): DL_STATUS stdcall;external libdll;


function ValueBlockDecrement_AKM2(decrement_value:LongInt;
                                  block_address: Byte;
                                  auth_mode: Byte): DL_STATUS stdcall;external libdll;


function ValueBlockInSectorDecrement_AKM2(decrement_value: LongInt;
                                          sector_address: Byte;
                                          block_in_sector_address: Byte;
                                          auth_mode: Byte): DL_STATUS stdcall;external libdll;


function BlockRead_PK(data:PByte;
                      block_address: Byte;
                      auth_mode: Byte;
                      const key: PByte): DL_STATUS  stdcall;external libdll;


function BlockWrite_PK(const data: PByte;
                       block_address: Byte;
                       auth_mode: Byte;
                       const key: PByte): DL_STATUS  stdcall;external libdll;


function BlockInSectorRead_PK(data:PByte;
                              sector_address: Byte;
                              block_in_sector_address: Byte;
                              auth_mode: Byte;
                              const key: PByte): DL_STATUS  stdcall;external libdll;


function BlockInSectorWrite_PK(const data: PByte;
                               sector_address: Byte;
                               block_in_sector_address: Byte;
                               auth_mode: Byte;
                               const key: PByte): DL_STATUS  stdcall;external libdll;


function LinearRead_PK(data:PByte;
                       linear_address: Word;
                       length: Word;
                       var bytes_returned: Word;
                       auth_mode: Byte;
                       const key:PByte): DL_STATUS  stdcall;external libdll;
function LinRowRead_PK(data:PByte;
                       linear_address: Word;
                       length: Word;
                       var bytes_returned: Word;
                       auth_mode: Byte;
                       const key:PByte): DL_STATUS  stdcall;external libdll;


function LinearWrite_PK(const data: PByte;
                        linear_address: Word;
                        length: Word;
                        var bytes_written: Word;
                        auth_mode: Byte;
                        const key: PByte): DL_STATUS stdcall;external libdll;


function LinearFormatCard_PK(const new_key_A: PByte;
                             blocks_access_bits: Byte;
                             sector_trailers_access_bits: Byte;
                             sector_trailers_byte9: Byte;
                             const new_key_B: PByte;
                             var sector_formatted:Byte;
                             auth_mode: Byte;
                             const key:PByte): DL_STATUS stdcall;external libdll;

function SectorTrailerWrite_PK(addressing_mode: Byte;
                               address: Byte;
                               const new_key_A: PByte;
                               block0_access_bits: Byte;
                               block1_access_bits: Byte;
                               block2_access_bits: Byte;
                               sector_trailer_access_bits: Byte;
                               sector_trailer_byte9:Byte;
                               const new_key_B:PByte;
                               auth_mode: Byte;
                               const key: PByte): DL_STATUS stdcall;external libdll;

function SectorTrailerWriteUnsafe_PK(addressing_mode: Byte;
                                     address: Byte;
                                     const sector_trailer: PByte;
                                     auth_mode: Byte;
                                     const key: PByte): DL_STATUS  stdcall;external libdll;


function ValueBlockRead_PK(value:PLongInt;
                           var value_addr: Byte;
                           block_address: Byte;
                           auth_mode: Byte;
                           const key: PByte): DL_STATUS  stdcall;external libdll;


function ValueBlockInSectorRead_PK(value: PLongInt;
                                   var value_addr: Byte;
                                   sector_address: Byte;
                                   block_in_sector_address: Byte;
                                   auth_mode: Byte;
                                   const key: PByte): DL_STATUS stdcall;external libdll;


function ValueBlockWrite_PK(value: LongInt;
                            value_addr: Byte;
                            block_address: Byte;
                            auth_mode: Byte;
                            const key: PByte): DL_STATUS  stdcall;external libdll;


function ValueBlockInSectorWrite_PK(value:LongInt;
                                    value_addr: Byte;
                                    sector_address: Byte;
                                    block_address: Byte;
                                    auth_mode: Byte;
                                    const key: PByte): DL_STATUS  stdcall;external libdll;


function ValueBlockIncrement_PK(increment_value:LongInt;
                                block_address: Byte;
                                auth_mode: Byte;
                                const key: PByte): DL_STATUS  stdcall;external libdll;


function ValueBlockInSectorIncrement_PK(increment_value: LongInt;
                                        sector_address: Byte;
                                        block_in_sector_address: Byte;
                                        auth_mode: Byte;
                                        const key: PByte): DL_STATUS  stdcall;external libdll;


function ValueBlockDecrement_PK(decrement_value:LongInt;
                                block_address: Byte;
                                auth_mode: Byte;
                                const key: PByte): DL_STATUS stdcall;external libdll;


function ValueBlockInSectorDecrement_PK(decrement_value: LongInt;
                                        sector_address: Byte;
                                        block_in_sector_address: Byte;
                                        auth_mode: Byte;
                                        const key: PByte): DL_STATUS  stdcall;external libdll;

function GetReaderHardwareVersion(const bMajor:Pbyte;
                                  const bMinor:Pbyte): DL_STATUS  stdcall;external libdll;

function GetReaderFirmwareVersion(const bMajor:Pbyte;
                                  const bMinor:Pbyte): DL_STATUS  stdcall;external libdll;
function UFR_Status2String(const status:DL_STATUS):PAnsichar stdcall; external libdll;

function GetDllVersion(): LongInt stdcall; external libdll;
function GetBuildNumber(const build:Pbyte):DL_STATUS stdcall; external libdll;
function UfrRedLightControl(light_status:integer):DL_STATUS stdcall;external libdll;

//----------- U T I L S --- ///

function MaxBytes(bCardType: Byte): integer;   // number of bytes,based on the type of card
begin
    result:=0;
    case bCardType of
         DL_NTAG_203           : Result:=MAX_BYTES_NTAG_203;
         DL_NTAG_213           : Result:=MAX_BYTES_NTAG_213;
         DL_NTAG_215           : Result:=MAX_BYTES_NTAG_215;
         DL_NTAG_216           : Result:=MAX_BYTES_NTAG_216;
         DL_MIFARE_ULTRALIGHT  : Result:=MAX_BYTES_ULTRALIGHT;
         DL_MIFARE_ULTRALIGHT_C: Result:=MAX_BYTES_ULTRALIGHT_C;
         DL_MIFARE_ULTRALIGHT_EV1_11 : Result:=MAX_BYTES_ULTRALIGHT;

         DL_MIFARE_CLASSIC_1K  : Result:=MAX_BYTES_CLASSIC_1K;
         DL_MIFARE_CLASSIC_4K,
         DL_MIFARE_PLUS_S_4K   : Result:=MAX_BYTES_CLASSIC_4k;
    end;
end;


function MaxTotalBytes(bCardType: Byte): integer;   // number of bytes,based on the type of card
begin
    result:=0;
    case bCardType of
         DL_NTAG_203           : Result:=MAX_BYTES_TOTAL_NTAG_203;
         DL_NTAG_213           : Result:=MAX_BYTES_TOTAL_NTAG_213;
         DL_NTAG_215           : Result:=MAX_BYTES_TOTAL_NTAG_215;
         DL_NTAG_216           : Result:=MAX_BYTES_TOTAL_NTAG_216;
         DL_MIFARE_ULTRALIGHT  : Result:=MAX_BYTES_TOTAL_ULTRALIGHT;
         DL_MIFARE_ULTRALIGHT_C: Result:=MAX_BYTES_TOTAL_ULTRALIGHT_C;
         DL_MIFARE_ULTRALIGHT_EV1_11 : Result:= MAX_BYTES_TOTAL_ULTRALIGHT;
         DL_MIFARE_CLASSIC_1K  : Result:=MAX_BYTES_TOTAL_CLASSIC_1K;
         DL_MIFARE_CLASSIC_4K,
         DL_MIFARE_PLUS_S_4K  : Result:=MAX_BYTES_TOTAL_CLASSIC_4k;
    end;

end;

function MaxBlocks(bCardType: Byte): Integer;
begin
    result:=0;
     case bCardType of
          DL_MIFARE_ULTRALIGHT,
          DL_MIFARE_ULTRALIGHT_EV1_11   : Result:=TOTAL_PAGES_ULTRALIGHT;
          DL_MIFARE_ULTRALIGHT_C : Result:=TOTAL_PAGES_ULTRALIGHT_C;
          DL_NTAG_203            : Result:=TOTAL_PAGES_NTAG_203;
          DL_NTAG_213            : Result:=TOTAL_PAGES_NTAG_213;
          DL_NTAG_215            : Result:=TOTAL_PAGES_NTAG_215;
          DL_NTAG_216            : Result:=TOTAL_PAGES_NTAG_216;
          DL_MIFARE_CLASSIC_1k   : Result:=64;
          DL_MIFARE_CLASSIC_4k,
          DL_MIFARE_PLUS_S_4K   : Result:=((MAX_SECTORS_1k*2)*4)+((MAX_SECTORS_1k-8)*16) ;
     end;
end;

function BytesPerBlock(bCardType: Byte): Integer;
begin
    result:=0;
  case bCardType of
          DL_MIFARE_ULTRALIGHT,
          DL_MIFARE_ULTRALIGHT_C,
          DL_MIFARE_ULTRALIGHT_EV1_11,
          DL_NTAG_203,
          DL_NTAG_213,
          DL_NTAG_215,
          DL_NTAG_216            : Result:=4;
          DL_MIFARE_CLASSIC_1k,
          DL_MIFARE_CLASSIC_4k,
          DL_MIFARE_PLUS_S_4K    : Result:=16;
     end;

end;


function bintostr(const bin: array of byte): string;
const HexSymbols = '0123456789ABCDEF';
var i: integer;
begin
  SetLength(Result, 2*Length(bin));
  for i :=  0 to Length(bin)-1 do begin

    Result[1 + 2*i + 0] := HexSymbols[1 + bin[i] shr 4];
    Result[1 + 2*i + 1] := HexSymbols[1 + bin[i] and $0F];
  end;
end;

function bintoAscii(const bin: array of byte): String;
var
   i: integer;
   c:char;
begin
  SetLength(Result, Length(bin));
  for i := 0 to Length(bin)-1 do
  begin
   case bin[i] of
           0..31,128..255: c:='.';
           32..127: c:= Char(bin[i]);
   end;
   Result[i+1] :=c;
  end;
end;
end.
