<span align="center">

# Owl +USB Library for Node.JS

<a href="https://www.npmjs.com/package/node-owlusb"><img title="npm version" src="https://badgen.net/npm/v/node-owlusb" ></a>
<a href="https://www.npmjs.com/package/node-owlusb"><img title="npm downloads" src="https://badgen.net/npm/dt/node-owlusb" ></a>

</span>

<img src="https://github.com/simonarnell/node-owlusb/blob/resources/owl.jpg" align="right" alt="owl">

Node.JS library for communicating with [Owl +USB CM160](https://www.theowl.com/index.php/energy-monitors/standalone-monitors/owl-usb/) energy monitoring and analysis devices. Live energy data is collected from the device (produced about once per minute) and converted to JSON.

This work is heavily influenced by Philippe Cornet's C library [eagle-owl](https://github.com/cornetp/eagle-owl).

## Driver

The OWL+USB uses a Silicon Labs [CP210x](https://www.silabs.com/interface/usb-bridges/classic/device.cp2102) USB to UART bridge that typically requires a kernel mode driver to interface with it, largely limiting options for linux. This library instead makes use of the libusb library and my fork of the [cp2102](https://github.com/simonarnell/cp2102) library, to interface with the device in user mode. This therefore does requires libusb to be installed.

### Linux

Install using a package manger e.g. `sudo apt install libusb` on Debian-based distros.

### macOS

Install using a package manger e.g. Homebrew `sudo brew install libusb` or macports `sudo port install libusb`.

### Windows 

On Windows you must install libusb per device using [Zadig](https://zadig.akeo.ie/).

#### WSL2

I have not had much success in installing libusb under Windows 10's WSL2. Hyper-V, [WSL2's underlying hypervisor](https://docs.microsoft.com/en-us/windows/wsl/wsl2-faq), lacks support for Host USB pass-through to VMs.

Purely speculating, you may be able to lash something together using [USB/IP](http://usbip.sourceforge.net) or Microsoft's [VMConnect](https://docs.microsoft.com/en-us/windows-server/virtualization/hyper-v/learn-more/hyper-v-virtual-machine-connect)

## Usage

- Install libusb as described in the [driver](#driver) section.
- Add `node-owlusb` to your dependencies in package.json
- Run `npm install` 
- Use the following code snippet:
```javascript
const OwlUSB = require('node-owlusb')

const owlUSB = new OwlUSB();
owlUSB.on('live', (record) => console.log(JSON.stringify(record)))
```

This should produce JSON similar to:
```json
{"addr":0,"year":2021,"month":1,"day":17,"hour":10,"min":51,"cost":12.50,"amps":1.899,"watts":435,"ah":0.03,"wh":7.25,"isLiveData":true}
```
