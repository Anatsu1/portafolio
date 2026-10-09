import * as THREE from "three";
import { CAMERA_POS } from "./cellLayout";
import {
  SPLAT_SIZE,
  SPLAT_WORLD,
  airParticles,
  buildSplat,
  groundHeight,
  placeTrees,
  placeUndergrowth,
  shaftAnchors,
  type Prop,
  type Tree,
} from "./forestScatter";
import * as geo from "./forestGeometry";
import * as flora from "./forestFlora";
import * as tex from "./forestTextures";

/**
 * Arma el bosque en three "puro": materiales, InstancedMesh por cada pieza
 * (un draw call por pieza, sin importar cuántos árboles haya), haces de luz y
 * partículas. `Forest.tsx` lo monta una vez y solo le cambia el tema.
 */

/** Posición del sol (dirección) en cada tema; la luz direccional de Forest usa la misma. */
export const FOREST_LAYER = 1;

export const SUN = {
  day: new THREE.Vector3(7, 11, -13),
  dusk: new THREE.Vector3(17, 3.2, -8),
};

// Uniforms compartidos por todo lo que se mueve con el viento.
const shared = {
  uTime: { value: 0 },
  uSunView: { value: new THREE.Vector3(0, 0, -1) },
  uTransColor: { value: new THREE.Color(0, 0, 0) },
};

/**
 * Follaje: balanceo por viento en el vértice (más amplitud cuanto más alto
 * respecto de `base`, fase distinta por instancia), normales sin invertir en
 * la cara trasera (las tarjetas usan normales "esféricas" de la copa) y un
 * poco de luz transmitida cuando se mira hacia el sol (contraluz).
 */
function foliage(mat: THREE.MeshStandardMaterial, amp: number, base: number) {
  const local = { uWindAmp: { value: amp }, uWindBase: { value: base } };
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, shared, local);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nuniform float uTime;\nuniform float uWindAmp;\nuniform float uWindBase;")
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        vec3 ip = vec3(0.0);
        #ifdef USE_INSTANCING
          ip = instanceMatrix[3].xyz;
        #endif
        float ph = ip.x * 0.37 + ip.z * 0.23;
        float hh = max(position.y - uWindBase, 0.0);
        float gust = 0.6 + 0.4 * sin(uTime * 0.27 + ip.x * 0.06 - ip.z * 0.04);
        float sw = (sin(uTime * 1.2 + ph) * 0.7 + sin(uTime * 2.3 + ph * 1.7) * 0.3) * gust;
        transformed.x += sw * hh * uWindAmp;
        transformed.z += cos(uTime * 1.0 + ph * 1.3) * 0.45 * hh * uWindAmp * gust;
        transformed.y += sin(uTime * 4.0 + dot(position, vec3(6.0, 3.0, 5.0))) * min(hh, 1.5) * uWindAmp * 0.15;`
      );
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform vec3 uSunView;\nuniform vec3 uTransColor;")
      .replace("#include <normal_fragment_begin>", THREE.ShaderChunk.normal_fragment_begin.replace("normal *= faceDirection;", ""))
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
        float backLit = pow(max(dot(normalize(-vViewPosition), uSunView), 0.0), 5.0);
        totalEmissiveRadiance += diffuseColor.rgb * uTransColor * backLit;`
      );
  };
  return mat;
}

const dummy = new THREE.Object3D();
const tmpColor = new THREE.Color();

type Placement = { x: number; y: number; z: number; rotY: number; tiltX?: number; tiltZ?: number; sx: number; sy: number; sz: number; tone: number };

/** InstancedMesh con matrices y una leve variación de color por instancia. */
function instances(
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  items: Placement[],
  tint: (tone: number, color: THREE.Color) => THREE.Color,
  order: THREE.EulerOrder = "XZY"
) {
  const mesh = new THREE.InstancedMesh(geometry, material, Math.max(1, items.length));
  mesh.count = items.length;
  items.forEach((it, i) => {
    dummy.position.set(it.x, it.y, it.z);
    dummy.rotation.set(it.tiltX ?? 0, it.rotY, it.tiltZ ?? 0, order);
    dummy.scale.set(it.sx, it.sy, it.sz);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
    mesh.setColorAt(i, tint(it.tone, tmpColor.setRGB(1, 1, 1)));
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.computeBoundingSphere();
  return mesh;
}

const fromTree = (t: Tree, k = 1): Placement => ({
  x: t.x,
  y: t.y,
  z: t.z,
  rotY: t.rotY,
  tiltX: t.tiltX,
  tiltZ: t.tiltZ,
  sx: t.scale * k,
  sy: t.scale * k * (0.92 + ((t.rotY * 7.3) % 1) * 0.16),
  sz: t.scale * k,
  tone: (t.rotY * 3.7) % 1,
});

const fromProp = (p: Prop, sy = p.scale * (p.sy ?? 1)): Placement => ({
  x: p.x,
  y: p.y,
  z: p.z,
  rotY: p.rotY,
  tiltX: p.tiltX,
  tiltZ: p.tiltZ,
  sx: p.scale,
  sy,
  sz: p.scale,
  tone: p.tone,
});

/** Variación de tono: `amount` de 0 (uniforme) a 1 (mucha variación). */
const vary = (amount: number, warm = 0) => (tone: number, c: THREE.Color) =>
  c.setRGB(1 - amount * 0.5 + amount * tone * 0.5 + warm * tone, 1 - amount * 0.5 + amount * tone * 0.45, 1 - amount * 0.5 + amount * tone * 0.3 - warm * tone);

/** Haces de luz: tiras aditivas orientadas hacia el sol y de frente a la cámara. */
function shaftGeometry(anchors: ReturnType<typeof shaftAnchors>, sun: THREE.Vector3, dusk: boolean) {
  const positions: number[] = [];
  const uvs: number[] = [];
  const colors: number[] = [];
  const index: number[] = [];
  const axis = sun.clone().normalize();
  const cam = new THREE.Vector3(CAMERA_POS.x, CAMERA_POS.y, CAMERA_POS.z);
  anchors.forEach((a, i) => {
    const length = dusk ? 16 : 11;
    const lift = dusk ? 0.4 + (i % 3) * 0.5 : -0.2;
    const foot = new THREE.Vector3(a.x, groundHeight(a.x, a.z) + lift, a.z);
    const head = foot.clone().addScaledVector(axis, length);
    const mid = foot.clone().lerp(head, 0.5);
    const side = new THREE.Vector3().crossVectors(axis, mid.clone().sub(cam)).normalize().multiplyScalar(a.width / 2);
    const base = positions.length / 3;
    // v = 1 en la cabeza (hacia el sol), v = 0 al pie.
    for (const [p, v] of [
      [foot, 0],
      [head, 1],
    ] as const) {
      for (const s of [-1, 1]) {
        const q = p.clone().addScaledVector(side, s * (v ? 1.6 : 1));
        positions.push(q.x, q.y, q.z);
        uvs.push(s < 0 ? 0 : 1, v);
        colors.push(a.strength, a.strength, a.strength);
      }
    }
    index.push(base, base + 1, base + 3, base, base + 3, base + 2);
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  g.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  g.setIndex(index);
  g.computeBoundingSphere();
  return g;
}

export type ForestKit = ReturnType<typeof buildForestKit>;

/** Colores de hojas por instancia: de día verdes variados; al atardecer, algunos otoñales. */
const LEAVES_DAY = ["#86b64e", "#5e9a3e", "#9db04e", "#6aa65a", "#78a844", "#4f8a3c"];
const LEAVES_DUSK = ["#7aa046", "#55853a", "#e2a446", "#d9772f", "#b9502f", "#8fa040", "#e6b850"];

export function buildForestKit() {
  const disposables: { dispose: () => void }[] = [];
  const keep = <T extends { dispose: () => void }>(x: T) => {
    disposables.push(x);
    return x;
  };
  const group = new THREE.Group();
  group.name = "forest";

  // ---- Datos ----
  const trees = placeTrees();
  const under = placeUndergrowth(trees);

  // ---- Texturas ----
  const bark = tex.barkTextures();
  keep(bark.map);
  keep(bark.bump);
  const litter = keep(tex.leafLitterTexture());
  const dirt = keep(tex.dirtTexture());
  const grassGround = keep(tex.groundGrassTexture());
  const dapple = keep(tex.dappleTexture());
  const oakLeaves = keep(tex.leafSprigTexture(41, true));
  const leaves = keep(tex.leafSprigTexture(43, false));
  const fern = keep(tex.fernTexture());
  const shaftTex = keep(tex.shaftTexture());

  const splat = keep(new THREE.DataTexture(buildSplat(trees), SPLAT_SIZE, SPLAT_SIZE, THREE.RGBAFormat));
  splat.magFilter = THREE.LinearFilter;
  splat.minFilter = THREE.LinearFilter;
  splat.needsUpdate = true;

  // ---- Suelo ----
  const groundGeo = keep(new THREE.PlaneGeometry(SPLAT_WORLD, SPLAT_WORLD, 100, 100));
  groundGeo.rotateX(-Math.PI / 2);
  {
    const pos = groundGeo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) pos.setY(i, groundHeight(pos.getX(i), pos.getZ(i)) - 0.03);
    groundGeo.computeVertexNormals();
  }
  const groundUniforms = {
    uSplat: { value: splat },
    uLitter: { value: litter },
    uDirt: { value: dirt },
    uGrass: { value: grassGround },
    uDapple: { value: dapple },
    uDappleAmt: { value: 1 },
  };
  const groundMat = keep(new THREE.MeshStandardMaterial({ roughness: 1, metalness: 0 }));
  groundMat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, groundUniforms, { uTime: shared.uTime });
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec2 vXZ;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvXZ = (modelMatrix * vec4(transformed, 1.0)).xz;");
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
        varying vec2 vXZ;
        uniform sampler2D uSplat, uLitter, uDirt, uGrass, uDapple;
        uniform float uDappleAmt, uTime;`
      )
      .replace(
        "#include <map_fragment>",
        `vec4 sp = texture2D(uSplat, (vXZ + ${(SPLAT_WORLD / 2).toFixed(1)}) / ${SPLAT_WORLD.toFixed(1)});
        // Hojarasca de base; dos escalas mezcladas para que no se note la repetición.
        vec3 col = mix(texture2D(uLitter, vXZ / 2.6).rgb, texture2D(uLitter, vXZ / 7.1 + 0.37).rgb, 0.35);
        vec3 grass = mix(texture2D(uGrass, vXZ / 2.2).rgb, texture2D(uGrass, vXZ / 6.3 + 0.21).rgb, 0.4);
        col = mix(col, grass * 0.85, smoothstep(0.15, 0.85, sp.g));
        col = mix(col, texture2D(uDirt, vXZ / 1.8).rgb, smoothstep(0.2, 0.8, sp.r));
        col *= 1.0 - 0.45 * sp.a;
        // Variación grande de tono (zonas más húmedas / más secas).
        col *= mix(1.1, 0.75, texture2D(uDapple, vXZ * 0.013 + 0.2).r);
        // Luz moteada que se cuela entre las copas.
        float dp = texture2D(uDapple, vXZ * 0.05 + vec2(uTime * 0.003, uTime * 0.002)).r;
        float dp2 = texture2D(uDapple, vXZ * 0.021 + 0.5).r;
        col *= mix(1.0 - 0.35 * uDappleAmt, 1.0 + 0.9 * uDappleAmt, dp * (0.5 + 0.5 * dp2));
        diffuseColor.rgb *= col;`
      );
  };
  group.add(new THREE.Mesh(groundGeo, groundMat));

  // ---- Materiales ----
  const barkMat = keep(new THREE.MeshStandardMaterial({ map: bark.map, bumpMap: bark.bump, bumpScale: 2.5, roughness: 0.95, vertexColors: true }));
  // alphaToCoverage: con el MSAA del canvas, el borde recortado de las tarjetas
  // de hojas sale suavizado (three lo afina con fwidth) en vez de dentado.
  const leafOpts = { alphaTest: 0.45, alphaToCoverage: true, side: THREE.DoubleSide, vertexColors: true, roughness: 0.8 } as const;
  const oakMat = keep(foliage(new THREE.MeshStandardMaterial({ ...leafOpts, map: oakLeaves }), 0.016, 1.8));
  const leafMat = keep(foliage(new THREE.MeshStandardMaterial({ ...leafOpts, map: leaves }), 0.016, 1.8));
  const bushMat = keep(foliage(new THREE.MeshStandardMaterial({ ...leafOpts, map: leaves }), 0.03, 0.15));
  const grassMat = keep(foliage(new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.9 }), 0.1, 0));
  const fernMat = keep(foliage(new THREE.MeshStandardMaterial({ map: fern, alphaTest: 0.45, alphaToCoverage: true, side: THREE.DoubleSide, vertexColors: true, roughness: 0.85 }), 0.07, 0.05));
  // Sotobosque propio (forestFlora): rocas con grano triplanar, hongos algo
  // satinados y flores que se mecen con el viento.
  const rockDetail = keep(tex.rockDetailTexture());
  const rockMat = keep(flora.rockMaterial(rockDetail));
  const mushroomMat = keep(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55 }));
  const flowerMat = keep(foliage(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, side: THREE.DoubleSide }), 0.12, 0.02));

  // El entorno (Lightformers) está calibrado fuerte para que brille el metal
  // del brazo; en materiales mates del bosque eso lava todo, así que se baja.
  for (const d of disposables) if (d instanceof THREE.MeshStandardMaterial) d.envMapIntensity = 0.3;

  // ---- Árboles ----
  const byKind = (k: Tree["kind"]) => trees.filter((t) => t.kind === k).map((t) => fromTree(t));
  const barkTint = vary(0.3, 0.03);
  const leafMeshes: { mesh: THREE.InstancedMesh; items: Placement[]; bias: number }[] = [];
  const species: [ReturnType<typeof geo.oakTree>, Placement[], THREE.Material, number][] = [
    [geo.oakTree(), byKind("oak"), oakMat, 0],
    [geo.roundTree(), byKind("round"), leafMat, 0.3],
    [geo.smallTree(), byKind("small"), leafMat, 0.6],
  ];
  for (const [parts, items, mat, bias] of species) {
    keep(parts.bark);
    keep(parts.leaves);
    group.add(instances(parts.bark, barkMat, items, barkTint));
    const mesh = instances(parts.leaves, mat, items, (_, c) => c);
    leafMeshes.push({ mesh, items, bias });
    group.add(mesh);
  }
  const far = trees
    .filter((t) => t.kind === "far")
    .map((t) => ({ ...fromTree(t), sx: 0.3 * t.scale, sz: 0.3 * t.scale, sy: 9 + t.scale * 4 }));
  group.add(instances(keep(geo.farTrunk()), barkMat, far, barkTint));
  const bushItems = under.bushes.map((p) => fromProp(p));
  const bushMesh = instances(keep(geo.bush()), bushMat, bushItems, (_, c) => c);
  leafMeshes.push({ mesh: bushMesh, items: bushItems, bias: 0.15 });
  group.add(bushMesh);

  /** Pinta las copas con la paleta del tema (el tono de cada instancia es fijo). */
  const paintLeaves = (dusk: boolean) => {
    const palette = (dusk ? LEAVES_DUSK : LEAVES_DAY).map((h) => new THREE.Color(h));
    for (const { mesh, items, bias } of leafMeshes) {
      items.forEach((it, i) => {
        const k = (it.tone + bias) % 1;
        mesh.setColorAt(i, tmpColor.copy(palette[Math.floor(k * palette.length)]).multiplyScalar(0.92 + ((k * 7) % 1) * 0.16));
      });
      mesh.instanceColor!.needsUpdate = true;
    }
  };

  // ---- Sotobosque ----
  const grassItems = under.grass.map((p) => fromProp(p, p.scale * (0.8 + p.tone * 0.5)));
  group.add(instances(keep(geo.grassTuft()), grassMat, grassItems, (t, c) => c.setRGB(0.85 + t * 0.25, 0.9 + t * 0.15, 0.8 + t * 0.1)));
  group.add(instances(keep(geo.fernClump()), fernMat, under.ferns.map((p) => fromProp(p)), (t, c) => c.setRGB(0.8 + t * 0.3, 0.85 + t * 0.2, 0.75)));

  /** Un InstancedMesh por geometría; `pick` elige qué props van en cada una. */
  const props = (geometry: THREE.BufferGeometry, mat: THREE.Material, items: Placement[], tint = vary(0.25)) => {
    if (items.length) group.add(instances(keep(geometry), mat, items, tint));
  };
  const byVariant = (list: Prop[], ...v: number[]) => list.filter((p) => v.includes(p.variant)).map((p) => fromProp(p));
  (["daisy", "buttercup", "bell"] as const).forEach((kind, v) => props(flora.flowerClump(kind), flowerMat, byVariant(under.flowers, v), vary(0.12)));
  props(flora.rock(5, 3, 0.55, 0.9), rockMat, byVariant(under.rocks, 0));
  // Piedras chicas y lajas del sendero: la misma geometría, las lajas aplastadas.
  const lajas = under.stones.map((p) => ({ ...fromProp(p, p.scale * 0.32), sx: p.scale * 1.5, sz: p.scale * 1.2 }));
  props(flora.rock(9, 2, 0.2, 0.55), rockMat, [...byVariant(under.rocks, 1), ...lajas], vary(0.3));
  props(flora.fallenLog(), barkMat, byVariant(under.logs, 0, 1), barkTint);
  props(flora.stump(), barkMat, byVariant(under.logs, 2, 3), barkTint);
  props(flora.mushroomCluster(), mushroomMat, under.mushrooms.map((p) => fromProp(p)), vary(0.25, 0.08));

  // ---- Haces de luz ----
  const anchors = shaftAnchors(trees);
  const shaftGeos = { day: keep(shaftGeometry(anchors, SUN.day, false)), dusk: keep(shaftGeometry(anchors, SUN.dusk, true)) };
  const shaftMat = keep(
    new THREE.MeshBasicMaterial({
      map: shaftTex,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      fog: false,
      opacity: 0.2,
    })
  );
  const shafts = new THREE.Mesh(shaftGeos.day, shaftMat);
  shafts.renderOrder = 2;
  group.add(shafts);
  let baseShaft = 0.2;
  const sunWorld = SUN.day.clone().normalize();

  // ---- Partículas en el aire (motas de día, luciérnagas al atardecer) ----
  const air = airParticles(140);
  const airGeo = keep(new THREE.BufferGeometry());
  airGeo.setAttribute("position", new THREE.BufferAttribute(air.positions, 3));
  airGeo.setAttribute("aSeed", new THREE.BufferAttribute(air.seeds, 1));
  const airUniforms = {
    uTime: shared.uTime,
    uSize: { value: 1 },
    uPx: { value: 1 },
    uColor: { value: new THREE.Color() },
    uFlicker: { value: 0 },
    uAlpha: { value: 1 },
  };
  const airMat = keep(
    new THREE.ShaderMaterial({
      uniforms: airUniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */ `
        uniform float uTime, uSize, uPx, uFlicker;
        attribute float aSeed;
        varying float vA;
        void main() {
          float s = aSeed * 6.2831;
          vec3 p = position + vec3(sin(uTime * 0.31 + s * 3.0) * 0.7, sin(uTime * 0.47 + s * 5.0) * 0.35, cos(uTime * 0.27 + s * 2.0) * 0.7);
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          float blink = smoothstep(0.35, 1.0, sin(uTime * (0.7 + aSeed) + s * 7.0) * 0.5 + 0.5);
          vA = mix(0.6 + 0.4 * sin(uTime * 0.8 + s), blink, uFlicker) * smoothstep(34.0, 10.0, -mv.z);
          gl_PointSize = uSize * uPx * 12.0 / -mv.z;
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor;
        uniform float uAlpha;
        varying float vA;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          float a = smoothstep(0.5, 0.0, d);
          gl_FragColor = vec4(uColor, a * a * vA * uAlpha);
        }`,
    })
  );
  const particles = new THREE.Points(airGeo, airMat);
  particles.frustumCulled = false;
  particles.renderOrder = 3;
  group.add(particles);

  // Todo el bosque vive en la capa 1: la cámara principal la ve (Forest la
  // habilita) pero la cámara de ContactShadows no, así no se dibuja dos veces.
  group.traverse((o) => o.layers.set(FOREST_LAYER));

  return {
    group,
    /** Cambia lo que depende del tema (no reconstruye geometría). */
    setTheme(dusk: boolean) {
      paintLeaves(dusk);
      shared.uTransColor.value.set(dusk ? "#ff8a3d" : "#ffd27a").multiplyScalar(dusk ? 0.55 : 0.6);
      groundUniforms.uDappleAmt.value = dusk ? 0.45 : 1;
      shafts.geometry = dusk ? shaftGeos.dusk : shaftGeos.day;
      shaftMat.color.set(dusk ? "#ffae6b" : "#fff1cf");
      baseShaft = dusk ? 0.3 : 0.35;
      airUniforms.uColor.value.set(dusk ? "#d9ff7a" : "#fff4d6");
      airUniforms.uFlicker.value = dusk ? 1 : 0;
      airUniforms.uSize.value = dusk ? 1.6 : 0.7;
      airUniforms.uAlpha.value = dusk ? 1 : 0.35;
      sunWorld.copy(dusk ? SUN.dusk : SUN.day).normalize();
    },
    /** Por cuadro: tiempo del viento y dirección del sol en espacio de vista. */
    update(time: number, camera: THREE.Camera, pixelRatio: number) {
      shared.uTime.value = time;
      shared.uSunView.value.copy(sunWorld).transformDirection(camera.matrixWorldInverse);
      airUniforms.uPx.value = pixelRatio;
      shaftMat.opacity = baseShaft + Math.sin(time * 0.4) * 0.025;
    },
    /** Triángulos y draw calls del bosque (para medir el presupuesto). */
    stats() {
      let tris = 0;
      let calls = 0;
      group.traverse((o) => {
        const m = o as THREE.Mesh;
        if (!m.isMesh) return;
        const g = m.geometry;
        const n = (g.index ? g.index.count : g.attributes.position.count) / 3;
        tris += n * ((o as THREE.InstancedMesh).isInstancedMesh ? (o as THREE.InstancedMesh).count : 1);
        calls++;
      });
      return { tris: Math.round(tris), calls: calls + 1 };
    },
    dispose() {
      disposables.forEach((d) => d.dispose());
    },
  };
}
