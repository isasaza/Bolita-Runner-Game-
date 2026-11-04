/* =====================================================================
   RUNNER GAME — Lógica de todo el juego (materiales de color)

   ÍNDICE
     1. Configuración
     2. Diseño del nivel (TILEMAP)
     3. Escena, cámara, renderizador y luces
     4. Materiales y geometrías
     5. Modelos 3D: jugador, enemigo y bandera
     6. Construcción del nivel
     7. Entrada del teclado
     8. Física y colisiones
     9. Bloques
     10. Jugador
     11. Enemigos
     12. Partículas y animaciones
     13. Cámara
     14. Interfaz
     15. Estados y bucle principal

   SISTEMA DE COORDENADAS:
     - Bloque 1x1x1
     - Eje X -> Derecha (avance del jugador)
     - Eje Y -> Arriba (altura del jugador)
     - Eje Z -> Profundidad visual

   ESTRUCTURA:
     index.html
     src/css/style.css
     src/js/game.js
   ===================================================================== */

import * as THREE from 'three';

/* =====================================================================
   1. CONFIGURACIÓN
   Cambiar estos números cambia cómo "se siente" el juego.
   ===================================================================== */

const CONFIG = {
    GRAVEDAD: -32,
    VEL_CAMINAR: 6,
    VEL_CORRER: 9,
    ACELERACION: 40,
    FRICCION: 30,

    // El mapa necesita este salto para alcanzar plataformas altas.
    FUERZA_SALTO: 15,

    MULT_CAIDA: 1.6,
    REBOTE_PISADA: 0.75,
    CORTE_SALTO: 0.45,
    VEL_MAX_CAIDA: -20,

    // Permite saltar brevemente después de salir de un borde.
    TIEMPO_COYOTE: 0.1,

    // Guarda una pulsación de salto antes de tocar el suelo.
    BUFFER_SALTO: 0.12,

    VIDAS_INICIALES: 3,
    TIEMPO_NIVEL: 300,
    LIMITE_CAIDA: -5,
    VEL_ENEMIGO: 1.0,
    INVULNERABLE: 1.0,
    RADIO_BOLA: 0.4,

    // Parámetros de movimiento sobre las rampas.
    G_RAMPA: 30,
    VEL_RODAR: 13,
    FRICCION_RODAR: 5
};

/* =====================================================================
   2. DISEÑO DEL NIVEL (TILEMAP)

   Cada carácter representa una casilla de 1x1.
   La primera fila corresponde a la parte superior.

   BLOQUES:
     # Suelo con pasto
     T Tierra
     = Plataforma flotante
     B Caja de madera
     S Roca
     C Tronco
     L Plataforma sobre estanque

   OBJETOS:
     E Enemigo rojo
     K Bandera de punto de control
     P Posición inicial de Junimo
     F Bandera de meta
   ===================================================================== */

const MAPA_NIVEL = [
  "",
  "",
  "                                               B                 B                                                                                       B",
  "                                                                                                                          B",
  "                                                                ",
  "                                              ===                   E                                                                                     E",
  "                                         E                 ############                                     BBB                                         ====",
  "                BBBBB                   ====       ====   #TTTTTTTTTTTT                                                  ====    S                    ",
  "                                                         #TTTTTTTTTTTTT                                                         SSS    C  C",
  "  P                        E                 E          #TTTTTTTTTTTTTT                 K                 E         E          SSSSS   CE C      E    E       E           F       ",
  "####################################  ##################TTTTTTTTTTTTTTT              ######### L LL L ##############################################################################",
];

// Caracteres sólidos: el jugador puede chocar con ellos.
// K y F son atravesables para activar el control y la meta.
const SOLIDOS = new Set([
    "#", "T", "=", "B", "S", "C", "L"
]);

// RAMPAS:
// x0 y x1 indican el comienzo y el final.
// hIzq y hDer representan la altura de cada extremo.
// La curva utiliza una transición suave para evitar escalones.
const RAMPAS = [
    { x0: 71, x1: 85, hIzq: 5, hDer: 1 }
];

// ESTANQUES:
// x0 es inclusivo y x1 es exclusivo.
const ESTANQUES = [
    { x0: 36, x1: 38 },
    { x0: 94, x1: 102 }
];

/* =====================================================================
   3. ESCENA, CÁMARA, RENDERIZADOR Y LUCES
   ===================================================================== */

const COLOR_CIELO = 0x6ec6ff;

const scene = new THREE.Scene();
scene.background = new THREE.Color(COLOR_CIELO);
scene.fog = null;

const camera = new THREE.PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.1,
    300
);

camera.position.set(5, 5, 14);

const renderer = new THREE.WebGLRenderer({
    antialias: true
});

renderer.setSize(
    window.innerWidth,
    window.innerHeight
);

renderer.setPixelRatio(
    Math.min(window.devicePixelRatio, 2)
);

renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

document.body.appendChild(renderer.domElement);

// Actualiza la cámara al cambiar el tamaño de la ventana.
window.addEventListener('resize', () => {
    renderer.setSize(
        window.innerWidth,
        window.innerHeight
    );

    camera.aspect =
        window.innerWidth / window.innerHeight;

    actualizarFondo();
});

// Una luz ambiental ilumina la escena de forma general.
// La luz direccional genera sombras y aporta volumen.
const luzAmbiente = new THREE.HemisphereLight(
    0xffffff,
    0x7caa5c,
    2.2
);

scene.add(luzAmbiente);

const luzSol = new THREE.DirectionalLight(
    0xffffff,
    2.6
);

luzSol.castShadow = true;
luzSol.shadow.mapSize.set(2048, 2048);

luzSol.shadow.camera.left = -22;
luzSol.shadow.camera.right = 22;
luzSol.shadow.camera.top = 15;
luzSol.shadow.camera.bottom = -10;
luzSol.shadow.camera.near = 1;
luzSol.shadow.camera.far = 60;

scene.add(luzSol);
scene.add(luzSol.target);

/* =====================================================================
   4. MATERIALES Y GEOMETRÍAS

   Los materiales definen el color de los objetos 3D.
   No se cargan imágenes ni se necesita recursos.js.
   ===================================================================== */

const material = color =>
    new THREE.MeshLambertMaterial({ color });

const MATERIALES = {
    suelo: material(0x48a942),
    tierra: material(0x94613c),
    tierraBloque: material(0x94613c),
    caja: material(0xb47742),
    roca: material(0x80858a),
    tronco: material(0x79512f),
    agua: material(0x378ad6),
    rampaTierra: material(0x94613c),
    rampaPasto: material(0x48a942)
};

const GEO_BLOQUE = new THREE.BoxGeometry(1, 1, 1);
const GEO_TIERRA = new THREE.BoxGeometry(1, 4, 1);

/* =====================================================================
   5. MODELOS 3D: JUGADOR, ENEMIGOS Y BANDERAS

   Cada objeto Mesh combina una geometría y un material.
   ===================================================================== */

const R_CUERPO = 0.38;
const Y_CENTRO = 0.4;

// Junimo: esfera verde.
function crearModeloJugador() {
    const grupo = new THREE.Group();
    const cuerpoRot = new THREE.Group();

    cuerpoRot.position.y = Y_CENTRO;

    cuerpoRot.add(
        new THREE.Mesh(
            new THREE.SphereGeometry(
                R_CUERPO, 24, 18
            ),
            material(0x18cf32)
        )
    );

    grupo.add(cuerpoRot);
    grupo.userData = { cuerpoRot };

    return grupo;
}

// Enemigo: esfera roja.
function crearModeloEnemigo() {
    const grupo = new THREE.Group();

    const esfera = new THREE.Mesh(
        new THREE.SphereGeometry(
            0.35, 20, 16
        ),
        material(0xef2929)
    );

    esfera.position.y = 0.35;
    grupo.add(esfera);

    return grupo;
}

// Bandera para punto de control y meta.
function crearBandera(color) {
    const grupo = new THREE.Group();

    const poste = new THREE.Mesh(
        new THREE.CylinderGeometry(
            0.045, 0.045, 2.5, 10
        ),
        material(0xd5d9de)
    );

    poste.position.y = 1.25;
    grupo.add(poste);

    const forma = new THREE.Shape();

    forma.moveTo(0, 0);
    forma.lineTo(1.05, -0.3);
    forma.lineTo(0, -0.6);
    forma.closePath();

    const tela = new THREE.Mesh(
        new THREE.ShapeGeometry(forma),
        new THREE.MeshBasicMaterial({
            color,
            side: THREE.DoubleSide
        })
    );

    tela.position.set(0.05, 2.4, 0.15);
    grupo.add(tela);

    grupo.userData.tela = tela;

    return grupo;
}
/* =====================================================================
   6. CONSTRUCCIÓN DEL NIVEL
   Recorremos el mapa de texto y creamos un objeto por cada carácter.
   Los bloques sólidos se guardan en un Map con la clave "x,y" para
   encontrarlos rápido al calcular colisiones.

   IMPORTANTE: construirNivel() se llama UNA vez al iniciar la partida,
   nunca dentro de animate(). Si se llamara en cada cuadro, crearíamos
   cientos de mallas 60 veces por segundo y el juego se volvería lento.
   ===================================================================== */

let grupoNivel = null,
    bloques = new Map(),
    enemigos = [],
    particulas = [],
    posicionInicial = { x: 2.5, y: 1 },
    puntoControl = null,
    banderaMeta = null;

const clave = (x, y) => x + "," + y;

function construirNivel() {
    // Eliminar el grupo de nivel anterior
    if (grupoNivel) scene.remove(grupoNivel);

    grupoNivel = new THREE.Group();
    scene.add(grupoNivel);

    bloques = new Map();
    enemigos = [];
    particulas = [];
    puntoControl = null;
    banderaMeta = null;

    RAMPAS.forEach(crearRampa);
    ESTANQUES.forEach(crearEstanque);

    const alto = MAPA_NIVEL.length;

    MAPA_NIVEL.forEach((fila, y) => {
        // Invertir el eje Y: la fila 0 del arreglo es la de ARRIBA del nivel
        const yMundo = alto - 1 - y;

        for (let index = 0; index < fila.length; index++) {
            const element = fila[index];

            if (SOLIDOS.has(element)) {
                crearBloque(index, yMundo, element);

            } else if (element === "E") {
                crearEnemigo(index, yMundo);

            } else if (element === "P") {
                posicionInicial = {
                    x: index + 0.5,
                    y: yMundo
                };

            } else if (element === "K") {
                const bandera = crearBandera(0xffd23f);

                bandera.position.set(
                    index + 0.5,
                    yMundo,
                    0
                );

                grupoNivel.add(bandera);

                puntoControl = {
                    x: index + 0.5,
                    y: yMundo,
                    bandera,
                    activo: false
                };

            } else if (element === "F") {
                const bandera = crearBandera(0x28d950);

                bandera.position.set(
                    index + 0.5,
                    yMundo,
                    0
                );

                grupoNivel.add(bandera);

                banderaMeta = {
                    x: index + 0.5,
                    bandera
                };
            }
        }
    });
}

function crearBloque(x, y, tipo) {
    // Seleccionar el material que se le va a colocar al bloque según su tipo
    const material = {
        "#": MATERIALES.suelo,
        "=": MATERIALES.suelo,
        "T": MATERIALES.tierraBloque,
        "B": MATERIALES.caja,
        "S": MATERIALES.roca,
        "C": MATERIALES.tronco,
        "L": MATERIALES.tronco
    }[tipo];

    const malla = new THREE.Mesh(GEO_BLOQUE, material);

    // +0.5 porque el cubo se ubica desde su centro,
    // pero la casilla va de x a x+1
    malla.position.set(x + 0.5, y + 0.5, 0);

    malla.castShadow = true;
    malla.receiveShadow = true;

    grupoNivel.add(malla);

    bloques.set(clave(x, y), {
        x,
        y,
        tipo,
        malla,
        rebote: 0
    });

    // Debajo del suelo de la fila de abajo agregamos tierra
    // (solo decorativa, sin colisión)
    if (tipo === "#" && y === 0) {
        const tierra = new THREE.Mesh(
            GEO_TIERRA,
            MATERIALES.tierra
        );

        tierra.position.set(x + 0.5, y - 1, 0);
        tierra.receiveShadow = true;

        grupoNivel.add(tierra);
    }
}

function crearEnemigo(x, y) {
    const malla = crearModeloEnemigo();

    grupoNivel.add(malla);

    enemigos.push({
        x: x + 0.5,
        y: y,
        vx: 0,
        vy: 0,
        ancho: 0.8,
        alto: 0.7,
        direccion: -1,
        vivo: true,
        tiempoMuerto: 0,
        malla
    });
}

// ---------- Rampa: curva suave hecha con una forma extruida ----------

// Altura de la superficie en la posición x
// (smoothstep: empieza y termina plana)
function alturaRampa(r, x) {
    const t = Math.min(
        1,
        Math.max(0, (x - r.x0) / (r.x1 - r.x0))
    );

    const s = t * t * (3 - 2 * t);

    return r.hIzq + (r.hDer - r.hIzq) * s;
}

// Pendiente (derivada) de esa curva:
// cuánto sube o baja por cada unidad en x
function pendienteRampa(r, x) {
    const t = Math.min(
        1,
        Math.max(0, (x - r.x0) / (r.x1 - r.x0))
    );

    return (
        (r.hDer - r.hIzq) *
        (6 * t * (1 - t)) /
        (r.x1 - r.x0)
    );
}

function rampaEn(x) {
    return RAMPAS.find(
        r => x >= r.x0 && x <= r.x1
    ) || null;
}

function crearRampa(r) {
    const N = 48;
    const pts = [];

    for (let i = 0; i <= N; i++) {
        const x = r.x0 + (r.x1 - r.x0) * i / N;

        pts.push([
            x,
            alturaRampa(r, x)
        ]);
    }

    // 1) Tierra: polígono desde la superficie hasta y = -4,
    // extruido 1 unidad de profundidad
    const formaTierra = new THREE.Shape();

    formaTierra.moveTo(r.x0, -4);

    pts.forEach(([x, y]) =>
        formaTierra.lineTo(x, y)
    );

    formaTierra.lineTo(r.x1, -4);
    formaTierra.closePath();

    const geoTierra = new THREE.ExtrudeGeometry(
        formaTierra,
        {
            depth: 1,
            bevelEnabled: false
        }
    );

    geoTierra.translate(0, 0, -0.5);

    const tierra = new THREE.Mesh(
        geoTierra,
        MATERIALES.rampaTierra
    );

    tierra.receiveShadow = true;
    tierra.castShadow = true;

    grupoNivel.add(tierra);

    // 2) Capa de pasto: una franja delgada
    // que sigue la superficie
    const formaPasto = new THREE.Shape();

    formaPasto.moveTo(pts[0][0], pts[0][1]);

    pts.forEach(([x, y]) =>
        formaPasto.lineTo(x, y)
    );

    for (let i = N; i >= 0; i--) {
        formaPasto.lineTo(
            pts[i][0],
            pts[i][1] - 0.35
        );
    }

    formaPasto.closePath();

    const geoPasto = new THREE.ExtrudeGeometry(
        formaPasto,
        {
            depth: 1.02,
            bevelEnabled: false
        }
    );

    geoPasto.translate(0, 0, -0.51);

    const pasto = new THREE.Mesh(
        geoPasto,
        MATERIALES.rampaPasto
    );

    pasto.receiveShadow = true;

    grupoNivel.add(pasto);
}

// ---------- Estanque: agua semitransparente en los huecos del suelo ----------

function crearEstanque(e) {
    const ancho = e.x1 - e.x0 - 0.02;

    const agua = new THREE.Mesh(
        new THREE.BoxGeometry(
            ancho,
            4.6,
            0.96
        ),
        MATERIALES.agua
    );

    // La superficie queda en y = 0.6
    agua.position.set(
        (e.x0 + e.x1) / 2,
        -1.7,
        0
    );

    grupoNivel.add(agua);
}

/* =====================================================================
   7. ENTRADA DEL TECLADO

   Guardamos qué teclas están presionadas;
   en cada cuadro preguntamos.
   ===================================================================== */

const teclas = {};

window.addEventListener('keydown', (e) => {
    teclas[e.code] = true;

    // Evita que la página haga scroll con espacio o flechas
    if ([
        'Space',
        'ArrowUp',
        'ArrowDown',
        'ArrowLeft',
        'ArrowRight'
    ].includes(e.code)) {
        e.preventDefault();
    }

    // "Buffer" de salto: recordamos que el jugador quiso saltar
    if (
        !e.repeat &&
        esTeclaSalto(e.code) &&
        estado === 'jugando'
    ) {
        jugador.bufferSalto = CONFIG.BUFFER_SALTO;
    }

    if (e.code === 'KeyP') alternarPausa();

    if (e.code === 'KeyR' && estado !== 'inicio') {
        iniciarJuego();
    }
});

window.addEventListener('keyup', (e) => {
    teclas[e.code] = false;
});

const esTeclaSalto = (code) =>
    code === 'Space' ||
    code === 'ArrowUp' ||
    code === 'KeyW';

const teclaIzquierda = () =>
    teclas['ArrowLeft'] ||
    teclas['KeyA'];

const teclaDerecha = () =>
    teclas['ArrowRight'] ||
    teclas['KeyD'];

const teclaSaltoPresionada = () =>
    teclas['Space'] ||
    teclas['ArrowUp'] ||
    teclas['KeyW'];

const teclaCorrer = () =>
    teclas['ShiftLeft'] ||
    teclas['ShiftRight'];

    /* =====================================================================
   8. FÍSICA Y COLISIONES (AABB contra la grilla + rampa)

   Movemos primero en X y resolvemos choques, y LUEGO en Y.
   Separar los ejes evita que el personaje se "pegue" en las esquinas.

   Toda entidad tiene:
     x, y, ancho, alto, vx, vy.

   La rampa NO son bloques:
   se resuelve aparte con resolverRampa().
   ===================================================================== */

function obtenerBloque(tx, ty) {
    return bloques.get(clave(tx, ty)) || null;
}

// Devuelve los bloques sólidos que se cruzan con la caja de la entidad.
// La holgura evita engancharse en la esquina donde empieza la rampa.
function bloquesQueToca(ent, holgura = 0.001) {
    const resultado = [];

    const izquierda = Math.floor(ent.x - ent.ancho / 2);
    const derecha = Math.floor(ent.x + ent.ancho / 2 - 0.001);
    const abajo = Math.floor(ent.y + holgura);
    const arriba = Math.floor(ent.y + ent.alto - 0.001);

    for (let tx = izquierda; tx <= derecha; tx++) {
        for (let ty = abajo; ty <= arriba; ty++) {
            const b = obtenerBloque(tx, ty);

            if (b) resultado.push(b);
        }
    }

    return resultado;
}

// Mueve una entidad y resuelve las colisiones.
// alGolpearTecho es una función opcional para detectar golpes con la cabeza.
function moverEntidad(ent, dt, alGolpearTecho) {
    ent.chocoPared = false;

    // Movimiento horizontal: eje X
    ent.x += ent.vx * dt;

    let choques = bloquesQueToca(
        ent,
        ent.enRampaAntes ? 0.12 : 0.001
    );

    if (choques.length > 0) {
        if (ent.vx > 0) {
            ent.x = Math.min(
                ...choques.map(b => b.x)
            ) - ent.ancho / 2 - 0.001;

        } else if (ent.vx < 0) {
            ent.x = Math.max(
                ...choques.map(b => b.x)
            ) + 1 + ent.ancho / 2 + 0.001;
        }

        ent.vx = 0;
        ent.chocoPared = true;
    }

    // Movimiento vertical: eje Y
    ent.y += ent.vy * dt;
    ent.enSuelo = false;

    choques = bloquesQueToca(ent);

    if (choques.length > 0) {
        if (ent.vy < 0) {
            // Al caer, la entidad aterriza sobre el bloque.
            ent.y = Math.max(
                ...choques.map(b => b.y)
            ) + 1;

            ent.enSuelo = true;

        } else if (ent.vy > 0) {
            // Al subir, la entidad golpea el techo.
            ent.y = Math.min(
                ...choques.map(b => b.y)
            ) - ent.alto - 0.001;

            if (alGolpearTecho) {
                alGolpearTecho(choques);
            }
        }

        ent.vy = 0;
    }
}

// Calcula el contacto de Junimo con la superficie de una rampa.
function resolverRampa(ent, dt) {
    ent.enRampa = false;
    ent.pendiente = 0;

    const r = rampaEn(ent.x);

    if (!r) return;

    const s = pendienteRampa(r, ent.x);

    // La esfera se apoya sobre la superficie inclinada.
    const yApoyo =
        alturaRampa(r, ent.x) +
        CONFIG.RADIO_BOLA * (Math.sqrt(1 + s * s) - 1);

    // Margen para seguir la curva cuando baja rápidamente.
    const margen = ent.enRampaAntes
        ? 0.08 + Math.abs(s * ent.vx) * dt * 1.5
        : 0.02;

    if (ent.vy <= 0 && ent.y <= yApoyo + margen) {
        ent.y = yApoyo;
        ent.vy = 0;
        ent.enSuelo = true;
        ent.enRampa = true;
        ent.pendiente = s;
    }
}

// AABB: comprueba si dos cajas rectangulares se superponen.
function seSuperponen(a, b) {
    return (
        Math.abs(a.x - b.x) <
            (a.ancho + b.ancho) / 2 &&
        a.y < b.y + b.alto &&
        a.y + a.alto > b.y
    );
}

/* =====================================================================
   9. BLOQUES

   Junimo puede golpear cajas desde abajo.
   Las cajas de madera se destruyen y dan puntos.
   ===================================================================== */

function golpearBloque(listaBloques) {
    const bloque = listaBloques.reduce(
        (mejor, b) =>
            Math.abs(b.x + 0.5 - jugador.x) <
            Math.abs(mejor.x + 0.5 - jugador.x)
                ? b
                : mejor
    );

    if (bloque.tipo === 'B') {
        destruirBloque(bloque);
    } else {
        bloque.rebote = 0.1;
    }

    // Si hay un enemigo encima del bloque, también recibe el golpe.
    enemigos.forEach(en => {
        if (
            en.vivo &&
            Math.floor(en.x) === bloque.x &&
            Math.abs(en.y - (bloque.y + 1)) < 0.1
        ) {
            derrotarEnemigo(en, 100);
        }
    });
}

function destruirBloque(bloque) {
    // Se elimina de la escena y del mapa de colisiones.
    grupoNivel.remove(bloque.malla);
    bloques.delete(clave(bloque.x, bloque.y));

    crearParticulas(
        bloque.x + 0.5,
        bloque.y + 0.5,
        MATERIALES.caja,
        8
    );

    puntos += 50;
}

/* =====================================================================
   10. JUGADOR (JUNIMO)

   Aquí se controlan:
     - Posición y velocidad
     - Aceleración y fricción
     - Gravedad y salto
     - Movimiento sobre rampas
     - Vidas y reaparición
     - Punto de control y meta
   ===================================================================== */

const jugador = {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,

    ancho: CONFIG.RADIO_BOLA * 2,
    alto: CONFIG.RADIO_BOLA * 2,

    enSuelo: false,
    mirando: 1,

    tiempoCoyote: 0,
    bufferSalto: 0,
    saltando: false,

    invulnerable: 0,
    tiempoAnimacion: 0,
    aplastar: 0,

    // Propiedades para el movimiento sobre las rampas.
    enRampa: false,
    enRampaAntes: false,
    pendiente: 0,
    rodando: false,

    malla: crearModeloJugador()
};

scene.add(jugador.malla);

// Reaparece al inicio o en el punto de control activado.
function reaparecerJugador() {
    const inicio =
        puntoControl && puntoControl.activo
            ? puntoControl
            : posicionInicial;

    jugador.x = inicio.x;
    jugador.y = inicio.y;

    jugador.vx = 0;
    jugador.vy = 0;
    jugador.mirando = 1;

    jugador.rodando = false;
    jugador.enRampa = false;
    jugador.enRampaAntes = false;

    jugador.invulnerable = CONFIG.INVULNERABLE;

    jugador.malla.rotation.set(0, 0, 0);
    jugador.malla.visible = true;
}

function actualizarJugador(dt) {
    const j = jugador;

    j.enRampaAntes = j.enRampa;

    // Movimiento horizontal con aceleración y fricción.
    let direccion = 0;

    if (teclaIzquierda()) direccion -= 1;
    if (teclaDerecha()) direccion += 1;

    const velocidadMaxima = teclaCorrer()
        ? CONFIG.VEL_CORRER
        : CONFIG.VEL_CAMINAR;

    const limite = j.rodando
        ? CONFIG.VEL_RODAR
        : velocidadMaxima;

    // La gravedad impulsa a Junimo cuesta abajo.
    if (j.enRampaAntes) {
        j.vx -= j.pendiente * CONFIG.G_RAMPA * dt;
    }

    if (direccion !== 0) {
        j.vx += direccion * CONFIG.ACELERACION * dt;
        j.mirando = direccion;

    } else if (!j.enRampaAntes) {
        // La fricción reduce gradualmente la velocidad.
        const freno = (
            j.rodando
                ? CONFIG.FRICCION_RODAR
                : CONFIG.FRICCION
        ) * dt;

        j.vx = Math.abs(j.vx) <= freno
            ? 0
            : j.vx - Math.sign(j.vx) * freno;
    }

    // Limita la velocidad horizontal.
    j.vx = Math.max(
        -limite,
        Math.min(limite, j.vx)
    );

    // Salto con tiempo coyote y buffer.
    j.tiempoCoyote = j.enSuelo
        ? CONFIG.TIEMPO_COYOTE
        : j.tiempoCoyote - dt;

    j.bufferSalto -= dt;

    if (
        j.bufferSalto > 0 &&
        j.tiempoCoyote > 0
    ) {
        j.vy = CONFIG.FUERZA_SALTO;
        j.bufferSalto = 0;
        j.tiempoCoyote = 0;
        j.saltando = true;
    }

    // Si se suelta el botón, se reduce la altura del salto.
    if (
        j.saltando &&
        !teclaSaltoPresionada() &&
        j.vy > 0
    ) {
        j.vy *= CONFIG.CORTE_SALTO;
        j.saltando = false;
    }

    if (j.vy <= 0) {
        j.saltando = false;
    }

    // La gravedad es mayor durante la caída.
    const g = j.vy < 0
        ? CONFIG.GRAVEDAD * CONFIG.MULT_CAIDA
        : CONFIG.GRAVEDAD;

    j.vy += g * dt;

    j.vy = Math.max(
        j.vy,
        CONFIG.VEL_MAX_CAIDA
    );

    // Movimiento y colisiones.
    const estabaEnSuelo = j.enSuelo;
    const vyAntes = j.vy;

    moverEntidad(j, dt, golpearBloque);

    // Evita salir del borde izquierdo del mapa.
    if (j.x < j.ancho / 2) {
        j.x = j.ancho / 2;
        j.vx = 0;
    }

    // Comprueba el contacto con la rampa.
    resolverRampa(j, dt);

    if (!estabaEnSuelo && j.enSuelo) {
        j.aplastar = Math.min(
            0.3,
            Math.abs(vyAntes) * 0.015
        );
    }

    // Rodar cuesta abajo.
    if (
        j.enRampa &&
        Math.abs(j.pendiente) > 0.08 &&
        j.vx * j.pendiente < 0
    ) {
        j.rodando = true;

    } else if (
        j.enSuelo &&
        Math.abs(j.vx) < CONFIG.VEL_CAMINAR
    ) {
        j.rodando = false;
    }

    // Caída al vacío o al agua.
    if (j.y < CONFIG.LIMITE_CAIDA) {
        perderVida(false);
        return;
    }

    // Activación de la bandera del punto de control.
    if (
        puntoControl &&
        !puntoControl.activo &&
        j.x >= puntoControl.x
    ) {
        puntoControl.activo = true;

        puntoControl.bandera.userData.tela
            .material.color.set(0x28d950);

        mostrarAviso('¡PUNTO DE CONTROL!');
    }

    // Llegada a la bandera de meta.
    if (
        banderaMeta &&
        j.x >= banderaMeta.x - 0.2
    ) {
        ganarNivel();
    }

    if (j.invulnerable > 0) {
        j.invulnerable -= dt;
    }

    actualizarModeloJugador(dt);
}

// Actualiza la posición y la rotación de la esfera verde.
function actualizarModeloJugador(dt) {
    const j = jugador;
    const m = j.malla;

    m.position.set(j.x, j.y, 0);

    m.userData.cuerpoRot.rotation.z -=
        j.vx * dt / R_CUERPO;

    // Parpadea temporalmente al reaparecer.
    m.visible = j.invulnerable > 0
        ? Math.floor(j.invulnerable * 12) % 2 === 0
        : true;
}

// Resta una vida cuando Junimo recibe daño o cae.
function perderVida(conAnimacion) {
    if (estado !== 'jugando') return;

    vidas--;
    estado = 'muriendo';
    tiempoMuerte = 1.4;

    jugador.malla.visible = true;
    jugador.vy = conAnimacion ? 12 : 0;
    jugador.vx = 0;
}

// Animación de caída después de perder una vida.
function actualizarMuerte(dt) {
    tiempoMuerte -= dt;

    jugador.vy += CONFIG.GRAVEDAD * dt;
    jugador.y += jugador.vy * dt;

    jugador.malla.position.set(
        jugador.x,
        jugador.y,
        0
    );

    jugador.malla.rotation.z += dt * 8;

    if (tiempoMuerte <= 0) {
        if (vidas <= 0) {
            terminarJuego(false);
        } else {
            reaparecerJugador();
            tiempoRestante = CONFIG.TIEMPO_NIVEL;
            estado = 'jugando';
        }
    }
}

/* =====================================================================
   11. ENEMIGOS

   Los enemigos caminan de lado a lado y cambian de dirección
   cuando encuentran una pared o llegan al borde de una plataforma.

   Si Junimo cae sobre un enemigo, lo derrota y recibe puntos.
   Si lo toca por un costado, pierde una vida.
   ===================================================================== */

function actualizarEnemigos(dt, tiempo) {
    enemigos.forEach(en => {

        // Enemigo derrotado: esperamos un momento antes de eliminarlo.
        if (!en.vivo) {
            en.tiempoMuerto -= dt;

            if (
                en.tiempoMuerto <= 0 &&
                en.malla.parent
            ) {
                grupoNivel.remove(en.malla);
            }

            return;
        }

        // Los enemigos solo se mueven cuando están cerca de Junimo.
        if (Math.abs(en.x - jugador.x) > 18) return;

        en.vx = en.direccion * CONFIG.VEL_ENEMIGO;
        en.vy += CONFIG.GRAVEDAD * dt;

        moverEntidad(en, dt);

        // Cambia de dirección al encontrar una pared
        // o al detectar que no hay suelo adelante.
        let girar = en.chocoPared;

        if (en.enSuelo) {
            const pieDelantero = Math.floor(
                en.x +
                en.direccion * (en.ancho / 2 + 0.05)
            );

            const sueloDelantero = obtenerBloque(
                pieDelantero,
                Math.floor(en.y - 0.1)
            );

            if (!sueloDelantero) {
                girar = true;
            }
        }

        if (girar) {
            en.direccion *= -1;
        }

        // Impide que el enemigo salga por el borde izquierdo.
        if (en.x < en.ancho / 2) {
            en.x = en.ancho / 2;
            en.direccion = 1;
        }

        // Elimina enemigos que caen al vacío.
        if (en.y < CONFIG.LIMITE_CAIDA) {
            en.vivo = false;
            en.tiempoMuerto = 0;
        }

        // Actualiza la posición y una pequeña animación.
        en.malla.position.set(en.x, en.y, 0);

        en.malla.scale.set(
            en.direccion,
            1 + Math.sin(tiempo * 8) * 0.04,
            1
        );

        /* -------------------------------------------------------------
           COLISIÓN ENTRE JUNIMO Y LOS ENEMIGOS

           Se utiliza una distancia entre centros.
           Esto evita choques por las esquinas de las cajas invisibles.
           ------------------------------------------------------------- */

        if (estado === 'jugando' && en.vivo) {
            const rBola = CONFIG.RADIO_BOLA;
            const rEnemigo = 0.36;

            const dx = jugador.x - en.x;

            const dy =
                (jugador.y + rBola) -
                (en.y + 0.32);

            const distanciaCuadrada =
                dx * dx + dy * dy;

            const radioTotal = rBola + rEnemigo;

            if (
                distanciaCuadrada <
                radioTotal * radioTotal
            ) {

                // Junimo derrota al enemigo si cae desde arriba.
                if (jugador.vy < 0 && dy > 0.1) {
                    derrotarEnemigo(en, 200);

                    jugador.vy =
                        CONFIG.FUERZA_SALTO *
                        CONFIG.REBOTE_PISADA;

                    jugador.saltando =
                        teclaSaltoPresionada();

                } else if (jugador.invulnerable <= 0) {
                    // Si toca al enemigo de lado, pierde una vida.
                    perderVida(true);
                }
            }
        }
    });
}

function derrotarEnemigo(en, puntosGanados) {
    en.vivo = false;
    en.tiempoMuerto = 0.5;

    // La esfera roja se aplasta al ser derrotada.
    en.malla.scale.set(1.2, 0.25, 1.2);

    puntos += puntosGanados;
}

/* =====================================================================
   12. PARTÍCULAS Y ANIMACIONES DEL NIVEL

   Al destruir una caja aparecen pequeños fragmentos 3D.
   Se utiliza el mismo material de color de la caja.
   ===================================================================== */

const GEO_PEDAZO = new THREE.BoxGeometry(
    0.25,
    0.25,
    0.25
);

function crearParticulas(x, y, material, cantidad) {
    for (let i = 0; i < cantidad; i++) {

        const malla = new THREE.Mesh(
            GEO_PEDAZO,
            material
        );

        malla.position.set(x, y, 0);
        grupoNivel.add(malla);

        particulas.push({
            malla,

            vx: (Math.random() - 0.5) * 6,
            vy: 5 + Math.random() * 5,
            vz: (Math.random() - 0.5) * 6,

            vida: 1.2,
            gira: 10,
            gravedad: CONFIG.GRAVEDAD
        });
    }
}

function actualizarParticulas(dt) {

    // Recorremos el arreglo al revés para eliminar
    // partículas sin saltarnos ninguna.
    for (let i = particulas.length - 1; i >= 0; i--) {
        const p = particulas[i];

        p.vy += p.gravedad * dt;

        p.malla.position.x += p.vx * dt;
        p.malla.position.y += p.vy * dt;
        p.malla.position.z += p.vz * dt;

        p.malla.rotation.x += p.gira * dt;
        p.malla.rotation.y += p.gira * dt;

        p.vida -= dt;

        if (p.vida <= 0) {
            grupoNivel.remove(p.malla);
            particulas.splice(i, 1);
        }
    }
}

// Animación de las cajas y la bandera de meta.
function animarNivel(dt, tiempo) {

    bloques.forEach(b => {
        if (b.rebote > 0) {
            b.rebote -= dt;

            b.malla.position.y =
                b.y + 0.5 +
                Math.sin(
                    Math.max(0, b.rebote) * 15
                ) * 0.15;
        }
    });

    // La bandera de meta ondea suavemente.
    if (banderaMeta) {
        banderaMeta.bandera.userData.tela.rotation.y =
            Math.sin(tiempo * 3) * 0.25;
    }
}

/* =====================================================================
   13. CÁMARA QUE SIGUE AL JUGADOR

   Interpolación (lerp):
   La cámara se acerca progresivamente a su posición objetivo.

   Esto permite que siga a Junimo sin movimientos bruscos.
   ===================================================================== */

function actualizarCamara(dt) {
    const suavizado = Math.min(1, 5 * dt);

    // La cámara mira un poco adelante de Junimo.
    const objetivoX = Math.max(
        8,
        jugador.x + 2
    );

    const objetivoY = Math.max(
        4.5,
        jugador.y + 3
    );

    camera.position.x +=
        (objetivoX - camera.position.x) *
        suavizado;

    camera.position.y +=
        (objetivoY - camera.position.y) *
        suavizado;

    camera.position.z = 14;

    camera.lookAt(
        camera.position.x,
        camera.position.y - 2,
        0
    );

    moverSol();
}

// La luz sigue a la cámara para iluminar el escenario.
function moverSol() {
    luzSol.position.set(
        camera.position.x - 6,
        18,
        12
    );

    luzSol.target.position.set(
        camera.position.x,
        0,
        0
    );
}

/* =====================================================================
   14. INTERFAZ: HUD Y PANTALLAS

   Elementos que deben existir en index.html:

   hud-vidas
   hud-puntos
   hud-tiempo
   aviso
   pantalla-inicio
   pantalla-pausa
   pantalla-fin
   fin-titulo
   fin-detalle
   btn-jugar
   btn-reiniciar
   ===================================================================== */

const ui = {
    vidas: document.getElementById('hud-vidas'),
    puntos: document.getElementById('hud-puntos'),
    tiempo: document.getElementById('hud-tiempo'),

    aviso: document.getElementById('aviso'),

    inicio: document.getElementById('pantalla-inicio'),
    pausa: document.getElementById('pantalla-pausa'),
    fin: document.getElementById('pantalla-fin'),

    finTitulo: document.getElementById('fin-titulo'),
    finDetalle: document.getElementById('fin-detalle')
};

// Actualiza vidas, puntos y tiempo en pantalla.
function actualizarHUD() {
    ui.vidas.textContent = vidas;

    // Los puntos se muestran con seis dígitos.
    ui.puntos.textContent =
        String(puntos).padStart(6, '0');

    ui.tiempo.textContent =
        Math.ceil(tiempoRestante);
}

let temporizadorAviso = null;

function mostrarAviso(texto) {
    ui.aviso.textContent = texto;

    ui.aviso.classList.remove('oculto');

    clearTimeout(temporizadorAviso);

    temporizadorAviso = setTimeout(() => {
        ui.aviso.classList.add('oculto');
    }, 1500);
}

// Botón para comenzar el juego.
const botonJugar =
    document.getElementById('btn-jugar');

botonJugar.disabled = false;

botonJugar.addEventListener(
    'click',
    iniciarJuego
);

// Botón para reiniciar después de terminar.
document.getElementById('btn-reiniciar')
    .addEventListener('click', iniciarJuego);

/* =====================================================================
   15. ESTADOS DEL JUEGO Y BUCLE PRINCIPAL

   Estados posibles:

   inicio -> jugando
   jugando <-> pausa
   jugando -> muriendo -> jugando
   muriendo -> gameover
   jugando -> victoria

   El bucle principal actualiza la lógica y dibuja la escena.
   ===================================================================== */

let estado = 'inicio';

let vidas = CONFIG.VIDAS_INICIALES;
let puntos = 0;
let tiempoRestante = CONFIG.TIEMPO_NIVEL;
let tiempoMuerte = 0;

// Inicia una partida nueva.
function iniciarJuego() {
    vidas = CONFIG.VIDAS_INICIALES;
    puntos = 0;
    tiempoRestante = CONFIG.TIEMPO_NIVEL;
    tiempoMuerte = 0;

    // El nivel se construye una vez por partida.
    construirNivel();

    reaparecerJugador();

    jugador.invulnerable = 0;

    camera.position.set(8, 4.5, 14);

    ui.inicio.classList.add('oculto');
    ui.fin.classList.add('oculto');
    ui.pausa.classList.add('oculto');
    ui.aviso.classList.add('oculto');

    estado = 'jugando';

    actualizarHUD();
}

// Pausa o reanuda el juego con la tecla P.
function alternarPausa() {
    if (estado === 'jugando') {
        estado = 'pausa';

        ui.pausa.classList.remove('oculto');

    } else if (estado === 'pausa') {
        estado = 'jugando';

        ui.pausa.classList.add('oculto');

        // Descarta el tiempo acumulado durante la pausa.
        reloj.getDelta();
    }
}

// Se ejecuta cuando Junimo llega a la bandera de meta.
function ganarNivel() {
    const bonus =
        Math.ceil(tiempoRestante) * 10;

    puntos += bonus;

    terminarJuego(true, bonus);
}

// Muestra la pantalla de victoria o derrota.
function terminarJuego(gano, bonus = 0) {
    estado = gano ? 'victoria' : 'gameover';

    actualizarHUD();

    ui.finTitulo.textContent = gano
        ? '¡NIVEL COMPLETADO!'
        : 'GAME OVER';

    ui.finDetalle.innerHTML = gano
        ? `Puntos: ${puntos}<br>Bono por tiempo: ${bonus}`
        : `Puntos: ${puntos}`;

    setTimeout(() => {
        ui.fin.classList.remove('oculto');
    }, gano ? 800 : 200);
}

/* =====================================================================
   BUCLE PRINCIPAL

   renderer.setAnimationLoop(animate) ejecuta la función
   aproximadamente 60 veces por segundo.

   dt (delta time) representa el tiempo transcurrido entre cuadros.

   Multiplicar las velocidades por dt permite mantener un movimiento
   similar en computadores rápidos y lentos.
   ===================================================================== */

const reloj = new THREE.Clock();

function animate() {
    const dt = Math.min(
        reloj.getDelta(),
        1 / 30
    );

    const tiempo = reloj.elapsedTime;

    if (estado === 'jugando') {

        actualizarJugador(dt);

        // Solo actualizamos enemigos si seguimos jugando.
        if (estado === 'jugando') {
            actualizarEnemigos(dt, tiempo);
        }

        if (estado === 'jugando') {
            tiempoRestante -= dt;

            if (tiempoRestante <= 0) {
                tiempoRestante = 0;
                perderVida(true);
            }
        }

    } else if (estado === 'muriendo') {

        actualizarMuerte(dt);
    }

    // Las animaciones se detienen durante la pausa.
    if (estado !== 'pausa') {
        actualizarParticulas(dt);
        animarNivel(dt, tiempo);
    }

    if (estado !== 'inicio') {
        actualizarCamara(dt);
        actualizarHUD();

    } else {

        // Movimiento suave de la cámara en el menú inicial.
        camera.position.set(
            10 + Math.sin(tiempo * 0.2) * 6,
            5,
            14
        );

        camera.lookAt(
            camera.position.x,
            3,
            0
        );

        moverSol();
    }

    renderer.render(scene, camera);
}

/* =====================================================================
   ARRANQUE DEL JUEGO
   ===================================================================== */

// Mostrar la pantalla inicial.
ui.inicio.classList.remove('oculto');

// Construir el mapa inicial.
construirNivel();

// Colocar a Junimo en su posición inicial.
reaparecerJugador();

// Sincronizar el modelo 3D.
actualizarModeloJugador(0);

// Iniciar el bucle de renderizado de Three.js.
renderer.setAnimationLoop(animate);