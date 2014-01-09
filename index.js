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

var horizontal = 0;
var vertical = 0;

var Board, sHoriz, sVert;

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
          socket.emit('faces', faces);
          horizontal = faces[0].x - 320;
          vertical = faces[0].y - 240;
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

  sHoriz.to(90);
  sVert.to(90);

  this.loop(20, function () {
    console.log(horizontal + ", " + vertical);
    sHoriz.to(Math.abs(horizontal/4));
    sVert.to(Math.abs(vertical/4));
  });
});
