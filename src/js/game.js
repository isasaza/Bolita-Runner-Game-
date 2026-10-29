/* Logica de todo el juego 

   SISTEMA DE COORDENADAS:
    - Bloque 1x1x1
    - Eje X -> Derecha (avance del jugador)
    - Eje Y -> Arriba (altura del jugador)
    - Eje Z -> Adelante (profundidad)
*/
import * as THREE from 'three';

const CONFIG = {
    GRAVEDAD: -32,
    VEL_CAMINAR: 6,
    VEL_CORRER: 9,
    ACELERACION: 40,
    FRICCION: 30,
    FUERZA_SALTO: 15,
    CORTE_SALTO: 0.45,      // al soltar el salto se multiplica vy por esto (salto variable)
    VEL_MAX_CAIDA: -20,
    TIEMPO_COYOTE: 0.1,     // margen para saltar justo después de salir de un borde
    BUFFER_SALTO: 0.12,     // margen para "adelantar" el salto antes de tocar el suelo
    VIDAS_INICIALES: 3,
    TIEMPO_NIVEL: 300,
    LIMITE_CAIDA: -5,
    VEL_ENEMIGO: 1.5,
    INVULNERABLE: 2.0,
    RADIO: 0.4,             // radio de la bolita
    REBOTE_PISADA: 11,      // impulso al aplastar un enemigo
};

/* ================= MAPA (TILEMAP) =================
    # Suelo | G sorpresa | C columna | E enemigo | K checkpoint
    B ladrillo (rompible) | S piedra | o gema | P inicio | F meta
*/
const MAPA_NIVEL = [
  "",
  "                                                                   ooo                               SS",
  "          G                                                        BBB                              SSS",
  "                              oooo                                                                 SSSS",
  "                              BBBB                    SS   S                                      SSSSS",
  "        GBGBG                                        SSS   SS     BGBGB          oo   GGG        SSSSSS",
  "                    C                     C         SSSS   SSS                                  SSSSSSS",
  "  P            E    C               E E   C    E   SSSSS   SSSS K       E E               E    SSSSSSSS   F",
  "#########################  #############################   ######################  ###########################",
];

// K y F NO son sólidos: la bolita las atraviesa para activarlas.
const SOLIDOS = new Set(["#", "B", "G", "S", "C", "U"]);
const R = CONFIG.RADIO;
const COLOR_CIELO = 0x6ec6ff;

/* ================= ESCENA ================= */
const scene = new THREE.Scene();
scene.background = new THREE.Color(COLOR_CIELO);
scene.fog = new THREE.Fog(COLOR_CIELO, 25, 60);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(6, 4, 14);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setAnimationLoop(animate);
document.body.appendChild(renderer.domElement);

// Luces: ambiental (base) + direccional (da sombras y volumen)
scene.add(new THREE.AmbientLight(0xffffff, 1.1));
const luz = new THREE.DirectionalLight(0xffffff, 2.2);
luz.castShadow = true;
luz.shadow.mapSize.set(2048, 2048);
luz.shadow.camera.left = -25;
luz.shadow.camera.right = 25;
luz.shadow.camera.top = 15;
luz.shadow.camera.bottom = -15;
luz.shadow.camera.near = 1;
luz.shadow.camera.far = 80;
scene.add(luz);
scene.add(luz.target);

window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
});

/* ================= TEXTURAS (archivos de imagen) ================= */
const loader = new THREE.TextureLoader();

function cargarTextura(url, repetirY = 1) {
    const t = loader.load(url);
    t.colorSpace = THREE.SRGBColorSpace;
    t.magFilter = THREE.NearestFilter;          // look pixelado
    t.minFilter = THREE.NearestFilter;
    if (repetirY > 1) {
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.repeat.set(1, repetirY);
    }
    return t;
}

// Rutas relativas al index.html (está al mismo nivel que la carpeta src/)
const texPasto        = cargarTextura('src/img/texture/pasto.jpg');
const texTierra       = cargarTextura('src/img/texture/tierra.png');
const texTierraRelleno = cargarTextura('src/img/texture/tierra.png', 4);
const texSueloLado    = cargarTextura('src/img/texture/tierra-lado.png');
const texLadrillo     = cargarTextura('src/img/texture/ladrillo.jpg');
const texSorpresa     = cargarTextura('src/img/texture/misterio.jpg');
const texUsado        = cargarTextura('src/img/texture/muro.png');      // bloque usado
const texPiedra       = cargarTextura('src/img/texture/roca.png');
const texColumna      = cargarTextura('src/img/texture/pilar.png');

// La bolita no tiene textura propia → se mantiene generada con canvas
function crearTextura(dibujar, repetirY = 1) {
    const tam = 64;
    const c = document.createElement('canvas');
    c.width = c.height = tam;
    dibujar(c.getContext('2d'), tam);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.magFilter = THREE.NearestFilter;
    if (repetirY > 1) {
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.repeat.set(1, repetirY);
    }
    return t;
}

const texBola = crearTextura((g, t) => {
    g.fillStyle = '#ff7043'; g.fillRect(0, 0, t, t);
    g.fillStyle = '#ffee58';
    for (let x = 0; x < t; x += 16) g.fillRect(x, 0, 8, t);   // franjas para ver que rueda
    g.fillStyle = '#212121'; g.fillRect(0, t / 2 - 3, t, 6);
});

/* ================= MATERIALES Y GEOMETRÍAS ================= */
const matSueloLado = new THREE.MeshLambertMaterial({ map: texSueloLado });
const MATERIALES = {
    // Orden de caras del BoxGeometry: [+X, -X, +Y (arriba), -Y (abajo), +Z, -Z]
    suelo: [
        matSueloLado, matSueloLado,
        new THREE.MeshLambertMaterial({ map: texPasto }),
        new THREE.MeshLambertMaterial({ map: texTierra }),
        matSueloLado, matSueloLado,
    ],
    tierra:   new THREE.MeshLambertMaterial({ map: texTierraRelleno }),
    ladrillo: new THREE.MeshLambertMaterial({ map: texLadrillo }),
    sorpresa: new THREE.MeshLambertMaterial({ map: texSorpresa, emissive: 0x332200 }),
    usado:    new THREE.MeshLambertMaterial({ map: texUsado }),
    piedra:   new THREE.MeshLambertMaterial({ map: texPiedra }),
    columna:  new THREE.MeshLambertMaterial({ map: texColumna }),
    gema:     new THREE.MeshPhongMaterial({ color: 0x26c6da, emissive: 0x0b5560, shininess: 100 }),
    bola:     new THREE.MeshPhongMaterial({ map: texBola, shininess: 60 }),
    enemigo:  new THREE.MeshLambertMaterial({ color: 0x8e24aa }),
    ojo:      new THREE.MeshBasicMaterial({ color: 0xffffff }),
    pupila:   new THREE.MeshBasicMaterial({ color: 0x000000 }),
    poste:    new THREE.MeshLambertMaterial({ color: 0xeeeeee }),
    cpOff:    new THREE.MeshLambertMaterial({ color: 0xff595e }),
    cpOn:     new THREE.MeshLambertMaterial({ color: 0x66bb6a }),
    meta:     new THREE.MeshLambertMaterial({ color: 0xffd23f }),
    trozo:    new THREE.MeshLambertMaterial({ color: 0xb5523b }),
};

const GEO_BLOQUE = new THREE.BoxGeometry(1, 1, 1);
const GEO_TIERRA = new THREE.BoxGeometry(1, 4, 1);
const GEO_GEMA = new THREE.OctahedronGeometry(0.28);
const GEO_TROZO = new THREE.BoxGeometry(0.2, 0.2, 0.2);

/* ================= ESTADO DEL JUEGO ================= */
let grupoNivel = null,
    bloques = new Map(),
    gemas = [],
    enemigos = [],
    particulas = [],
    checkpoints = [],
    rebotando = [],
    posicionInicial = { x: 2.5, y: 1 },
    puntoControl = null,
    banderaMeta = null;

let estado = 'inicio';   // 'inicio' | 'jugando' | 'pausa' | 'fin'
let vidas = CONFIG.VIDAS_INICIALES, nGemas = 0, puntos = 0, tiempo = CONFIG.TIEMPO_NIVEL;

const clave = (x, y) => x + "," + y;
const $ = (id) => document.getElementById(id);

/* ================= CONSTRUCCIÓN DEL NIVEL ================= */
function construirNivel() {
    if (grupoNivel) scene.remove(grupoNivel);
    grupoNivel = new THREE.Group();
    scene.add(grupoNivel);

    bloques = new Map();
    gemas = []; enemigos = []; particulas = []; checkpoints = []; rebotando = [];
    banderaMeta = null;

    const alto = MAPA_NIVEL.length;
    MAPA_NIVEL.forEach((fila, y) => {
        const yMundo = alto - 1 - y;   // (0,0) abajo a la izquierda
        for (let x = 0; x < fila.length; x++) {
            const c = fila[x];
            if (SOLIDOS.has(c)) crearBloque(x, yMundo, c);
            else if (c === 'o') crearGema(x, yMundo);
            else if (c === 'E') crearEnemigo(x, yMundo);
            else if (c === 'K') crearCheckpoint(x, yMundo);
            else if (c === 'F') crearMeta(x, yMundo);
            else if (c === 'P') posicionInicial = { x: x + 0.5, y: yMundo + R + 0.01 };
        }
    });
}

function crearBloque(x, y, tipo) {
    const material = {
        "#": MATERIALES.suelo, "B": MATERIALES.ladrillo, "G": MATERIALES.sorpresa,
        "S": MATERIALES.piedra, "C": MATERIALES.columna, "U": MATERIALES.usado,
    }[tipo];

    const malla = new THREE.Mesh(GEO_BLOQUE, material);
    malla.position.set(x + 0.5, y + 0.5, 0);
    malla.castShadow = true;
    malla.receiveShadow = true;
    grupoNivel.add(malla);
    bloques.set(clave(x, y), { x, y, tipo, malla, rebote: 0 });

    if (tipo === "#") {   // tierra decorativa debajo del suelo (sin colisión)
        const tierra = new THREE.Mesh(GEO_TIERRA, MATERIALES.tierra);
        tierra.position.set(x + 0.5, y - 2, 0);
        tierra.receiveShadow = true;
        grupoNivel.add(tierra);
    }
}

function crearGema(x, y) {
    const malla = new THREE.Mesh(GEO_GEMA, MATERIALES.gema);
    malla.position.set(x + 0.5, y + 0.5, 0);
    malla.castShadow = true;
    grupoNivel.add(malla);
    gemas.push({ malla, x: x + 0.5, y: y + 0.5, baseY: y + 0.5 });
}

function crearEnemigo(x, y) {
    const g = new THREE.Group();
    const cuerpo = new THREE.Mesh(new THREE.SphereGeometry(0.4, 16, 12), MATERIALES.enemigo);
    cuerpo.castShadow = true;
    g.add(cuerpo);
    for (const lado of [-1, 1]) {           // ojitos
        const ojo = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), MATERIALES.ojo);
        ojo.position.set(lado * 0.17, 0.1, 0.33);
        const pupila = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), MATERIALES.pupila);
        pupila.position.set(lado * 0.17, 0.1, 0.42);
        g.add(ojo, pupila);
    }
    g.position.set(x + 0.5, y + 0.4, 0);
    grupoNivel.add(g);
    enemigos.push({ malla: g, x: x + 0.5, y: y + 0.4, dir: -1, vivo: true, aplastado: 0 });
}

function crearPoste(x, y, alto, matBandera) {
    const g = new THREE.Group();
    const poste = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, alto, 8), MATERIALES.poste);
    poste.position.y = alto / 2;
    const bandera = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.45, 0.05), matBandera);
    bandera.position.set(0.38, alto - 0.3, 0);
    g.add(poste, bandera);
    g.position.set(x + 0.5, y, 0);
    grupoNivel.add(g);
    return { grupo: g, bandera };
}

function crearCheckpoint(x, y) {
    const p = crearPoste(x, y, 1.6, MATERIALES.cpOff);
    checkpoints.push({ x: x + 0.5, y, activo: false, bandera: p.bandera });
}

function crearMeta(x, y) {
    crearPoste(x, y, 3.5, MATERIALES.meta);
    banderaMeta = { x: x + 0.5 };
}

/* ================= JUGADOR (LA BOLITA) ================= */
const jug = { x: 0, y: 0, vx: 0, vy: 0, enSuelo: false, coyote: 0, buffer: 0, invul: 0, saltando: false };
const mallaJugador = new THREE.Mesh(new THREE.SphereGeometry(R, 24, 16), MATERIALES.bola);
mallaJugador.castShadow = true;
scene.add(mallaJugador);

function reaparecer() {
    const p = puntoControl || posicionInicial;
    jug.x = p.x; jug.y = p.y;
    jug.vx = 0; jug.vy = 0;
    jug.invul = CONFIG.INVULNERABLE;
}

/* ================= TECLADO ================= */
const teclas = {};
const TECLAS_SALTO = ['Space', 'ArrowUp', 'KeyW'];

window.addEventListener('keydown', (e) => {
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    teclas[e.code] = true;
    if (TECLAS_SALTO.includes(e.code) && !e.repeat) jug.buffer = CONFIG.BUFFER_SALTO;
    if (e.code === 'KeyP' && !e.repeat) alternarPausa();
});

window.addEventListener('keyup', (e) => {
    teclas[e.code] = false;
    // Salto variable: si sueltas la tecla mientras subes, el salto se corta
    if (TECLAS_SALTO.includes(e.code) && jug.saltando && jug.vy > 0) {
        jug.vy *= CONFIG.CORTE_SALTO;
        jug.saltando = false;
    }
});

/* ================= FÍSICA Y COLISIONES ================= */
const EPS = 0.001;
const esSolido = (tx, ty) => bloques.has(clave(tx, ty));

function resolverX(dx) {
    if (dx === 0) return;
    const y0 = Math.floor(jug.y - R + EPS), y1 = Math.floor(jug.y + R - EPS);
    const x0 = Math.floor(jug.x - R), x1 = Math.floor(jug.x + R);
    for (let ty = y0; ty <= y1; ty++) {
        for (let tx = x0; tx <= x1; tx++) {
            if (!esSolido(tx, ty)) continue;
            jug.x = dx > 0 ? tx - R - EPS : tx + 1 + R + EPS;
            jug.vx = 0;
        }
    }
}

function resolverY(dy) {
    if (dy === 0) return;
    const x0 = Math.floor(jug.x - R + EPS), x1 = Math.floor(jug.x + R - EPS);
    const y0 = Math.floor(jug.y - R), y1 = Math.floor(jug.y + R);
    let golpe = null;
    for (let ty = y0; ty <= y1; ty++) {
        for (let tx = x0; tx <= x1; tx++) {
            if (!esSolido(tx, ty)) continue;
            if (dy < 0) {                       // cayendo -> aterriza
                jug.y = ty + 1 + R + EPS;
                jug.vy = 0;
                jug.enSuelo = true;
                jug.saltando = false;
            } else {                            // subiendo -> se pega con la cabeza
                jug.y = ty - R - EPS;
                jug.vy = 0;
                const dist = Math.abs(tx + 0.5 - jug.x);
                if (!golpe || dist < golpe.dist) golpe = { tx, ty, dist };
            }
        }
    }
    if (golpe) golpearBloque(golpe.tx, golpe.ty);   // solo el bloque más cercano al centro
}

function actualizarJugador(dt) {
    const izq = teclas.ArrowLeft || teclas.KeyA;
    const der = teclas.ArrowRight || teclas.KeyD;
    const dir = (der ? 1 : 0) - (izq ? 1 : 0);
    const vMax = (teclas.ShiftLeft || teclas.ShiftRight) ? CONFIG.VEL_CORRER : CONFIG.VEL_CAMINAR;

    // Movimiento horizontal con aceleración y fricción
    if (dir !== 0) {
        const acel = (dir * jug.vx < 0) ? CONFIG.ACELERACION * 2 : CONFIG.ACELERACION; // giro rápido
        jug.vx += dir * acel * dt;
        jug.vx = Math.max(-vMax, Math.min(vMax, jug.vx));
    } else {
        const f = CONFIG.FRICCION * dt;
        jug.vx = Math.abs(jug.vx) <= f ? 0 : jug.vx - Math.sign(jug.vx) * f;
    }

    // Gravedad
    jug.vy = Math.max(jug.vy + CONFIG.GRAVEDAD * dt, CONFIG.VEL_MAX_CAIDA);

    // Coyote time y buffer de salto
    jug.coyote = jug.enSuelo ? CONFIG.TIEMPO_COYOTE : jug.coyote - dt;
    jug.buffer -= dt;
    if (jug.buffer > 0 && jug.coyote > 0) {
        jug.vy = CONFIG.FUERZA_SALTO;
        jug.saltando = true;
        jug.buffer = 0;
        jug.coyote = 0;
    }

    // Mover en X y resolver, luego en Y y resolver (por separado = colisiones estables)
    const dx = jug.vx * dt;
    jug.x += dx;
    if (jug.x < R) { jug.x = R; jug.vx = 0; }   // pared invisible a la izquierda
    resolverX(dx);

    const dy = jug.vy * dt;
    jug.y += dy;
    jug.enSuelo = false;
    resolverY(dy);

    // Invulnerabilidad (parpadeo)
    if (jug.invul > 0) jug.invul -= dt;
    mallaJugador.visible = jug.invul <= 0 || Math.floor(jug.invul * 10) % 2 === 0;

    // Dibujar: posición y rodar
    mallaJugador.position.set(jug.x, jug.y, 0);
    mallaJugador.rotation.z -= (jug.vx * dt) / R;

    // Caer al vacío
    if (jug.y < CONFIG.LIMITE_CAIDA) perderVida();
}

/* ================= BLOQUES GOLPEADOS DESDE ABAJO ================= */
function golpearBloque(tx, ty) {
    const b = bloques.get(clave(tx, ty));
    if (!b) return;

    if (b.tipo === 'B') {
        bloques.delete(clave(tx, ty));
        grupoNivel.remove(b.malla);
        puntos += 10;
        for (let i = 0; i < 8; i++) {       // lluvia de pedazos
            const t = new THREE.Mesh(GEO_TROZO, MATERIALES.trozo);
            t.position.set(tx + 0.5, ty + 0.5, 0);
            grupoNivel.add(t);
            particulas.push({
                malla: t,
                vx: (Math.random() - 0.5) * 6,
                vy: 4 + Math.random() * 5,
                vida: 1.2,
            });
        }
        actualizarHUD();
    } else if (b.tipo === 'G') {
        b.tipo = 'U';
        b.malla.material = MATERIALES.usado;
        b.rebote = 0.2;
        rebotando.push(b);
        sumarGema();
        puntos += 20;
        actualizarHUD();
    } else {
        b.rebote = 0.2;                     // los demás solo "tiemblan"
        if (!rebotando.includes(b)) rebotando.push(b);
    }
}

function actualizarBloquesRebote(dt) {
    for (let i = rebotando.length - 1; i >= 0; i--) {
        const b = rebotando[i];
        b.rebote -= dt;
        if (b.rebote <= 0) {
            b.malla.position.y = b.y + 0.5;
            rebotando.splice(i, 1);
        } else {
            b.malla.position.y = b.y + 0.5 + Math.sin((b.rebote / 0.2) * Math.PI) * 0.25;
        }
    }
}

function actualizarParticulas(dt) {
    for (let i = particulas.length - 1; i >= 0; i--) {
        const p = particulas[i];
        p.vy -= 25 * dt;
        p.malla.position.x += p.vx * dt;
        p.malla.position.y += p.vy * dt;
        p.malla.rotation.x += 6 * dt;
        p.vida -= dt;
        if (p.vida <= 0) {
            grupoNivel.remove(p.malla);
            particulas.splice(i, 1);
        }
    }
}

/* ================= GEMAS, ENEMIGOS, CHECKPOINTS, META ================= */
function sumarGema() {
    nGemas++;
    puntos += 50;
    if (nGemas % 10 === 0) {
        vidas++;
        mostrarAviso('¡Vida extra!');
    }
    actualizarHUD();
}

function actualizarGemas(dt, t) {
    for (let i = gemas.length - 1; i >= 0; i--) {
        const g = gemas[i];
        g.malla.rotation.y += 2.5 * dt;
        g.malla.position.y = g.baseY + Math.sin(t * 3 + g.x) * 0.1;
        const dx = jug.x - g.x, dy = jug.y - g.baseY;
        if (dx * dx + dy * dy < 0.6 * 0.6) {
            grupoNivel.remove(g.malla);
            gemas.splice(i, 1);
            sumarGema();
        }
    }
}

function actualizarEnemigos(dt) {
    for (let i = enemigos.length - 1; i >= 0; i--) {
        const e = enemigos[i];

        if (!e.vivo) {                       // animación de aplastado
            e.aplastado -= dt;
            e.malla.scale.y = 0.2;
            e.malla.position.y = e.y - 0.3;
            if (e.aplastado <= 0) {
                grupoNivel.remove(e.malla);
                enemigos.splice(i, 1);
            }
            continue;
        }

        // Patrulla: gira si hay pared adelante o si no hay suelo adelante
        e.x += e.dir * CONFIG.VEL_ENEMIGO * dt;
        const frenteX = Math.floor(e.x + e.dir * 0.45);
        const hayPared = esSolido(frenteX, Math.floor(e.y));
        const haySuelo = esSolido(frenteX, Math.floor(e.y - 0.6));
        if (hayPared || !haySuelo) {
            e.dir *= -1;
            e.x += e.dir * CONFIG.VEL_ENEMIGO * dt;
        }
        e.malla.position.set(e.x, e.y, 0);
        e.malla.rotation.y = e.dir > 0 ? 0.5 : -0.5;

        // Colisión con la bolita
        const dx = jug.x - e.x, dy = jug.y - e.y;
        if (dx * dx + dy * dy < (R + 0.4) * (R + 0.4)) {
            if (jug.vy < 0 && jug.y > e.y + 0.15) {     // cayendo desde arriba = aplastar
                e.vivo = false;
                e.aplastado = 0.4;
                jug.vy = CONFIG.REBOTE_PISADA;
                jug.saltando = true;
                puntos += 100;
                actualizarHUD();
            } else if (jug.invul <= 0) {
                perderVida();
            }
        }
    }
}

function actualizarCheckpoints() {
    for (const c of checkpoints) {
        if (!c.activo && jug.x > c.x) {
            c.activo = true;
            c.bandera.material = MATERIALES.cpOn;
            puntoControl = { x: c.x, y: c.y + R + 0.01 };
            mostrarAviso('¡Punto de control!');
        }
    }
}

/* ================= VIDAS, HUD Y PANTALLAS ================= */
function actualizarHUD() {
    $('hud-vidas').textContent = vidas;
    $('hud-gemas').textContent = nGemas;
    $('hud-puntos').textContent = puntos;
    $('hud-tiempo').textContent = Math.max(0, Math.ceil(tiempo));
}

let temporizadorAviso = null;
function mostrarAviso(texto) {
    const a = $('aviso');
    a.textContent = texto;
    a.classList.remove('oculto');
    clearTimeout(temporizadorAviso);
    temporizadorAviso = setTimeout(() => a.classList.add('oculto'), 1500);
}

function perderVida() {
    if (jug.invul > 0 && jug.y >= CONFIG.LIMITE_CAIDA) return;
    vidas--;
    actualizarHUD();
    if (vidas <= 0) terminar(false, 'GAME OVER');
    else reaparecer();
}

function terminar(gano, titulo) {
    estado = 'fin';
    if (gano) puntos += Math.ceil(tiempo) * 10;   // bonus por tiempo restante
    $('fin-titulo').textContent = titulo;
    $('fin-detalle').textContent = `Puntos: ${puntos}  |  Gemas: ${nGemas}`;
    $('pantalla-fin').classList.remove('oculto');
    actualizarHUD();
}

function iniciar() {
    vidas = CONFIG.VIDAS_INICIALES; nGemas = 0; puntos = 0;
    tiempo = CONFIG.TIEMPO_NIVEL;
    puntoControl = null;
    construirNivel();
    reaparecer();
    actualizarHUD();
    ['pantalla-inicio', 'pantalla-pausa', 'pantalla-fin'].forEach(id => $(id).classList.add('oculto'));
    estado = 'jugando';
}

function alternarPausa() {
    if (estado === 'jugando') {
        estado = 'pausa';
        $('pantalla-pausa').classList.remove('oculto');
    } else if (estado === 'pausa') {
        estado = 'jugando';
        $('pantalla-pausa').classList.add('oculto');
    }
}

$('btn-jugar').addEventListener('click', iniciar);
$('btn-reiniciar').addEventListener('click', iniciar);

/* ================= CÁMARA ================= */
function actualizarCamara(dt) {
    const objX = Math.max(jug.x + 2, 6);
    const objY = Math.max(jug.y, 2) + 1.5;     // no baja al caer en un hueco
    const k = Math.min(1, 6 * dt);
    camera.position.x += (objX - camera.position.x) * k;
    camera.position.y += (objY - camera.position.y) * k;
    camera.position.z = 14;
    camera.lookAt(camera.position.x, camera.position.y - 0.5, 0);

    // La luz sigue al jugador para que las sombras siempre se vean
    luz.position.set(jug.x + 10, 20, 15);
    luz.target.position.set(jug.x, 0, 0);
}

/* ================= INICIO Y BUCLE PRINCIPAL ================= */
construirNivel();        // se construye UNA vez al cargar (no en animate)
reaparecer();
mallaJugador.position.set(jug.x, jug.y, 0);
$('pantalla-inicio').classList.remove('oculto');

const reloj = new THREE.Clock();

function animate() {
    const dt = Math.min(reloj.getDelta(), 1 / 30);   // limitar dt evita saltos al cambiar de pestaña
    const t = reloj.elapsedTime;

    if (estado === 'jugando') {
        tiempo -= dt;
        if (tiempo <= 0) { tiempo = 0; terminar(false, '¡SE ACABÓ EL TIEMPO!'); }

        actualizarJugador(dt);
        actualizarEnemigos(dt);
        actualizarGemas(dt, t);
        actualizarCheckpoints();
        actualizarBloquesRebote(dt);
        actualizarParticulas(dt);
        actualizarHUD();

        if (banderaMeta && jug.x > banderaMeta.x - 0.3 && estado === 'jugando') {
            terminar(true, '¡NIVEL COMPLETADO!');
        }
    }

    actualizarCamara(dt);
    renderer.render(scene, camera);
}