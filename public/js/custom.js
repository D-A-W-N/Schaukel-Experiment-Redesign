let movedOne = false;
let movedTwo = false;
let chartOneValue = 0.00;
let chartTwoValue = 0.00;
let equalCounter = 0;
let standingCounter = 0;
let chartOneCorrection = 0;
let chartTwoCorrection = 0;
let video = null;

let socket = io();

function showCam() {
    clearInterval(differenceInterval);
    $("canvas#frequency-chart").addClass("hide");

    snapshot();

    setTimeout(function () {
        $('.match-icon').addClass('match');
        $(".progress-container").fadeOut();

        setTimeout(function(){
            $(".match-icon").addClass("vanishOut");

            $("video").addClass("show");

            setTimeout(function () {
                $(".match-icon").removeClass("match vanishOut");
                $(".match-icon").hide();
            }, 2000);

        }, 3000);
    }, 1000);
    
    setTimeout(function () {
        hideCam();
    }, 10000);
}

function hideCam() {
    $("video").removeClass("show");

    setTimeout(function () {
        $("canvas#frequency-chart").removeClass("hide");
        $(".progress-bar").css("width", "0%");

        setTimeout(function () {
            $(".progress-container").fadeIn();
            $(".match-icon").fadeIn();
        }, 500);

        setTimeout(function () {
            equalCounter = 0;
            setDifferenceInterval();
        }, 1000);
    }, 2000);
}

function snapshot() {
    let canvas, ctx;
    canvas = document.getElementById("snapshot-canvas");
    ctx = canvas.getContext('2d');
    // Draws current image from the video element into the canvas

    ctx.filter = "grayscale(1)";
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.filter = "grayscale(0)";
    // ctx.fillStyle = "rgb(124, 77, 201, 0.3)";
    // ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.drawImage(document.getElementById("water-mark"), canvas.width * 0.83, canvas.height * 0.9, canvas.width / 7, canvas.width / 7 / 3.61);

    saveImage();
}

function saveImage() {
    var ua = window.navigator.userAgent;

    if (ua.indexOf("Chrome") > 0) {
        // save image without file type
        var canvas = document.getElementById("snapshot-canvas");
        // document.location.href = canvas.toDataURL("image/png").replace("image/png", "image/octet-stream");

        // save image as png
        var link = document.createElement('a');
        link.download = "snapshot_" + Date.now() + ".png";
        link.href = canvas.toDataURL("image/png").replace("image/png", "image/octet-stream");;
        link.click();
    }
    else {
        alert("Please use Chrome");
    }
}

function setDifferenceInterval() {
    differenceInterval = setInterval(function () {
        if (movedOne || movedTwo) {
            if (parseFloat(chartTwoValue) >= (parseFloat(chartOneValue) - 0.1) && parseFloat(chartTwoValue) <= (parseFloat(chartOneValue) + 0.1)) {
                equalCounter++;
                $(".progress-bar").css("width", equalCounter + "%");

            } else {
                equalCounter = 0;
                $(".progress-bar").css("width", "0%");
            }
            socket.emit('equalCounter', equalCounter);
        }

        if (equalCounter >= 100) {
            socket.emit('equalCounter', 100);
            $(".progress-bar").css("width", "100%");
            
            if((chartOneValue >= 0.05 && chartOneValue <= 0.2) && (chartTwoValue >= 0.05 && chartTwoValue <= 0.2)) {
                movedOne = false;
                movedTwo = false;
                showCam();
            } else if ((chartOneValue < 0.05 && chartOneValue > (-0.05)) && (chartTwoValue < 0.05 && chartTwoValue > (-0.05)) ) {
                standingCounter++;

                if(standingCounter >= 50) {
                    $(".progress-bar").css("width", "0%");
                    chartOneCorrection = 0 - (chartOneValue) + 0.02;
                    chartTwoCorrection = 0 - (chartTwoValue);
                    movedOne = false;
                    movedTwo = false;
                    equalCounter = 0;
                    standingCounter = 0;
                }
            }
        }

    }, 100);
}

$(document).ready(function () {

    // Create Div Elements for Stars and Bokehs
    for (let index = 0; index < 50; index++) {
        $('.star-container').append('<div></div>');
    }

    for (let index = 0; index < 25; index++) {
        $('.bokeh-container').append('<div></div>');
    }

    //implement WebCam code
    video = document.getElementById("webcam-video");

    if (navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({audio: false, video: {width: 1920, height: 1080} })
            .then(function (stream) {
                video.srcObject = stream;
            })
            .catch(function (error) {
                //console.log("Somethin went wrong");
            });
    }

    let ctx = document.getElementById('frequency-chart');
    let myLineChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: "",
            datasets: [{
                label: "",
                // backgroundColor: "rgba(230,0,255,0.1)",
                borderColor: "rgba(230,0,255,1)",
                backgroundColor: "transparent",
                borderWidth: 8,
                data: []
            }, {
                label: "",
                // backgroundColor: "rgba(243, 147, 36, 0.1)",
                borderColor: "rgba(243, 147, 36, 1)",
                backgroundColor: "transparent",
                borderWidth: 8,
                data: []
            }, {
                label: "",
                // backgroundColor: "rgba(230,0,255,0.1)",
                borderColor: "rgba(230,0,255,0.1)",
                backgroundColor: "transparent",
                borderWidth: 20,
                data: []
            }, {
                label: "",
                // backgroundColor: "rgba(243, 147, 36, 0.1)",
                borderColor: "rgba(243, 147, 36, 0.1)",
                backgroundColor: "transparent",
                borderWidth: 20,
                data: []
            }]
        },
        options: {
            legend: {
                display: false,
            },
            responsive: false,
            elements: {
                point: {
                    radius: 0
                },
                line: {
                    tension: 0, // disables bezier curves
                }
            },
            scales: {
                xAxes: [{
                    display: false,
                    gridLines: {
                        display: false
                    }
                }],
                yAxes: [{
                    display: false,
                    ticks: {
                        max: .35,
                        min: -.35,
                        // stepSize: 0.5,
                    },
                    gridLines: {
                        display: false
                    }
                }]
            }
        }
    });



    async function getFirstSensor() {
        socket.on("pot0", async function (message) {
            message = parseFloat(message) + (chartOneCorrection);
            chartOneValue = message;

            if (message > 0.05 || message < (-0.05) && movedOne == false) {
                movedOne = true;
            }

            myLineChart.data.labels.push("");
            myLineChart.data.datasets[0].data.push(message);
            myLineChart.data.datasets[2].data.push(message);

            if (myLineChart.data.datasets[0].data.length > 100) {
                myLineChart.data.datasets[0].data.shift();
                myLineChart.data.datasets[2].data.shift();
                myLineChart.data.labels.shift();
            }

            myLineChart.update(0);
        });
    }

    async function getSecondSensor() {
        socket.on("pot1", async function (message) {
            message = parseFloat(message) + (chartTwoCorrection);
            chartTwoValue = message;
            if (message > 0.05 || message < (-0.05) && movedTwo == false) {
                movedTwo = true;
            }

            myLineChart.data.datasets[1].data.push(message);
            myLineChart.data.datasets[3].data.push(message);

            if (myLineChart.data.datasets[1].data.length > 100) {
                myLineChart.data.datasets[1].data.shift();
                myLineChart.data.datasets[3].data.shift();
            }

            myLineChart.update(0);
        });
    }

    async function initSensor() {
        const waitInitFirstSensor = await getFirstSensor();
        const waitInitSecondSensor = await getSecondSensor();
    }

    initSensor();

    setDifferenceInterval();
});