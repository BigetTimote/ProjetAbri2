unit unitMain;

{$mode objfpc}{$H+}

interface

uses
  Classes, SysUtils, FileUtil, Forms, Controls, Graphics, Dialogs, StdCtrls,
  Grids, ufcoder;

type

  { TForm1 }
THandleList = record
  index: LongInt;
  handle:PlongWord;
  DeviceSerialStr: Ansistring;
  deviceType : LongInt;
  DeviceFWVer : LongInt;
  DeviceCommID : LongInt;
  DeviceCommSpeed : LongInt;
  FTDISerialStr : AnsiString;
  FTDIDescStr : AnsiString;
  DeviceIsOpened : LongInt;
  DeviceStatus   : LongInt;
end;

  TForm1 = class(TForm)
    btnGetCardInfo: TButton;
    btnGetCount: TButton;
    btnOpen: TButton;
    btnDevInfo: TButton;
    btnClose: TButton;
    ed1: TEdit;
    gbDevice: TGroupBox;
    GroupBox2: TGroupBox;
    GroupBox3: TGroupBox;
    Label1: TLabel;
    labUID: TLabel;
    labIndex: TLabel;
    Label2: TLabel;
    Label3: TLabel;
    labDevice: TLabel;
    Label5: TLabel;
    labSerial: TLabel;
    labCtype: TLabel;
    Memo1: TMemo;
    sg1: TStringGrid;

    procedure btnDevInfoClick(Sender: TObject);
    procedure btnGetCountClick(Sender: TObject);
    procedure btnOpenClick(Sender: TObject);
    procedure btnGetCardInfoClick(Sender: TObject);
    procedure btnCloseClick(Sender: TObject);
    procedure FormCreate(Sender: TObject);


      procedure SG1SelectCell(Sender: TObject; aCol, aRow: Integer;
      var CanSelect: Boolean);
  private

    { private declarations }
  public
    { public declarations }
  end;
const DL_OK = 0;
var
  Form1: TForm1;
  HList: array of THandleList;
  NumDevices: Integer =0;
  SelectedDevice : integer =0;


implementation

{$R *.lfm}

{ TForm1 }
procedure Tform1.SG1SelectCell(Sender: TObject; aCol, aRow: Integer;
var CanSelect: Boolean);
begin
  if assigned(hlist) then
     begin
     labIndex.Caption:=inttostr(Hlist[arow-1].index);
     labDevice.Caption:=Hlist[arow-1].FTDIDescStr;
     labserial.Caption:=Hlist[arow-1].FTDISerialStr;
     SelectedDevice:=Hlist[arow-1].index;
     end;
end;

procedure TForm1.btnGetCountClick(Sender: TObject);
var
  res : integer;
  pnum:^integer;
begin

 new(pnum);
 try
 res:=ReaderList_UpdateAndGetCount (pnum);
 if res=DL_OK then
    begin
    NumDevices:=pnum^;
    ed1.text:=inttostr(NumDevices);
    Memo1.append('Number of devices :'+inttostr(NumDevices));
    btnOpen.enabled:=true;
    end
      else
          begin
          Memo1.append('Error opening devices :'+uFR_Status2String(res));
          btnOpen.enabled:=false;
          end;
  finally
  dispose(pnum);
  end;
end;


procedure TForm1.btnOpenClick(Sender: TObject);
var
  res:DL_STATUS;
  i : integer;

begin
         if length(Hlist)>0 then
            begin
            for i:=0 to length(Hlist)-1 do
                ReaderList_Destroy(Hlist[i].handle);
            end;
         IF NumDevices>0 then
            begin
            setlength(Hlist,0);
            setlength(hlist,NumDevices);
            sg1.RowCount:=NumDevices+1;
            sg1.Refresh;
            sg1.Repaint;
            form1.Repaint;
            for i := 0 to NumDevices-1 do
                begin
                hlist[i].index:=i;
                new(hlist[i].handle);
                res:=ReaderList_OpenByIndex(hlist[i].index,@hlist[i].handle);
                if res=DL_OK then
                              begin
                              memo1.append('Opened device :'+inttostr(i)+' handle: '+format('%p',[hlist[i].handle]));
                              btnDevInfo.enabled:=true;
                              btnClose.enabled:=true;
                              btnGetCount.enabled:=false;
                              btnOpen.enabled:=false;
                              end
                              else
                              begin
                              memo1.append('Error '+ufr_status2string(res));
                              btnDevInfo.enabled:=false;
                              btnClose.enabled:=false;
                              btnGetCount.enabled:=false;
                              btnOpen.enabled:=true;
                              end;
                end;
            end;

end;   //func
procedure TForm1.btnDevInfoClick(Sender: TObject);
Var
  res:DL_STATUS;
  i,j : integer;
  DeviceSerialNumber : Array [0..32] of AnsiChar;
  PDeviceSerialNumber : c_string;
  FTDIserial   : Array [0..32] of AnsiChar;
  pFTDISerial : c_string;
  FTDIDesc  : Array [0..32] of AnsiChar;
  pFTDIdesc : c_string;

begin
  if length(Hlist)>0 then
  begin
  new(PDeviceSerialNumber);
  new(pFTDIserial);
  new(pFTDIdesc);

         for i := 0 to NumDevices-1 do
             begin

             pFTDISerial:=@FTDIserial;
             pFTDIdesc :=@FTDIdesc;
             PDeviceSerialNumber :=@DeviceSerialNumber;

             res:=ReaderList_GetInformation(@hlist[i].handle,
                              @pDeviceSerialNumber,
                              @Hlist[i].deviceType,
                              @Hlist[i].DeviceFWVer,
                              @HList[i].DeviceCommID,
                              @Hlist[i].DeviceCommSpeed,
                              @pFTDISerial,
                              @pFTDIDesc,
                              @HList[i].DeviceIsOpened,
                              @Hlist[i].DeviceStatus
                              );

             if res=DL_OK then
                begin

                Hlist[i].DeviceSerialStr:=Ansistring(pDeviceSerialNumber);;
                Hlist[i].FTDISerialStr:=Ansistring(pFTDISerial);
                HList[i].FTDIDescStr:=Ansistring(pFTDIDesc);

                sg1.Cells[0,i+1]:=inttostr(hlist[i].index);
                sg1.Cells[1,i+1]:=format('0x%p',[hlist[i].handle]);
                sg1.Cells[2,i+1]:=Hlist[i].DeviceSerialStr;
                sg1.Cells[3,i+1]:=format('0x%.8x',[Hlist[i].deviceType]);
                sg1.Cells[4,i+1]:=inttostr(Hlist[i].DeviceFWVer);
                sg1.Cells[5,i+1]:=inttostr(Hlist[i].DeviceCommID);
                sg1.Cells[6,i+1]:=inttostr(Hlist[i].DeviceCommSpeed);
                sg1.Cells[7,i+1]:=HList[i].FTDISerialStr;
                sg1.Cells[8,i+1]:=Hlist[i].FTDIDescStr;
                sg1.Cells[9,i+1]:=BoolToStr(Boolean(Hlist[i].DeviceIsOpened), true);
                sg1.Cells[10,i+1]:=inttostr(Hlist[i].DeviceStatus);
                for j:=0 to sg1.ColCount-1 do sg1.AutoSizeColumn(j);
                sg1.row:=sg1.rowcount;
                sg1.col:=0;
                btnDEvInfo.enabled:=false;
                btnGetCardInfo.Enabled:=true;
                memo1.append(ufr_status2String(res));
                end
                   else
                   begin
                   memo1.append('Error:'+ufr_status2String(res));
                   end;
              end;

  end;
end;



procedure TForm1.btnGetCardInfoClick(Sender: TObject);
var
baCardUID     :  Array[0..9] of Byte;
UidSize       :  Byte = 0;
CardType      :  Byte = 0;
UID_result, Card_Result: DL_STATUS;
i:integer;
UID:string;

begin
  Card_Result:= GetDlogicCardTypeM(Hlist[SelectedDevice].handle,CardType);
  labCtype.Caption:=IntToHex(CardType,2)+' : '+CardType2String(Cardtype);
  UID_Result:= GetCardIdExM(Hlist[SelectedDevice].handle,@CardType,@baCardUID[0],@UidSize);   //get card UID
             if UID_Result=DL_OK
                then
                    begin
                    for i:= 0 to UidSize-1 do UID:= UID+' '+IntToHex(baCardUID[i],2);
                    end
             else
             begin
             UID:='Error '+ufr_Status2String(UID_Result);
             end;
 labUID.caption:=UID;
end;

procedure TForm1.btnCloseClick(Sender: TObject);
var
  res:DL_STATUS;
  i : integer;
begin
  if (NumDevices>0) and (Length(Hlist)>0) then
      begin
      for i:= 0 to Numdevices-1 do
          begin
          res:=ReaderCloseM(Hlist[i].handle);
          if res=DL_OK then
             memo1.Append(uFR_Status2String(res)+' Device closed - index : ' +
                        inttostr(Hlist[i].index)+
                        format('Handle: %p ' ,[Hlist[i].handle])
                        )
              else  memo1.Append(uFR_Status2String(res));
          res:=ReaderList_Destroy(Hlist[i].handle);
          if res=DL_OK then
             memo1.Append(uFR_Status2String(res)+
                        format('Handle destroyed: %p ' ,[Hlist[i].handle])
                        )
              else  memo1.Append(uFR_Status2String(res));
          end;
      setLength(Hlist,0);
      NumDevices:=0;
      btnClose.enabled:=false;
      btnGetCardInfo.enabled:=false;
      btnDevInfo.enabled:=false;
      btnGetCount.enabled:=true;
      btnGetCount.SetFocus;
      end;
end;

procedure TForm1.FormCreate(Sender: TObject);
begin
  btnGetCount.enabled:=true;
end;


end.

