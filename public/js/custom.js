let movedOne = false;
let movedTwo = false;
let chartOneValue = 0;
let chartTwoValue = 0;
let equalCounter = 0;
let differenceInterval;

function showCam(video) {
    $("canvas#frequency-chart").addClass("hide");
    $("video").addClass("show");
    clearInterval(differenceInterval);

    setTimeout(function () {
        snapshot(video);
    }, 2000);
}

function hideCam() {
    $("canvas#frequency-chart").removeClass("hide");
    $("video").removeClass("show");
    movedOne = false;
    movedTwo = false;
    setDifferenceInterval();
}

function snapshot(video) {
    let canvas, ctx;
    canvas = document.getElementById("snapshot-canvas");
    ctx = canvas.getContext('2d');
    // Draws current image from the video element into the canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
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
        link.download = "snapshot_" + Date.now() + ".jpg";
        link.href = canvas.toDataURL("image/jpg").replace("image/jpg", "image/octet-stream");;
        link.click();
    }
    else {
        alert("Please use Chrome");
    }
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
    let video = document.getElementById("webcam-video");

    if (navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ video: true })
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
                fill: false,
                label: "",
                backgroundColor: "transparent",
                borderColor: "#8818A1",
                borderWidth: 4,
                data: []
            }, {
                fill: false,
                label: "",
                backgroundColor: "transparent",
                borderColor: "#F39324",
                borderWidth: 4,
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
                        max: 1.5,
                        min: -1
                    },
                    gridLines: {
                        display: false
                    }
                }]
            }
        }
    });

    let socket = io();

    async function getFirstSensor() {
        socket.on("pot0", async function (message) {
            // message = Math.round(message / 10) * 10;
            chartOneValue = message;

            // if (message > 600 || message < 400) {
            //     movedOne = true;
            // }

            myLineChart.data.labels.push("");
            myLineChart.data.datasets[0].data.push(message);

            myLineChart.update({
                duration: 800,
                easing: 'easeOutBounce'
            });

            if (myLineChart.data.datasets[0].data.length > 40) {
                myLineChart.data.datasets[0].data.shift();
                myLineChart.data.datasets[1].data.shift();
                myLineChart.data.labels.shift();
            }
        });
    }

    async function getSecondSensor() {
        socket.on("pot1", async function (message) {
            // message = Math.round(message / 10) * 10;
            chartTwoValue = message;

            // if (message > 600 || message < 400) {
            //     movedTwo = true;
            // }

            myLineChart.data.datasets[1].data.push(message);

            myLineChart.update({
                duration: 10
            });

            if (myLineChart.data.datasets[0].data.length > 40) {
                myLineChart.data.datasets[1].data.shift();
            }
        });
    }

    async function initSensor() {
        const waitInitFirstSensor = await getFirstSensor();
        const waitInitSecondSensor = await getSecondSensor();
    }

    initSensor();

    function setDifferenceInterval() {
        differenceInterval = setInterval(function () {
            // if (movedOne || movedTwo) {

            // Check if chart values are smiliar
            var difference = Math.abs(chartOneValue - chartTwoValue);

            if (difference <= 100) {
                equalCounter++;
            } else {
                equalCounter = 0;
            }
            // }

            if (equalCounter >= 100) {
                equalCounter = 0;
                showCam(video);
            }

        }, 100);
    }

    // setDifferenceInterval();
});