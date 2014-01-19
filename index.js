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

// Physical vars
var Board, sHoriz, sVert;
var servoAngles = {x: 70, y: 40};
var MOVETHRESHOLD = 50;

var lastError;

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
      im.detectObject("./node_modules/opencv/data/haarcascade_frontalface_default.xml", {}, function (err, faces) {
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

  sHoriz.to(servoAngles.x);
  sVert.to(servoAngles.y);
/*
  this.loop(100, function () {
    //console.log(face_x + ", " + face_y);
    var move = calculateServoAngles(face_x, face_y);
    angleHoriz = move.h;
    angleVert = move.v;
    if (angleHoriz < 0) angleHoriz = 0;
    if (angleHoriz > 160) angleHoriz = 160;
    sHoriz.to(angleHoriz);
    
    if (angleVert < 0) angleVert = 0;
    if (angleVert > 160) angleVert = 160;
    sVert.to(angleVert);
    
  });
});
*/
});

evt.on('face', function (face) {
  face_x = face.x + face.width/2 - 320;
  face_y = face.y + face.height/2 - 240;
  timeStamp = new Date().getTime();
  servoAngles = calculateServoAngles(face_x, face_y, servoAngles);
  sHoriz.to(servoAngles.x);
  sVert.to(servoAngles.y);
  lastError = {x: face_x, y: face_y, t: timeStamp};
});

function calculateServoAngles(x,y,servoAngles) {
  var hOut, vOut;

  if (x < -1*MOVETHRESHOLD) {
    hOut = servoAngles.x + 1;
  } else if (x > MOVETHRESHOLD) {
    hOut = servoAngles.x - 1;
  } else {
    hOut = servoAngles.x;
  }

  if (y < -1*MOVETHRESHOLD) {
    vOut = servoAngles.y - 1;
  } else if (y > MOVETHRESHOLD) {
    vOut = servoAngles.y + 1;
  } else {
    vOut = servoAngles.y;
  }

  console.log('[hOut, vOut] ' + hOut + ", " + vOut);

  return {x: hOut, y: vOut};
}