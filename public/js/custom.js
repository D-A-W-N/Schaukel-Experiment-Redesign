let movedOne = false;
let movedTwo = false;
let chartOneValue = 0.00;
let chartTwoValue = 0.00;
let equalCounter = 0;
let differenceInterval;
let video;

function showCam(video) {
    $("canvas#frequency-chart").addClass("hide");
    
    setTimeout(function(){
        $('.logo').addClass('fadeIn');

        setTimeout(function(){
            $(".logo").addClass("vanishOut");

            $("video").addClass("show");

            setTimeout(function(){
                $(".logo").removeClass("fadeIn vanishOut");
            }, 2000);
            
        }, 3000);
    }, 1000);

    // let snapshotInterval = setInterval(function () {
    //     snapshot(video);
    // }, 1000);

    setTimeout(function(){
        snapshot(video);
        //  clearInterval(snapshotInterval);
    }, 1000);

     setTimeout(function(){
        hideCam();
    }, 10000);
}

function hideCam() {
    $("video").removeClass("show");

    setTimeout(function(){
        $("canvas#frequency-chart").removeClass("hide");
    }, 2000);
    setDifferenceInterval();
}

function snapshot(video) {
    let canvas, ctx;
    canvas = document.getElementById("snapshot-canvas");
    ctx = canvas.getContext('2d');
    // Draws current image from the video element into the canvas
    ctx.filter = "grayscale(1)";
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

                $(".progress-container").text(equalCounter+" %");
            } else {
                $(".progress-container").text("0 %");
                equalCounter = 0;
            }
        }

        if (equalCounter >= 100) {
            equalCounter = 0;
            movedOne = false;
            movedTwo = false;
            //showCam(video);
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
                borderColor : "rgba(230,0,255,1)",
                backgroundColor: "transparent",
                borderWidth: 5,
                data: []
            }, {
                label: "",
                // backgroundColor: "rgba(243, 147, 36, 0.1)",
                borderColor: "rgba(243, 147, 36, 1)",
                backgroundColor: "transparent",
                borderWidth: 5,
                data: []
            },{
                label: "",
                // backgroundColor: "rgba(230,0,255,0.1)",
                borderColor : "rgba(230,0,255,0.1)",
                backgroundColor: "transparent",
                borderWidth: 20,
                data: []
            },{
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
                        // max: 0.5,
                        // min: -0.5,
                        // stepSize: 0.5,
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
            message = parseFloat(message);// - 0.013;
            chartOneValue = message;

            if (message > 0.15 || message < (-0.15) && movedOne == false) {
                movedOne = true;
            }

            myLineChart.data.labels.push("");
            myLineChart.data.datasets[0].data.push(message);
            myLineChart.data.datasets[2].data.push(message);

            if (myLineChart.data.datasets[0].data.length > 150) {
                myLineChart.data.datasets[0].data.shift();
                myLineChart.data.datasets[2].data.shift();
                myLineChart.data.labels.shift();
            }

            myLineChart.update(45);
        });
    }

    async function getSecondSensor() {
        socket.on("pot1", async function (message) {
            message = parseFloat(message) * (-1.0000);
            chartTwoValue = message;
            if (message > 0.15 || message < (-0.15) && movedTwo == false) {
                movedTwo = true;
            }

            myLineChart.data.datasets[1].data.push(message);
            myLineChart.data.datasets[3].data.push(message);

            if (myLineChart.data.datasets[1].data.length > 150) {
                myLineChart.data.datasets[1].data.shift();
                myLineChart.data.datasets[3].data.shift();
            }

            myLineChart.update(45);
        });
    }

    async function initSensor() {
        const waitInitFirstSensor = await getFirstSensor();
        const waitInitSecondSensor = await getSecondSensor();
    }

    initSensor();

    setDifferenceInterval();
});