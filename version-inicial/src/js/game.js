/* ============================================================
   JUNIMO RUNNER - VERSION INICIAL 
   ============================================================ */

import * as THREE from 'three';


/* ============================================================
   1. CONFIGURACION
   ============================================================ */

const CONFIG = {
    GRAVEDAD: -32,
    VEL_CAMINAR: 6,
    VEL_CORRER: 9,
    ACELERACION: 40,
    FRICCION: 30,

    FUERZA_SALTO: 15,

    MULT_CAIDA: 1.6,
    REBOTE_PISADA: 0.75,
    CORTE_SALTO: 0.45,
    VEL_MAX_CAIDA: -20,

    TIEMPO_COYOTE: 0.1,
    BUFFER_SALTO: 0.12,

    VIDAS_INICIALES: 3,
    TIEMPO_NIVEL: 300,
    LIMITE_CAIDA: -5,

    VEL_ENEMIGO: 1.0,
    INVULNERABLE: 1.0,
    RADIO_BOLA: 0.4,

    G_RAMPA: 30,
    VEL_RODAR: 13,
    FRICCION_RODAR: 5
};


/* ============================================================
   2. MAPA 

   # = Suelo
   T = Tierra
   = = Plataforma
   B = Ladrillo
   G = Caja sorpresa
   U = Caja utilizada
   S = Piedra
   C = Columna
   L = Plataforma de madera

   E = Enemigo
   K = Checkpoint
   P = Inicio
   F = Meta
   ============================================================ */

const MAPA_NIVEL = [
  "",
  "",
  "                                               B                 B                                                                                       B",
  "                                                                                                                          B",
  "                                                                ",
  "                                              ===                   E                                                                                     E",
  "                                         E                 ############                                     BGB                                         ====",
  "                BGBGB                   ====       ====   #TTTTTTTTTTTT                                                  ====    S                    ",
  "                                                         #TTTTTTTTTTTTT                                                         SSS    C  C",
  "  P                        E                 E          #TTTTTTTTTTTTTT                 K                 E         E          SSSSS   CE C      E    E       E           F       ",
  "####################################  ##################TTTTTTTTTTTTTTT              ######### L LL L ##############################################################################"
];


// Bloques con colision
const SOLIDOS = new Set([
    "#", "T", "=", "B", "G", "U", "S", "C", "L"
]);


// Rampa
const RAMPAS = [
    {
        x0: 71,
        x1: 85,
        hIzq: 5,
        hDer: 1
    }
];


// Agua estanq
const ESTANQUES = [
    { x0: 36, x1: 38 },
    { x0: 94, x1: 102 }
];


/* ============================================================
   3. ESCENA, CAMARA Y RENDERIZADOR
   ============================================================ */

const COLOR_CIELO = 0x6ec6ff;

const scene = new THREE.Scene();

scene.background = new THREE.Color(COLOR_CIELO);
scene.fog = null;


// Camara 
const camera = new THREE.PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.1,
    300
);

camera.position.set(5, 5, 14);


// Render
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


// pantalla
window.addEventListener('resize', () => {

    renderer.setSize(
        window.innerWidth,
        window.innerHeight
    );

    camera.aspect =
        window.innerWidth / window.innerHeight;

    camera.updateProjectionMatrix();
});


/* ============================================================
   ILUMINACION
   ============================================================ */

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


/* ============================================================
   4. TEXTURAS
   ============================================================ */

// color para objetos 
const material = color =>
    new THREE.MeshLambertMaterial({ color });


// ruta imagenes
const RUTA_TEXTURAS = './src/img/texture/';

const textureLoader = new THREE.TextureLoader();


/* ============================================================
   CARGAR TEXTURAS
   ============================================================ */

function materialConTextura(
    archivos,
    colorRespaldo,
    opciones = {}
) {

    const materialBase =
        new THREE.MeshLambertMaterial({
            color: colorRespaldo,
            emissive: opciones.emissive || 0x000000
        });

    const nombres = Array.isArray(archivos)
        ? archivos
        : [archivos];


    function intentar(indice) {

        if (indice >= nombres.length) {

            console.warn(
                'No se encontro textura:',
                nombres.join(', ')
            );

            return;
        }

        textureLoader.load(
            RUTA_TEXTURAS + nombres[indice],

            textura => {

                textura.colorSpace =
                    THREE.SRGBColorSpace;

                textura.wrapS =
                    THREE.RepeatWrapping;

                textura.wrapT =
                    THREE.RepeatWrapping;

                textura.anisotropy = Math.min(
                    8,
                    renderer.capabilities
                        .getMaxAnisotropy()
                );


                // Mantener la imagen
                const ancho = textura.image.width;
                const alto = textura.image.height;

                const factorX = ancho > alto
                    ? alto / ancho
                    : 1;

                const factorY = alto > ancho
                    ? ancho / alto
                    : 1;


                textura.repeat.set(
                    factorX * (opciones.repetirX || 1),
                    factorY * (opciones.repetirY || 1)
                );


                materialBase.map = textura;
                materialBase.color.setHex(0xffffff);
                materialBase.needsUpdate = true;
            },

            undefined,

            () => intentar(indice + 1)
        );
    }

    intentar(0);

    return materialBase;
}


/* ============================================================
   CARGA DE MATERIALES
   ============================================================ */

// Pasto
const matPasto = materialConTextura(
    ['pasto.jpg', 'pasto.png'],
    0x48a942
);


// suelo
const matSueloLado = materialConTextura(
    'suelo-lado.jpg',
    0x94613c
);


// Tierra
const matTierra = materialConTextura(
    ['ground.jpg', 'tierra.png'],
    0x94613c
);


// Relleno de la parte de abajo
const matRelleno = materialConTextura(
    ['ground.jpg', 'tierra.png'],
    0x94613c,
    { repetirY: 4 }
);


// tierra lateral
const matTierraLado = materialConTextura(
    [
        'tierra-lado.png',
        'ground.jpg',
        'tierra.png'
    ],
    0x94613c
);


// Ladrillo
const matLadrillo = materialConTextura(
    ['ladrillo.jpg', 'caja.png'],
    0xb47742
);


// sorpresa
const matSorpresa = materialConTextura(
    ['sorpresa.png', 'sorpresa.jpg'],
    0xf5b62d,
    { emissive: 0x221100 }
);


// Bloque usados
const matUsado = materialConTextura(
    ['usado.jpg', 'vacio.png'],
    0x88898d
);


// Piedra
const matPiedra = materialConTextura(
    ['piedra.jpg', 'roca.png'],
    0x80858a
);


// Columna
const matColumna = materialConTextura(
    ['columna.jpg', 'pilar.png'],
    0x8d8680
);


// Tronco
const matTronco = materialConTextura(
    'tronco.png',
    0x79512f
);


/* ============================================================
   SUELO
   ============================================================ */

const carasSuelo = [
    matSueloLado,
    matSueloLado,
    matPasto,
    matTierra,
    matSueloLado,
    matSueloLado
];

/* ============================================================
   MATERIALES MAPA
   ============================================================ */

const MATERIALES = {

    suelo: carasSuelo,

    tierra: matRelleno,
    tierraBloque: matTierraLado,

    caja: matLadrillo,

    sorpresa: matSorpresa,
    usado: matUsado,

    roca: matPiedra,
    tronco: matTronco,

    agua: material(0x378ad6),

    rampaTierra: matTierra,
    rampaPasto: matSueloLado,
    rampaCima: matPasto
};

/* ============================================================
   GEOMETRIAS
   ============================================================ */

const GEO_BLOQUE =
    new THREE.BoxGeometry(1, 1, 1);

const GEO_TIERRA =
    new THREE.BoxGeometry(1, 4, 1);


// Gema de los bloques sorpresa.
const GEO_GEMA_SORPRESA =
    new THREE.OctahedronGeometry(0.27);

const MAT_GEMA_SORPRESA =
    new THREE.MeshPhongMaterial({
        color: 0x26c6da,
        emissive: 0x0b5560,
        shininess: 100
    });
/* ============================================================
   5. MODELOS 3D
   ============================================================ */

const R_CUERPO = 0.38;
const Y_CENTRO = 0.4;


/* ============================================================
   MODELO DEL JUGADOR 
   ============================================================ */

function crearModeloJugador() {

    const grupo = new THREE.Group();

    const cuerpoRot = new THREE.Group();

    cuerpoRot.position.y = Y_CENTRO;


    // Material verde
    const matJugador = material(0x18cf32);


    // esfera
    const geometriaJugador =
        new THREE.SphereGeometry(
            R_CUERPO,
            24,
            18
        );


    // Crear cuerpo
    const cuerpo = new THREE.Mesh(
        geometriaJugador,
        matJugador
    );

    cuerpo.castShadow = true;
    cuerpo.receiveShadow = true;


    // Añadir cuerpo al grupo giratorio
    cuerpoRot.add(cuerpo);


    // Añadir grupo giratorio al personaje
    grupo.add(cuerpoRot);


    // animacion
    grupo.userData = {
        cuerpoRot
    };


    return grupo;
}
/* ============================================================
ENEMIGO
   ============================================================ */

function crearModeloEnemigo() {

    const grupo = new THREE.Group();


    // Geometria enemigo
    const geometriaEnemigo =
        new THREE.SphereGeometry(
            0.35,
            20,
            16
        );


    // Material color rojo
    const matEnemigo = material(0xef2929);


    // esfera
    const esfera = new THREE.Mesh(
        geometriaEnemigo,
        matEnemigo
    );


    // altura correcta para los enemies
    esfera.position.y = 0.35;

    esfera.castShadow = true;
    grupo.add(esfera);


    return grupo;
}


/* ============================================================
   CREAR BANDERAS
   ============================================================ */

function crearBandera(color) {

    const grupo = new THREE.Group();


    // Poste
    const poste = new THREE.Mesh(

        new THREE.CylinderGeometry(
            0.045,
            0.045,
            2.5,
            10
        ),

        material(0xd5d9de)
    );


    poste.position.y = 1.25;

    poste.castShadow = true;

    grupo.add(poste);


    // triangulo de la bandera
    const forma = new THREE.Shape();

    forma.moveTo(0, 0);

    forma.lineTo(1.05, -0.3);

    forma.lineTo(0, -0.6);

    forma.closePath();


    // Material tela
    const materialTela =
        new THREE.MeshBasicMaterial({
            color: color,
            side: THREE.DoubleSide
        });


    // Crear bandera
    const tela = new THREE.Mesh(
        new THREE.ShapeGeometry(forma),
        materialTela
    );


    tela.position.set(
        0.05,
        2.4,
        0.15
    );


    grupo.add(tela);
    grupo.userData.tela = tela;

    return grupo;
}
/* ============================================================
   6. CONSTRUCCION DEL NIVEL
   ============================================================ */


// Grupo escenario
let grupoNivel = null;


// Bloques y objetos
let bloques = new Map();

let enemigos = [];

let particulas = [];


// Posicion inicial
let posicionInicial = {
    x: 2.5,
    y: 1
};


// Banderas
let puntoControl = null;

let banderaMeta = null;
const clave = (x, y) => x + "," + y;


/* ============================================================
   MAPA COMPLETO
   ============================================================ */

function construirNivel() {

    // Eliminar nivel anterior al reiniciar
    if (grupoNivel) {

        scene.remove(grupoNivel);
    }


    // Crear nuevo grupo del nivel
    grupoNivel = new THREE.Group();

    scene.add(grupoNivel);


    // Reiniciar elementos
    bloques = new Map();

    enemigos = [];

    particulas = [];

    puntoControl = null;

    banderaMeta = null;


    // Construir rampas
    RAMPAS.forEach(crearRampa);


    // Construir estanques 
    ESTANQUES.forEach(crearEstanque);


    // filas mapa
    const alto = MAPA_NIVEL.length;


    // Recorrer todas las filas
    MAPA_NIVEL.forEach((fila, y) => {

        const yMundo = alto - 1 - y;


        // Recorrer caracteres
        for (
            let index = 0;
            index < fila.length;
            index++
        ) {

            const elemento = fila[index];


            // Crear bloques 
            if (SOLIDOS.has(elemento)) {

                crearBloque(
                    index,
                    yMundo,
                    elemento
                );
            }


            // Crear enemigos
            else if (elemento === "E") {

                crearEnemigo(
                    index,
                    yMundo
                );
            }


            // Posicion inicial del jugador
            else if (elemento === "P") {

                posicionInicial = {
                    x: index + 0.5,
                    y: yMundo
                };
            }


            // Punto de control
            else if (elemento === "K") {

                const bandera =
                    crearBandera(0xffd23f);


                bandera.position.set(
                    index + 0.5,
                    yMundo,
                    0
                );


                grupoNivel.add(bandera);


                puntoControl = {
                    x: index + 0.5,
                    y: yMundo,
                    bandera: bandera,
                    activo: false
                };
            }


            // Meta 
            else if (elemento === "F") {

                const bandera =
                    crearBandera(0x28d950);


                bandera.position.set(
                    index + 0.5,
                    yMundo,
                    0
                );


                grupoNivel.add(bandera);


                banderaMeta = {
                    x: index + 0.5,
                    bandera: bandera
                };
            }
        }
    });
}


/* ============================================================
   CREAR BLOQUES CON TEXTURAS
   ============================================================ */

function crearBloque(x, y, tipo) {

    let materialBloque;


    /* --------------------------------------------------------
       ELEGIR MATERIAL SEGUN EL TIPO DE BLOQUE
       -------------------------------------------------------- */

    switch (tipo) {

        // Suelo con pasto
        case "#":

            materialBloque = MATERIALES.suelo;

            break;


        // Plataformas
        case "=":

            materialBloque = MATERIALES.suelo;

            break;


        // Tierra
        case "T":

            materialBloque =
                MATERIALES.tierraBloque;

            break;


        // Ladrillo
        case "B":

            materialBloque =
                MATERIALES.caja;

            break;


        // sorpresa
        case "G":

            materialBloque =
                MATERIALES.sorpresa;

            break;


        // Caja sorpresa usada
        case "U":

            materialBloque =
                MATERIALES.usado;

            break;


        // Piedra
        case "S":

            materialBloque =
                MATERIALES.roca;

            break;


        // Columna
        case "C":

            materialBloque =
                matColumna;

            break;


        // Tronco
        case "L":

            materialBloque =
                MATERIALES.tronco;

            break;


        // Material de respaldo
        default:

            materialBloque =
                MATERIALES.tierraBloque;

            break;
    }


    /* --------------------------------------------------------
       BLOQUE 3D
       -------------------------------------------------------- */

    const malla = new THREE.Mesh(
        GEO_BLOQUE,
        materialBloque
    );


    // Posicion del cubo
    malla.position.set(
        x + 0.5,
        y + 0.5,
        0
    );


    // Sombras
    malla.castShadow = true;

    malla.receiveShadow = true;


    // Añadir bloque al escenario
    grupoNivel.add(malla);

    bloques.set(
        clave(x, y),
        {
            x: x,
            y: y,
            tipo: tipo,
            malla: malla,
            rebote: 0
        }
    );

    if (tipo === "#" && y === 0) {

        const tierra = new THREE.Mesh(
            GEO_TIERRA,
            MATERIALES.tierra
        );


        tierra.position.set(
            x + 0.5,
            y - 2,
            0
        );


        tierra.receiveShadow = true;


        grupoNivel.add(tierra);
    }
}

/* ============================================================
   CREAR ENEMIGOS
   ============================================================ */

function crearEnemigo(x, y) {

    const malla = crearModeloEnemigo();


    // Añadir enemigo
    grupoNivel.add(malla);


    // datos movimiento
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

        malla: malla
    });
}

/* ============================================================
   RAMPA
   CALCULAR ALTURA DE RAMPA
   ============================================================ */

function alturaRampa(r, x) {

    // Posicion relativa entre 0 y 1
    const t = Math.min(
        1,
        Math.max(
            0,
            (x - r.x0) / (r.x1 - r.x0)
        )
    );


    // Funcion smoothstep. (crea una transicion suave entre los valores 0 y 1)
    const s = t * t * (3 - 2 * t);


    // Altura superf
    return (
        r.hIzq +
        (r.hDer - r.hIzq) * s
    );
}

/* ============================================================
   CALCULAR PENDIENTE DE LA RAMPA
   ============================================================ */

function pendienteRampa(r, x) {

    const t = Math.min(
        1,
        Math.max(
            0,
            (x - r.x0) / (r.x1 - r.x0)
        )
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

    // Cantidad de divisiones de la curva
    const N = 48;

    const puntos = [];
/*
       CALCULAR PUNTOS DE LA CURVA
       -------------------------------------------------------- */

    for (let i = 0; i <= N; i++) {

        const x =
            r.x0 +
            (r.x1 - r.x0) * i / N;


        puntos.push([
            x,
            alturaRampa(r, x)
        ]);
    }

    const formaTierra = new THREE.Shape();


    formaTierra.moveTo(
        r.x0,
        -4
    );


    puntos.forEach(([x, y]) => {

        formaTierra.lineTo(x, y);
    });


    formaTierra.lineTo(
        r.x1,
        -4
    );


    formaTierra.closePath();


    // Convertir volumen 3D
    const geoTierra =
        new THREE.ExtrudeGeometry(
            formaTierra,
            {
                depth: 1,
                bevelEnabled: false
            }
        );


    geoTierra.translate(
        0,
        0,
        -0.5
    );


    // Tierra textura
    const tierra = new THREE.Mesh(

        geoTierra,

        [
            MATERIALES.rampaTierra,
            MATERIALES.tierraBloque
        ]
    );


    tierra.receiveShadow = true;

    tierra.castShadow = true;


    grupoNivel.add(tierra);


    /* --------------------------------------------------------
       PASTO SOBRE LA RAMPA
       -------------------------------------------------------- */

    const formaPasto = new THREE.Shape();


    formaPasto.moveTo(
        puntos[0][0],
        puntos[0][1]
    );


    puntos.forEach(([x, y]) => {

        formaPasto.lineTo(x, y);
    });


    // Parte inferior de la franja
    for (let i = N; i >= 0; i--) {

        formaPasto.lineTo(
            puntos[i][0],
            puntos[i][1] - 0.35
        );
    }


    formaPasto.closePath();


    // Convertir franja en geo 3D
    const geoPasto =
        new THREE.ExtrudeGeometry(
            formaPasto,
            {
                depth: 1.02,
                bevelEnabled: false
            }
        );


    geoPasto.translate(
        0,
        0,
        -0.51
    );

    const pasto = new THREE.Mesh(

        geoPasto,

        [
            MATERIALES.rampaCima,
            MATERIALES.rampaPasto
        ]
    );


    pasto.receiveShadow = true;


    grupoNivel.add(pasto);
}
/* ============================================================
   ESTANQUES DEL NIVEL
   ============================================================ */

function crearEstanque(e) {

    // Ancho 
    const ancho =
        e.x1 - e.x0 - 0.02;


    // Geometria agua
    const geometriaAgua =
        new THREE.BoxGeometry(
            ancho,
            4.6,
            0.96
        );


    // Agua color
    const agua = new THREE.Mesh(

        geometriaAgua,

        MATERIALES.agua
    );


    // Colocar agua en el hueco
    agua.position.set(

        (e.x0 + e.x1) / 2,

        -1.7,

        0
    );


    // Añadir al escenario
    grupoNivel.add(agua);
}
/* ============================================================
   7. CONTROLES DEL TECLADO

   A / Flecha izquierda  = Mover a la izquierda
   D / Flecha derecha    = Mover a la derecha
   W / Flecha arriba     = Saltar
   Espacio               = Saltar
   Shift                 = Correr
   P                     = Pausar
   R                     = Reiniciar
   ============================================================ */

// Almacena las teclas
const teclas = {};


/* ============================================================
   DETECTAR CUANDO SE PRESIONA UNA TECLA
   ============================================================ */

window.addEventListener('keydown', (e) => {

    // Guardar la tecla presionada
    teclas[e.code] = true;


    // Evitar que las flechas y el espacio
    // desplacen la pagina del navegador
    if ([
        'Space',
        'ArrowUp',
        'ArrowDown',
        'ArrowLeft',
        'ArrowRight'
    ].includes(e.code)) {

        e.preventDefault();
    }
    /* --------------------------------------------------------
       buffer que permite recordar un salto
       durante una fraccion de segundo
       -------------------------------------------------------- */

    if (
        !e.repeat &&
        esTeclaSalto(e.code) &&
        estado === 'jugando'
    ) {

        jugador.bufferSalto =
            CONFIG.BUFFER_SALTO;
    }


    // Pausar o continuar el juego.
    if (e.code === 'KeyP' && !e.repeat) {

        alternarPausa();
    }


    // Reiniciar el juego.
    if (
        e.code === 'KeyR' &&
        !e.repeat &&
        estado !== 'inicio'
    ) {

        iniciarJuego();
    }

});

/* ============================================================
   DETECTAR CUANDO SE SUELTA UNA TECLA
   ============================================================ */

window.addEventListener('keyup', (e) => {

    teclas[e.code] = false;

});

// Teclas que permiten saltar
const esTeclaSalto = (code) => {

    return (
        code === 'Space' ||
        code === 'ArrowUp' ||
        code === 'KeyW'
    );
};


// Movimiento hacia la izquierda
const teclaIzquierda = () => {

    return (
        teclas['ArrowLeft'] ||
        teclas['KeyA']
    );
};


// Movimiento hacia la derecha
const teclaDerecha = () => {

    return (
        teclas['ArrowRight'] ||
        teclas['KeyD']
    );
};


// Comprobar si se mantiene salto
const teclaSaltoPresionada = () => {

    return (
        teclas['Space'] ||
        teclas['ArrowUp'] ||
        teclas['KeyW']
    );
};


// Tecla para correr
const teclaCorrer = () => {

    return (
        teclas['ShiftLeft'] ||
        teclas['ShiftRight']
    );
};

/* ============================================================
   8. FISICA Y COLISIONES
   Las colisiones las calcula primero en X
   y despues en Y
   ============================================================ */

function obtenerBloque(tx, ty) {

    // Buscar el bloque utilizando su posicion
    return bloques.get(
        clave(tx, ty)
    ) || null;
}

function bloquesQueToca(ent, holgura = 0.001) {

    const resultado = [];


    // Lim izquierdo
    const izquierda = Math.floor(
        ent.x - ent.ancho / 2
    );


    // Lim derecho
    const derecha = Math.floor(
        ent.x + ent.ancho / 2 - 0.001
    );


    // Lim inferior
    const abajo = Math.floor(
        ent.y + holgura
    );


    // Lim superior
    const arriba = Math.floor(
        ent.y + ent.alto - 0.001
    );
//revisar bloques en el area o dentro del area 
    for (
        let tx = izquierda;
        tx <= derecha;
        tx++
    ) {

        for (
            let ty = abajo;
            ty <= arriba;
            ty++
        ) {

            const bloque =
                obtenerBloque(tx, ty);


            // guarda si hay un bloque
            if (bloque) {

                resultado.push(bloque);
            }
        }
    }


    return resultado;
}
//entidades
function moverEntidad(
    ent,
    dt,
    alGolpearTecho
) {

    ent.chocoPared = false;


//Movimiento horizontal

    // Actualizar posicion horizontal
    ent.x += ent.vx * dt;


    // Detectar bloques cercanos
    let choques = bloquesQueToca(

        ent,

        ent.enRampaAntes
            ? 0.12
            : 0.001
    );


    // Comprobar choque horizontal
    if (choques.length > 0) {

        // Movimiento hacia la derecha
        if (ent.vx > 0) {

            ent.x = Math.min(
                ...choques.map(b => b.x)
            ) - ent.ancho / 2 - 0.001;
        }


        // Movimiento hacia la izquierda
        else if (ent.vx < 0) {

            ent.x = Math.max(
                ...choques.map(b => b.x)
            ) + 1 + ent.ancho / 2 + 0.001;
        }


        // Detener movimiento horizontal
        ent.vx = 0;

        ent.chocoPared = true;
    }
//Mov vertical
    // Aplicar movimiento vertical
    ent.y += ent.vy * dt;


    // Se comprueba nuevamente si toca el suelo
    ent.enSuelo = false;


    // Detectar bloques
    choques = bloquesQueToca(ent);


    if (choques.length > 0) {

// Colision cuando cae

        if (ent.vy < 0) {

            ent.y = Math.max(
                ...choques.map(b => b.y)
            ) + 1;


            ent.enSuelo = true;
        }

// colision cuando sube 

        else if (ent.vy > 0) {

            ent.y = Math.min(
                ...choques.map(b => b.y)
            ) - ent.alto - 0.001;


            // Activar la funcion de golpe
            if (alGolpearTecho) {

                alGolpearTecho(choques);
            }
        }


        // Detener movimiento vertical
        ent.vy = 0;
    }
}



  // COLISION CON RAMPAS

function resolverRampa(ent, dt) {

    ent.enRampa = false;

    ent.pendiente = 0;
    const r = rampaEn(ent.x);

    if (!r) {

        return;
    }


    // Calcular la pendiente
    const pendiente =
        pendienteRampa(r, ent.x);


//calculo de altura de apoyo

    const yApoyo =

        alturaRampa(r, ent.x) +

        CONFIG.RADIO_BOLA *

        (
            Math.sqrt(
                1 + pendiente * pendiente
            ) - 1
        );

    // margen de contacto 

    const margen = ent.enRampaAntes

        ? 0.08 +
          Math.abs(pendiente * ent.vx) *
          dt * 1.5

        : 0.02;
//contacto con la rampa
    if (
        ent.vy <= 0 &&
        ent.y <= yApoyo + margen
    ) {

        // Colocar sobre la superficie
        ent.y = yApoyo;


        // Detener caida
        ent.vy = 0;


        // Marcar contacto con el suelo
        ent.enSuelo = true;

        ent.enRampa = true;


        // Guardar pendiente
        ent.pendiente = pendiente;
    }
}

function seSuperponen(a, b) {

    return (

        Math.abs(a.x - b.x) <
        (a.ancho + b.ancho) / 2 &&

        a.y < b.y + b.alto &&

        a.y + a.alto > b.y

    );
}

/* ============================================================
   9. LADRILLOS Y CAJAS SORPRESA

   B = Ladrillo que se destruye
   G = Caja sorpresa con gema
   U = Caja sorpresa utilizada
   ============================================================ 
   GOLPEAR UN BLOQUE DESDE ABAJO
   ============================================================ */

function golpearBloque(listaBloques) {

    // Evitar operaciones sobre una lista vacia
    if (
        !listaBloques ||
        listaBloques.length === 0
    ) {

        return;
    }

    const bloque = listaBloques.reduce(

        (mejor, actual) => {

            const distanciaActual =
                Math.abs(
                    actual.x + 0.5 - jugador.x
                );

            const distanciaMejor =
                Math.abs(
                    mejor.x + 0.5 - jugador.x
                );


            return distanciaActual < distanciaMejor
                ? actual
                : mejor;
        }
    );

    /* --------------------------------------------------------
       CASO 1: LADRILLO NORMAL

       Se rompe y entrega 50 puntos.
       -------------------------------------------------------- */

    if (bloque.tipo === 'B') {

        destruirBloque(bloque);
    }


    /* --------------------------------------------------------
       CASO 2: CAJA SORPRESA

       La caja entrega una gema azul.
       -------------------------------------------------------- */

    else if (bloque.tipo === 'G') {

        // Cambiar el tipo de bloque
        bloque.tipo = 'U';


        // Cambiar la textura
        bloque.malla.material =
            MATERIALES.usado;


        // Mantener la caja en el mapa de colisiones
        bloques.set(
            clave(bloque.x, bloque.y),
            bloque
        );


        // Animacion de golpe
        bloque.rebote = 0.18;


        // Crear gema azul
        lanzarGemaSorpresa(
            bloque.x,
            bloque.y
        );


        // Recompensa por golpear la caja
        puntos += 100;


        // Mostrar aviso
        mostrarAviso(
            '¡GEMA SORPRESA! +100'
        );
    }
    /* --------------------------------------------------------
       CASO 3: CAJA YA USADA
       -------------------------------------------------------- */

    else if (bloque.tipo === 'U') {

        bloque.rebote = 0.08;
    }
    /* --------------------------------------------------------
       CASO 4: OTROS BLOQUES REBOTE VISUAL )
       -------------------------------------------------------- */

    else {

        bloque.rebote = 0.1;
    }

    /* --------------------------------------------------------
       ENEMIGOS ENCIMA DEL BLOQUE

       Si Junimo golpea una caja desde abajo,
       un enemigo situado encima recibe el golpe  y muere xd
       -------------------------------------------------------- */

    enemigos.forEach(en => {

        if (
            en.vivo &&

            Math.floor(en.x) === bloque.x &&

            Math.abs(
                en.y - (bloque.y + 1)
            ) < 0.1
        ) {

            derrotarEnemigo(
                en,
                100
            );
        }
    });
}
/* ============================================================
   DESTRUIR LADRILLOS
   ============================================================ */

function destruirBloque(bloque) {

    // Eliminar bloque visualmente
    grupoNivel.remove(
        bloque.malla
    );


    // Eliminar bloque del mapa
    bloques.delete(
        clave(bloque.x, bloque.y)
    );


    /* --------------------------------------------------------
       FRAGMENTO DE LADRILLO
       -------------------------------------------------------- */

    crearParticulas(

        bloque.x + 0.5,

        bloque.y + 0.5,

        MATERIALES.caja,

        8
    );


    // Sumar puntos
    puntos += 50;
}


/* ============================================================
   GEMA SORPRESA
   ============================================================ */

function lanzarGemaSorpresa(x, y) {

    /* --------------------------------------------------------
       CREAR MODELO 3D DE LA GEMA
       -------------------------------------------------------- */

    const gema = new THREE.Mesh(

        GEO_GEMA_SORPRESA,

        MAT_GEMA_SORPRESA
    );


    // Posicion inicial 
    gema.position.set(

        x + 0.5,

        y + 1.35,

        0.25
    );


    // Permitir iluminación
    gema.castShadow = true;


    // Agregar gema al nivel
    grupoNivel.add(gema);


    /* --------------------------------------------------------
       ANIMACION DE LA GEMA
       -------------------------------------------------------- */

    particulas.push({

        malla: gema,

        vx: 0,

        vy: 7,

        vz: 0,

        vida: 1.4,

        gira: 5,

        gravedad: -16
    });
}
/* ============================================================
   10. JUGADOR

   x, y: posicion
   vx, vy: velocidad
   enSuelo: indica si toca el terreno
   invulnerable: tiempo de proteccion despues de morir
   ============================================================ */

const jugador = {

    // Posicion inicial
    x: 0,
    y: 0,

    // Velocidades
    vx: 0,
    vy: 0,

    // Dimensiones para las colisiones
    ancho: CONFIG.RADIO_BOLA * 2,
    alto: CONFIG.RADIO_BOLA * 2,

    // Estado del movimiento
    enSuelo: false,

    // Direccion del personaje
    mirando: 1,

    // Tiempo permitido para saltar al salir de un borde
    tiempoCoyote: 0,

    // Guarda solicitud de salto
    bufferSalto: 0,

    // Indica si esta saltando
    saltando: false,

    // Proteccion temporal despues de recibir daño
    invulnerable: 0,

    // animacion
    tiempoAnimacion: 0,
    aplastar: 0,

    // Propiedad de la rampa
    enRampa: false,
    enRampaAntes: false,
    pendiente: 0,

    // Indica si esta rodando
    rodando: false,
    malla: crearModeloJugador()
};


// Agregar personaje a la escena
scene.add(jugador.malla);


/* ============================================================
   REAPARECER JUGADOR

   Si Junimo no ha activado una bandera de control,
   vuelve a la posicion inicial

   Si activo un checkpoint, reaparece alli en el checkpoint
   ============================================================ */

function reaparecerJugador() {

    // Elegir la posicion de reaparicion
    const inicio = (
        puntoControl && puntoControl.activo
    )
        ? puntoControl
        : posicionInicial;


    // Restaurar posicion
    jugador.x = inicio.x;
    jugador.y = inicio.y;


    // Detener velocidades
    jugador.vx = 0;
    jugador.vy = 0;


    // Restaurar direccion
    jugador.mirando = 1;


    // Reiniciar salto
    jugador.enSuelo = false;
    jugador.saltando = false;

    jugador.tiempoCoyote = 0;
    jugador.bufferSalto = 0;


    // Reiniciar movimiento sobre rampas
    jugador.enRampa = false;
    jugador.enRampaAntes = false;

    jugador.pendiente = 0;
    jugador.rodando = false;


    // Restaurar animaciones
    jugador.tiempoAnimacion = 0;
    jugador.aplastar = 0;


    // Proteccion temporal
    jugador.invulnerable =
        CONFIG.INVULNERABLE;


    // Restaurar giro del personaje
    jugador.malla.rotation.set(0, 0, 0);

    jugador.malla.userData.cuerpoRot.rotation.z = 0;


    // Actualizar posicion visual
    jugador.malla.position.set(
        jugador.x,
        jugador.y,
        0
    );

    jugador.malla.visible = true;
}


/* ============================================================
   ACTUALIZAR JUGADOR

   Esta funcion se ejecutara en cada fotograma

   dt representa el tiempo entre fotogramas.
   ============================================================ */

function actualizarJugador(dt) {

    const j = jugador;


    // Guardar si estaba en una rampa
    j.enRampaAntes = j.enRampa;


    /* ========================================================
       PASO 1. MOVIMIENTO HORIZONTAL

       flecha izquierda = -1
       flecha derecha = +1
       Sin pulsar teclas = 0
       ======================================================== */

    let direccion = 0;


    // Movimiento hacia la izquierda
    if (teclaIzquierda()) {

        direccion -= 1;
    }


    // Movimiento hacia la derecha
    if (teclaDerecha()) {

        direccion += 1;
    }


    /* ========================================================
       PASO 2. VELOCIDAD MAXIMA

       Caminar 6 unidades/segundo
       Correr 9 unidades/segundo
       ======================================================== */

    const velocidadMaxima = teclaCorrer()
        ? CONFIG.VEL_CORRER
        : CONFIG.VEL_CAMINAR;


    // Si esta rodando puede alcanzar mayor velocidad
    const limite = j.rodando
        ? CONFIG.VEL_RODAR
        : velocidadMaxima;


    /* ========================================================
       PASO 3. ACELERACION EN LAS RAMPAS
       ======================================================== */

    if (j.enRampaAntes) {

        j.vx -=
            j.pendiente *
            CONFIG.G_RAMPA *
            dt;
    }


    /* ========================================================
       PASO 4. ACELERAR CUANDO SE PULSA UNA DIRECCION
       ======================================================== */

    if (direccion !== 0) {

        j.vx +=
            direccion *
            CONFIG.ACELERACION *
            dt;


        // Guardar hacia donde mira
        j.mirando = direccion;
    }


    /* ========================================================
       PASO 5. FRICCION

       Si no se presiona ninguna tecla y no esta
       sobre una rampa el jugador reduce su velocidad
       ======================================================== */

    else if (!j.enRampaAntes) {

        const freno = (

            j.rodando
                ? CONFIG.FRICCION_RODAR
                : CONFIG.FRICCION

        ) * dt;


        if (Math.abs(j.vx) <= freno) {

            j.vx = 0;

        } else {

            j.vx -=
                Math.sign(j.vx) * freno;
        }
    }


    /* ========================================================
       PASO 6. LIMITAR VELOCIDAD HORIZONTAL
       ======================================================== */

    j.vx = Math.max(

        -limite,

        Math.min(
            limite,
            j.vx
        )
    );


    /* ========================================================
       PASO 7. TIEMPO COYOTE

       Permite saltar durante un instante despues
       de abandonar el borde de una plataforma
       ======================================================== */

    if (j.enSuelo) {

        j.tiempoCoyote =
            CONFIG.TIEMPO_COYOTE;

    } else {

        j.tiempoCoyote -= dt;
    }


    /* ========================================================
       PASO 8. BUFFER DE SALTO

       Guarda la pulsacion del salto
       ======================================================== */

    j.bufferSalto -= dt;


    /* ========================================================
       PASO 9. EJECUTAR EL SALTO
       ======================================================== */

    if (
        j.bufferSalto > 0 &&
        j.tiempoCoyote > 0
    ) {

        // Aplicar velocidad vertical hacia arriba
        j.vy = CONFIG.FUERZA_SALTO;


        // Consumir solicitud de salto
        j.bufferSalto = 0;

        // Evitar repetir el salto en el aire
        j.tiempoCoyote = 0;


        j.saltando = true;
        j.enSuelo = false;
        j.enRampa = false;
    }


    /* ========================================================
       PASO 10. CONTROLAR ALTURA DEL SALTO
       ======================================================== */

    if (
        j.saltando &&
        !teclaSaltoPresionada() &&
        j.vy > 0
    ) {

        j.vy *= CONFIG.CORTE_SALTO;

        j.saltando = false;
    }


    // Cuando comienza a caer termina el impulso de salto
    if (j.vy <= 0) {

        j.saltando = false;
    }


    /* ========================================================
       PASO 11. APLICAR GRAVEDAD
gravedad mayor cuando cae 
       ======================================================== */

    const gravedad = j.vy < 0

        ? CONFIG.GRAVEDAD * CONFIG.MULT_CAIDA

        : CONFIG.GRAVEDAD;


    // Formula:
    // velocidad = velocidad anterior + gravedad * tiempo

    j.vy += gravedad * dt;


    /* ========================================================
       PASO 12. LIMITAR VELOCIDAD DE CAIDA
       ======================================================== */

    j.vy = Math.max(

        j.vy,

        CONFIG.VEL_MAX_CAIDA
    );


    /* ========================================================
       PASO 13. DETECTAR COLISIONES
       ======================================================== */

    const estabaEnSuelo = j.enSuelo;

    const velocidadVerticalAnterior = j.vy;


    /* ========================================================
       PASO 14. MOVER AL JUGADOR
       ======================================================== */

    moverEntidad(

        j,

        dt,

        golpearBloque
    );


    /* ========================================================
       PASO 15. LIMITAR BORDE IZQUIERD
       ======================================================== */

    if (j.x < j.ancho / 2) {

        j.x = j.ancho / 2;

        j.vx = 0;
    }


    /* ========================================================
       PASO 16. CONTACTO CON RAMPAS
       ======================================================== */

    resolverRampa(j, dt);


    /* ========================================================
       PASO 17. ANIMACION DE ATERRIZAJE
       ======================================================== */

    if (
        !estabaEnSuelo &&
        j.enSuelo
    ) {

        j.aplastar = Math.min(

            0.3,

            Math.abs(
                velocidadVerticalAnterior
            ) * 0.015
        );
    }


    /* ========================================================
       PASO 18. RODAR SOBRE LAS RAMPAS

       Si el jugador se desplaza por la rampa baja rodando
       ======================================================== */

    if (
        j.enRampa &&
        Math.abs(j.pendiente) > 0.08 &&
        j.vx * j.pendiente < 0
    ) {

        j.rodando = true;
    }


    // Dejar de rodar cuando pierde velocidad
    else if (
        j.enSuelo &&
        Math.abs(j.vx) < CONFIG.VEL_CAMINAR
    ) {

        j.rodando = false;
    }


    /* ========================================================
       PASO 19. DETECTAR CAIDA AL VACIO
       ======================================================== */

    if (j.y < CONFIG.LIMITE_CAIDA) {

        perderVida(false);

        return;
    }


    /* ========================================================
       PASO 20. ACTIVAR PUNTO DE CONTROL

       Al alcanzar la bandera amarilla, se activa el checkpoint.
       Bandera cambia a verde.
       Guarda la posicion para reaparecer.
       ======================================================== */

    if (
        puntoControl &&
        !puntoControl.activo &&
        j.x >= puntoControl.x
    ) {

        puntoControl.activo = true;


        // Cambiar bandera a verde
        puntoControl.bandera.userData.tela
            .material.color.set(0x28d950);


        // mensaje
        mostrarAviso(
            '¡PUNTO DE CONTROL!'
        );
    }


    /* ========================================================
       PASO 21. DETECTAR LA META

       Si llega a la bandera final,
       se completa el nivel.
       ======================================================== */

    if (
        banderaMeta &&
        j.x >= banderaMeta.x - 0.2
    ) {

        ganarNivel();

        return;
    }


    /* ========================================================
       PASO 22. INVULNERABILIDAD

       Despues de reaparecer Junimo tiene
       proteccion durante un tiempo.
       ======================================================== */

    if (j.invulnerable > 0) {

        j.invulnerable = Math.max(
            0,
            j.invulnerable - dt
        );
    }


    /* ========================================================
       PASO 23. ACTUALIZAR MODELO VISUAL
       ======================================================== */

    actualizarModeloJugador(dt);
}


/* ============================================================
   ANIMACION DE JUNIMO

   La esfera gira de acuerdo con su desplazamiento.

   El efecto visual no modifica las colisiones.
   ============================================================ */

function actualizarModeloJugador(dt) {

    const j = jugador;

    const m = j.malla;


    // Actualizar posicion tridimensional.
    m.position.set(
        j.x,
        j.y,
        0
    );


    /* ========================================================
       RODAMIENTO

       Formula:

       angulo = distancia / radio

       distancia = velocidad * tiempo
       ======================================================== */

    m.userData.cuerpoRot.rotation.z -=

        j.vx * dt / R_CUERPO;


    /* ========================================================
       PARPADEO DE INVULNERABILIDAD

       Junimo parpadea brevemente despues
       de perder una vida y reaparecer.
       ======================================================== */

    if (j.invulnerable > 0) {

        m.visible =

            Math.floor(
                j.invulnerable * 12
            ) % 2 === 0;

    } else {

        m.visible = true;
    }
}


/* ============================================================
   SISTEMA DE VIDAS

   Cuando Junimo recibe daño:
   - Pierde una vida.
   - Se activa el estado de muerte.
   - Comienza la animacion.
   ============================================================ */

function perderVida(conAnimacion) {

    // Evitar perder varias vidas simultaneamente.
    if (estado !== 'jugando') {

        return;
    }


    // Restar una vida.
    vidas--;


    // Cambiar estado del juego.
    estado = 'muriendo';


    // Duracion de la animacion.
    tiempoMuerte = 1.4;


    // Asegurar que Junimo sea visible.
    jugador.malla.visible = true;


    /* ========================================================
       ANIMACION DE MUERTE

       Si recibe daño de un enemigo, salta antes de caer.

       Si cae al vacio, no necesita ese impulso.
       ======================================================== */

    jugador.vy = conAnimacion
        ? 12
        : 0;


    jugador.vx = 0;


    // Cancelar salto y rodamiento.
    jugador.saltando = false;
    jugador.rodando = false;
}


/* ============================================================
   ACTUALIZAR ANIMACION DE MUERTE

   Se llama desde el bucle principal.

   Cuando termina:
   - Si tiene vidas, reaparece.
   - Si no tiene vidas, termina la partida.
   ============================================================ */

function actualizarMuerte(dt) {

    // Reducir tiempo de animacion.
    tiempoMuerte -= dt;


    /* ========================================================
       APLICAR GRAVEDAD DURANTE LA MUERTE
       ======================================================== */

    jugador.vy +=
        CONFIG.GRAVEDAD * dt;


    // Actualizar posicion vertical.
    jugador.y +=
        jugador.vy * dt;


    /* ========================================================
       ACTUALIZAR POSICION VISUAL
       ======================================================== */

    jugador.malla.position.set(

        jugador.x,

        jugador.y,

        0
    );


    /* ========================================================
       GIRAR AL PERSONAJE MIENTRAS CAE
       ======================================================== */

    jugador.malla.rotation.z +=
        dt * 8;


    /* ========================================================
       FINALIZAR ANIMACION DE MUERTE
       ======================================================== */

    if (tiempoMuerte <= 0) {

        /* ----------------------------------------------------
           CASO 1: NO QUEDAN VIDAS

           Mostrar pantalla Game Over.
           ---------------------------------------------------- */

        if (vidas <= 0) {

            terminarJuego(false);
        }


        /* ----------------------------------------------------
           CASO 2: TODAVIA QUEDAN VIDAS

           Reaparecer en el inicio o checkpoint.
           ---------------------------------------------------- */

        else {

            // Reposicionar a Junimo.
            reaparecerJugador();


            // Reiniciar temporizador como en el original.
            tiempoRestante =
                CONFIG.TIEMPO_NIVEL;


            // Volver al estado de juego.
            estado = 'jugando';
        }
    }
}


/* =============== FIN PARTE 4 =============== */
/* ============================================================
   JUNIMO RUNNER - VERSION INICIAL CON TEXTURAS
   PARTE 5 DE 5

   11. ENEMIGOS
   12. PARTICULAS Y ANIMACIONES
   13. CAMARA
   14. INTERFAZ DEL JUEGO
   15. ESTADOS Y BUCLE PRINCIPAL

   Esta parte completa el funcionamiento del videojuego.
   ============================================================ */


/* ============================================================
   11. ACTUALIZACION DE ENEMIGOS

   Los enemigos:
   - Caminan automaticamente.
   - Cambian de direccion al encontrar una pared.
   - Cambian de direccion al llegar a un borde.
   - Pueden ser derrotados saltando sobre ellos.
   - Quitan una vida si golpean a Junimo lateralmente.
   ============================================================ */

function actualizarEnemigos(dt, tiempo) {

    enemigos.forEach(en => {

        /* ----------------------------------------------------
           ENEMIGO DERROTADO
           ---------------------------------------------------- */

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


        /* ----------------------------------------------------
           ACTIVAR SOLO ENEMIGOS CERCANOS

           Evita actualizar enemigos que estan
           demasiado lejos de Junimo.
           ---------------------------------------------------- */

        if (
            Math.abs(en.x - jugador.x) > 18
        ) {

            return;
        }


        /* ----------------------------------------------------
           MOVIMIENTO DEL ENEMIGO
           ---------------------------------------------------- */

        en.vx =
            en.direccion *
            CONFIG.VEL_ENEMIGO;


        // Aplicar gravedad.
        en.vy += CONFIG.GRAVEDAD * dt;


        // Limitar velocidad de caida.
        en.vy = Math.max(
            en.vy,
            CONFIG.VEL_MAX_CAIDA
        );


        // Resolver movimiento y colisiones.
        moverEntidad(en, dt);


        /* ----------------------------------------------------
           DETECTAR PAREDES Y BORDES
           ---------------------------------------------------- */

        let cambiarDireccion = en.chocoPared;


        // Revisar si hay suelo delante del enemigo.
        if (en.enSuelo) {

            const pieDelantero = Math.floor(

                en.x +

                en.direccion *

                (en.ancho / 2 + 0.05)
            );


            const sueloDelantero = obtenerBloque(

                pieDelantero,

                Math.floor(en.y - 0.1)
            );


            // Si no hay suelo, debe girar.
            if (!sueloDelantero) {

                cambiarDireccion = true;
            }
        }


        /* ----------------------------------------------------
           CAMBIAR DIRECCION
           ---------------------------------------------------- */

        if (cambiarDireccion) {

            en.direccion *= -1;
        }


        // Evitar salir por el borde izquierdo.
        if (en.x < en.ancho / 2) {

            en.x = en.ancho / 2;

            en.direccion = 1;
        }


        /* ----------------------------------------------------
           ENEMIGO QUE CAE AL VACIO
           ---------------------------------------------------- */

        if (en.y < CONFIG.LIMITE_CAIDA) {

            en.vivo = false;

            en.tiempoMuerto = 0;

            grupoNivel.remove(en.malla);

            return;
        }


        /* ----------------------------------------------------
           ACTUALIZAR POSICION DEL MODELO 3D
           ---------------------------------------------------- */

        en.malla.position.set(
            en.x,
            en.y,
            0
        );


        // Animacion de movimiento.
        en.malla.scale.set(

            en.direccion,

            1 + Math.sin(tiempo * 8) * 0.04,

            1
        );


        /* ----------------------------------------------------
           COLISION ENTRE JUNIMO Y EL ENEMIGO
           ---------------------------------------------------- */

        if (estado !== 'jugando') {

            return;
        }


        const radioJugador =
            CONFIG.RADIO_BOLA;

        const radioEnemigo = 0.36;


        // Distancia horizontal.
        const dx = jugador.x - en.x;


        // Distancia vertical entre centros.
        const dy =

            (jugador.y + radioJugador) -

            (en.y + 0.32);


        // Distancia al cuadrado.
        const distanciaCuadrada =

            dx * dx +

            dy * dy;


        // Suma de los radios.
        const radioTotal =

            radioJugador +

            radioEnemigo;


        /* ----------------------------------------------------
           COMPROBAR CONTACTO
           ---------------------------------------------------- */

        if (
            distanciaCuadrada <
            radioTotal * radioTotal
        ) {

            /* ------------------------------------------------
               JUNIMO CAE ENCIMA DEL ENEMIGO

               El enemigo es derrotado.
               Junimo recibe un impulso hacia arriba.
               ------------------------------------------------ */

            if (
                jugador.vy < 0 &&
                dy > 0.1
            ) {

                derrotarEnemigo(
                    en,
                    200
                );


                // Rebote despues de derrotar enemigo.
                jugador.vy =

                    CONFIG.FUERZA_SALTO *

                    CONFIG.REBOTE_PISADA;


                jugador.saltando =
                    teclaSaltoPresionada();
            }


            /* ------------------------------------------------
               JUNIMO TOCA AL ENEMIGO DE LADO

               Pierde una vida si no es invulnerable.
               ------------------------------------------------ */

            else if (
                jugador.invulnerable <= 0
            ) {

                perderVida(true);
            }
        }
    });
}


/* ============================================================
   DERROTAR ENEMIGO

   El enemigo desaparece y entrega puntos.
   ============================================================ */

function derrotarEnemigo(
    en,
    puntosGanados
) {

    // Evitar entregar puntos repetidos.
    if (!en.vivo) {

        return;
    }


    // Cambiar estado.
    en.vivo = false;


    // Tiempo de animacion.
    en.tiempoMuerto = 0.5;


    // Aplastar visualmente.
    en.malla.scale.set(
        1.2,
        0.25,
        1.2
    );


    // Sumar recompensa.
    puntos += puntosGanados;
}


/* ============================================================
   12. PARTICULAS Y ANIMACIONES

   Cuando se rompe un ladrillo aparecen fragmentos
   que utilizan el material del bloque.

   Tambien actualizamos las gemas sorpresa creadas
   desde la Parte 3.
   ============================================================ */


/* ============================================================
   GEOMETRIA DE LOS FRAGMENTOS

   Los fragmentos son cubos pequeños.
   ============================================================ */

const GEO_PEDAZO =
    new THREE.BoxGeometry(
        0.25,
        0.25,
        0.25
    );


/* ============================================================
   CREAR PARTICULAS

   Parametros:

   x, y     = Posicion inicial
   material = Material del bloque
   cantidad = Numero de fragmentos
   ============================================================ */

function crearParticulas(
    x,
    y,
    materialParticula,
    cantidad
) {

    for (
        let i = 0;
        i < cantidad;
        i++
    ) {

        /* ----------------------------------------------------
           CREAR FRAGMENTO
           ---------------------------------------------------- */

        const malla = new THREE.Mesh(

            GEO_PEDAZO,

            materialParticula
        );


        // Posicion inicial.
        malla.position.set(
            x,
            y,
            0
        );


        // Añadir al escenario.
        grupoNivel.add(malla);


        /* ----------------------------------------------------
           GUARDAR MOVIMIENTO DE LA PARTICULA
           ---------------------------------------------------- */

        particulas.push({

            malla: malla,


            // Velocidad horizontal aleatoria.
            vx: (Math.random() - 0.5) * 6,


            // Velocidad vertical.
            vy: 5 + Math.random() * 5,


            // Velocidad en profundidad.
            vz: (Math.random() - 0.5) * 6,


            // Duracion de la particula.
            vida: 1.2,


            // Velocidad de giro.
            gira: 10,


            // Gravedad.
            gravedad: CONFIG.GRAVEDAD
        });
    }
}


/* ============================================================
   ACTUALIZAR PARTICULAS Y GEMAS

   Esta funcion sirve para:
   - Fragmentos de ladrillo.
   - Gemas de cajas sorpresa.

   Todas las particulas comparten:
   vx, vy, vz, vida, gira y gravedad.
   ============================================================ */

function actualizarParticulas(dt) {

    /* --------------------------------------------------------
       RECORRER PARTICULAS DE ATRAS HACIA ADELANTE

       Esto permite eliminarlas sin alterar
       el recorrido del arreglo.
       -------------------------------------------------------- */

    for (
        let i = particulas.length - 1;
        i >= 0;
        i--
    ) {

        const p = particulas[i];


        /* ----------------------------------------------------
           APLICAR GRAVEDAD
           ---------------------------------------------------- */

        p.vy += p.gravedad * dt;


        /* ----------------------------------------------------
           ACTUALIZAR POSICIONES
           ---------------------------------------------------- */

        p.malla.position.x +=
            p.vx * dt;


        p.malla.position.y +=
            p.vy * dt;


        p.malla.position.z +=
            p.vz * dt;


        /* ----------------------------------------------------
           ANIMAR ROTACION
           ---------------------------------------------------- */

        p.malla.rotation.x +=
            p.gira * dt;


        p.malla.rotation.y +=
            p.gira * dt;


        /* ----------------------------------------------------
           DISMINUIR TIEMPO DE VIDA
           ---------------------------------------------------- */

        p.vida -= dt;


        /* ----------------------------------------------------
           ELIMINAR PARTICULAS CUANDO TERMINAN
           ---------------------------------------------------- */

        if (p.vida <= 0) {

            grupoNivel.remove(
                p.malla
            );


            particulas.splice(
                i,
                1
            );
        }
    }
}


/* ============================================================
   ANIMAR BLOQUES Y BANDERAS

   Los bloques se mueven brevemente cuando reciben
   un golpe desde abajo.

   La bandera final ondea ligeramente.
   ============================================================ */

function animarNivel(dt, tiempo) {

    /* --------------------------------------------------------
       ANIMACION DE LOS BLOQUES
       -------------------------------------------------------- */

    bloques.forEach(b => {

        if (b.rebote > 0) {

            b.rebote -= dt;


            // Movimiento vertical del bloque.
            b.malla.position.y =

                b.y + 0.5 +

                Math.sin(

                    Math.max(
                        0,
                        b.rebote
                    ) * 15

                ) * 0.15;


            // Restaurar posicion al finalizar.
            if (b.rebote <= 0) {

                b.rebote = 0;

                b.malla.position.y =
                    b.y + 0.5;
            }
        }
    });


    /* --------------------------------------------------------
       ANIMACION DE BANDERA FINAL
       -------------------------------------------------------- */

    if (banderaMeta) {

        banderaMeta.bandera.userData
            .tela.rotation.y =

            Math.sin(tiempo * 3) *
            0.25;
    }
}


/* ============================================================
   13. CAMARA

   La camara sigue a Junimo mientras avanza.

   Conservamos la distancia original para evitar
   cambiar la escala del mapa.
   ============================================================ */

function actualizarCamara(dt) {

    // Suavidad de seguimiento.
    const suavizado = Math.min(
        1,
        5 * dt
    );


    /* --------------------------------------------------------
       POSICION OBJETIVO EN X
       -------------------------------------------------------- */

    const objetivoX = Math.max(

        8,

        jugador.x + 2
    );


    /* --------------------------------------------------------
       POSICION OBJETIVO EN Y
       -------------------------------------------------------- */

    const objetivoY = Math.max(

        4.5,

        jugador.y + 3
    );


    /* --------------------------------------------------------
       SEGUIMIENTO HORIZONTAL
       -------------------------------------------------------- */

    camera.position.x +=

        (objetivoX - camera.position.x) *

        suavizado;


    /* --------------------------------------------------------
       SEGUIMIENTO VERTICAL
       -------------------------------------------------------- */

    camera.position.y +=

        (objetivoY - camera.position.y) *

        suavizado;


    // Mantener distancia original.
    camera.position.z = 14;


    // Orientar camara hacia el escenario.
    camera.lookAt(

        camera.position.x,

        camera.position.y - 2,

        0
    );


    // Actualizar la iluminacion.
    moverSol();
}


/* ============================================================
   MOVIMIENTO DE LA LUZ SOLAR

   La luz acompaña a la camara.
   ============================================================ */

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


/* ============================================================
   14. INTERFAZ DEL JUEGO

   Elementos HTML:

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
   ============================================================ */

const ui = {

    vidas:
        document.getElementById('hud-vidas'),

    puntos:
        document.getElementById('hud-puntos'),

    tiempo:
        document.getElementById('hud-tiempo'),

    aviso:
        document.getElementById('aviso'),

    inicio:
        document.getElementById('pantalla-inicio'),

    pausa:
        document.getElementById('pantalla-pausa'),

    fin:
        document.getElementById('pantalla-fin'),

    finTitulo:
        document.getElementById('fin-titulo'),

    finDetalle:
        document.getElementById('fin-detalle')
};


/* ============================================================
   MOSTRAR U OCULTAR PANTALLAS

   Si el elemento no existe, no interrumpe el juego.
   ============================================================ */

function mostrarPantalla(elemento, visible) {

    if (!elemento) {

        return;
    }


    elemento.classList.toggle(
        'oculto',
        !visible
    );
}


/* ============================================================
   ACTUALIZAR HUD

   HUD significa Heads-Up Display.

   Muestra:
   - Vidas
   - Puntos
   - Tiempo restante
   ============================================================ */

function actualizarHUD() {

    // Mostrar vidas.
    if (ui.vidas) {

        ui.vidas.textContent = vidas;
    }


    // Mostrar puntos con seis digitos.
    if (ui.puntos) {

        ui.puntos.textContent =

            String(puntos).padStart(
                6,
                '0'
            );
    }


    // Mostrar tiempo restante.
    if (ui.tiempo) {

        ui.tiempo.textContent =

            Math.ceil(
                Math.max(0, tiempoRestante)
            );
    }
}


/* ============================================================
   MOSTRAR AVISOS

   Ejemplos:
   ¡PUNTO DE CONTROL!
   ¡GEMA SORPRESA! +100
   ============================================================ */

let temporizadorAviso = null;


function mostrarAviso(texto) {

    if (!ui.aviso) {

        return;
    }


    // Escribir mensaje.
    ui.aviso.textContent = texto;


    // Mostrar aviso.
    mostrarPantalla(
        ui.aviso,
        true
    );


    // Cancelar aviso anterior.
    clearTimeout(
        temporizadorAviso
    );


    // Ocultar despues de 1.5 segundos.
    temporizadorAviso = setTimeout(
        () => {

            mostrarPantalla(
                ui.aviso,
                false
            );

        },
        1500
    );
}


/* ============================================================
   BOTONES DEL JUEGO
   ============================================================ */


// Boton para iniciar.
const botonJugar =
    document.getElementById('btn-jugar');


if (botonJugar) {

    botonJugar.disabled = false;

    botonJugar.addEventListener(
        'click',
        iniciarJuego
    );
}


// Boton para reiniciar.
const botonReiniciar =
    document.getElementById('btn-reiniciar');


if (botonReiniciar) {

    botonReiniciar.addEventListener(
        'click',
        iniciarJuego
    );
}


/* ============================================================
   15. ESTADOS DEL JUEGO

   inicio
   jugando
   pausa
   muriendo
   victoria
   gameover
   ============================================================ */

let estado = 'inicio';


// Vidas iniciales.
let vidas = CONFIG.VIDAS_INICIALES;


// Puntuacion.
let puntos = 0;


// Temporizador.
let tiempoRestante =
    CONFIG.TIEMPO_NIVEL;


// Tiempo de animacion de muerte.
let tiempoMuerte = 0;


// Temporizador de pantalla final.
let temporizadorFinal = null;


/* ============================================================
   INICIAR JUEGO

   Se ejecuta al presionar JUGAR o REINICIAR.
   ============================================================ */

function iniciarJuego() {

    /* --------------------------------------------------------
       REINICIAR VARIABLES
       -------------------------------------------------------- */

    vidas = CONFIG.VIDAS_INICIALES;

    puntos = 0;

    tiempoRestante =
        CONFIG.TIEMPO_NIVEL;

    tiempoMuerte = 0;


    // Cancelar pantallas finales pendientes.
    clearTimeout(
        temporizadorFinal
    );

    clearTimeout(
        temporizadorAviso
    );


    /* --------------------------------------------------------
       RECONSTRUIR EL MAPA

       Las cajas destruidas o usadas se restauran.
       Los enemigos vuelven a sus posiciones originales.
       -------------------------------------------------------- */

    construirNivel();


    /* --------------------------------------------------------
       COLOCAR A JUNIMO AL INICIO
       -------------------------------------------------------- */

    reaparecerJugador();


    // Al comenzar no necesita invulnerabilidad.
    jugador.invulnerable = 0;


    // Posicion inicial de camara.
    camera.position.set(
        8,
        4.5,
        14
    );


    /* --------------------------------------------------------
       OCULTAR PANTALLAS
       -------------------------------------------------------- */

    mostrarPantalla(
        ui.inicio,
        false
    );

    mostrarPantalla(
        ui.fin,
        false
    );

    mostrarPantalla(
        ui.pausa,
        false
    );

    mostrarPantalla(
        ui.aviso,
        false
    );


    // Cambiar estado.
    estado = 'jugando';


    // Actualizar indicadores.
    actualizarHUD();
}


/* ============================================================
   PAUSAR Y REANUDAR EL JUEGO

   Se controla mediante la tecla P.
   ============================================================ */

function alternarPausa() {

    /* --------------------------------------------------------
       ACTIVAR PAUSA
       -------------------------------------------------------- */

    if (estado === 'jugando') {

        estado = 'pausa';


        mostrarPantalla(
            ui.pausa,
            true
        );
    }


    /* --------------------------------------------------------
       REANUDAR PARTIDA
       -------------------------------------------------------- */

    else if (estado === 'pausa') {

        estado = 'jugando';


        mostrarPantalla(
            ui.pausa,
            false
        );


        // Reiniciar medicion de tiempo.
        reloj.getDelta();
    }
}


/* ============================================================
   GANAR EL NIVEL

   Junimo gana cuando llega a la bandera de meta.

   Recibe una bonificacion por tiempo restante.
   ============================================================ */

function ganarNivel() {

    if (estado !== 'jugando') {

        return;
    }


    // Bonificacion de tiempo.
    const bonus =

        Math.ceil(
            tiempoRestante
        ) * 10;


    // Sumar bonificacion.
    puntos += bonus;


    // Mostrar pantalla de victoria.
    terminarJuego(
        true,
        bonus
    );
}


/* ============================================================
   TERMINAR PARTIDA

   gano = true  -> Victoria
   gano = false -> Game Over
   ============================================================ */

function terminarJuego(
    gano,
    bonus = 0
) {

    // Actualizar estado.
    estado = gano
        ? 'victoria'
        : 'gameover';


    // Actualizar HUD.
    actualizarHUD();


    /* --------------------------------------------------------
       TITULO FINAL
       -------------------------------------------------------- */

    if (ui.finTitulo) {

        ui.finTitulo.textContent = gano

            ? '¡NIVEL COMPLETADO!'

            : 'GAME OVER';
    }


    /* --------------------------------------------------------
       MOSTRAR RESULTADOS
       -------------------------------------------------------- */

    if (ui.finDetalle) {

        ui.finDetalle.innerHTML = gano

            ? `Puntos: ${puntos}
               <br>
               Bono por tiempo: ${bonus}`

            : `Puntos: ${puntos}`;
    }


    /* --------------------------------------------------------
       MOSTRAR PANTALLA FINAL
       -------------------------------------------------------- */

    clearTimeout(
        temporizadorFinal
    );


    temporizadorFinal = setTimeout(
        () => {

            mostrarPantalla(
                ui.fin,
                true
            );

        },
        gano ? 800 : 200
    );
}


/* ============================================================
   BUCLE PRINCIPAL DEL VIDEOJUEGO

   Esta funcion controla todo el juego.

   En cada fotograma actualiza:
   - Jugador
   - Enemigos
   - Gemas y particulas
   - Bloques
   - Temporizador
   - Camara
   - Interfaz

   Al final dibuja la escena con Three.js.
   ============================================================ */

// Reloj de Three.js.
const reloj = new THREE.Clock();


/* ============================================================
   FUNCION PRINCIPAL DE ANIMACION
   ============================================================ */

function animate() {

    /* --------------------------------------------------------
       CALCULAR TIEMPO ENTRE FOTOGRAMAS

       dt se limita para evitar movimientos grandes
       cuando el navegador pierde velocidad.
       -------------------------------------------------------- */

    const dt = Math.min(

        reloj.getDelta(),

        1 / 30
    );


    // Tiempo acumulado para animaciones.
    const tiempo = reloj.elapsedTime;


    /* ========================================================
       ESTADO JUGANDO
       ======================================================== */

    if (estado === 'jugando') {

        /* ----------------------------------------------------
           ACTUALIZAR JUNIMO
           ---------------------------------------------------- */

        actualizarJugador(dt);


        /* ----------------------------------------------------
           ACTUALIZAR ENEMIGOS

           Se comprueba nuevamente el estado porque Junimo
           puede haber alcanzado la meta o perdido una vida.
           ---------------------------------------------------- */

        if (estado === 'jugando') {

            actualizarEnemigos(
                dt,
                tiempo
            );
        }


        /* ----------------------------------------------------
           ACTUALIZAR TEMPORIZADOR
           ---------------------------------------------------- */

        if (estado === 'jugando') {

            tiempoRestante -= dt;


            // Tiempo agotado.
            if (tiempoRestante <= 0) {

                tiempoRestante = 0;


                // Perder vida.
                perderVida(true);
            }
        }
    }


    /* ========================================================
       ESTADO MURIENDO
       ======================================================== */

    else if (estado === 'muriendo') {

        actualizarMuerte(dt);
    }


    /* ========================================================
       ACTUALIZAR ANIMACIONES

       No se actualizan durante la pausa.
       ======================================================== */

    if (
        estado !== 'pausa' &&
        estado !== 'inicio'
    ) {

        // Fragmentos de ladrillo y gemas sorpresa.
        actualizarParticulas(dt);


        // Rebote de cajas y bandera.
        animarNivel(
            dt,
            tiempo
        );
    }


    /* ========================================================
       CAMARA Y HUD
       ======================================================== */

    if (estado !== 'inicio') {

        // Seguir al jugador.
        actualizarCamara(dt);


        // Actualizar vidas, puntos y tiempo.
        actualizarHUD();
    }


    /* ========================================================
       CAMARA DEL MENU INICIAL

       La camara se desplaza suavemente mientras
       se muestra la pantalla de bienvenida.
       ======================================================== */

    else {

        camera.position.set(

            10 +
            Math.sin(tiempo * 0.2) * 6,

            5,

            14
        );


        camera.lookAt(

            camera.position.x,

            3,

            0
        );


        // Ajustar iluminacion.
        moverSol();
    }


    /* ========================================================
       RENDERIZAR ESCENA

       Dibujar el mapa, Junimo, enemigos y texturas.
       ======================================================== */

    renderer.render(
        scene,
        camera
    );
}


/* ============================================================
   ARRANQUE DEL VIDEOJUEGO

   Se ejecuta automaticamente cuando se carga game.js.
   ============================================================ */


// Mostrar pantalla inicial.
mostrarPantalla(
    ui.inicio,
    true
);


// Construir el escenario con las texturas.
construirNivel();


// Colocar Junimo al inicio.
reaparecerJugador();


// Actualizar posicion visual del personaje.
actualizarModeloJugador(0);


// Actualizar indicadores.
actualizarHUD();


// Iniciar animacion permanente.
renderer.setAnimationLoop(
    animate
);


/* ============================================================
   FIN DEL CODIGO COMPLETO

   JUNIMO RUNNER - VERSION INICIAL CON TEXTURAS
   ============================================================ */