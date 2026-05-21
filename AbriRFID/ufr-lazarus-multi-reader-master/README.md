# Example how to use multiple uFR Series readers at single host

Software example written for Lazarus/FPC. Shows basic usage of multiple uRF Series readers on single host.
Tested on Windows and Linux-RPI.


## Getting Started

Download project, open source in Lazarus RAD, compile and run. Optionally you can use precompiled binary at first.
Appropriate ufr-lib dynamic library (ufCoder-...) is mandatory for this project, choose it depending on platform and architecture.

### Prerequisites

uFR series reader, Lazarus/FPC.

NOTE: Please be sure that you are using Strings in appropriate manner, if String type is ulti byte, please use Ansistring with safe conversion method in that case. 

### Installing

No installation needed. 


## Background explanation

uFR Series devices communication relies on FTDI's drivers and device instances.
Order and enumaration of FTDI devices on single host may vary, so one can not be sure what device is used for active communication.
Usually, it is the frist plugged device, because that device takes the very first handle in OS.
From that reason, special set of functions in our API reference are dedicated to the purpose of handling multiple devices.
All those functions has exactly the same syntax as "single device" functions with two exceptions:

- Multi reader functions has added suffix "_M" at the end of function's name
- Multi reader functions has one more parameter, it is always the first one and it represents the handle of that device.

 

## License

This project is licensed under the ..... License - see the [LICENSE.md](LICENSE.md) file for details

## Acknowledgments

* Purpose of this software demo is to provide additional info about usage of uFR Series specific features.
* It is specific to mentioned hardware ONLY and some other hardware might have different approach, please bear in mind that.  




