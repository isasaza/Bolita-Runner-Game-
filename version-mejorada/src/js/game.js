/* =====================================================================
RUNNER GAME MEJORADO Y CON EL SONIDO 

   1. Configuración
   2. Diseño del nivel
   3. Escena, cámara y luces
   4. Materiales y texturas
   5. Modelos 3D
   6. Construcción del nivel
   7. Teclado
   8. Física y colisiones
   9. Bloques misteriosos
   10. Jugador
   11. Enemigos
   12. Partículas y animaciones
   13. Cámara
   14. Interfaz
   15. Estados y bucle principal
   ===================================================================== */

import * as THREE from 'three';

// Música del juego en bucle.
const RUTA_SONIDOS = './src/sonido/';
const musicaJuego = new Audio(RUTA_SONIDOS + 'SonidoJuego.mp3');
musicaJuego.loop = true;
musicaJuego.volume = 0.35;

// Sonidos de las acciones.
const sonidos = {
    salto: new Audio(RUTA_SONIDOS + 'salto.mp3'),
    reaparece: new Audio(RUTA_SONIDOS + 'reaparece.mp3'),
    meta: new Audio(RUTA_SONIDOS + 'meta.mp3'),
    gameover: new Audio(RUTA_SONIDOS + 'gameover.mp3'),
    aplastar: new Audio(RUTA_SONIDOS + 'aplastarenemigo.mp3'),
gemas: new Audio(RUTA_SONIDOS + 'gemas.mp3'),
golpecaja: new Audio(RUTA_SONIDOS +'golpecaja.mp3')
};

for (const sonido of Object.values(sonidos)) {
    sonido.preload = 'auto';
    sonido.volume = 0.8;
}

// Reproduce un efecto cuando ocurre su evento.
function reproducirSonido(nombre) {
    const sonido = sonidos[nombre];
    if (!sonido) return;
    sonido.currentTime = 0;
    sonido.play().catch(() => {});
}

// Inicia la música cuando el navegador permite sonido.
function iniciarMusica() {
    if (musicaJuego.paused) {
        musicaJuego.play().catch(() => {});
    }
}

window.addEventListener('pointerdown', iniciarMusica);
window.addEventListener('keydown', iniciarMusica);
window.addEventListener('touchstart', iniciarMusica, { passive: true });
iniciarMusica();


/* =====================================================================
   1. CONFIGURACIÓN
   ===================================================================== */

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

    // Movimiento de Junimo rodando en la montaña
    G_RAMPA: 30,
    VEL_RODAR: 13,
    FRICCION_RODAR: 5
};


/* =====================================================================
   2. DISEÑO DEL NIVEL (TILEMAP)


   BLOQUES:
   # = Suelo con pasto
   T = Tierra
   = = Plataforma flotante
   B = Caja de madera
   G = Caja misteriosa
   U = Caja misteriosa utilizada
   S = Roca
   C = Tronco
   L = Plataforma sobre estanque

   OBJETOS:
   E = Enemigo
   o = Gema
   K = Bandera de control
   P = Posición inicial
   F = Bandera de meta
   ===================================================================== */

const MAPA_NIVEL = [
  "",
  "",
  "                                               G                 B                                                                                       G",
  "                                                                                                                          B",
  "                                                                ",
  "                                              ===oo                 Eooo                                                                                  E",
  "                                         E                 ############                                     GBG                                         ====",
  "                BGBGB ooo               ====       ====   #TTTTTTTTTTTT      ooo                                      oo ====    S                    ",
  "           ooo               ooo             ooo         #TTTTTTTTTTTTT                 ooo                  ooo                SSS    C  C",
  "  P                        E                 E          #TTTTTTTTTTTTTT                 K                 E         E          SSSSS   CE C      E    E       E           F       ",
  "####################################  ##################TTTTTTTTTTTTTTT              ######### L LL L ##############################################################################"
];

// Los bloques sólidos producen colisiones.
// Las banderas K y F no son sólidas.
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


// agua
const ESTANQUES = [
    {
        x0: 36,
        x1: 38
    },
    {
        x0: 94,
        x1: 102
    }
];


/* =====================================================================
   3. ESCENA, CÁMARA, RENDERIZADOR Y LUCES
   ===================================================================== */


const COLOR_CIELO = 0x6ec6ff;

// Crear escena principal
const scene = new THREE.Scene();

scene.background = null;
scene.fog = new THREE.Fog(0xbddfff, 20, 70);


// Cámara en perspectiva.
const camera = new THREE.PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.1,
    300
);

camera.position.set(5, 5, 14);


const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true
});
renderer.setClearColor(0x000000,0);
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
window.addEventListener('resize', () => {

    renderer.setSize(
        window.innerWidth,
        window.innerHeight
    );

    camera.aspect =
        window.innerWidth / window.innerHeight;

    camera.updateProjectionMatrix();
});


// Luz ambiental
const luzAmbiente = new THREE.HemisphereLight(
    0xffffff,
    0x7caa5c,
    2.2
);

scene.add(luzAmbiente);


// Luz direccional 
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

/* =====================================================================
TEXTURAS
   ===================================================================== */

const RUTA_TEXTURAS = './src/img/texture/';

const cargadorTexturas = new THREE.TextureLoader();

function aplicarTextura(nombre, materialDestino) {

    cargadorTexturas.load(
        RUTA_TEXTURAS + nombre,

        textura => {
            textura.colorSpace = THREE.SRGBColorSpace;
            textura.magFilter = THREE.NearestFilter;

            materialDestino.map = textura;
            materialDestino.color.set(0xffffff);
            materialDestino.needsUpdate = true;
        },

        undefined,

        () => {
            console.warn(
                'Imagen opcional no encontrada:',
                nombre
            );
        }
    );
}


// Texturas de bloques suelo y rampas
[
    ['cesped.png', MATERIALES.suelo],
    ['tierra.png', MATERIALES.tierra],
    ['tierra.png', MATERIALES.tierraBloque],
    ['caja.png', MATERIALES.caja],
    ['roca.png', MATERIALES.roca],
    ['tronco.png', MATERIALES.tronco],
    ['tierra.png', MATERIALES.rampaTierra],
    ['cesped.png', MATERIALES.rampaPasto]

].forEach(([nombre, destino]) => {
    aplicarTextura(nombre, destino);
});


// Material de las cajas misteriosas
MATERIALES.misterio = material(0xf5b62d);

// Material de las cajas después de entregar el premio
MATERIALES.usado = material(0x88898d);

aplicarTextura(
    'misterio.png',
    MATERIALES.misterio
);

aplicarTextura(
    'vacio.png',
    MATERIALES.usado
);

const capaMontanas = document.getElementById('fondo-montanas');
const capaNubes = document.getElementById('fondo-nubes');

let derivaNubes = 0;

function actualizarFondo(dt = 0) {

    // Las nubes avanzan 
    derivaNubes += 15 * dt;

    const x = camera.position.x;

    // Montaña
    capaMontanas.style.backgroundPositionX =
        `${-x * 6}px`;

    // Nube
    capaNubes.style.backgroundPositionX =
        `${-x * 18 - derivaNubes}px`;
}
/* =====================================================================
   DECORACIONES DEL ESCENARIO

   Árboles, pinos, arbustos, flores y hongos.

   No tienen colisiones
   ===================================================================== */

const decoraciones = [];

// Neblina del escenario
let grupoNeblina = null;

function crearNeblina() {

    if (grupoNeblina) {
        scene.remove(grupoNeblina);
    }

    grupoNeblina = new THREE.Group();
    scene.add(grupoNeblina);

    // Crear textura de neblina
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;

    const ctx = canvas.getContext('2d');

    const degradado = ctx.createRadialGradient(
        128, 64, 5,
        128, 64, 125
    );

    degradado.addColorStop(0, 'rgba(245,250,255,0.8)');
    degradado.addColorStop(0.5, 'rgba(245,250,255,0.4)');
    degradado.addColorStop(1, 'rgba(245,250,255,0)');

    ctx.fillStyle = degradado;
    ctx.fillRect(0, 0, 256, 128);

    const textura = new THREE.CanvasTexture(canvas);

    const materialNeblina = new THREE.MeshBasicMaterial({
        map: textura,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
        side: THREE.DoubleSide,
        fog: false
    });

    const geometria = new THREE.PlaneGeometry(12, 4);

    // Colocar neblina en dos profundidades
    for (let x = 0; x <= 220; x += 9) {

        for (const z of [-1.5, -7]) {

            const nube = new THREE.Mesh(
                geometria,
                materialNeblina
            );

            nube.position.set(
                x + (z === -7 ? 4 : 0),
                1.5 + Math.sin(x * 0.3) * 0.4,
                z
            );

            grupoNeblina.add(nube);
        }
    }
}

let grupoDecoracion = null;

const Z_DECORACION = {
    cercana: -2,
    media: -7,
    lejana: -13
}

function agregarDecoracion(
    nombre,
    x,
    y,
    ancho,
    alto
) {

    const grupoDestino = grupoDecoracion;

    cargadorTexturas.load(

        RUTA_TEXTURAS + nombre,

        function(textura) {

            textura.colorSpace = THREE.SRGBColorSpace;
            textura.magFilter = THREE.NearestFilter;

            const materialDeco =
                new THREE.MeshBasicMaterial({

                    map: textura,
                    transparent: true,
                    alphaTest: 0.08,
                    depthWrite: false,
                    side: THREE.DoubleSide
                });

            const malla = new THREE.Mesh(

                new THREE.PlaneGeometry(
                    ancho,
                    alto
                ),

                materialDeco
            );

            const ajusteBase =
                nombre === 'arbol.png' ||
                nombre === 'pino.png'
                    ? 0.45
                    : 0.12;

           
// Profundidad segun el tipo de decoracion
const z = nombre === 'arbol.png' || nombre === 'pino.png'
    ? Z_DECORACION.lejana
    : nombre === 'arbusto.png' || nombre === 'hongo.png'
        ? Z_DECORACION.media
        : Z_DECORACION.cercana;

      //ajustar tamalo perspectiva

const factor = (camera.position.z - z)/ camera.position.z;

malla.userData.alturaOriginal = y + alto / 2 - ajusteBase;
malla.scale.set(factor, factor, 1);

malla.position.y + (malla.userData.alturaOriginal-camera.position.y)*factor,z


malla.position.set(
    x,
    y + alto / 2 - ajusteBase,
    z
) 


            
            if (grupoDestino !== grupoDecoracion) {
                malla.geometry.dispose();
                malla.material.dispose();
                return;
            }

            grupoDestino.add(malla);

            decoraciones.push(malla);
        },

        undefined,

        function() {
            console.warn(
                'No se pudo cargar:',
                nombre
            );
        }
    );
}
/* =====================================================================
   FRUTA ESTELAR Y GEMAS
   ===================================================================== */

const materialEstrella =
    new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        side: THREE.DoubleSide
    });

aplicarTextura(
    'estrella.png',
    materialEstrella
);


// Geometría de la fruta estelar
const GEO_ESTRELLA =
    new THREE.PlaneGeometry(
        0.9,
        0.9
    );


// Geometría de la gema
const GEO_GEMA =
    new THREE.OctahedronGeometry(0.25);


// Material para las gemas
const materialGema =
    new THREE.MeshLambertMaterial({
        color: 0x34ddff,
        emissive: 0x063b55
    });

const GEO_BLOQUE =
    new THREE.BoxGeometry(1, 1, 1);

const GEO_TIERRA =
    new THREE.BoxGeometry(1, 4, 1);

    const PROFUNDIDAD_MAPA = 18;
    const Z_CENTRO_MAPA = -(PROFUNDIDAD_MAPA-1)/2;

    const GEO_TERRENO_Z = new THREE.BoxGeometry(1,1,PROFUNDIDAD_MAPA);
    const GEO_TIERRA_Z = new THREE.BoxGeometry(1,4, PROFUNDIDAD_MAPA);


/* =====================================================================
   5. MODELOS 3D

   Crearemos:
   - Junimo
   - Enemigos 
   - Banderas para checkpoint y meta
   ===================================================================== */

const R_CUERPO = 0.38;
const Y_CENTRO = 0.4;

function pieza(geometria, materialPieza, x, y, z) {

    const malla = new THREE.Mesh(
        geometria,
        materialPieza
    );

    malla.position.set(x, y, z);
    malla.castShadow = true;

    return malla;
}

/* =====================================================================
   JUGADOR JUNIMO
   ===================================================================== */

function crearModeloJugador() {

    const grupo = new THREE.Group();

    // junimo
    const matCuerpo =
        new THREE.MeshLambertMaterial({
            color: 0x0cc510
        });

    const matClaro =
        new THREE.MeshLambertMaterial({
            color: 0x48db4f
        });

    const matOscuro =
        new THREE.MeshLambertMaterial({
            color: 0x06590a
        });

    const matHoja =
        new THREE.MeshLambertMaterial({
            color: 0x0a9610
        });

    const matNegro =
        new THREE.MeshLambertMaterial({
            color: 0x101010
        });

    const matMejilla =
        new THREE.MeshLambertMaterial({
            color: 0xff88cc
        });


    // rotar jugador
    const cuerpoRot = new THREE.Group();

    cuerpoRot.position.y = Y_CENTRO;


    // Cuerpo principal
    cuerpoRot.add(
        pieza(
            new THREE.SphereGeometry(
                R_CUERPO,
                24,
                18
            ),
            matCuerpo,
            0, 0, 0
        )
    );

    cuerpoRot.add(
        pieza(
            new THREE.SphereGeometry(
                R_CUERPO + 0.012,
                24,
                8,
                0,
                Math.PI * 2,
                0,
                Math.PI * 0.3
            ),
            matClaro,
            0, 0, 0
        )
    );


    cuerpoRot.add(
        pieza(
            new THREE.SphereGeometry(
                R_CUERPO + 0.02,
                20,
                6,
                0,
                Math.PI * 2,
                0,
                Math.PI * 0.14
            ),
            matOscuro,
            0, 0, 0
        )
    );


    // Tallito de la cabeza
    cuerpoRot.add(
        pieza(
            new THREE.CylinderGeometry(
                0.03,
                0.03,
                0.2,
                8
            ),
            matNegro,
            0,
            R_CUERPO + 0.08,
            0
        )
    );


    // Hoja de la cabeza
    const hoja = pieza(
        new THREE.BoxGeometry(
            0.15,
            0.05,
            0.03
        ),
        matHoja,
        0.07,
        R_CUERPO + 0.2,
        0
    );

    hoja.rotation.z = 0.5;
    cuerpoRot.add(hoja);


    // Ojo izquierdo
    cuerpoRot.add(
        pieza(
            new THREE.BoxGeometry(
                0.07,
                0.11,
                0.03
            ),
            matNegro,
            -0.15,
            0.04,
            0.35
        )
    );


    // Ojo derecho
    cuerpoRot.add(
        pieza(
            new THREE.BoxGeometry(
                0.07,
                0.11,
                0.03
            ),
            matNegro,
            0.15,
            0.04,
            0.35
        )
    );


    // Mejilla izquierda
    cuerpoRot.add(
        pieza(
            new THREE.BoxGeometry(
                0.1,
                0.06,
                0.03
            ),
            matMejilla,
            -0.22,
            -0.07,
            0.31
        )
    );


    // Mejilla derecha
    cuerpoRot.add(
        pieza(
            new THREE.BoxGeometry(
                0.1,
                0.06,
                0.03
            ),
            matMejilla,
            0.22,
            -0.07,
            0.31
        )
    );


    // Boca
    cuerpoRot.add(
        pieza(
            new THREE.BoxGeometry(
                0.04,
                0.03,
                0.02
            ),
            matOscuro,
            0,
            -0.07,
            0.375
        )
    );

    grupo.add(cuerpoRot);


    /* -------------------------------------------------------------
       BRAZOS Y PIERNAS

       Cada extremidad tiene un pivote.
       y se aplica una animacion para cuando este caminando
       ------------------------------------------------------------- */

    const extremidades = new THREE.Group();


    function brazo(lado) {

        const pivote = new THREE.Group();

        pivote.position.set(
            lado * 0.36,
            0.46,
            0
        );

        pivote.add(
            pieza(
                new THREE.CylinderGeometry(
                    0.025,
                    0.025,
                    0.22,
                    6
                ),
                matNegro,
                0,
                -0.11,
                0
            )
        );

        pivote.add(
            pieza(
                new THREE.SphereGeometry(
                    0.04,
                    8,
                    8
                ),
                matNegro,
                0,
                -0.23,
                0
            )
        );

        pivote.rotation.z = lado * 0.9;

        return pivote;
    }


    function pierna(lado) {

        const pivote = new THREE.Group();

        pivote.position.set(
            lado * 0.13,
            0.1,
            0
        );

        pivote.add(
            pieza(
                new THREE.CylinderGeometry(
                    0.025,
                    0.025,
                    0.1,
                    6
                ),
                matNegro,
                0,
                -0.05,
                0
            )
        );

        pivote.add(
            pieza(
                new THREE.BoxGeometry(
                    0.11,
                    0.03,
                    0.09
                ),
                matNegro,
                lado * 0.02,
                -0.095,
                0.02
            )
        );

        return pivote;
    }


    // extremidades
    const armIzq = brazo(-1);
    const armDer = brazo(1);

    const legIzq = pierna(-1);
    const legDer = pierna(1);

    extremidades.add(
        armIzq,
        armDer,
        legIzq,
        legDer
    );

    grupo.add(extremidades);


    // animaciones.
    grupo.userData = {
        cuerpoRot,
        extremidades,
        armIzq,
        armDer,
        legIzq,
        legDer
    };

    return grupo;
}

/* =====================================================================
   ENEMIGOS
   ===================================================================== */

function crearModeloEnemigo() {

    const grupo = new THREE.Group();

    // Cuerpo 
    const esfera = new THREE.Mesh(
        new THREE.SphereGeometry(
            0.35,
            20,
            16
        ),
        material(0xef2929)
    );

    esfera.position.y = 0.35;

    grupo.add(esfera);


    // ojos
    const blanco =
        new THREE.MeshBasicMaterial({
            color: 0xffffff
        });

    // pupilas
    const negro =
        new THREE.MeshBasicMaterial({
            color: 0x161616
        });


    // crear ojos
    for (const x of [-0.13, 0.13]) {

        const ojo = new THREE.Mesh(
            new THREE.SphereGeometry(
                0.095,
                12,
                10
            ),
            blanco
        );

        ojo.position.set(
            x,
            0.43,
            0.305
        );

        grupo.add(ojo);


        // Pupila negra
        const pupila = new THREE.Mesh(
            new THREE.SphereGeometry(
                0.043,
                10,
                8
            ),
            negro
        );

        pupila.position.set(
            x + 0.015,
            0.43,
            0.39
        );

        grupo.add(pupila);
    }

    return grupo;
}

/* =====================================================================
   BANDERAS
   Punto de control
 Meta
   ===================================================================== */

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

    grupo.add(poste);


    // bandera en triangulo
    const forma = new THREE.Shape();

    forma.moveTo(0, 0);
    forma.lineTo(1.05, -0.3);
    forma.lineTo(0, -0.6);
    forma.closePath();


    // Tela?
    const tela = new THREE.Mesh(
        new THREE.ShapeGeometry(forma),
        new THREE.MeshBasicMaterial({
            color,
            side: THREE.DoubleSide
        })
    );

    tela.position.set(
        0.05,
        2.4,
        0.15
    );

    grupo.add(tela);


    // Referencia para cambi color y animación
    grupo.userData.tela = tela;

    return grupo;
}
/* =====================================================================
   6. CONSTRUCCIÓN DEL NIVEL
   ===================================================================== */

let grupoNivel = null,
    bloques = new Map(),
    enemigos = [],
    gemas = [],
    particulas = [],
    posicionInicial = { x: 2.5, y: 1 },
    puntoControl = null,
    banderaMeta = null;


// Genera una clave única para cada posición del mapa
const clave = (x, y) => x + "," + y;


/* =====================================================================
   CONSTRUIR EL ESCENARIO
   ===================================================================== */

function construirNivel() {

    // Eliminar el escenario anterior
    if (grupoNivel) {
        scene.remove(grupoNivel);
    }

    // Crear el grupo que contendrá todos los objetos
    grupoNivel = new THREE.Group();

    scene.add(grupoNivel);


    // Reiniciar los elementos del escenario
    bloques = new Map();
    enemigos = [];
    gemas = [];
    particulas = [];

    puntoControl = null;
    banderaMeta = null;

    decoraciones.length = 0;
if (grupoDecoracion){
    scene.remove(grupoDecoracion);
}
grupoDecoracion = new THREE.Group ();
grupoDecoracion.name = 'DecoracionFondo';
scene.add(grupoDecoracion)
crearNeblina();
    // Construir las rampas y los estanques
    RAMPAS.forEach(crearRampa);
    ESTANQUES.forEach(crearEstanque);


    /* -------------------------------------------------------------
       DECORACIÓN
       ------------------------------------------------------------- */

    // Árboles y pinos
    [8, 24, 43, 91, 116, 151, 172].forEach((x, i) => {

        agregarDecoracion(
            i % 2 ? 'pino.png' : 'arbol.png',
            x,
            1,
            3.2,
            4.5
        );
    });


    // Arbustos
    [14, 32, 106, 132, 164].forEach(x => {

        agregarDecoracion(
            'arbusto.png',
            x,
            1,
            1.6,
            1.2
        );
    });


    // Flores y margaritas
    [6, 19, 33, 88, 105, 128, 158].forEach((x, i) => {

        agregarDecoracion(
            i % 2 ? 'margarita.png' : 'flor.png',
            x,
            1,
            0.8,
            0.9
        );
    });


    // Hongos
    [26, 114, 147].forEach(x => {

        agregarDecoracion(
            'hongo.png',
            x,
            1,
            1.0,
            1.0
        );
    });


    /* -------------------------------------------------------------
       LECTURA DEL MAPA
       ------------------------------------------------------------- */

    const alto = MAPA_NIVEL.length;

    MAPA_NIVEL.forEach((fila, y) => {

        // Invertimos Y porque el mapa está escrito de arriba abajo
        const yMundo = alto - 1 - y;

        for (let index = 0; index < fila.length; index++) {

            const element = fila[index];

            if (SOLIDOS.has(element)) {

                // Crear un bloque sólido
                crearBloque(index, yMundo, element);

            } else if (element === "o") {

                // Crear una gema 
                crearGema(index, yMundo);

            } else if (element === "E") {

                // Crear un enemigo 
                crearEnemigo(index, yMundo);

            } else if (element === "P") {

                // Posición donde inicia el jugador
                posicionInicial = {
                    x: index + 0.5,
                    y: yMundo
                };

            } else if (element === "K") {

                // punto de control
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

                // Bandera meta.
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


/* =====================================================================
   CREACIÓN DE BLOQUES
   ===================================================================== */

function crearBloque(x, y, tipo) {

    const materialBloque = {

        "#": MATERIALES.suelo,
        "=": MATERIALES.suelo,

        "T": MATERIALES.tierraBloque,

        "B": MATERIALES.caja,

        "G": MATERIALES.misterio,

        "U": MATERIALES.usado,

        "S": MATERIALES.roca,

        "C": MATERIALES.tronco,

        "L": MATERIALES.tronco

    }[tipo];


    // cubo 3D.
    const esTerreno = ['#', 'T','=', 'L'].includes(tipo);
    const malla = new THREE.Mesh(esTerreno? GEO_TERRENO_Z : GEO_BLOQUE,
        materialBloque
    );

    malla.position.set(
        x + 0.5,
        y + 0.5,
        0
    );

    malla.castShadow = true;
    malla.receiveShadow = true;

    grupoNivel.add(malla);

    // Guardar el bloque para calcular colisiones
    bloques.set(
        clave(x, y),
        {
            x,
            y,
            tipo,
            malla,
            rebote: 0
        }
    );


    // Agregar tierra debajo del suelo
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


/* =====================================================================
   GEMAS COLECCIONABLES

   Las gemas
   Giran sobre sí mismas
   Flotan
   Desaparecen cuando se cogen
   Entregan 100 puntos cada una.
   ===================================================================== */

function crearGema(x, y) {

    const malla = new THREE.Mesh(
        GEO_GEMA,
        materialGema
    );

    malla.position.set(
        x + 0.5,
        y + 0.55,
        0.2
    );

    grupoNivel.add(malla);

    gemas.push({
        x: x + 0.5,
        y: y + 0.55,
        malla,
        recogida: false
    });
}
/* =====================================================================
   FRUTA ESTELAR

   Aparece al golpear una caja misteriosa
   Su imagen proviene de estrella.png
   ===================================================================== */

function lanzarFrutaEstelar(x, y) {

    const malla = new THREE.Mesh(
        GEO_ESTRELLA,
        materialEstrella
    );

    malla.position.set(
        x + 0.5,
        y + 1.3,
        0.5
    );

    grupoNivel.add(malla);


    // La fruta sube y después cae
    particulas.push({
        malla,
        vx: 0,
        vy: 8,
        vz: 0,
        vida: 0.9,
        gira: 6,
        gravedad: -20
    });
}

/* =====================================================================
   RECOLECCIÓN DE GEMAS
   ===================================================================== */

function actualizarGemas(dt, tiempo) {

    for (const gema of gemas) {

        if (gema.recogida) continue;


        // Animación de giro
        gema.malla.rotation.y += dt * 3;


        // Animación de flotación
        gema.malla.position.y =
            gema.y +
            Math.sin(tiempo * 4 + gema.x) * 0.08;


        // Distancia entre Junimo y la gma
        const dx = jugador.x - gema.x;

        const dy =
            (jugador.y + CONFIG.RADIO_BOLA) -
            gema.y;

        const distanciaCuadrada =
            dx * dx + dy * dy;


        // Detectar si Junimo recoge la gema
        if (distanciaCuadrada < 0.75 * 0.75) {

            gema.recogida = true;

            grupoNivel.remove(gema.malla);

            puntos += 100;
            gemasRecogidas++;

            reproducirSonido('gemas');


            // Una vida extra por cada 20 gemas
            if (gemasRecogidas % 20 === 0) {

                vidas++;

                mostrarAviso('¡VIDA EXTRA!');
            }
        }
    }
}

/* =====================================================================
   CREACIÓN ENEMIGOS
   ===================================================================== */

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

/* =====================================================================
   RAMPA

   Se construyen mediante una curva suave.
   La pendiente permite que Junimo suba y baje.
   ===================================================================== */

// Altura de la rampa en una posición X
function alturaRampa(r, x) {

    const t = Math.min(
        1,
        Math.max(
            0,
            (x - r.x0) / (r.x1 - r.x0)
        )
    );

    const s = t * t * (3 - 2 * t);

    return (
        r.hIzq +
        (r.hDer - r.hIzq) * s
    );
}


// Calcula la pendiente de la rampa
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


// Busca si está sobre alguna rampa
function rampaEn(x) {

    return RAMPAS.find(
        r => x >= r.x0 && x <= r.x1
    ) || null;
}
//construccion 3d rampa 

function crearRampa(r) {

    const N = 48;
    const pts = [];


    // Calcular los puntos de la curva
    for (let i = 0; i <= N; i++) {

        const x =
            r.x0 +
            (r.x1 - r.x0) * i / N;

        pts.push([
            x,
            alturaRampa(r, x)
        ]);
    }


    // Crear la forma de tierra
    const formaTierra = new THREE.Shape();

    formaTierra.moveTo(r.x0, -4);

    pts.forEach(([x, y]) => {
        formaTierra.lineTo(x, y);
    });

    formaTierra.lineTo(r.x1, -4);

    formaTierra.closePath();


    // Convertir la forma en un objeto 3D
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


    // Crear una franja de pasto sobre la rampa
    const formaPasto = new THREE.Shape();

    formaPasto.moveTo(
        pts[0][0],
        pts[0][1]
    );

    pts.forEach(([x, y]) => {
        formaPasto.lineTo(x, y);
    });

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

    geoPasto.translate(
        0,
        0,
        -0.51
    );


    const pasto = new THREE.Mesh(
        geoPasto,
        MATERIALES.rampaPasto
    );

    pasto.receiveShadow = true;

    grupoNivel.add(pasto);
}


/* =====================================================================
   AGUA (MINI ESTANQUES EN LOS VACIOS)
   ===================================================================== */

function crearEstanque(e) {

    const ancho =
        e.x1 - e.x0 - 0.02;

    const agua = new THREE.Mesh(

        new THREE.BoxGeometry(
            ancho,
            4.6,
            0.96
        ),

        MATERIALES.agua
    );

    agua.position.set(
        (e.x0 + e.x1) / 2,
        -1.7,
        0
    );

    grupoNivel.add(agua);
}
/* =====================================================================
   7. ENTRADA DEL TECLADO
   ===================================================================== */

const teclas = {};


// Detectar cuando se presiona una tecla
window.addEventListener('keydown', (e) => {

    teclas[e.code] = true;


    // Evitar que las flechas y la barra espaciadora
    // desplacen la página
    if ([
        'Space',
        'ArrowUp',
        'ArrowDown',
        'ArrowLeft',
        'ArrowRight'
    ].includes(e.code)) {

        e.preventDefault();
    }


    // Guardar una solicitud de salto
    if (
        !e.repeat &&
        esTeclaSalto(e.code) &&
        estado === 'jugando'
    ) {

        jugador.bufferSalto =
            CONFIG.BUFFER_SALTO;
    }


    // Tecla P: pausar 
    if (e.code === 'KeyP') {
        alternarPausa();
    }


    // Tecla R: reiniciar.
    if (
        e.code === 'KeyR' &&
        estado !== 'inicio'
    ) {

        iniciarJuego();
    }
});


// Detectar cuando se suelta una tecla
window.addEventListener('keyup', (e) => {

    teclas[e.code] = false;
});


// Teclas para saltar
const esTeclaSalto = code =>
    code === 'Space' ||
    code === 'ArrowUp' ||
    code === 'KeyW';


// Movimiento hacia la izquierda
const teclaIzquierda = () =>
    teclas['ArrowLeft'] ||
    teclas['KeyA'];


// Movimiento hacia la derecha
const teclaDerecha = () =>
    teclas['ArrowRight'] ||
    teclas['KeyD'];


// Comprueba si se mantiene presionado el salto
const teclaSaltoPresionada = () =>
    teclas['Space'] ||
    teclas['ArrowUp'] ||
    teclas['KeyW'];


// Tecla Shift pa correr
const teclaCorrer = () =>
    teclas['ShiftLeft'] ||
    teclas['ShiftRight'];

    /* =====================================================================
   8. FÍSICA Y COLISIONES

   Las entidades tienen:
   x, y, ancho, alto, vx y vy.

   Primero resolvemos las colisiones horizontales
   y después las verticales.

   Las rampas se calculan por separado.
   ===================================================================== */

// Busca un bloque en una posición del mapa
function obtenerBloque(tx, ty) {
    return bloques.get(clave(tx, ty)) || null;
}


// Encuentra los bloques que toca una entidad
function bloquesQueToca(ent, holgura = 0.001) {

    const resultado = [];

    const izquierda =
        Math.floor(ent.x - ent.ancho / 2);

    const derecha =
        Math.floor(ent.x + ent.ancho / 2 - 0.001);

    const abajo =
        Math.floor(ent.y + holgura);

    const arriba =
        Math.floor(ent.y + ent.alto - 0.001);


    for (let tx = izquierda; tx <= derecha; tx++) {

        for (let ty = abajo; ty <= arriba; ty++) {

            const bloque = obtenerBloque(tx, ty);

            if (bloque) {
                resultado.push(bloque);
            }
        }
    }

    return resultado;
}

/* =====================================================================
   MOVIMIENTO Y COLISIONES

   alGolpearTecho permite detectar cuando Junimo golpea
   una caja desde abajo.
   ===================================================================== */

function moverEntidad(ent, dt, alGolpearTecho) {

    ent.chocoPared = false;


    // -------------------------------------------------------------
    // MOVIMIENTO HORIZONTAL (X)
    // -------------------------------------------------------------

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


    // -------------------------------------------------------------
    // MOVIMIENTO VERTICAL (Y)
    // -------------------------------------------------------------

    ent.y += ent.vy * dt;

    ent.enSuelo = false;

    choques = bloquesQueToca(ent);


    if (choques.length > 0) {

        if (ent.vy < 0) {

            // La entidad aterriza sobre el bloque.
            ent.y = Math.max(
                ...choques.map(b => b.y)
            ) + 1;

            ent.enSuelo = true;

        } else if (ent.vy > 0) {

            // La entidad golpea el techo
            ent.y = Math.min(
                ...choques.map(b => b.y)
            ) - ent.alto - 0.001;


            // Detectar golpe contra cajas
            if (alGolpearTecho) {
                alGolpearTecho(choques);
            }
        }

        ent.vy = 0;
    }
}

//colision con rampa

function resolverRampa(ent, dt) {

    ent.enRampa = false;
    ent.pendiente = 0;

    const r = rampaEn(ent.x);

    if (!r) return;


    const pendiente = pendienteRampa(r, ent.x);

    const yApoyo =
        alturaRampa(r, ent.x) +
        CONFIG.RADIO_BOLA *
        (Math.sqrt(1 + pendiente * pendiente) - 1);


    const margen = ent.enRampaAntes
        ? 0.08 + Math.abs(pendiente * ent.vx) * dt * 1.5
        : 0.02;


    if (
        ent.vy <= 0 &&
        ent.y <= yApoyo + margen
    ) {

        ent.y = yApoyo;
        ent.vy = 0;

        ent.enSuelo = true;
        ent.enRampa = true;

        ent.pendiente = pendiente;
    }

    // Comprueba si dos entidades se superponen
    function seSuperponen(a, b) {

        return (
            Math.abs(a.x - b.x) <
                (a.ancho + b.ancho) / 2 &&

            a.y < b.y + b.alto &&

            a.y + a.alto > b.y
        );
    }
}

/* =====================================================================
   9. BLOQUES Y CAJAS MISTERIOSAS

   B = Caja de madera, se destruye.
   G = Caja misteriosa, entrega una fruta estelar.
   U = Caja utilizada, ya no entrega premios.
   ===================================================================== */

function golpearBloque(listaBloques) {

    if (listaBloques.length === 0) return;
reproducirSonido('golpecaja');

    // Elegir el bloque más cercano al centro de Junim
    const bloque = listaBloques.reduce(
        (mejor, b) =>

            Math.abs(b.x + 0.5 - jugador.x) <
            Math.abs(mejor.x + 0.5 - jugador.x)

                ? b
                : mejor
    );

//caja madera

    if (bloque.tipo === 'B') {

        destruirBloque(bloque);

//caja misteriosa 

    } else if (bloque.tipo === 'G') {

        // La caja entrega el premio una sola vez
        bloque.tipo = 'U';

        // Cambiar su apariencia a caja vacía
        bloque.malla.material = MATERIALES.usado;

        // Animación de golpe
        bloque.rebote = 0.18;

        // Lanzar fruta estelar
        lanzarFrutaEstelar(
            bloque.x,
            bloque.y
        );

        // Sumar puntos
        puntos += 300;

        mostrarAviso('¡FRUTA ESTELAR! +300');

//otros bloques

    } else {

        bloque.rebote = 0.1;
    }


    // Si hay un enemigo encima recibe el golpe
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

//destruir cajas de madera
function destruirBloque(bloque) {

    // Eliminar visualmente
    grupoNivel.remove(bloque.malla);

    // Eliminar del mapa de colisiones
    bloques.delete(
        clave(bloque.x, bloque.y)
    );


    // Crear fragmentos al destruir la caja
    crearParticulas(
        bloque.x + 0.5,
        bloque.y + 0.5,
        MATERIALES.caja,
        8
    );


    // Recompensa
    puntos += 50;
}

/* =====================================================================
   10. JUGADOR JUNIMO

   Controlamos
   - Posición
   - Velocidad
   - Aceleración
   - Gravedad
   - Saltos
   - Rampas
   - Vidas
   - Punto de control
   - Meta
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

    // Movimiento sobre rampa
    enRampa: false,
    enRampaAntes: false,

    pendiente: 0,
    rodando: false,

    malla: crearModeloJugador()
};


// Agregar a la escena
scene.add(jugador.malla);


/* =====================================================================
   REAPARICIÓN DEL JUGADOR

   Si activó una bandera de control, reaparece allí
   De lo contrario, vuelve al inicio
   ===================================================================== */

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

    jugador.enSuelo = false;
    jugador.saltando = false;

    jugador.tiempoCoyote = 0;
    jugador.bufferSalto = 0;

    jugador.rodando = false;

    jugador.enRampa = false;
    jugador.enRampaAntes = false;

    jugador.pendiente = 0;

    jugador.invulnerable =
        CONFIG.INVULNERABLE;


    // Restaurar el modelo visual
    jugador.malla.rotation.set(0, 0, 0);

    jugador.malla.visible = true;
}


/* =====================================================================
   ACTUALIZACIÓN DEL JUGADOR

   Se ejecuta en cada fotograma.
   ===================================================================== */

function actualizarJugador(dt) {

    const j = jugador;

    j.enRampaAntes = j.enRampa;


    // -------------------------------------------------------------
    // MOVIMIENTO HORIZONTAL
    // -------------------------------------------------------------

    let direccion = 0;

    if (teclaIzquierda()) {
        direccion -= 1;
    }

    if (teclaDerecha()) {
        direccion += 1;
    }


    const velocidadMaxima = teclaCorrer()
        ? CONFIG.VEL_CORRER
        : CONFIG.VEL_CAMINAR;


    const limite = j.rodando
        ? CONFIG.VEL_RODAR
        : velocidadMaxima;


    // La pendiente acelera a Junimo cuesta abajo
    if (j.enRampaAntes) {

        j.vx -=
            j.pendiente *
            CONFIG.G_RAMPA *
            dt;
    }


    // Aceleración al caminar
    if (direccion !== 0) {

        j.vx +=
            direccion *
            CONFIG.ACELERACION *
            dt;

        j.mirando = direccion;


    } else if (!j.enRampaAntes) {

        // Fricción cuando no se presiona ninguna dirección
        const freno = (
            j.rodando
                ? CONFIG.FRICCION_RODAR
                : CONFIG.FRICCION
        ) * dt;


        j.vx = Math.abs(j.vx) <= freno
            ? 0
            : j.vx - Math.sign(j.vx) * freno;
    }


    // Limitar velocidad horizontal
    j.vx = Math.max(
        -limite,
        Math.min(limite, j.vx)
    );

//salto coyote

    j.tiempoCoyote = j.enSuelo
        ? CONFIG.TIEMPO_COYOTE
        : j.tiempoCoyote - dt;


    // Reducir tiempo del buffer de salto
    j.bufferSalto -= dt;


    if (
        j.bufferSalto > 0 &&
        j.tiempoCoyote > 0
    ) {

        j.vy = CONFIG.FUERZA_SALTO;

        j.bufferSalto = 0;
        j.tiempoCoyote = 0;

        j.saltando = true;

        // Sonido al saltar
        reproducirSonido('salto');
    }

//altura del salto

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

// gravedad

    const g = j.vy < 0
        ? CONFIG.GRAVEDAD * CONFIG.MULT_CAIDA
        : CONFIG.GRAVEDAD;


    j.vy += g * dt;


    // Limitar velocidad máxima de caída
    j.vy = Math.max(
        j.vy,
        CONFIG.VEL_MAX_CAIDA
    );

//moviimiento y colisiones

    const estabaEnSuelo = j.enSuelo;

    const vyAntes = j.vy;


    // Mover y detectar golpes desde abajo
    moverEntidad(
        j,
        dt,
        golpearBloque
    );


    // Evitar que salga por el borde izquierdo
    if (j.x < j.ancho / 2) {

        j.x = j.ancho / 2;

        j.vx = 0;
    }


    // contacto con rampas
    resolverRampa(j, dt);


    // Animación de aterrizaje
    if (!estabaEnSuelo && j.enSuelo) {

        j.aplastar = Math.min(
            0.3,
            Math.abs(vyAntes) * 0.015
        );
    }

//rodar

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

//cae al vacio

    if (j.y < CONFIG.LIMITE_CAIDA) {

        perderVida(false);

        return;
    }

// punto control

    if (
        puntoControl &&
        !puntoControl.activo &&
        j.x >= puntoControl.x
    ) {

        puntoControl.activo = true;


        // Cambiar bandera amarilla a verde
        puntoControl.bandera.userData.tela
            .material.color.set(0x28d950);


        mostrarAviso('¡PUNTO DE CONTROL!');
    }

//meta

    if (
        banderaMeta &&
        j.x >= banderaMeta.x - 0.2
    ) {

        ganarNivel();

        return;
    }

//invulnerabilidad

    if (j.invulnerable > 0) {

        j.invulnerable -= dt;
    }


    // Actualizar la apariencia de Junimo
    actualizarModeloJugador(dt);
}


/* =====================================================================
   ANIMACIÓN DEL JUNIMO
   ===================================================================== */

function actualizarModeloJugador(dt) {

    const j = jugador;

    const m = j.malla;

    m.position.set(
        j.x,
        j.y,
        0
    );


    const partes = m.userData;

//animacion cuando rueda

    if (j.rodando) {

        partes.cuerpoRot.rotation.z -=
            j.vx * dt / R_CUERPO;

        partes.extremidades.visible = false;


    // animación mientras camina
    } else {

        // Recuperar orientación vertical del cuerpo
        partes.cuerpoRot.rotation.z *=
            Math.max(0, 1 - dt * 10);

        partes.extremidades.visible = true;


        // Movimiento de brazos y piernas
        const paso =
            Math.sin(reloj.elapsedTime * 13) *
            Math.min(
                0.5,
                Math.abs(j.vx) * 0.07
            );


        partes.armIzq.rotation.z =
            -0.6 + paso;

        partes.armDer.rotation.z =
            0.6 - paso;

        partes.legIzq.rotation.z =
            paso * 0.4;

        partes.legDer.rotation.z =
            -paso * 0.4;
    }

    m.visible = j.invulnerable > 0
        ? Math.floor(j.invulnerable * 12) % 2 === 0
        : true;
}


// sistema vidas

function perderVida(conAnimacion) {

    if (estado !== 'jugando') return;


    vidas--;

    estado = 'muriendo';

    tiempoMuerte = 1.4;


    jugador.malla.visible = true;

    jugador.vy = conAnimacion ? 12 : 0;

    jugador.vx = 0;
}

//animacon muerte y reaparecer jugador
function actualizarMuerte(dt) {

    tiempoMuerte -= dt;


    // Aplicar gravedad durante la caída
    jugador.vy += CONFIG.GRAVEDAD * dt;

    jugador.y += jugador.vy * dt;


    // Actualizar posición visual
    jugador.malla.position.set(
        jugador.x,
        jugador.y,
        0
    );


    // Girar el personaje durante la animación
    jugador.malla.rotation.z += dt * 8;


    if (tiempoMuerte <= 0) {

        if (vidas <= 0) {

            terminarJuego(false);

        } else {

            // Volver al punto de control o al inicio
            reaparecerJugador();

            // Sonido cuando reaparece
            reproducirSonido('reaparece');

            // Restaurar el tiempo
            tiempoRestante = CONFIG.TIEMPO_NIVEL;

            estado = 'jugando';
        }
    }
}

// 1. Enemigos 
function actualizarEnemigos(dt, tiempo) {

    enemigos.forEach(en => {

        // Enemigo derrotado
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


        // Solo mover enemigos cercanos al jugador
        if (Math.abs(en.x - jugador.x) > 18) {
            return;
        }


        // Movimiento horizontal y gravedad
        en.vx =
            en.direccion * CONFIG.VEL_ENEMIGO;

        en.vy += CONFIG.GRAVEDAD * dt;

        moverEntidad(en, dt);


        // Detectar paredes y bordes
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


        // Evitar que salga por la izquierda
        if (en.x < en.ancho / 2) {

            en.x = en.ancho / 2;
            en.direccion = 1;
        }


        // Actualizar posición visual
        en.malla.position.set(
            en.x,
            en.y,
            0
        );


        // Animación de movimiento
        en.malla.scale.set(
            en.direccion,
            1 + Math.sin(tiempo * 8) * 0.04,
            1
        );


        //colision jugador y enemigo

        if (estado === 'jugando' && en.vivo) {

            const rBola = CONFIG.RADIO_BOLA;
            const rEnemigo = 0.36;

            const dx = jugador.x - en.x;

            const dy =
                (jugador.y + rBola) -
                (en.y + 0.32);

            const distanciaCuadrada =
                dx * dx + dy * dy;

            const radioTotal =
                rBola + rEnemigo;


            if (
                distanciaCuadrada <
                radioTotal * radioTotal
            ) {

                // Si cae sobre el enemigo lo derrota
                if (
                    jugador.vy < 0 &&
                    dy > 0.1
                ) {

                    derrotarEnemigo(en, 200);

                    // Sonido al aplastar enemigo
                    reproducirSonido('aplastar');

                    jugador.vy =
                        CONFIG.FUERZA_SALTO *
                        CONFIG.REBOTE_PISADA;

                    jugador.saltando =
                        teclaSaltoPresionada();


                // Si toca al enemigo de lado pierde una vida
                } else if (
                    jugador.invulnerable <= 0
                ) {

                    perderVida(true);
                }
            }
        }
    });
}

//derrotar enemigos

function derrotarEnemigo(en, puntosGanados) {

    en.vivo = false;

    en.tiempoMuerto = 0.5;


    // Aplastar visualmente al enemigo
    en.malla.scale.set(
        1.2,
        0.25,
        1.2
    );


    // Sumar puntos
    puntos += puntosGanados;
}


/* =====================================================================
   12. PARTÍCULAS Y ANIMACIONES

   Al romper una caja aparecen fragmentos
   También se anima la fruta estelar
   ===================================================================== */

const GEO_PEDAZO =
    new THREE.BoxGeometry(
        0.25,
        0.25,
        0.25
    );


function crearParticulas(x, y, materialParticula, cantidad) {

    for (let i = 0; i < cantidad; i++) {

        const malla = new THREE.Mesh(
            GEO_PEDAZO,
            materialParticula
        );

        malla.position.set(
            x,
            y,
            0
        );

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


/* =====================================================================
   ACTUALIZACIÓN DE PARTÍCULAS
   ===================================================================== */

function actualizarParticulas(dt) {

    // Recorrer de atrás hacia adelante para eliminar partículas
    for (let i = particulas.length - 1; i >= 0; i--) {

        const p = particulas[i];


        // Gravedad
        p.vy += p.gravedad * dt;


        // Movimiento
        p.malla.position.x += p.vx * dt;

        p.malla.position.y += p.vy * dt;

        p.malla.position.z += p.vz * dt;


        // Rotación
        p.malla.rotation.x += p.gira * dt;

        p.malla.rotation.y += p.gira * dt;


        // Reducir duración
        p.vida -= dt;


        // Eliminar partícula cuando termina
        if (p.vida <= 0) {

            grupoNivel.remove(p.malla);

            particulas.splice(i, 1);
        }
    }
}


/* =====================================================================
   ANIMACIONES DEL NIVEL

   - Rebote de cajas
   - Movimiento de bandera
   ===================================================================== */

function animarNivel(dt, tiempo) {

    // Animación de bloques golpeados
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


    // Bandera de meta 
    if (banderaMeta) {

        banderaMeta.bandera.userData.tela.rotation.y =
            Math.sin(tiempo * 3) * 0.25;
    }
}

/* =====================================================================
   13. CÁMARA
   ===================================================================== */

function actualizarCamara(dt) {

    const suavizado = Math.min(
        1,
        5 * dt
    );

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


    // Actualizar iluminación
    moverSol();
    actualizarFondo(dt);
}

/* =====================================================================
   LUZ
   ===================================================================== */

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
   14. INTERFAZ DEL JUEGO
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

    finDetalle: document.getElementById('fin-detalle'),

    gemas: document.getElementById('hud-gemas'),
};

function actualizarHUD() {

    // Mostrar vidas.
    ui.vidas.textContent = vidas;

    // Mostrar gemas recogidas.
    if (ui.gemas) {
        ui.gemas.textContent = gemasRecogidas;
    }

    // Mostrar puntos con seis digitos.
    ui.puntos.textContent =
        String(puntos).padStart(6, '0');

    // Mostrar tiempo restante.
    ui.tiempo.textContent =
        Math.ceil(tiempoRestante);
}

//avisos
let temporizadorAviso = null;


function mostrarAviso(texto) {

    ui.aviso.textContent = texto;

    ui.aviso.classList.remove('oculto');


    clearTimeout(temporizadorAviso);


    temporizadorAviso = setTimeout(() => {

        ui.aviso.classList.add('oculto');

    }, 1500);
}

//botones
// Botón de inicio
const botonJugar =
    document.getElementById('btn-jugar');

botonJugar.disabled = false;

botonJugar.addEventListener(
    'click',
    iniciarJuego
);


// Botón de reinicio
document.getElementById('btn-reiniciar')
    .addEventListener(
        'click',
        iniciarJuego
    );


/* =====================================================================
   15. ESTADOS Y BUCLE PRINCIPAL

   Estados=
   inicio
   jugando
   pausa
   muriendo
   victoria
   gameover
   ===================================================================== */

let estado = 'inicio';

let vidas = CONFIG.VIDAS_INICIALES;

let puntos = 0;

let gemasRecogidas = 0;

let tiempoRestante = CONFIG.TIEMPO_NIVEL;

let tiempoMuerte = 0;


//partida nueva

function iniciarJuego() {

    vidas = CONFIG.VIDAS_INICIALES;

    puntos = 0;

    gemasRecogidas = 0;

    tiempoRestante = CONFIG.TIEMPO_NIVEL;

    tiempoMuerte = 0;


    // Reconstruir el escenario
    construirNivel();


    // Colocar Junimo en el inicio
    reaparecerJugador();

    jugador.invulnerable = 0;


    // Posición inicial de la cámara
    camera.position.set(
        8,
        4.5,
        14
    );


    // Ocultar pantallas
    ui.inicio.classList.add('oculto');

    ui.fin.classList.add('oculto');

    ui.pausa.classList.add('oculto');

    ui.aviso.classList.add('oculto');


    estado = 'jugando';

    actualizarHUD();
}

//pausar y reanudar

function alternarPausa() {

    if (estado === 'jugando') {

        estado = 'pausa';

        ui.pausa.classList.remove('oculto');


    } else if (estado === 'pausa') {

        estado = 'jugando';

        ui.pausa.classList.add('oculto');


        // Evitar salto de tiempo después de pausar
        reloj.getDelta();
    }
}

//victoria

function ganarNivel() {

    // Bonificación por tiempo restante
    const bonus =
        Math.ceil(tiempoRestante) * 10;

    puntos += bonus;

    terminarJuego(true, bonus);
}


//pantalla final

function terminarJuego(gano, bonus = 0) {

    estado = gano
        ? 'victoria'
        : 'gameover';

    // Sonido de meta o Game Over
    reproducirSonido(gano ? 'meta' : 'gameover');


    actualizarHUD();


    ui.finTitulo.textContent = gano
        ? '¡NIVEL COMPLETADO!'
        : 'GAME OVER';


    ui.finDetalle.innerHTML = gano
        ? `Puntos: ${puntos}<br>Bono por tiempo: ${bonus}<br>Gemas: ${gemasRecogidas}`
        : `Puntos: ${puntos}<br>Gemas: ${gemasRecogidas}`;


    setTimeout(() => {

        ui.fin.classList.remove('oculto');

    }, gano ? 800 : 200);
}

/* =====================================================================
   BUCLE PRINCIPAL
   dt = tiempo transcurrido entre fotogramas
   ===================================================================== */

const reloj = new THREE.Clock();


function animate() {

    const dt = Math.min(
        reloj.getDelta(),
        1 / 30
    );

    const tiempo = reloj.elapsedTime;


    // -------------------------------------------------------------
    // ESTADO: JUGANDO
    // -------------------------------------------------------------

    if (estado === 'jugando') {

        // Actualizar movimiento
        actualizarJugador(dt);


        // Actualizar enemigos
        if (estado === 'jugando') {

            actualizarEnemigos(dt, tiempo);
        }


        // Actualizar gemas
        if (estado === 'jugando') {

            actualizarGemas(dt, tiempo);
        }


        // Actualizar temporizador
        if (estado === 'jugando') {

            tiempoRestante -= dt;


            // Si se termina el tiempo pierde una vida
            if (tiempoRestante <= 0) {

                tiempoRestante = 0;

                perderVida(true);
            }
        }


    // -------------------------------------------------------------
    // ESTADO: MURIENDO
    // -------------------------------------------------------------

    } else if (estado === 'muriendo') {

        actualizarMuerte(dt);
    }


    // -------------------------------------------------------------
    // ANIMACIONES
    // -------------------------------------------------------------

    if (estado !== 'pausa') {

        actualizarParticulas(dt);

        animarNivel(dt, tiempo);
    }


    // -------------------------------------------------------------
    // ACTUALIZAR CÁMARA  INTERFAZ
    // -------------------------------------------------------------

    if (estado !== 'inicio') {

        actualizarCamara(dt);

        actualizarHUD();


    } else {

        // Cámara animada del menú inicial
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

        actualizarFondo(dt);
    }


    // Dibujar escena 3D.
    renderer.render(scene, camera);
}

// Mostrar pantalla de inicio
ui.inicio.classList.remove('oculto');


// Construir el escenario
construirNivel();


// Colocar a Junimo
reaparecerJugador();


// Sincronizar el modelo 3D
actualizarModeloJugador(0);


// Iniciar el bucle de renderizado
renderer.setAnimationLoop(animate);