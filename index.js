var fs = require('fs'),
    url = require('url'),
    cv = require('opencv'),
    five = require('johnny-five'),
    express = require('express');

// Initialize webserver & socket.io
var app = express();
var server = app.listen(8888, "0.0.0.0");
var io = require('socket.io').listen(server);

var hLow = 0;
var hHigh = 180;
var sLow = 0;
var sHigh = 256;
var vLow = 0;
var vHigh = 256;

var face_x = 0;
var face_y = 0;

// Physical vars
var Board, sHoriz, sVert;
var angleHoriz = 90;
var angleVert = 90;

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
      im.detectObject("./node_modules/opencv/data/haarcascade_frontalface_alt2.xml", {}, function (err, faces) {
        if (faces.length > 0) {
          var largest = 0;
          if (faces.length > 1) {
            for (var i = 1; i < faces.length; i++) {
              if (faces[i].width > faces[i-1].width) {
                largest = i;
              }
            }
          }
          socket.emit('faces', faces);
          face_x = faces[largest].x + faces[largest].width/2 - 320;
          face_y = faces[largest].y + faces[largest].height/2 - 240;
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
  sHoriz = new five.Servo(6);
  sVert = new five.Servo(10);

  sHoriz.to(angleHoriz);
  sVert.to(angleVert);

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

function calculateServoAngles(x,y) {
  var hOut, vOut;

  if (x < 10) {
    hOut = angleHoriz + 0.5;
  } else if (x > 10) {
    hOut = angleHoriz - 0.5;
  } else {
    hOut = angleHoriz;
  }

  if (y < 10) {
    vOut = angleVert - 0.5;
  } else if (y > 10) {
    vOut = angleVert + 0.5;
  } else {
    vOut = angleVert;
  }

  console.log('[hOut, vOut] ' + hOut + ", " + vOut);

  return {h: hOut, v: vOut};
}