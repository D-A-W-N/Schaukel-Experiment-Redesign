/**
 * Schaukel Experiment Redesign
 * Created and Developed by Patrick & Nils Schumacher
 *
 * Version: 0.1a
 */

let chalk = require('chalk');
let serialport = require("serialport");
let SerialPort = serialport.SerialPort;
let util = require("util"), repl = require("repl");

/**
 * Node-Draftlog
 * Because Logging can be pretty and fun
 * 
 * What it does 
 * It allows you to re-write a line of your log after being written. Just like post 'updating'. 
 * This is the building block for any dynamic element such as 
 * progress bars, loading status, animations, checkboxes and so on. 
 * 
 * https://github.com/ivanseidel/node-draftlog
 * */
// Account for manual line breaks with:
require('draftlog').into(console);

// The Built-in HTTP Module
// Node.js has a built-in module called HTTP, which allows Node.js to transfer data over the Hyper Text Transfer Protocol (HTTP).
const http = require('http')
// Express is a minimal and flexible Node.js web application framework that provides a robust set of features for web and mobile applications.
const express = require('express')
// Socket.IO is a library that enables real-time, bidirectional and event-based communication between the browser and the server. 
const socketio = require('socket.io')

/**
* Johnny-Five
* The JavaScript Robotics Programming Framework
* 
* Johnny-Five is an Open Source, Firmata Protocol based, IoT and Robotics programming framework, developed at Bocoup. 
* Johnny-Five programs can be written for Arduino (all models), Electric Imp, Beagle Bone, Intel Galileo & Edison, 
* Linino One, Pinoccio, pcDuino3, Raspberry Pi, Particle/Spark Core & Photon, Tessel 2, TI Launchpad and more!
* 
* https://github.com/rwaldron/johnny-five
* */
const five = require("johnny-five");

async function getPort() {
    var message = console.draft();

    return new Promise((resolve, reject) => {
        try {
            serialport.list((err, ports) => {
                if (err) { throw err }
                var allports = ports.length;
                var count = 0;
                var done = false

                // Durchlaufe alle gefundenen Ports...
                ports.forEach(port => {
                    count += 1;
                    pm = port['manufacturer'];

                    //..Wenn Arduino gefunden setzte Portvariable
                    if (typeof pm !== 'undefined' && pm.includes('arduino')) {
                        done = true;
                        let portString = port.comName.toString()
                        message('[PORT]', `Arduino an Port ${portString} erkannt. Verbinde...`);
                        resolve(portString)
                    }

                    //..Wenn alle Ports ohne ergebnis durchgelaufen sind, Meldung ausgeben
                    if (count === allports && done === false) {
                        message('[PORT]', `No Arduino found.`);
                        reject();
                    }
                });
            });
        } catch (err) {
            message('[PORT]', "::ERROR::", err.code, err.message);
            return reject(err)
        }
    });
}

async function connectBoard(port) {
    var message = console.draft();
    return new Promise((resolve, reject) => {
        try {
            var board = new five.Board({
                port: port,
                repl: false,
                debug: false
            });

            board.on("error", function (err) {
                return reject(err)
            });

            board.on("message", function (event) {
                message('[Board]', event.class, event.message);
            });

            board.on("ready", function () {
                message('[Board]', "Connected to Arduino-Board on", port);

                resolve();
            });
        } catch (err) {
            message('[Board]', "::ERROR::", err.code, err.message);
            return reject(err)
        }
    });
}

async function emitSensorData(io) {
    var message = console.draft();

    return new Promise((resolve, reject) => {
        try {
            // Create new `potentiometer` hardware instances.
            // [{ pin: 'A0' }, { pin: 'A1' }, { pin: 'A2' }, { pin: 'A3' }, { pin: 'A4' }]
            var sensors = new five.Sensors([{ pin: 'A0', freq: 60 }, { pin: 'A1', freq: 60 }]);
            let i = 0;
            sensors.forEach(function (sensor) {
                var s = "pot" + i;
                var p = 'var s = console.draft()';
                eval(p);
                sensor.on("change", function () {
                    let v = this.scaleTo([-90, 90]);
                    io.sockets.emit("pot" + this.pin, v);
                    var o = 's("Pot", this.pin+":", v)';
                    eval(o);
                });
                i++;
            });
            resolve();

        } catch (err) {
            message('[SENSORS]', "::ERROR::", err.code, err.message);
            return reject();
        }
    });
}

async function emitDummyData(io) {
    var message = console.draft('[DUMMYDATA]', "Init Dummy Data for Socket Simulation");
    var p1 = console.draft();
    var p2 = console.draft();

    let max = 1024;
    let increase = true;
    let index = 0;


    setInterval(async () => {
        try {
            if (index == max) { increase = false; } else { increase = true; }
            if (increase === true) { index += 0.1; } else { index -= 0.1; }

            io.sockets.emit('pot0', Math.sin(index));
            p1(Math.sin(index));

            io.sockets.emit('pot1', Math.sin(index) + 0.1);
            p2(Math.sin(index) + 0.1);
        } catch (err) {
            message('[DUMMYDATA]', "::ERROR::", err.code, err.message);
        }
    }, 50);

}

async function initWebserver() {
    var message = console.draft();
    return new Promise((resolve, reject) => {
        // Create app instance
        const app = new express();
        const server = http.Server(app);

        const io = socketio(server);

        try {
            app.get('/', function (req, res) {
                res.sendFile(__dirname + '/index.html')
            });

            app.use('/jquery', express.static(__dirname + '/node_modules/jquery/dist/'));
            app.use(express.static('public'));

            server.listen(3000, () => {
                var port = server.address().port;
                // Update Console Draft for Messages
                message('[WEBSERVER]', `started on the http://localhost:${port}`);
                resolve(io);
            });
        } catch (err) {
            message('[WEBSERVER]', "::ERROR::", err.code, err.message);
            return reject(err);
        }
    });
}

async function checkforBrowser(io) {
    var message = console.draft();
    message('[BROWSER]', 'Wait for Browser is Connecting')
    return new Promise((resolve, reject) => {
        try {
            io.on('connection', function (socket) {
                message('[BROWSER]', 'Connected.')
                socket.on('disconnect', () => {
                    message('[BROWSER]', 'Disconnected');
                });
                resolve(true);
            });
        } catch (err) {
            message('[BROWSER]', "::ERROR::", err.code, err.message);
            return reject(false);
        }
    });
}

async function startApp() {
    var message = console.draft();
    let sio;

    const waitInitWebserver = initWebserver();

    waitInitWebserver.then((io) => {
        sio = io;
        if (sio) {
            return checkforBrowser(sio);
        }
    }).then((status) => {
        if (status) {
            return getPort();
        }
    }).then((port) => {
        const waitConnectBoard = connectBoard(port);
        waitConnectBoard.then(() => {
            return emitSensorData(sio);
        });
    }, (reason) => {
        return emitDummyData(sio);
    }).catch((err) => { message('[APP]', "::ERROR::", err.code, err.message) });

    // waitGetPort.then((response) => {
    //     if (!response) {
    //         return setDummyData(sio);
    //     } else {
    //         const waitConnectBoard = connectBoard(waitGetPort);
    //         waitConnectBoard.then(() => {
    //             return emitSensorData(sio);
    //         });

    //     }
    // });

    // const waitgetInitWebserver = initWebserver();
    // const o = await waitgetInitWebserver;
    // const waitForBrowser = checkforBrowser(o);

    // waitForBrowser.then((status) => {
    //     if (status) {
    //         return getSensorData(o)
    //     }
    // });
    // const waitgetSensorData = await getSensorData(o);

    return "done!";
}

startApp();