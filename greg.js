function error(msg) {
  alert(msg);
}

function checkArgs(fn, args, specs) {
  for (var i = 0; i < specs.length; i++) {
    var spec = specs[i];
    var arg = args[i]
    if (typeof arg !== spec.type) {
      error(fn + " called with argument " + spec.name + "=" + arg + 
            " of type " + typeof arg + " instead of " + spec.type);
    }
  }
}

function spec(name, type) {
  return {name: name, type: type};
}

var _canvas;
var _ctx;
var _width;
var _height;

function setup() {
    _canvas = document.getElementById("theCanvas");
    _ctx = _canvas.getContext("2d");
    //_ctx.scale(5,5);
    //_ctx.scale(2,2);
    _width = _canvas.getAttribute("width");
    _height =  _canvas.getAttribute("height");
}


var pathWrapper = terminator => f => {
  _ctx.beginPath();
  f();
  terminator();
};

var stroke = pathWrapper(() => _ctx.stroke());
var fill = pathWrapper(() => _ctx.fill());

function vec2(x,y) {
  return {x: x, y: y};
}

function add(u, v) {
  return vec2(u.x + v.x, u.y + v.y);
}

var _pos;

function moveTo(pos) {
  _pos = pos;
  _ctx.moveTo(pos.x, pos.y);
}

function lineTo(pos) {
  _pos = pos;
  _ctx.lineTo(pos.x, pos.y);
}

function moveRel(bump) {
  _pos = add(_pos, bump);
  moveTo(_pos);
}

function lineRel(bump) {
  _pos = add(_pos, bump);
  lineTo(_pos);
}

function arcTo(p1, p2, r) {
  _pos = p2;
  _ctx.arcTo(p1.x, p1.y, p2.x, p2.y, r);
}

// chain bumps
function arcRel(bump1, bump2, r) {
  var p1 = add(_pos, bump1);
  arcTo(p1, add(p1, bump2), r);
}

function bezierCurveTo(p1, p2, p3) {
  _pos = p3;
  _ctx.bezierCurveTo(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y);
}

// Annoying but useful:
//   bump1 is relative to the starting point
//   bump3 is *also* relative to the starting point
//   bump2 is relative to bump3
function bezierCurveRel(bump1, bump2, bump3) {
  var end = add(_pos, bump3);
  bezierCurveTo(add(_pos, bump1), add(end, bump2), end);
}

function closePath() {
  _ctx.closePath();
}

function drawLine(a, b) {
  stroke(() => {
    moveTo(a);
    lineTo(b);
  });  
}

var staff_line_sep = 14;

function staff(pos, width, n) {
  for (var i = 0; i < n; i++) {
    var y = pos.y + staff_line_sep * (i + 1);
    drawLine(vec2(pos.x, y), vec2(pos.x + width, y));
  }
}

function gregorianCClef(pos) {
  var pos1, pos2;
  var r_big = 5;
  var r_small = 3;

  fill(() => {
    moveTo(pos);
    moveRel(vec2(0, -2));
    lineRel(vec2(0, -6));
    lineRel(vec2(-2, 0));
    arcRel(vec2(-r_big,0), vec2(0,r_big), r_big);
    lineRel(vec2(0, 2 * (pos.y - _pos.y)));
    arcRel(vec2(0,r_big), vec2(r_big,0),r_big)
    lineRel(vec2(2, 0));
    lineRel(vec2(0, -6));
    bezierCurveRel(vec2(-3,1), vec2(0,3), vec2(-5.5,-2.5));
    lineRel(vec2(0, 2 * (pos.y - _pos.y)));
    bezierCurveRel(vec2(0,-3),vec2(-3,-1),vec2(5.5,-2.5));
    closePath();
  });
}

function rect(pos, r) {
  fill(() => {
    moveTo(pos);
    moveRel(vec2(r,0));
    lineRel(vec2(0,-r));
    lineRel(vec2(-2*r, 0));
    lineRel(vec2(0, 2*r));
    lineRel(vec2(2*r, 0));
    lineRel(vec2(0,r));
    closePath();
  });
}

var neume_radius = 2.5;

function punctum(pos) {
  rect(pos, neume_radius);
}

function podatus(p1, p2) {
  rect(p1, neume_radius);
  rect(p2, neume_radius);
  drawLine(add(p1, vec2(neume_radius, neume_radius)), 
           add(p2, vec2(neume_radius, -neume_radius)));
}

function clivis(p1, p2) {
  p1 = add(p1, vec2(-neume_radius,0));
  p2 = add(p2, vec2(neume_radius,0));
  rect(p1, neume_radius);
  rect(p2, neume_radius);
  stroke(() => {
    moveTo(p1);
    moveRel(vec2(-neume_radius, -neume_radius));
    lineRel(vec2(0, staff_line_sep))
  });
}

// degree is given relative to C
function scaleDegreeToY(deg, y_offset) {
  if (y_offset === undefined) {
    y_offset = 0;
  }
  checkArgs("scaleDegreeToY", arguments, 
            [spec("deg", "number"), spec("y_offset", "number")]);
  
  return y_offset + 2 * staff_line_sep - deg * staff_line_sep / 2;
}

function forEach(f, a) {
  for (var i = 0; i < a.length; i++) {
    f(a[i], i);
  }
}

function phrase(y_offset, notes) {
  var width = notes.length * 20 + 15;
  var x_offset = 10;
  staff(vec2(x_offset,y_offset), width, 4);  
  gregorianCClef(vec2(x_offset + 10, 2 * staff_line_sep + y_offset));

  for (var i = 0; i < notes.length; i++) {
    var note = notes[i];
    var x = x_offset + 5 + 20 * (i + 1);
    if (typeof note === "object") {
      if (note.length == 2 && note[1] > note[0]) {
        podatus(vec2(x, scaleDegreeToY(note[0], y_offset)),
                vec2(x, scaleDegreeToY(note[1], y_offset)));
      } else if  (note.length == 2 && note[0] > note[1]) {
        clivis(vec2(x, scaleDegreeToY(note[0], y_offset)),
               vec2(x, scaleDegreeToY(note[1], y_offset)));

      } else {
        error("phrase: unrecognized neume shape " + note);
      }
    } else {
      punctum(vec2(x, scaleDegreeToY(note, y_offset)));
    }
  }
}

function go() {

    _canvas.fillStyle="white";
    _ctx.rect(0,0,_width,_height);
    _canvas.fillStyle="black";

    phrase(0, [-2, 0, 0, 1, 0, -1, 0]);
    phrase(80, [-2, 0, 0, 0, 0, -1, 0]);
    phrase(160, [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, -1, 0]);
    phrase(240, [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, -1, 0]);
    phrase(320, [0, [0, 1], 0, [0, -1]]);
    phrase(400, [0, 0, [0, 1], 0, [0,-1], -1]);
    phrase(480, [-4, -4, -4, -4, [-3, -2], [-2, -3], -4, [-3, -2], [-3, -4], -3, -3, -4]);
    phrase(560, [-4, -4, -4, -4, [-3, -2], [-2, -3], -4, [-3, -2], [-3, -4], -3, -3, -4]);
    phrase(640, [[-4, -2], -2, -2, -2, [-3, -2], -3, -3, -3, -3, -3, -4, [-3, -2], [-2, -3]]);
    phrase(720, [ -4, [-3, -2], [-3, -4], -3, -3, -4]);
    phrase(800, [-4, -4, -4, -4, -4, -3, -2, -2, [-2, -1], -2, -2, -2, -2, [-3, -2], -3, -4, -4]);
    phrase(880, [-4, -4, -4, -4, [-3, -2], [-2, -3], -4, [-3, -2], [-3, -4], -3, -3, -4]);
}

window.onload = () => { setup(); go () }
