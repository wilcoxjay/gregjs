function error(msg) {
    alert(msg);
}

function assert(b, msg) {
    if (!b) {
        error(msg);
    }
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
        lineRel(vec2(0,-r));
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

var pitches = {
    c: 0,
    d: 1,
    e: 2,
    f: -4,
    g: -3,
    a: -2,
    b: -1
}

function pitchToScaleDegree(s) {
    return pitches[s];
}

function note(pitch, duration) {
    return {
        pitch: pitch, duration: duration,
        degree: function() { return pitchToScaleDegree(this.pitch[0]);},
        isFlat: function() { return this.pitch.length > 1;}
    };
}

function isAlpha(s) {
    return s.length == 1 && 'a' <= s && s <= 'z';
}

function parseNote(s, defaultDuration) {
    var dur = defaultDuration;
    var pitch = "";
    for (j = 0; j < s.length; j++) {
        var c = s[j];
        if (isAlpha(c)) {
            pitch = pitch + c;
        } else {
            break;
        }
    }
    if (j < s.length) {
        dur = parseInt(s.substr(j));
    }
    return note(pitch, dur);
}

function tokenize(s) {
    var ans = [];
    var i = 0;
    while (i < s.length) {
        var c = s[i];
        if (c == ' ') {
            i++;
        } else if (c == '(' || c == ')') {
            ans.push(c);
            i++;
        } else {
            var buf = c;
            for (i++; i < s.length; i++) {
                c = s[i];
                if (c != ' ' && c != '(' && c != ')') {
                    buf = buf + c;
                } else {
                    break;
                }
            }
            ans.push(buf);
        }
    }
    return ans;
}

function parsePhrase(s) {
    var toks = tokenize(s);
    var dur = 1;
    var ans = [[]];
    var tos, nos;
    for (var i = 0; i < toks.length; i++) {
        var tok = toks[i];
        if (tok == '(') {
            ans.push([]);
        } else if (tok == ')') {
            tos = ans.pop();
            nos = ans.pop();
            nos.push(tos);
            ans.push(nos);
        } else {
            var note = parseNote(tok, dur);
            tos = ans.pop();
            tos.push(note);
            ans.push(tos);
            dur = note.duration;
        }
    }
    assert(ans.length == 1, "unbalanced neume in phrase: " + s);
    return ans.pop();
}

var y_offset = 0;

function containsFlat(neume) {
    if (Array.isArray(neume)) {
        for (var i = 0; i < neume.length; i++) {
            if (neume[i].isFlat()) {
                return true;
            }
        }
        return false;
    } else {
        return neume.isFlat();
    }
}

function drawBflat(offset) {
    var r = neume_radius;

    stroke(() => {
        moveTo(vec2(offset.x - r - 2.5 * neume_radius,
                    scaleDegreeToY(pitchToScaleDegree("b"), offset.y)));
        moveRel(vec2(-r, -5 * r));
        lineRel(vec2(0, 6 * r));
        lineRel(vec2(2 * r, 0));
        lineRel(vec2(0, -2 * r));
        lineRel(vec2(-2 * r, 0));
    });
}

function drawNeume(offset, neume) {
    if (Array.isArray(neume)) {
        if (neume.length == 2 && neume[1].degree() > neume[0].degree()) {
            podatus(vec2(offset.x, scaleDegreeToY(neume[0].degree(), offset.y)),
                    vec2(offset.x, scaleDegreeToY(neume[1].degree(), offset.y)));
        } else if (neume.length == 2 && neume[0].degree() > neume[1].degree()) {
            clivis(vec2(offset.x, scaleDegreeToY(neume[0].degree(), offset.y)),
                   vec2(offset.x, scaleDegreeToY(neume[1].degree(), offset.y)));

        } else {
            error("phrase: unrecognized neume shape " + ",".join(neume.map(x => x.degree())));
        }
    } else {
        punctum(vec2(offset.x, scaleDegreeToY(neume.degree(), offset.y)));
    }

    if (containsFlat(neume)) {
        drawBflat(offset);
    }
}

var staff_left_margin = 10;
var staff_left_padding = 5;
var staff_right_padding = 10;
var inter_neume_horizontal_space = 20;

function phrase(notes) {
    notes = parsePhrase(notes);
    var width = notes.length * inter_neume_horizontal_space +
        staff_left_padding + staff_right_padding;
    var x_offset = staff_left_margin;
    staff(vec2(x_offset,y_offset), width, 4);  
    gregorianCClef(vec2(x_offset + 10, 2 * staff_line_sep + y_offset));

    for (var i = 0; i < notes.length; i++) {
        var x = x_offset + staff_left_padding + inter_neume_horizontal_space * (i + 1);
        drawNeume(vec2(x, y_offset), notes[i]);
    }

    y_offset += 80;
}

function go() {
    _canvas.fillStyle="white";
    _ctx.rect(0,0,_width,_height);
    _canvas.fillStyle="black";

    phrase("a1 c c d c b c");
    phrase("a1 c c c c b c");
    phrase("c1 c c c c c c c c c c c c c b c");
    phrase("c1 c c c c c c c c c c c c c c c c c c b c");
    phrase("c1 (c d) c (c b)");
    phrase("c1 c (c d) c (c b) b");

    phrase("f1 f f f (g a) (a g) f (g a) (g f) g g f");
    phrase("f1 f f f (g a) (a g) f (g a) (g f) g g f");
    phrase("(f1 a) a a a (g a) g g g g g f (g a) (a g)");
    phrase("f1 (g a) (g f) g g f");
    phrase("f1 f f f f g a a (a bes) a a a a (g a) g f f");
    phrase("f1 f f f (g a) (a g) f (g a) (g f) g g f");
}

window.onload = () => { setup(); go () }
