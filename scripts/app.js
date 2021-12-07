const gameCanvas = document.getElementById('gameCanvas');
const arrowGridSize = 10;

const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 600;

const CANVAS_GAME_SIZE = 600;
const CANVAS_X_OFFSET = (CANVAS_WIDTH - CANVAS_GAME_SIZE) / 2;
const CANVAS_Y_OFFSET = (CANVAS_HEIGHT - CANVAS_GAME_SIZE) / 2;

var stop_arrow_gen = false;

/*
0 - Start screen
1 - Game screen
2 - Score animation screen
3 - Game over screen
*/
var game_state = 0;

var remainingLocations = [];
var override_equation = {
    i: "sin(x)",
    j: "-x",
}

var equation;
var max_magnitude;
var time_remaining;
var override_equation = false;


const colors = {
    'black': '#092327',
    'white': '#eeeeee',
    'theme': '#00A9A5',
    'alt_theme': '#0B5351',
    'highlight': '#dac0f8',
    'background': '#0e0e0e',
};


/* 
Game loop:
0: Display UI
1: Generate vector field equation
2: Display equation, and pause for 5 seconds
3: Slowly & randomly generate arrows
4: Once player has placed down their line, speed up arrow generation
5: Total up score
6: Start over!
*/
async function gameLoop() {
    const ctx = gameCanvas.getContext('2d');

    // 0: Display UI
    displayGameUI(ctx);

    // 1: Generate vector field equation
    console.time('Generating equation');
    if (override_equation) {
        equation = override_equation;
    } else {
        equation = generateEquation();
    }

    console.timeEnd('Generating equation');

    // 2: Display equation, and pause for 5 seconds
    console.time('Displaying equation');
    displayEquation(ctx, equation);
    console.timeEnd('Displaying equation');
    await sleep(1);

    // 3: Slowly & randomly generate arrows
    console.time('Revealing arrows');
    remainingLocations = [];
    for (let i = 0; i < arrowGridSize; i++) {
        for (let j = 0; j < arrowGridSize; j++) {
            remainingLocations.push({x:i, y:j});
        }
    }
    // Find largest possible arrow
    let all_arrows = [];
    
    for (let i = 0; i < remainingLocations.length; i++) {
        all_arrows.push(generateArrow(equation, 0, remainingLocations[i]).magnitude);
    }

    max_magnitude = Math.max(...all_arrows);

    revealArrows(ctx, equation, max_magnitude);
    console.timeEnd('Revealing arrows');

    // 5: Total up score
    // 6: Start over!

}

function displayGameUI(ctx) {
    ctx.save();

    // Background
    ctx.fillStyle = colors.background;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw grid
    ctx.strokeStyle = colors.black;
    ctx.lineWidth = 1;
    ctx.beginPath();
    
    for (let i = 0; i <= arrowGridSize; i++) {
        ctx.moveTo(CANVAS_X_OFFSET + i * CANVAS_GAME_SIZE / arrowGridSize, CANVAS_Y_OFFSET);
        ctx.lineTo(CANVAS_X_OFFSET + i * CANVAS_GAME_SIZE / arrowGridSize, CANVAS_Y_OFFSET + CANVAS_GAME_SIZE);
    }

    for (let i = 0; i <= arrowGridSize; i++) {
        ctx.moveTo(CANVAS_X_OFFSET, CANVAS_Y_OFFSET + i * CANVAS_GAME_SIZE / arrowGridSize);
        ctx.lineTo(CANVAS_X_OFFSET + CANVAS_GAME_SIZE, CANVAS_Y_OFFSET + i * CANVAS_GAME_SIZE / arrowGridSize);
    }


    ctx.stroke();

    // Draw axis
    ctx.strokeStyle = colors.theme;
    ctx.lineWidth = 6;
    ctx.beginPath();
    // Account for offset
    ctx.moveTo(CANVAS_X_OFFSET + CANVAS_GAME_SIZE/2, CANVAS_Y_OFFSET);
    ctx.lineTo(CANVAS_X_OFFSET + CANVAS_GAME_SIZE/2, CANVAS_Y_OFFSET + CANVAS_GAME_SIZE);

    ctx.moveTo(CANVAS_X_OFFSET, CANVAS_Y_OFFSET + CANVAS_GAME_SIZE/2);
    ctx.lineTo(CANVAS_X_OFFSET + CANVAS_GAME_SIZE, CANVAS_Y_OFFSET + CANVAS_GAME_SIZE/2);

    ctx.stroke();

    


    ctx.restore();
}

function generateEquation() {
    const template_equations = [
        '?x^?',
        '?y^?',
        '?x^? + ?y^?',
        '?x^? - ?y^?',
        'cos(?x)^?',
        'sin(?y)^?',
        '?x^? + ?',
        '?y^? + ?',
        'cos(?x)^? + ?',
        'sin(?y)^? + ?',
    ]

    const randomIndex_i = Math.floor(Math.random() * template_equations.length);
    const randomIndex_j = Math.floor(Math.random() * template_equations.length);

    let equation_i = template_equations[randomIndex_i];
    let equation_j = template_equations[randomIndex_j];

    for (let i = 0; i < equation_i.length; i++) {
        if (equation_i[i] === '?') {
            // Generate random number between 1 and 5
            const randomNumber = Math.floor(Math.random() * 5) + 1;
            equation_i = equation_i.replace('?', randomNumber);
        }
    }

    for (let i = 0; i < equation_j.length; i++) {
        if (equation_j[i] === '?') {
            // Generate random number between 1 and 5
            const randomNumber = Math.floor(Math.random() * 5) + 1;
            equation_j = equation_j.replace('?', randomNumber);
        }
    }

    return {
        i: equation_i,
        j: equation_j,
    };
    
}

function displayEquation(ctx, equation) {
    ctx.save()
    ctx.fillStyle = '#eeeeee'

    // text specific styles
    ctx.font = 'bold 16px IBM Plex Mono'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'alphabetic'

    // X = previous X position + width + 25px margin
    ctx.fillText(`F = 〈${equation.i}, ${equation.j}〉`, 20, 30)

    ctx.restore();
}

async function revealArrows(ctx, equation, max_magnitude, speed=1) {
    let arrowSpeed = speed;

    while (remainingLocations.length > 0) {
        // Pick random arrow from remaining locations
        const randomIndex = Math.floor(Math.random() * remainingLocations.length);
        const randomLocation = remainingLocations.splice(randomIndex, 1)[0];

        const arrow = generateArrow(equation, arrowSpeed, randomLocation);
        displayArrow(ctx, arrow, max_magnitude);
        await sleep(Math.max(1000 - (arrowSpeed * 100), 10));

        if (stop_arrow_gen) {
            return;
        }

        arrowSpeed *= 1.1;
    }
}

function generateArrow(equation, speed, location) {
    // Convert between 0-10 and -5 to 5
    const x_rep = ((location.x / arrowGridSize) * 10) - 5;
    const y_rep = -(((location.y / arrowGridSize) * 10) - 5);
    
    const x = equation.i.replaceAll('x', `(${x_rep})`).replaceAll('y', `(${y_rep})`);
    const y = equation.j.replaceAll('x', `(${x_rep})`).replaceAll('y', `(${y_rep})`);

    let normalized = normalizeVector(math.evaluate(x), math.evaluate(y));

    const arrow = {
        x: normalized.x,
        y: normalized.y,
        speed: speed,
        location: location,
        magnitude: normalized.magnitude,
    };

    return arrow;
}

function normalizeVector(x, y) {
    if (x === 0 && y === 0) {
        return {
            x: 0,
            y: 0,
            magnitude: 0,
        };
    }
    
    let magnitude = Math.sqrt(x**2 + y**2);

    if (magnitude < 0) {
        magnitude = 0;
    }

    let new_x = x / magnitude;
    let new_y = y / magnitude;
    return {
        x: new_x,
        y: new_y,
        magnitude: magnitude,
    };
}

function displayArrow(ctx, arrow, max_magnitude) {
    const size = Math.max(Math.abs(arrow.magnitude/max_magnitude), .1);
    // Convert from -5 to 5 to pixel on canvas
    const start = gridToPixel(arrow.location.x, arrow.location.y);
    const end = gridToPixel(arrow.location.x + (size * arrow.x), arrow.location.y - (size * arrow.y));

    ctx.save()   

    drawArrowhead(ctx, start, end, 5);

    ctx.restore();
}

function gridToPixel(x, y) {
    return {
        x: x * (CANVAS_GAME_SIZE / arrowGridSize) + CANVAS_X_OFFSET,
        y: y * (CANVAS_GAME_SIZE / arrowGridSize) + CANVAS_Y_OFFSET,
    }   
}

function drawArrowhead(ctx, from, to, radius) {
    ctx.lineWidth = 2;
    ctx.strokeStyle = colors.highlight;
    ctx.fillStyle = colors.highlight; // for the triangle fill
    ctx.lineJoin = 'butt';

	var x_center = to.x;
	var y_center = to.y;

	var angle;
	var x;
	var y;

	ctx.beginPath();

    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);

    ctx.stroke();

    ctx.beginPath();

	angle = Math.atan2(to.y - from.y, to.x - from.x)
	x = radius * Math.cos(angle) + x_center;
	y = radius * Math.sin(angle) + y_center;

	ctx.moveTo(x, y);

	angle += (1.0/3.0) * (2 * Math.PI)
	x = radius * Math.cos(angle) + x_center;
	y = radius * Math.sin(angle) + y_center;

	ctx.lineTo(x, y);

	angle += (1.0/3.0) * (2 * Math.PI)
	x = radius *Math.cos(angle) + x_center;
	y = radius *Math.sin(angle) + y_center;

	ctx.lineTo(x, y);

	ctx.closePath();

	ctx.fill();
}

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function getMousePos(canvas, evt) {
    var rect = canvas.getBoundingClientRect();
    return {
      x: evt.clientX - rect.left,
      y: evt.clientY - rect.top
    };
}

gameCanvas.addEventListener('click', function(event) { 
    if (game_state == 0) {
        game_state = 1;
        let audio = document.getElementById("audio");
        audio.volume = 0.2;
        audio.play();
        gameLoop();
    } else if (game_state == 1) {
        var mousePos = getMousePos(gameCanvas, event);
        var message = 'Mouse position: ' + mousePos.x + ',' + mousePos.y;
        console.log(message);
        
        let grid_x;
        if (mousePos.x < CANVAS_X_OFFSET) {
            grid_x = -1;
        } else if (mousePos.x > CANVAS_X_OFFSET + CANVAS_GAME_SIZE) {
            grid_x = -1;
        } else {
            grid_x = Math.floor((mousePos.x - CANVAS_X_OFFSET) / (CANVAS_GAME_SIZE / arrowGridSize));
        }
    
        let grid_y;
        if (mousePos.y < CANVAS_Y_OFFSET) {
            grid_y = -1;
        } else if (mousePos.y > CANVAS_Y_OFFSET + CANVAS_GAME_SIZE) {
            grid_y = -1;
        } else {
            grid_y = Math.floor((mousePos.y - CANVAS_Y_OFFSET) / (CANVAS_GAME_SIZE / arrowGridSize));
        }

        if (grid_x != -1 && grid_y != -1) {
            game_state = 2;
            submitAnswer(grid_x, grid_y);
        }

        console.log(`Grid position: ${grid_x}, ${grid_y}`);

    } else if (game_state == 2) {
        game_state = 3;
    } else if (game_state == 3) {
        game_state = 1;
        gameLoop();
    } else {
        return;
    }
}, false);


function submitAnswer(x, y) {
    if (x === -1 || y === -1) {
        return;
    }

    time_remaining = remainingLocations.length;
    stop_arrow_gen = true;

    let ctx = gameCanvas.getContext('2d');

    drawAnswer(ctx, x, y);

    console.time('Revealing all arrows');
    stop_arrow_gen = false;
    revealArrows(ctx, equation, max_magnitude, speed=10000);
    console.timeEnd('Revealing all arrows');

    const score = calculateScore(equation, x, y);
    displayScore(ctx, score);
}

function calculateScore(equation, x, y) {
    let x_bound_lower = x - 5;

    let y_bound_upper = 5 - y;
    let y_bound_lower = y_bound_upper - 1;

    let samples = 1000;
    let score = 0;
    for (let i = 0; i < samples; i++) {
        let x_sample = Math.floor(Math.random() * x_bound_lower)
        let y_sample = Math.floor(Math.random() * y_bound_lower);

        let arrow = generateArrow(equation, 1, {x: x_sample, y: y_sample});
        if (`{arrow.magnitude}` != "NaN") {
            score += arrow.magnitude;
        }
    }

    score = Math.log10(time_remaining) * 10 * score/max_magnitude // * (1 - (time_taken/10000));

    console.log(`Score: ${score}`);

    return score;
}

function drawAnswer(ctx, x, y) {
    ctx.save();
    ctx.fillStyle = colors.theme;
    ctx.fillRect(x * (CANVAS_GAME_SIZE / arrowGridSize) + CANVAS_X_OFFSET, y * (CANVAS_GAME_SIZE / arrowGridSize) + CANVAS_Y_OFFSET, CANVAS_GAME_SIZE / arrowGridSize, CANVAS_GAME_SIZE / arrowGridSize);
    ctx.restore();
}

async function displayScore(ctx, score) {
    ctx.save();
    ctx.fillStyle = '#eeeeee';

    ctx.font = '28px IBM Plex Mono';
    ctx.fillText(`Score:`, 20, 90);
    ctx.restore();

    for (let i = 0; i < score; i+= 200) {
        ctx.save();
        ctx.fillStyle = colors.background;
        ctx.fillRect(20, 100, 150, 150);
        ctx.restore();

        ctx.save();
        ctx.fillStyle = '#eeeeee';
        ctx.font = '24px IBM Plex Mono';
        ctx.fillText(i, 20, 120);
        ctx.restore();
        await sleep(1);
        if (game_state != 2) {
            return;
        }
    }

    ctx.save();
    ctx.fillStyle = colors.background;
    ctx.fillRect(20, 100, 150, 150);
    ctx.restore();

    ctx.save();
    ctx.fillStyle = '#eeeeee';
    ctx.font = '24px IBM Plex Mono';
    ctx.fillText(Math.floor(score), 20, 120);
    ctx.restore();

    game_state = 3;

}

function displayStartUI(ctx) {
    game_state = 0;
    ctx.save();
    ctx.fillStyle = colors.white;

    // text specific styles
    ctx.font = 'bold 30px IBM Plex Mono'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'alphabetic'
    
    // Center text
    ctx.fillText(`Welcome to OMEGA FLUX`, CANVAS_X_OFFSET + CANVAS_GAME_SIZE / 2, CANVAS_Y_OFFSET + CANVAS_GAME_SIZE / 2 - 100);
    ctx.font = 'bold 16px IBM Plex Mono'
    ctx.fillText(`Maximize total FLUX through the provided vector field by selecting a square`, CANVAS_X_OFFSET + CANVAS_GAME_SIZE / 2, CANVAS_Y_OFFSET + CANVAS_GAME_SIZE / 2);
    ctx.fillText(`The quicker you choose, the higher your SCORE will be`, CANVAS_X_OFFSET + CANVAS_GAME_SIZE / 2, CANVAS_Y_OFFSET + CANVAS_GAME_SIZE / 2 + 50);
    
    ctx.fillText(`- Click anywhere to start -`, CANVAS_X_OFFSET + CANVAS_GAME_SIZE / 2, CANVAS_Y_OFFSET + CANVAS_GAME_SIZE / 2 + 100);

    ctx.restore();
}

function start() {
    let ctx = gameCanvas.getContext('2d');
    displayStartUI(ctx);
}