const params = new URLSearchParams(window.location.search);
const dificultad = params.get('dificultad') || 'facil';

let FILAS, COLS, TOTAL_MINAS, MINAS_ORIGINAL;
if (dificultad === 'dificil') {
    FILAS = 16;
    COLS = 16;
    TOTAL_MINAS = 40;
} else {
    FILAS = 9;
    COLS = 9;
    TOTAL_MINAS = 10;
}
MINAS_ORIGINAL = TOTAL_MINAS;

let grilla = [];
let celdasReveladas = 0;
let banderasColocadas = 0;
let juegoActivo = false;
let primerClic = true;
let cronometroID = null;
let segundos = 0;
let intentosFallidos = 0;

const offsets = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];

function generarTablero() {
    TOTAL_MINAS = MINAS_ORIGINAL;
    const contenedor = document.getElementById('grilla');
    contenedor.innerHTML = '';
    grilla = [];
    celdasReveladas = 0;
    banderasColocadas = 0;
    juegoActivo = false;
    primerClic = true;
    segundos = 0;
    detenerCronometro();
    actualizarDisplayCronometro();
    document.getElementById('contadorMinas').textContent = '💣 ' + TOTAL_MINAS;
    document.getElementById('btnReiniciar').textContent = '😊';
    document.getElementById('overlay').classList.remove('visible');

    for (let f = 0; f < FILAS; f++) {
        grilla[f] = [];
        for (let c = 0; c < COLS; c++) {
            const celda = {
                esMina: false,
                vecinos: 0,
                revelada: false,
                bandera: false,
                elemento: null
            };

            const div = document.createElement('div');
            div.classList.add('celda', 'celda-oculta');
            div.addEventListener('click', () => revelarCelda(f, c));
            div.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                colocarBandera(f, c);
            });

            celda.elemento = div;
            grilla[f][c] = celda;
            contenedor.appendChild(div);
        }
    }

    colocarMinas();
    calcularVecinos();
}

function colocarMinas() {
    let colocadas = 0;
    while (colocadas < TOTAL_MINAS) {
        const f = Math.floor(Math.random() * FILAS);
        const c = Math.floor(Math.random() * COLS);
        if (!grilla[f][c].esMina) {
            grilla[f][c].esMina = true;
            colocadas++;
        }
    }
}

function calcularVecinos() {
    for (let f = 0; f < FILAS; f++) {
        for (let c = 0; c < COLS; c++) {
            if (grilla[f][c].esMina) continue;
            let cuenta = 0;
            for (const [df, dc] of offsets) {
                const nf = f + df;
                const nc = c + dc;
                if (nf >= 0 && nf < FILAS && nc >= 0 && nc < COLS && grilla[nf][nc].esMina) {
                    cuenta++;
                }
            }
            grilla[f][c].vecinos = cuenta;
        }
    }
}

function reubicarMina(fila, col) {
    grilla[fila][col].esMina = false;
    let colocada = false;
    while (!colocada) {
        const nf = Math.floor(Math.random() * FILAS);
        const nc = Math.floor(Math.random() * COLS);
        if (!grilla[nf][nc].esMina && !(nf === fila && nc === col)) {
            grilla[nf][nc].esMina = true;
            colocada = true;
        }
    }
    recalcularVecinos();
}

function recalcularVecinos() {
    for (let f = 0; f < FILAS; f++) {
        for (let c = 0; c < COLS; c++) {
            if (grilla[f][c].esMina) { grilla[f][c].vecinos = 0; continue; }
            let cuenta = 0;
            for (const [df, dc] of offsets) {
                const nf = f + df;
                const nc = c + dc;
                if (nf >= 0 && nf < FILAS && nc >= 0 && nc < COLS && grilla[nf][nc].esMina) {
                    cuenta++;
                }
            }
            grilla[f][c].vecinos = cuenta;
        }
    }
}

function revelarCelda(fila, col) {
    const celda = grilla[fila][col];
    if (!juegoActivo && !primerClic) return;
    if (celda.revelada || celda.bandera) return;

    if (primerClic) {
        if (celda.esMina) {
            reubicarMina(fila, col);
        }
        primerClic = false;
        juegoActivo = true;
        iniciarCronometro();

        if (intentosFallidos >= 3) {
            intentosFallidos = 0;
            eliminarMinas();
        }
    }

    if (celda.esMina) {
        gameOver(fila, col);
        return;
    }

    celda.revelada = true;
    celdasReveladas++;
    celda.elemento.classList.remove('celda-oculta');
    celda.elemento.classList.add('celda-revelada');

    if (celda.vecinos > 0) {
        celda.elemento.textContent = celda.vecinos;
        celda.elemento.classList.add('n' + celda.vecinos);
    } else {
        revelarAdyacentes(fila, col);
    }

    verificarVictoria();
}

function revelarAdyacentes(fila, col) {
    for (const [df, dc] of offsets) {
        const nf = fila + df;
        const nc = col + dc;
        if (nf < 0 || nf >= FILAS || nc < 0 || nc >= COLS) continue;
        const v = grilla[nf][nc];
        if (v.revelada || v.bandera || v.esMina) continue;

        v.revelada = true;
        celdasReveladas++;
        v.elemento.classList.remove('celda-oculta');
        v.elemento.classList.add('celda-revelada');

        if (v.vecinos > 0) {
            v.elemento.textContent = v.vecinos;
            v.elemento.classList.add('n' + v.vecinos);
        } else {
            revelarAdyacentes(nf, nc);
        }
    }
}

function colocarBandera(fila, col) {
    const celda = grilla[fila][col];
    if (!juegoActivo && !primerClic) return;
    if (celda.revelada) return;

    if (primerClic) {
        primerClic = false;
        juegoActivo = true;
        iniciarCronometro();
    }

    if (celda.bandera) {
        celda.bandera = false;
        celda.elemento.textContent = '';
        banderasColocadas--;
    } else {
        celda.bandera = true;
        celda.elemento.textContent = '🚩';
        banderasColocadas++;
    }

    document.getElementById('contadorMinas').textContent = '💣 ' + (TOTAL_MINAS - banderasColocadas);
}

function verificarVictoria() {
    if (celdasReveladas === FILAS * COLS - TOTAL_MINAS) {
        detenerCronometro();
        juegoActivo = false;
        document.getElementById('btnReiniciar').textContent = '😎';
        mostrarOverlay(true);
    }
}

function gameOver(filaExploto, colExploto) {
    detenerCronometro();
    juegoActivo = false;

    grilla[filaExploto][colExploto].elemento.classList.remove('celda-oculta');
    grilla[filaExploto][colExploto].elemento.classList.add('celda-mina-explotada');
    grilla[filaExploto][colExploto].elemento.textContent = '💥';

    for (let f = 0; f < FILAS; f++) {
        for (let c = 0; c < COLS; c++) {
            if (f === filaExploto && c === colExploto) continue;
            const celda = grilla[f][c];
            if (celda.esMina && !celda.bandera) {
                celda.elemento.classList.remove('celda-oculta');
                celda.elemento.classList.add('celda-mina-revelada');
                celda.elemento.textContent = '💣';
            }
        }
    }

    intentosFallidos++;
    document.getElementById('contadorMinas').textContent = '💣 0';
    document.getElementById('btnReiniciar').textContent = '😵';
    setTimeout(() => {
        mostrarOverlay(false);
    }, 800);
}

function eliminarMinas() {
    for (let f = 0; f < FILAS; f++) {
        for (let c = 0; c < COLS; c++) {
            grilla[f][c].esMina = false;
        }
    }
    TOTAL_MINAS = 0;
    document.getElementById('contadorMinas').textContent = '💣 0';
}

function mostrarOverlay(victoria) {
    const overlay = document.getElementById('overlay');
    const titulo = document.getElementById('overlayTitulo');
    const tiempo = document.getElementById('overlayTiempo');

    const mm = String(Math.floor(segundos / 60)).padStart(2, '0');
    const ss = String(segundos % 60).padStart(2, '0');

    if (victoria) {
        titulo.textContent = '🎉 ¡GANASTE!';
        titulo.style.color = '#4CAF50';
    } else {
        titulo.textContent = '💥 ¡PISASTE UNA MINA!';
        titulo.style.color = '#EF5350';
    }

    tiempo.textContent = 'Tiempo: ' + mm + ':' + ss;
    overlay.classList.add('visible');
}

function iniciarCronometro() {
    segundos = 0;
    actualizarDisplayCronometro();
    cronometroID = setInterval(() => {
        segundos++;
        actualizarDisplayCronometro();
    }, 1000);
}

function actualizarDisplayCronometro() {
    const mm = String(Math.floor(segundos / 60)).padStart(2, '0');
    const ss = String(segundos % 60).padStart(2, '0');
    document.getElementById('cronometro').textContent = '⏱ ' + mm + ':' + ss;
}

function detenerCronometro() {
    clearInterval(cronometroID);
    cronometroID = null;
}

function reiniciar() {
    detenerCronometro();
    generarTablero();
}

document.addEventListener('DOMContentLoaded', () => {
    const grillaEl = document.getElementById('grilla');
    const tamCelda = dificultad === 'dificil' ? '30px' : '40px';
    grillaEl.style.gridTemplateColumns = 'repeat(' + COLS + ', ' + tamCelda + ')';

    if (dificultad === 'dificil') {
        grillaEl.classList.add('grilla-dificil');
    }

    generarTablero();
    document.getElementById('btnReiniciar').addEventListener('click', reiniciar);
    document.getElementById('btnOverlay').addEventListener('click', reiniciar);
});
