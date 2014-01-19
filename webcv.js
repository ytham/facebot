var video = document.getElementById('video');
var canvas = document.getElementById('canvas');
var fps = 20;
var context = canvas.getContext('2d');
var width = 640;
var height = 0;
var streaming = false;
var circle_x = 0;
var circle_y = 0;
var circle_size = 1;

var lastFace;

var socket = io.connect();
socket.on('start', function (data) {
  console.log(data);
});

socket.on('ellipse', function (data) {
  circle_x = data.x;
  circle_y = data.y;
  circle_size = data.size;
});

socket.on('face', function (face) {
  // for (var i = 0; i < faces.length; i++) {
  //   var face = faces[i];
  if (typeof lastFace !== 'undefined') {
    face = smoothFaceValues(face, lastFace);
  }
  context.beginPath();
  context.rect(face.x, face.y, face.width, face.height);
  context.lineWidth = 3;
  context.strokeStyle = '#FF0000';
  context.stroke();
  lastFace = face;
  //}
});

navigator.getMedia = ( navigator.getUserMedia || 
                       navigator.webkitGetUserMedia ||
                       navigator.mozGetUserMedia || 
                       navigator.msGetUserMedia );

navigator.getMedia({ video: true, audio: false }, function (stream) {
  if (navigator.mozGetUserMedia) {
    video.mozSrcObject = stream;
  } else {
    var vendorURL = window.URL || window.webkitURL;
    video.src = vendorURL.createObjectURL(stream);
  }
  //video.play();
}, function (err) {
  console.log('[ERROR] navigator.getMedia: ' + err);
});

video.addEventListener('canplay', function (ev) {
  if (!streaming) {
    height = video.videoHeight / (video.videoWidth/width);
    video.setAttribute('width', width);
    video.setAttribute('height', height);
    canvas.setAttribute('width', width);
    canvas.setAttribute('height', height);
    streaming = true;
  }
}, false);

function emitFrame () {
  context.drawImage(video, 0, 0, 640, 480);
  socket.emit('frame', canvas.toDataURL('image/jpeg'));
}

setInterval(function () {
  emitFrame();
}, 1000/fps);

function smoothFaceValues(face, lastFace) {
  var returnedFace = {};
  returnedFace.x = (face.x * (3/3)) + (lastFace.x * (0/3));
  returnedFace.y = (face.y * (3/3)) + (lastFace.y * (0/3));
  returnedFace.height = (face.height * (3/3)) + (lastFace.height * (0/3));
  returnedFace.width = (face.width * (3/3)) + (lastFace.width * (0/3));
  return returnedFace;
}


// Web Interface
$('.button').mouseover(function () {
  $(this).addClass('buttonHover');
});

$('.button').mouseout(function () {
  $(this).removeClass('buttonHover');
});

$('.button').click(function () {
  var action = $(this).text();
  socket.emit(action, action);
  console.log(action);
});