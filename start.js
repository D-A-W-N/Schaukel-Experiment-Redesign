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

// global Socket Variable
let socket;

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


// Mithilfe von Serialport sämtliche angeschlossenen Ports finden und nach Adruino Kennzeichnung suchen
async function getPort() {
    var message = console.draft('[PORT]', `Looking for suitable Ports...`);

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

                    //..Wenn Arduino gefunden setzte Portvariable uns Resolve den PortString
                    if (typeof pm !== 'undefined' && pm.includes('arduino')) {
                        done = true;
                        let portString = port.comName.toString()
                        message('[PORT]', `Arduino an Port ${portString} erkannt. Verbinde...`);
                        resolve(portString)
                    }

                    //..Wenn alle Ports ohne ergebnis durchgelaufen sind, Meldung ausgeben und reject duchführen um die Meldung abfangen zu können
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

// Verbindung zum Adruino mit Hilfe des ermittelten Ports aufbauen
async function connectBoard(port) {
    var message = console.draft('[Board]', "Connect to the board...");
    return new Promise((resolve, reject) => {
        try {
            // Versuche die Verbindung  zum Adruino herzustellen
            var board = new five.Board({
                port: port,
                repl: false,
                debug: false
            });

            // Wenn Fehler Event ausgelöst wird -> reject
            board.on("error", function (err) {
                return reject(err)
            });

            // Mitteilungen des Adruino werden im Console Draft erfasst.
            board.on("message", function (event) {
                message('[Board]', event.class, event.message);
            });

            // Wenn der Adrunio verbunden und bereit ist -> resolve
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

// emit Data from Connected Adruino to Webserversocket
async function emitSensorData(io) {
    var message = console.draft();

    return new Promise((resolve, reject) => {
        try {
            // erstelle `potentiometer` Hardwareinstanz.
            // [{ pin: 'A0' }, { pin: 'A1' }, { pin: 'A2' }, { pin: 'A3' }, { pin: 'A4' }]
            var sensors = new five.Sensors([{ pin: 'A0', freq: 40 }, { pin: 'A1', freq: 40 }]);
            let i = 0;

            // Für jeden Sensor in der Collection werden Daten empfangen, bearbeitet und zum Webserver gesendet
            sensors.forEach(function (sensor) {
                // Dynamische Variable für die Ausgabe der Sensor Werte im KonsolenDraft
                var s = "pot" + i;
                var p = 'var s = console.draft()';
                eval(p);
                // let valueCounter = 0
                // let valueArray = [];
                // let arrAvg = 0;
                // Sofern sich die Werte ändern soll an den Webserver gesendet werden
                sensor.on("data", function () {
                    // Skaliere ankommende Werte auf einen Bereich von -1 und 1
                    let v = this.fscaleTo([-1, 1]);
                    // v = v.toFixed(3);
                    // let v = this.scaleTo([-512,512]);
                    // v = Math.ceil(v / 10 ) * 10;
                    // v = v.toFixed(4);
                    // Sende die Skalierten Werte an den Webserver
                    io.sockets.emit("pot" + this.pin, v);
                    // Update der Dynamischen Variable mit den Sensor Werte für den jeweiligen Sensor
                    var o = 's("Pot", this.pin+":", v)';
                    eval(o);
                    // }
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


// Emit Dummy Values to Webserversocket
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
            if (increase === true) { index += 0.05; } else { index -= 0.05; }

            io.sockets.emit('pot0', 0.40 * Math.sin(index));
            p1('[DUMMYDATA]', 'Pot 1:', 0.40 * Math.sin(index));

            io.sockets.emit('pot1', 0.40 * Math.sin((index * -1)) + 0.05);
            p2('[DUMMYDATA]', 'Pot 2:', 0.40 * Math.sin((index * -1)) + 0.05);
        } catch (err) {
            message('[DUMMYDATA]', "::ERROR::", err.code, err.message);
        }
    }, 40);

}

// Input progess goes from 0 to 100
function ProgressBar(progress) {
    // Make it 50 characters length
    var units = Math.round(progress / 2)
    return '[' + '='.repeat(units) + ' '.repeat(50 - units) + '] ' + progress + '%'
}

// Init Webserver
async function initWebserver() {
    var message = console.draft('[WEBSERVER]', `Initialize Webserver...`);
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
                // Server erfolgreich gestartet, aktualisiere Webserver Statusmeldung
                message('[WEBSERVER]', `started on the http://localhost:${port}`);
                resolve(io);
            });
        } catch (err) {
            message('[WEBSERVER]', "::ERROR::", err.code, err.message);
            return reject(err);
        }
    });
}

// Check for Browser is Connected to Webserver
async function checkforBrowser(io) {
    var message = console.draft();
    message('[BROWSER]', 'Wait for Browser is Connecting')
    return new Promise((resolve, reject) => {
        try {
            // Wenn eine Socketverbindung hergestellt wurde ist das ein Indikator dafür das der Browser die Seite geöffnet hat
            io.on('connection', function (s) {
                socket = s;
                message('[BROWSER]', 'Connected.')
                // Aktualisiere Meldung wenn Browser geschlossen wird
                s.on('disconnect', () => {
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

// Check for Browser is Connected to Webserver
async function getMatchBar(io) {
    var barLine = console.draft('[MATCHCOUNT]', 'Wait for Data...');
        try {
                // Display a Match Progressbar
                socket.on('equalCounter', function (equalCounter) {
                    if (equalCounter == 100) {
                        barLine('[MATCHCOUNT]', 'A MATCH!')
                    } else {
                        barLine('[MATCHCOUNT]', ProgressBar(equalCounter))
                    }

                });
        } catch (err) {
            message('[MATCHCOUNT]', "::ERROR::", err.code, err.message);
        }
}

// Init all async Tasks
async function startApp() {
    var message = console.draft();
    let sio;

    const waitInitWebserver = initWebserver();

    waitInitWebserver.then((io) => {
        sio = io;
        if (sio) {
            return checkforBrowser(sio);
        }
    }).then(async (status) => {
        if (status) {
            return getPort();
        }
    }).then(async (port) => {
        const waitConnectBoard = connectBoard(port);
        waitConnectBoard.then(() => {
            return emitSensorData(sio);
        });
    },async (reason) => {
        return emitDummyData(sio);
    }).then(() => getMatchBar(sio)).catch((err) => { message('[APP]', "::ERROR::", err.code, err.message) });
    return
}

startApp();