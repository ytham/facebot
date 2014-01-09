// Servo Tester Script
// pin 9:  regular
// pin 10: continuous

var five = require('johnny-five');

var Board, p6, p10;

Board = new five.Board();
Board.on('ready', function () {
  p6 = new five.Servo(6);
  p10 = new five.Servo(10);

  board.repl.inject({
  	p6: p6,
    p10: p10
  });
});
