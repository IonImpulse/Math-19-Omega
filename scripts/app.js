const gameCanvas = document.getElementById('gameCanvas');
const arrowGridSize = 10;

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

var player_done = false;
var remainingLocations = [];
/* 
Game loop:
1: Generate vector field equation
2: Display equation, and pause for 5 seconds
3: Slowly & randomly generate arrows
4: Once player has placed down their line, speed up arrow generation
5: Total up score
6: Start over!
*/
async function gameLoop() {
    // 1: Generate vector field equation
    console.time('Generating equation');
    const equation = generateEquation();
    console.timeEnd('Generating equation');

    // 2: Display equation, and pause for 5 seconds
    console.time('Displaying equation');
    displayEquation(equation);
    console.timeEnd('Displaying equation');
    await sleep(5000);

    // 3: Slowly & randomly generate arrows
    console.time('Revealing arrows');
    remainingLocations = [];
    for (let i = 0; i < arrowGridSize; i++) {
        for (let j = 0; j < arrowGridSize; j++) {
            remainingLocations.push({x:i, y:j});
        }
    }
    revealArrows(equation);
    console.timeEnd('Revealing arrows');
    
    // 4: Once player has placed down their line, speed up arrow generation
    while (!player_done) {
        await sleep(10);
    }

    console.time('Revealing all arrows');
    revealArrows(equation, 100);
    console.timeEnd('Revealing all arrows');

    // 5: Total up score
    // 6: Start over!

}

function generateEquation() {
    const template_equations = [
        '?x^?',
        '?y^?',
        '?x^? + ?y^?',
        '?x^? - ?y^?',
        'cos(?x)^?',
        'sin(?y)^?',
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

function displayEquation(equation) {
    const ctx = gameCanvas.getContext('2d');

    ctx.save()
    ctx.fillStyle = '#eeeeee'

    // text specific styles
    ctx.font = 'bold 16px Monospace'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'alphabetic'

    // X = previous X position + width + 25px margin
    ctx.fillText(`F = 〈${equation.i}, ${equation.j}〉`, 50, 250)

    ctx.restore();
}

async function revealArrows(equation, speed=1) {
    let arrowSpeed = speed;

    while (remainingLocations.length > 0) {
        // Pick random arrow from remaining locations
        const randomIndex = Math.floor(Math.random() * remainingLocations.length);
        const randomLocation = remainingLocations.splice(randomIndex, 1)[0];

        console.log(randomLocation);
        const arrow = generateArrow(equation, arrowSpeed, randomLocation);
        displayArrow(arrow);
        await sleep(100);

        if (player_done) {
            return;
        }

        arrowSpeed += 0.1;
    }
}

function generateArrow(equation, speed, location) {
    const x = equation.i.replaceAll('x', `(${location.x - 5})`).replaceAll('y', `(${location.y - 5})`);
    const y = equation.j.replaceAll('x', `(${location.x - 5})`).replaceAll('y', `(${location.y - 5})`);

    console.log(`Generating arrow: {${x} | ${y}}`);

    const arrow = {
        x: math.evaluate(x) * .4,
        y: math.evaluate(y) * .4,
        speed: speed,
        location: location,
    };

    return arrow;
}

function displayArrow(arrow) {
    const ctx = gameCanvas.getContext('2d');

    ctx.save()

    ctx.translate(50 + arrow.location.x * 50, 250 + arrow.location.y * 50);
    ctx.rotate(arrow.x);

    ctx.fillStyle = '#ff0000';
    ctx.fillRect(-5, -5, 10, 10);

    ctx.restore();
}


async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function init() {
    gameLoop();
}


document.addEventListener('DOMContentLoaded', init)