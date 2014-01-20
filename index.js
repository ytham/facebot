var fs = require('fs'),
    url = require('url'),
    cv = require('opencv'),
    five = require('johnny-five'),
    evt = new (require('events').EventEmitter),
    express = require('express');

// Initialize webserver & socket.io
var app = express();
var server = app.listen(8888, "0.0.0.0");
var io = require('socket.io').listen(server);

var face_x = 0;
var face_y = 0;
var center = {x: 320, y: 210};

// Physical vars
var Board, sHoriz, sVert;
var servoAngle = {x: 70, y: 40};
var MOVETHRESHOLD = 50;
var tracking = true;

// PID Control vars
var error;
var lastError;
var Kp = 0.9;
var Ki = 0;
var Kd = 1.5;

// Express setup
app.use(express.static(__dirname + '/'));
app.use(express.bodyParser());

io.sockets.on('connection', function (socket) {
  socket.emit('start', { data: 'Websocket connection started.' });

  // CV Frame from webcam
  socket.on('frame', function (data) {
    //socket.emit('output', data);
    data = data.split(',');
    cv.readImage(new Buffer(data[1],'base64'), function (err, im) {
      // Convert and filter the RGB image
      //im.detectObject("./node_modules/opencv/data/haarcascade_profileface.xml", {}, function (err, faces) {
      im.detectObject("./lib/cv/lbpcascade_frontalface.xml", {}, function (err, faces) {
        if (faces.length > 0) {
          var largest = 0;
          if (faces.length > 1) {
            for (var i = 1; i < faces.length; i++) {
              if (faces[i].width > faces[i-1].width) {
                largest = i;
              }
            }
          }
          socket.emit('face', faces[largest]);
          evt.emit('face', faces[largest]);
        }
      });
    });
  });

  socket.on('buttonClick', function (action) {
    switch(action) {
      case 'Left':
        console.log("[Button Pressed] moving left.")
        servoAngle.x += 5;
        sHoriz.to(servoAngle.x);
        break;
      case 'Right':
        console.log("[Button Pressed] moving right.")
        servoAngle.x -= 5;
        sHoriz.to(servoAngle.x);
        break;
      case 'Up':
        console.log("[Button Pressed] moving up.")
        servoAngle.y -= 5;
        sVert.to(servoAngle.y);
        break;
      case 'Down':
        console.log("[Button Pressed] moving down.")
        servoAngle.y += 5;
        sVert.to(servoAngle.y);
        break;
      case 'Start':
        tracking = true;
        break;
      case 'Stop':
        tracking = false;
        break;
      default:
        console.log("Invalid button pressed.");
        break;
    }
  });
});

process.on('uncaughtException', function (err) {
  console.error(err);
});

Board = new five.Board();
Board.on('ready', function () {
  sHoriz = new five.Servo({
    range: [0, 140],
    pin: 6
  });
  sVert = new five.Servo({
    range: [0, 140],
    pin: 10
  });

  // Move to initial positions
  sHoriz.to(servoAngle.x);
  sVert.to(servoAngle.y);
});

evt.on('face', function (face) {
  face_x = face.x + face.width/2 - center.x;
  face_y = face.y + face.height/2 - center.y;
  timeStamp = new Date().getTime();
  error = {x: face_x, y: face_y, t: timeStamp};
  var angleDelta = calculateservoAngle(error, lastError);
  if (isNaN(angleDelta.x) || isNaN(angleDelta.y) || tracking === false) {
    // Do nothing
  } else {
    servoAngle.x -= angleDelta.x;
    servoAngle.y += angleDelta.y;
    sHoriz.to(servoAngle.x);
    sVert.to(servoAngle.y);
  }
  lastError = error;
});

function calculateservoAngle(error,lastError) {
  var xOut = 0;
  var yOut = 0;

  if (typeof lastError !== 'undefined') {
    xOut = PIDController(error.x, lastError.x, error.t - lastError.t)/100;
    yOut = PIDController(error.y, lastError.y, error.t - lastError.t)/100;
  }

  return {x: xOut, y: yOut};
}

function PIDController(error, lastError, delta) {
  var P = error;
  var I = 0;
  var D = (error + lastError) / delta;
  var newError = Kp*P + Ki*I - Kd*D;
  return newError;
}