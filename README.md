# EasyI2C
EasyI2C is made for a BananaPi or RasberryPi (& more). It allows to easily control the I2C Bus and stuff like an I2C LCD

Its a Wrapper! Using: i2c-bus

## Installation

    npm i easyi2c
    
## Usage
```javascript
var EasyI2C = require("easyi2c");

var i2c = new EasyI2C(2);

i2c.on("connectedDevice", e => {
    console.log(`${ e.fid} has connected to the I2C-Bus`); 
});
i2c.on("disconnectedDevice", e => {
    console.log(`${ e.fid} has has disconnected from the I2C-Bus`);
});
i2c.on("message", e => {
    console.log(`${ e.fid} has send: ${ e.text} (${ e.bytes} Bytes)`);
});
i2c.on("ready", () => {
    console.log("EasyI2C is ready!");
});

i2c.start();
``` 
### LCD-Example
```javascript
i2c.on("connectedDevice", e => {
    console.log(`${ e.fid} has connected to the I2C-Bus`);
    if(e.fid =="0x27") {
        lcd = i2c.LCD(e.id, 16,2);
        lcd.print("Hello World");
    } 
});
```
## Syntax
```javascript
lcd.print(String);
lcd.clear();
lcd.cursorFull();
lcd.cursorUnder();
lcd.setCursor(x:number,y:number);
lcd.home(); // => setCursor(0,0)
lcd.blink(boolen)
lcd.cursor(boolen);
lcd.setBacklight(boolen);
lcd.off();
lcd.on();

i2c.on(name, func);
i2c.LCD(address,cols,rows); //=> EasyLCD
i2c.start();
i2c.updateSpeed; // default 1000
i2c.devicelist;
i2c.devicelistjson(); get i2c.devicelist as json
i2c.write(address,String);
i2c.read(address,length); (length > response text)
i2c.sleep(ms);
i2c.request(address,text,length); // write + read (length > response text)
i2c.updateDeviceList(this) // dont use if you dont use i2c.start();
```
### Notes

Using i2c-bus for communication 
