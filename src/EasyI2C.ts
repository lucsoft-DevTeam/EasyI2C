import i2c,{ I2cBus } from "i2c-bus";
import sleep2 = require('sleep');

interface IEasyI2CEvents<T> {
    onRecive(handler: { (data: T): void }) : void;
    onDeviceListChanged(test: { (data: T)}): void;
}
interface EasyI2CEventsInterface {
    id: number;
    text: string;
    length: number;
    hexid: string;
}
class EasyI2CEvents<T> implements IEasyI2CEvents<T> {
    handlers: { (data: T): void; }[] = [];
    tests: { (data: T): void; }[] = [];
    public onRecive(handler: { (data: T): void }) : void {
        this.handlers.push(handler);
    }
    public onDeviceListChanged(test: { (data: T)}) : void {
        this.tests.push(test);
    }
    public trigger(data: T) {
        this.handlers.slice(0).forEach(h => h(data));
    }
    public triggerDeviceChange(data: T) {
        this.tests.slice(0).forEach(h => h(data));
    }
    public expose() : IEasyI2CEvents<T> {
        return this;
    }
}
export class EasyI2C {
    private device:number;
    private bus:I2cBus;
    private scanlistbefor:number[]= [];
    bufferlength:number = 8193;
    private readonly EventList = new EasyI2CEvents<EasyI2CEventsInterface>();

    public get events() { return this.EventList.expose(); } 
    private arr_diff (a1, a2) {

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
            diff.push(Number.parseInt(k));
        }
    
        return diff;
    }
    constructor(device:number) {
        this.device = device;
        this.bus = i2c.openSync(device);
        
    }

    SendText(address:number,text: string) {
        try {
            for (var i = 0; i < text.length; i++) {
            
                this.bus.sendByteSync(address,text.charAt(i).charCodeAt(0));
            }    
        } catch (error) {
            
        }
        
        
    }
    ReqeustString(address:number,length:number) {  
        try {
            var buffertest = new Buffer(length);
            this.bus.i2cReadSync(address,length,buffertest);
            
            var array = [...buffertest];
            array = array.slice(0, array.indexOf(0));
            var stringarray =""; 
            array.forEach(element => {
                stringarray += String.fromCharCode(element);
            });
            this.EventList.trigger({id: address, hexid: this.intToHex(address), length: stringarray.length, text: stringarray});
                
        } catch (error) {
            
        }
        
    }
    SendByte(address:number,int: number) {
        try {
            this.bus.sendByteSync(address,int);
            
        } catch (error) {
            
            console.error("Error while sending to " +address);
        }
    }
    LCD (address:number,cols:number,rows:number) {
        return new LCD(this.device,address,cols,rows,this.bus);
    }
    SimpleScan() {
        return this.bus.scanSync();
    }
    SimpleScanJson() {
        return JSON.stringify(this.SimpleScan());
    }
    intToHex(address:number) {
        if (address < 16) {
            return "0x0" + address.toString(16);
        } else if(address >= 16 && address <= 255 ){
            return "0x" + address.toString(16);
        }
    }
    updateDeviceList() {
        var scanlistnow = this.bus.scanSync();
        var thisthis = this;
        if(this.scanlistbefor.length != scanlistnow.length) {
            
            var device = this.arr_diff(this.scanlistbefor, scanlistnow);
            device.forEach(function(e) {
                if(scanlistnow.includes(e)) {
                    thisthis.EventList.triggerDeviceChange({hexid: thisthis.intToHex(e),id: e, text:"connected", length:null});
                } else {
                    thisthis.EventList.triggerDeviceChange({hexid: thisthis.intToHex(e),id: e, text:"disconnected", length:null});
                }
            });
            this.scanlistbefor = scanlistnow;
        }
    }
};

class LCD {
    private displayPorts = {
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
    private buffer = new Buffer(3); 
    private CLEARDISPLAY = 0x01;
    private RETURNHOME = 0x02;
    private ENTRYMODESET = 0x04;
    private DISPLAYCONTROL = 0x08;
    private CURSORSHIFT = 0x10;
    private FUNCTIONSET = 0x20;
    private SETCGRAMADDR = 0x40;
    private SETDDRAMADDR = 0x80;
    private ENTRYRIGHT = 0x00;
    private ENTRYLEFT = 0x02;
    private ENTRYSHIFTINCREMENT = 0x01;
    private ENTRYSHIFTDECREMENT = 0x00;
    private DISPLAYON = 0x04;
    private DISPLAYOFF = 0x00;
    private CURSORON = 0x02;
    private CURSOROFF = 0x00;
    private BLINKON = 0x01;
    private BLINKOFF = 0x00;
    private DISPLAYMOVE = 0x08;
    private CURSORMOVE = 0x00;
    private MOVERIGHT = 0x04;
    private MOVELEFT = 0x00;
    private _8BITMODE = 0x10;
    private _4BITMODE = 0x00;
    private _2LINE = 0x08;
    private _1LINE = 0x00;
    private _5x10DOTS = 0x04;
    private _5x8DOTS = 0x00;
    private LINEADDRESS = [0x80, 0xC0, 0x94, 0xD4];
    private device:number;
    private address:number;
    private cols:number;
    private rows:number;
    private error = null;
    private i2c = null;
    private bus:I2cBus;
    constructor(device:number,address:number, cols:number,rows:number,bus:I2cBus) {
        this.device = device;
        this.address = address;
        this.cols = cols;
        this.rows = rows;
        this.bus = bus;
        this.init();
    }
    private  init() {
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
        this.writeA(this.FUNCTIONSET | this._4BITMODE | this._2LINE | this._5x10DOTS, this.displayPorts.CMD); //4 bit - 2 line 5x7 matrix

        sleep(10);
        this.write(this.DISPLAYCONTROL | this.DISPLAYON, this.displayPorts.CMD); //turn cursor off 0x0E to enable cursor
        sleep(10);
        this.write(this.ENTRYMODESET | this.ENTRYLEFT, this.displayPorts.CMD); //shift cursor right
        sleep(10);
        this.write(this.CLEARDISPLAY, this.displayPorts.CMD);
        sleep(10);
        return this;

    }
    private  writeA(x:any, c:any) {
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
    private  write(x:any, c:any) {
        this.writeA(x, c);
        this.writeA(x << 4, c);
        return this;
    };
    clear() {
        return this.write(this.CLEARDISPLAY, this.displayPorts.CMD);
    };
     print(str:any) {
        if (typeof str === 'string') {
            for (let i = 0; i < str.length; i++) {
                let c = str[i].charCodeAt(0);
                this.write(c, this.displayPorts.CHR);
                sleep(2);
            }
        }
        return this;
    };
    println(str:string, line:any) {
        //Set cursor to correct line.
        if (line > 0 && line <= this.rows) {
            this.write(this.LINEADDRESS[line - 1], this.displayPorts.CMD);
        }
        this.print(str.substring(0, this.cols));
        return this;
    };
    /** flashing block for the current cursor */
    cursorFull() {
        return this.write(this.DISPLAYCONTROL | this.DISPLAYON | this.CURSORON | this.BLINKON, this.displayPorts.CMD);
    };

    /** small line under the current cursor */
    cursorUnder() {
        return this.write(this.DISPLAYCONTROL | this.DISPLAYON | this.CURSORON | this.BLINKOFF, this.displayPorts.CMD);
    }

    /** set cursor pos, top left = 0,0 */
    setCursor(x:number, y:number) {
        let l = [0x00, 0x40, 0x14, 0x54];
        return this.write(this.SETDDRAMADDR | (l[y] + x), this.displayPorts.CMD);
    }

    /** set cursor to 0,0 */
    home() {
        return this.write(this.SETDDRAMADDR | 0x00, this.displayPorts.CMD);
    }

    /** Turn underline cursor off */
    blinkOff() {
        return this.write(this.DISPLAYCONTROL | this.DISPLAYON | this.CURSOROFF | this.BLINKOFF, this.displayPorts.CMD);
    }

    /** Turn underline cursor on */
    blinkOn() {
        return this.write(this.DISPLAYCONTROL | this.DISPLAYON | this.CURSORON | this.BLINKOFF, this.displayPorts.CMD);
    }

    /** Turn block cursor off */
    cursorOff() {
        return this.write(this.DISPLAYCONTROL | this.DISPLAYON | this.CURSOROFF | this.BLINKON, this.displayPorts.CMD);
    }

    /** Turn block cursor on */
    cursorOn() {
        return this.write(this.DISPLAYCONTROL | this.DISPLAYON | this.CURSORON | this.BLINKON, this.displayPorts.CMD);
    }

    /** setBacklight */
    setBacklight(val:boolean) {
        if (val) {
            this.displayPorts.backlight = 0x08;
        } else {
            this.displayPorts.backlight = 0x00;
        }
        return this.write(this.DISPLAYCONTROL, this.displayPorts.CMD);
    }
    /** Turn display off */
    off() {
        this.displayPorts.backlight = 0x00;
        return this.write(this.DISPLAYCONTROL | this.DISPLAYOFF, this.displayPorts.CMD);
    }

    /** Turn display on */
    on() {
        this.displayPorts.backlight = 0x08;
        return this.write(this.DISPLAYCONTROL | this.DISPLAYON, this.displayPorts.CMD);
    }

    /** set special character 0..7, data is an array(8) of bytes, and then return to home addr */
    createChar(ch:any, data:any) {
        this.write(this.SETCGRAMADDR | ((ch & 7) << 3), this.displayPorts.CMD);
        for (let i = 0; i < 8; i++)
            this.write(data[i], this.displayPorts.CHR);
        return this.write(this.SETDDRAMADDR, this.displayPorts.CMD);
    }
}

function sleep(ms:number){
    sleep2.usleep(ms * 1000);
}
