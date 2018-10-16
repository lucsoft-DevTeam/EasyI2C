var EventEmitter = require('events');
const i2c = require("i2c-bus");
var sleep2 = require('sleep');
function arr_diff (a1, a2) {

    var a= [], diff = [];

    for (var i = 0; i < a1.length; i++) {
        a[a1[i]] = true;
    }

    for (var i = 0; i < a2.length; i++) {
        if (a[a2[i]]) {
            delete a[a2[i]];
        } else {
            a[a2[i]] = true;
        }
    }

    for (var k in a) {
        diff.push(Number(k));
    }

    return diff;
}
class EasyLCD {
    constructor(address, cols, rows, bus) {
        this.displayPorts = {
            RS: 0x01,
            E: 0x04,
            D4: 0x10,
            D5: 0x20,
            D6: 0x40,
            D7: 0x80,
    
            CHR: 1,
            CMD: 0,
    
            backlight: 0x08,
            RW: 0x20 // not used
        };
        this.buffer = new Buffer(3); 
        this.CLEARDISPLAY = 0x01;
        this.RETURNHOME = 0x02;
        this.ENTRYMODESET = 0x04;
        this.DISPLAYCONTROL = 0x08;
        this.CURSORSHIFT = 0x10;
        this.FUNCTIONSET = 0x20;
        this.SETCGRAMADDR = 0x40;
        this.SETDDRAMADDR = 0x80;
        this.ENTRYRIGHT = 0x00;
        this.ENTRYLEFT = 0x02;
        this.ENTRYSHIFTINCREMENT = 0x01;
        this.ENTRYSHIFTDECREMENT = 0x00;
        this.DISPLAYON = 0x04;
        this.DISPLAYOFF = 0x00;
        this.CURSORON = 0x02;
        this.CURSOROFF = 0x00;
        this.BLINKON = 0x01;
        this.BLINKOFF = 0x00;
        this.DISPLAYMOVE = 0x08;
        this.CURSORMOVE = 0x00;
        this.MOVERIGHT = 0x04;
        this.MOVELEFT = 0x00;
        this._8BITMODE = 0x10;
        this._4BITMODE = 0x00;
        this._2LINE = 0x08;
        this._1LINE = 0x00;
        this._5x10DOTS = 0x04;
        this._5x8DOTS = 0x00;
        this.LINEADDRESS = [0x80, 0xC0, 0x94, 0xD4];
        this.address = address;
        this.cols = cols;
        this.rows = rows;
        this.bus = bus;
        this.init();
    }
    init() {
        this.writeA(0x33, this.displayPorts.CMD); //initialization
        sleep(200);
        this.writeA(0x32, this.displayPorts.CMD); //initialization
        sleep(100);
        this.writeA(0x06, this.displayPorts.CMD); //initialization
        sleep(100);
        this.writeA(0x28, this.displayPorts.CMD); //initialization
        sleep(100);
        this.writeA(0x01, this.displayPorts.CMD); //initialization
        sleep(100);
        this.writeA(this.FUNCTIONSET | this._4BITMODE | this._2LINE | this._5x10DOTS, this.displayPorts.CMD);
        sleep(10);
        this.write(this.DISPLAYCONTROL | this.DISPLAYON, this.displayPorts.CMD);
        this.write(this.ENTRYMODESET | this.ENTRYLEFT, this.displayPorts.CMD);
        sleep(10);
        this.write(this.CLEARDISPLAY, this.displayPorts.CMD);
        sleep(10);
        return this;
    }
    writeA(x, c) {
        try {
            let a = (x & 0xF0);
            this.bus.sendByteSync(this.address, a | this.displayPorts.backlight | c);
            this.bus.sendByteSync(this.address, a | this.displayPorts.E | this.displayPorts.backlight | c);
            this.bus.sendByteSync(this.address, a | this.displayPorts.backlight | c);
        } catch (err) {
            this.error = err;
        }
        sleep(2);
    };
    write(x, c) {
        this.writeA(x, c);
        this.writeA(x << 4, c);
        return this;
    };
    clear() {
        return this.write(this.CLEARDISPLAY, this.displayPorts.CMD);
    };
    print(str) {
        if (typeof str === 'string') {
            for (let i = 0; i < str.length; i++) {
                let c = str[i].charCodeAt(0);
                this.write(c, this.displayPorts.CHR);
                sleep(2);
            }
        }
        return this;
    };
    cursorFull() {
        return this.write(this.DISPLAYCONTROL | this.DISPLAYON | this.CURSORON | this.BLINKON, this.displayPorts.CMD);
    };


    cursorUnder() {
        return this.write(this.DISPLAYCONTROL | this.DISPLAYON | this.CURSORON | this.BLINKOFF, this.displayPorts.CMD);
    }


    setCursor(x, y) {
        let l = [0x00, 0x40, 0x14, 0x54];
        return this.write(this.SETDDRAMADDR | (l[y] + x), this.displayPorts.CMD);
    }

  
    home() {
        return this.write(this.SETDDRAMADDR | 0x00, this.displayPorts.CMD);
    }

    blinkOff() {
        return this.write(this.DISPLAYCONTROL | this.DISPLAYON | this.CURSOROFF | this.BLINKOFF, this.displayPorts.CMD);
    }

    blinkOn() {
        return this.write(this.DISPLAYCONTROL | this.DISPLAYON | this.CURSORON | this.BLINKOFF, this.displayPorts.CMD);
    }

    cursorOff() {
        return this.write(this.DISPLAYCONTROL | this.DISPLAYON | this.CURSOROFF | this.BLINKON, this.displayPorts.CMD);
    }

    cursorOn() {
        return this.write(this.DISPLAYCONTROL | this.DISPLAYON | this.CURSORON | this.BLINKON, this.displayPorts.CMD);
    }

    setBacklight(val) {
        if (val) {
            this.displayPorts.backlight = 0x08;
        } else {
            this.displayPorts.backlight = 0x00;
        }
        return this.write(this.DISPLAYCONTROL, this.displayPorts.CMD);
    }
    off() {
        this.displayPorts.backlight = 0x00;
        return this.write(this.DISPLAYCONTROL | this.DISPLAYOFF, this.displayPorts.CMD);
    }

    on() {
        this.displayPorts.backlight = 0x08;
        return this.write(this.DISPLAYCONTROL | this.DISPLAYON, this.displayPorts.CMD);
    }

    createChar(ch, data) {
        this.write(this.SETCGRAMADDR | ((ch & 7) << 3), this.displayPorts.CMD);
        for (let i = 0; i < 8; i++)
           var EventEmitter = require('events');
const i2c = require("i2c-bus");
var sleep2 = require('sleep');
function arr_diff (a1, a2) {

    var a= [], diff = [];

    for (var i = 0; i < a1.length; i++) {
        a[a1[i]] = true;
    }

    for (var i = 0; i < a2.length; i++) {
        if (a[a2[i]]) {
            delete a[a2[i]];
        } else {
            a[a2[i]] = true;
        }
    }

    for (var k in a) {
        diff.push(Number(k));
    }

    return diff;
}
class EasyLCD {
    constructor(address, cols, rows, bus) {
        this.displayPorts = {
            RS: 0x01,
            E: 0x04,
            D4: 0x10,
            D5: 0x20,
            D6: 0x40,
            D7: 0x80,
    
            CHR: 1,
            CMD: 0,
    
            backlight: 0x08,
            RW: 0x20 // not used
        };
        this.buffer = new Buffer(3); 
        this.CLEARDISPLAY = 0x01;
        this.RETURNHOME = 0x02;
        this.ENTRYMODESET = 0x04;
        this.DISPLAYCONTROL = 0x08;
        this.CURSORSHIFT = 0x10;
        this.FUNCTIONSET = 0x20;
        this.SETCGRAMADDR = 0x40;
        this.SETDDRAMADDR = 0x80;
        this.ENTRYRIGHT = 0x00;
        this.ENTRYLEFT = 0x02;
        this.ENTRYSHIFTINCREMENT = 0x01;
        this.ENTRYSHIFTDECREMENT = 0x00;
        this.DISPLAYON = 0x04;
        this.DISPLAYOFF = 0x00;
        this.CURSORON = 0x02;
        this.CURSOROFF = 0x00;
        this.BLINKON = 0x01;
        this.BLINKOFF = 0x00;
        this.DISPLAYMOVE = 0x08;
        this.CURSORMOVE = 0x00;
        this.MOVERIGHT = 0x04;
        this.MOVELEFT = 0x00;
        this._8BITMODE = 0x10;
        this._4BITMODE = 0x00;
        this._2LINE = 0x08;
        this._1LINE = 0x00;
        this._5x10DOTS = 0x04;
        this._5x8DOTS = 0x00;
        this.LINEADDRESS = [0x80, 0xC0, 0x94, 0xD4];
        this.address = address;
        this.cols = cols;
        this.rows = rows;
        this.bus = bus;
        this.init();
    }
    init() {
        this.writeA(0x33, this.displayPorts.CMD); //initialization
        sleep(200);
        this.writeA(0x32, this.displayPorts.CMD); //initialization
        sleep(100);
        this.writeA(0x06, this.displayPorts.CMD); //initialization
        sleep(100);
        this.writeA(0x28, this.displayPorts.CMD); //initialization
        sleep(100);
        this.writeA(0x01, this.displayPorts.CMD); //initialization
        sleep(100);
        this.writeA(this.FUNCTIONSET | this._4BITMODE | this._2LINE | this._5x10DOTS, this.displayPorts.CMD);
        sleep(10);
        this.write(this.DISPLAYCONTROL | this.DISPLAYON, this.displayPorts.CMD);
        this.write(this.ENTRYMODESET | this.ENTRYLEFT, this.displayPorts.CMD);
        sleep(10);
        this.write(this.CLEARDISPLAY, this.displayPorts.CMD);
        sleep(10);
        return this;
    }
    writeA(x, c) {
        try {
            let a = (x & 0xF0);
            this.bus.sendByteSync(this.address, a | this.displayPorts.backlight | c);
            this.bus.sendByteSync(this.address, a | this.displayPorts.E | this.displayPorts.backlight | c);
            this.bus.sendByteSync(this.address, a | this.displayPorts.backlight | c);
        } catch (err) {
            this.error = err;
        }
        sleep(2);
    };
    write(x, c) {
        this.writeA(x, c);
        this.writeA(x << 4, c);
        return this;
    };
    clear() {
        return this.write(this.CLEARDISPLAY, this.displayPorts.CMD);
    };
    print(str) {
        if (typeof str === 'string') {
            for (let i = 0; i < str.length; i++) {
                let c = str[i].charCodeAt(0);
                this.write(c, this.displayPorts.CHR);
                sleep(2);
            }
        }
        return this;
    };
    cursorFull() {
        return this.write(this.DISPLAYCONTROL | this.DISPLAYON | this.CURSORON | this.BLINKON, this.displayPorts.CMD);
    };


    cursorUnder() {
        return this.write(this.DISPLAYCONTROL | this.DISPLAYON | this.CURSORON | this.BLINKOFF, this.displayPorts.CMD);
    }


    setCursor(x, y) {
        let l = [0x00, 0x40, 0x14, 0x54];
        return this.write(this.SETDDRAMADDR | (l[y] + x), this.displayPorts.CMD);
    }

  
    home() {
        return this.write(this.SETDDRAMADDR | 0x00, this.displayPorts.CMD);
    }

    blinkOff() {
        return this.write(this.DISPLAYCONTROL | this.DISPLAYON | this.CURSOROFF | this.BLINKOFF, this.displayPorts.CMD);
    }

    blinkOn() {
        return this.write(this.DISPLAYCONTROL | this.DISPLAYON | this.CURSORON | this.BLINKOFF, this.displayPorts.CMD);
    }

    cursorOff() {
        return this.write(this.DISPLAYCONTROL | this.DISPLAYON | this.CURSOROFF | this.BLINKON, this.displayPorts.CMD);
    }

    cursorOn() {
        return this.write(this.DISPLAYCONTROL | this.DISPLAYON | this.CURSORON | this.BLINKON, this.displayPorts.CMD);
    }

    setBacklight(val) {
        if (val) {
            this.displayPorts.backlight = 0x08;
        } else {
            this.displayPorts.backlight = 0x00;
        }
        return this.write(this.DISPLAYCONTROL, this.displayPorts.CMD);
    }
    off() {
        this.displayPorts.backlight = 0x00;
        return this.write(this.DISPLAYCONTROL | this.DISPLAYOFF, this.displayPorts.CMD);
    }

    on() {
        this.displayPorts.backlight = 0x08;
        return this.write(this.DISPLAYCONTROL | this.DISPLAYON, this.displayPorts.CMD);
    }

    createChar(ch, data) {
        this.write(this.SETCGRAMADDR | ((ch & 7) << 3), this.displayPorts.CMD);
        for (let i = 0; i < 8; i++)
            this.write(data[i], this.displayPorts.CHR);
        return this.write(this.SETDDRAMADDR, this.displayPorts.CMD);
    }
}
function sleep(ms){
    sleep2.usleep(ms * 1000);
}
 
class EasyI2C {
    

    constructor(device) {
        this.device;
        this.events = new EventEmitter();
        this.bus = i2c.openSync(device);
        this.updateSpeed = 1000;
        this.devicelist = [];
    }
    on(name, func) {
       this.events.on(name, func); 
    }

    LCD(address, cols,rows) {
      return new EasyLCD(address, cols,rows,this.bus);
    }
    start() {
        this.events.emit("ready");
        setInterval(this.updateDeviceList, this.updateSpeed,this);
        
    }

    devicelistjson() {
        return JSON.stringify(this.devicelist);
    }
    write(address, text) {
        if(typeof text == "string") {
            for (var i = 0; i < text.length; i++) {
            
                this.bus.sendByteSync(address,text.charAt(i).charCodeAt(0));
            } 
        } else if (typeof text == "number") {
            try {
                this.bus.sendByteSync(address,int);
                
            } catch (error) {
                this.events.emit("debug", "Error: While sending to " + address);          
            }
        }
    }
    sleep(ms){
        sleep2.usleep(ms * 1000);
    }
     
    request(address,text,length) {
        this.write(address,text);
        this.read(address,length);
    }
    intToHex(address) {
        if (address < 16) {
            return "0x0" + address.toString(16);
        } else if(address >= 16 && address <= 255 ){
            return "0x" + address.toString(16);
        }
    }
    read(address,length) {
        var buffertest = new Buffer(length);
        this.bus.i2cReadSync(address,length,buffertest);
        
        var array = [...buffertest];
        array = array.slice(0, array.indexOf(0));
        var stringarray =""; 
        array.forEach(element => {
            stringarray += String.fromCharCode(element);
        });
        this.events.emit("message",{id: address, fid: this.intToHex(address), bytes: stringarray.length, text: stringarray});
            
    }
    updateDeviceList(thisis) {
        try {
            var scanlistnow = thisis.bus.scanSync();
            if(thisis.devicelist.length != scanlistnow.length) {
                
                var device = arr_diff(thisis.devicelist, scanlistnow);
                device.forEach(e => {
                    if(scanlistnow.includes(e)) {
                        thisis.events.emit("connectedDevice", {fid: thisis.intToHex(e),id: e});
                    } else {
                        thisis.events.emit("disconnectedDevice",   {fid: thisis.intToHex(e),id: e});
                    }
                });
                thisis.devicelist = scanlistnow;
            }    
        } catch (error) {
            thisis.events.emit("debug", error);
        }
        
    }
}

module.exports = EasyI2C; this.write(data[i], this.displayPorts.CHR);
        return this.write(this.SETDDRAMADDR, this.displayPorts.CMD);
    }
}
function sleep(ms){
    sleep2.usleep(ms * 1000);
}
 
class EasyI2C {
    

    constructor(device) {
        this.device;
        this.events = new EventEmitter();
        this.bus = i2c.openSync(device);
        this.updateSpeed = 1000;
        this.devicelist = [];
    }
    on(name, func) {
       this.events.on(name, func); 
    }

    LCD(address, cols,rows) {
      return new EasyLCD(address, cols,rows,this.bus);
    }
    start() {
        this.events.emit("ready");
        setInterval(this.updateDeviceList, this.updateSpeed,this);
        
    }

    devicelistjson() {
        return JSON.stringify(this.devicelist);
    }
    write(address, text) {
        if(typeof text == "string") {
            for (var i = 0; i < text.length; i++) {
            
                this.bus.sendByteSync(address,text.charAt(i).charCodeAt(0));
            } 
        } else if (typeof text == "number") {
            try {
                this.bus.sendByteSync(address,int);
                
            } catch (error) {
                this.events.emit("debug", "Error: While sending to " + address);          
            }
        }
    }
    sleep(ms){
        sleep2.usleep(ms * 1000);
    }
     
    request(address,text,length) {
        this.write(address,text);
        this.read(address,length);
    }
    intToHex(address) {
        if (address < 16) {
            return "0x0" + address.toString(16);
        } else if(address >= 16 && address <= 255 ){
            return "0x" + address.toString(16);
        }
    }
    read(address,length) {
        var buffertest = new Buffer(length);
        this.bus.i2cReadSync(address,length,buffertest);
        
        var array = [...buffertest];
        array = array.slice(0, array.indexOf(0));
        var stringarray =""; 
        array.forEach(element => {
            stringarray += String.fromCharCode(element);
        });
        this.events.emit("message",{id: address, fid: this.intToHex(address), bytes: stringarray.length, text: stringarray});
            
    }
    updateDeviceList(thisis) {
        try {
            var scanlistnow = thisis.bus.scanSync();
            if(thisis.devicelist.length != scanlistnow.length) {
                
                var device = arr_diff(thisis.devicelist, scanlistnow);
                device.forEach(e => {
                    if(scanlistnow.includes(e)) {
                        thisis.events.emit("connectedDevice", {fid: thisis.intToHex(e),id: e});
                    } else {
                        thisis.events.emit("disconnectedDevice",   {fid: thisis.intToHex(e),id: e});
                    }
                });
                thisis.devicelist = scanlistnow;
            }    
        } catch (error) {
            thisis.events.emit("debug", error);
        }
        
    }
}

module.exports = EasyI2C;
