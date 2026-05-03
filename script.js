const THREE = window.THREE;

if (!THREE) {
  const fallbackStartBtn = document.getElementById("startBtn");
  const fallbackMessageBox = document.getElementById("message");

  if (fallbackStartBtn && fallbackMessageBox) {
    fallbackStartBtn.addEventListener("click", () => {
      fallbackMessageBox.textContent = "Three.js를 불러오지 못했습니다. 인터넷 연결 또는 CDN 차단을 확인하세요.";
      fallbackMessageBox.classList.add("show");
    });
  }

  throw new Error("Three.js failed to load. Check the CDN script in index.html.");
}

const canvas = document.getElementById("game");
const hudCanvas = document.getElementById("hud");
const ctx = hudCanvas.getContext("2d");

const menu = document.getElementById("menu");
const startBtn = document.getElementById("startBtn");
const messageBox = document.getElementById("message");
const settingsScreen = document.getElementById("settings");
const closeSettingsBtn = document.getElementById("closeSettingsBtn");
const resetControlsBtn = document.getElementById("resetControlsBtn");
const resetGameBtn = document.getElementById("resetGameBtn");
const testPanel = document.getElementById("testPanel");
const closeTestBtn = document.getElementById("closeTestBtn");
const applyTestBtn = document.getElementById("applyTestBtn");
const fillTestBtn = document.getElementById("fillTestBtn");
const testWood = document.getElementById("testWood");
const testStone = document.getElementById("testStone");
const testCrystal = document.getElementById("testCrystal");
const testCoal = document.getElementById("testCoal");
const testStamina = document.getElementById("testStamina");
const testSanity = document.getElementById("testSanity");
const testLight = document.getElementById("testLight");
const testBoots = document.getElementById("testBoots");
const testMarker = document.getElementById("testMarker");
const testWorkbench = document.getElementById("testWorkbench");
const testLantern = document.getElementById("testLantern");
const testPortableWorkbench = document.getElementById("testPortableWorkbench");
const testInfiniteLantern = document.getElementById("testInfiniteLantern");
const sensitivitySlider = document.getElementById("sensitivitySlider");
const sensitivityValue = document.getElementById("sensitivityValue");
const bindButtons = Array.from(document.querySelectorAll(".bind-key"));

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: "high-performance"
});

renderer.setClearColor(0x11100e, 1);
setRendererColorSpace(renderer);

const scene3d = new THREE.Scene();
scene3d.background = new THREE.Color(0x11100e);
scene3d.fog = new THREE.FogExp2(0x11100e, 0.09);

const camera = new THREE.PerspectiveCamera(52, 1, 0.04, 18);
const eyeLight = new THREE.PointLight(0xffdfad, 1.25, 12, 1.8);
camera.add(eyeLight);
scene3d.add(camera);

const hemiLight = new THREE.HemisphereLight(0xb9c2d0, 0x251a11, 0.34);
scene3d.add(hemiLight);

const ambientLight = new THREE.AmbientLight(0x373029, 0.55);
scene3d.add(ambientLight);

let worldRoot = null;
let renderPixelRatio = 1;
const doorVisuals = new Map();
const DOOR_OPEN_ANGLE = Math.PI * 0.52;
const DOOR_ANIMATION_SPEED = 0.16;

const FLOOR_Y = 0;
const WALL_HEIGHT = 2.4;
const EYE_HEIGHT = 1.35;
const CEILING_Y = WALL_HEIGHT;

const tempPosition = new THREE.Vector3();
const tempQuaternion = new THREE.Quaternion();
const tempScale = new THREE.Vector3(1, 1, 1);
const tempMatrix = new THREE.Matrix4();
const tempEuler = new THREE.Euler();
const lookTarget = new THREE.Vector3();

const floorTexture = createGridTexture("#211c16", "#2b241a", "rgba(255,255,255,0.045)");
const ceilingTexture = createGridTexture("#151414", "#1c1b19", "rgba(255,255,255,0.03)");
const wallTexture = createStoneWallTexture(false);
const wallBumpTexture = createStoneWallTexture(true);
const doorTexture = createDoorTexture(false);
const doorBumpTexture = createDoorTexture(true);

const materials = {
  floor: new THREE.MeshStandardMaterial({ map: floorTexture, roughness: 0.96, metalness: 0.02, side: THREE.DoubleSide }),
  baseFloor: new THREE.MeshStandardMaterial({ color: 0x2a2118, roughness: 0.92, metalness: 0.02, side: THREE.DoubleSide }),
  ceiling: new THREE.MeshStandardMaterial({ map: ceilingTexture, roughness: 1, metalness: 0, side: THREE.DoubleSide }),
  wall: new THREE.MeshStandardMaterial({ color: 0xd0ccc2, map: wallTexture, bumpMap: wallBumpTexture, bumpScale: 0.075, roughness: 0.96, metalness: 0.01 }),
  wallTrim: new THREE.MeshStandardMaterial({ color: 0x383631, roughness: 0.96, metalness: 0.02 }),
  door: new THREE.MeshStandardMaterial({ map: doorTexture, bumpMap: doorBumpTexture, bumpScale: 0.05, roughness: 0.88, metalness: 0.02 }),
  doorFrame: new THREE.MeshStandardMaterial({ color: 0x3a2416, roughness: 0.84, metalness: 0.02 }),
  doorMetal: new THREE.MeshStandardMaterial({ color: 0x282522, roughness: 0.42, metalness: 0.72 }),
  wood: new THREE.MeshStandardMaterial({ color: 0x8f5d2d, roughness: 0.9, metalness: 0.02 }),
  stone: new THREE.MeshStandardMaterial({ color: 0x7a7d84, roughness: 0.98, metalness: 0.02 }),
  crystal: new THREE.MeshStandardMaterial({ color: 0x84c7ff, emissive: 0x246b99, emissiveIntensity: 0.7, roughness: 0.42, metalness: 0.04 }),
  coal: new THREE.MeshStandardMaterial({ color: 0x1d1c1a, roughness: 0.92, metalness: 0.04 }),
  workbench: new THREE.MeshStandardMaterial({ color: 0x9a7040, roughness: 0.82, metalness: 0.03 }),
  storage: new THREE.MeshStandardMaterial({ color: 0x5f7186, roughness: 0.76, metalness: 0.03 }),
  exit: new THREE.MeshStandardMaterial({ color: 0xd76b51, emissive: 0x9c2a18, emissiveIntensity: 1.2, roughness: 0.45, metalness: 0.02, transparent: true, opacity: 0.84 })
};

const resourceMaterials = {
  woodBark: new THREE.MeshStandardMaterial({ color: 0x7a4a24, roughness: 0.93, metalness: 0.01 }),
  woodCore: new THREE.MeshStandardMaterial({ color: 0xc18b52, roughness: 0.88, metalness: 0.01 }),
  leaf: new THREE.MeshStandardMaterial({ color: 0x557242, roughness: 0.86, metalness: 0.01 }),
  stoneDark: new THREE.MeshStandardMaterial({ color: 0x62666f, roughness: 1.0, metalness: 0.02 }),
  stoneLight: new THREE.MeshStandardMaterial({ color: 0x8c919b, roughness: 0.98, metalness: 0.02 }),
  crystalCore: new THREE.MeshStandardMaterial({ color: 0x9ad8ff, emissive: 0x3f90cf, emissiveIntensity: 1.0, roughness: 0.22, metalness: 0.03, transparent: true, opacity: 0.96 }),
  crystalShard: new THREE.MeshStandardMaterial({ color: 0xc8eeff, emissive: 0x69b8ff, emissiveIntensity: 1.3, roughness: 0.18, metalness: 0.02, transparent: true, opacity: 0.92 }),
  coalGlow: new THREE.MeshStandardMaterial({ color: 0x2c231f, emissive: 0xff7b2e, emissiveIntensity: 0.75, roughness: 0.86, metalness: 0.02 })
};

const keys = {};
const mouse = { dx: 0, dy: 0 };

const DEFAULT_CONTROLS = {
  forward: "KeyW",
  back: "KeyS",
  left: "KeyA",
  right: "KeyD",
  run: "ShiftLeft",
  interact: "KeyE",
  map: "KeyM",
  craft: "KeyC",
  reroll: "KeyR"
};

const TILE = {
  EMPTY: 0,
  WALL: 1,
  EXIT: 2,
  WOOD: 3,
  STONE: 4,
  CRYSTAL: 5,
  COAL: 6,
  WORKBENCH: 7,
  STORAGE: 8,
  MAZE_DOOR: 9
};

const RESOURCE_TYPES = {
  [TILE.WOOD]: "wood",
  [TILE.STONE]: "stone",
  [TILE.CRYSTAL]: "crystal",
  [TILE.COAL]: "coal"
};

const RESOURCE_NAMES = {
  wood: "나무",
  stone: "돌",
  crystal: "수정",
  coal: "석탄"
};

const CRAFT_COSTS = {
  craftTech: [
    { wood: 1, stone: 1 },
    { wood: 2, stone: 2 },
    { wood: 3, stone: 2, crystal: 1 },
    { wood: 4, stone: 3, crystal: 2, coal: 2 },
    { wood: 5, stone: 4, crystal: 3, coal: 3 }
  ],
  workbench: [
    { wood: 3, stone: 2, coal: 1 },
    { wood: 4, stone: 3, coal: 2 },
    { wood: 5, stone: 4, crystal: 2, coal: 3 }
  ],
  manualCrafter: [
    { wood: 3, stone: 3, crystal: 1 }
  ],
  restStone: [
    { stone: 5, crystal: 3, coal: 2 }
  ],
  potionWorkbench: [
    { wood: 3, stone: 2, crystal: 2 }
  ],
  basicSanityPotion: [
    { crystal: 1, coal: 1 }
  ],
  manualExtractor: [
    { wood: 3, stone: 4, coal: 1 }
  ],
  mysteryDevice: [
    { stone: 5, crystal: 3, coal: 4 },
    { stone: 6, crystal: 4, coal: 5 }
  ],
  machineWorkbench: [
    { wood: 4, stone: 4, coal: 2 }
  ],
  machineMaxUpgrade: [
    { stone: 3, coal: 2 },
    { stone: 4, crystal: 1, coal: 3 },
    { stone: 6, crystal: 2, coal: 4 }
  ],
  machineRecoveryUpgrade: [
    { stone: 4, crystal: 1, coal: 2 },
    { stone: 5, crystal: 2, coal: 3 }
  ],
  // torch는 최대치 강화, torchUse는 실제 횃불 제작이다.
  torch: [
    { wood: 2, coal: 1 },
    { wood: 2, coal: 2, crystal: 1 },
    { wood: 3, coal: 3, crystal: 2 }
  ],
  torchUse: { wood: 1, coal: 1 },
  lantern: [
    { wood: 2, crystal: 2, coal: 2 },
    { crystal: 3, coal: 4 }
  ],
  boots: [
    { wood: 2, stone: 1 },
    { wood: 3, stone: 2 },
    { wood: 4, stone: 3, crystal: 1 }
  ],
  marker: [
    { stone: 2, crystal: 1 },
    { stone: 4, crystal: 2 }
  ],
  portableWorkbench: [
    { wood: 2, stone: 1, crystal: 1 }
  ],
  machineUpgrade: [
    { stone: 3, coal: 2 },
    { stone: 4, crystal: 1, coal: 3 },
    { stone: 6, crystal: 2, coal: 4 }
  ]
};

const CONFIG = {
  mazeFov: 52,
  lanternFov: 76,
  mazeRayDepth: 9,
  lanternRayDepth: 30,
  rotSpeed: 0.0018,
  walkSpeed: 0.035,
  runSpeed: 0.06,
  runStartStaminaRatio: 0.20,
  runResumeStaminaRatio: 0.30,
  staminaExhaustRecoverDelay: 30,
  baseSize: 9,
  mazeCells: 68,
  resourceDensity: 0.055,
  interactDistance: 1.25,
  playerRadius: 0.24,
  baseLightRecover: 0.18,
  // 초당 기준 수치를 60프레임 기준으로 나눠 사용한다.
  // 빛 감소: 기본 10L/s, 업그레이드 I 8L/s, 업그레이드 II 5L/s.
  mazeLightDecay: 10 / 60,
  torchDecay: 10 / 60,
  sanityDrainAtDark: 1.5 / 60,
  sanityRecoverInBase: 0.035,
  // 횃불 제작은 현재 횃불 최대치까지 채운다. 값은 getTorchMax()에서 관리한다.
  torchStackGain: 180,
  lanternFuelIntervals: [0, 1500, 2600],
  gather: {
    wood: { duration: 72, staminaCost: 10, minStamina: 8 },
    stone: { duration: 108, staminaCost: 16, minStamina: 12 },
    crystal: { duration: 144, staminaCost: 24, minStamina: 16 },
    coal: { duration: 90, staminaCost: 12, minStamina: 10 }
  }
};

let gameStarted = false;
let scene = "base";

let mapW = 0;
let mapH = 0;
let level = [];
let centralBaseBounds = null;
let centralBaseSpawn = null;

let x = 6.5;
let y = 6.5;
let dir = 0;
let pitch = 0;

let day = getStoredDay();
let mazeSeed = getDailySeed(day);

let mapOpen = false;
let showCraft = false;
let inventoryOpen = false;
let settingsOpen = false;
let testOpen = false;
let bindingAction = null;
let controls = { ...DEFAULT_CONTROLS };
let mouseSensitivity = 1;

let stamina = 100;
let staminaMax = 100;
let runLockedByStamina = false;
let sprintActive = false;
let staminaRecoverWait = 0;
let staminaRecoveryStarted = false;
let sanity = 100;
let sanityMax = 100;
let lightPower = 60;
let lightMax = 100;
let torchPower = 0;
let lanternFuelTimer = 0;
let gameOver = false;
let debugInfiniteLantern = false;
let gathering = null;
let testApplyInProgress = false;

let inventory = {
  wood: 0,
  stone: 0,
  crystal: 0,
  coal: 0
};

let collectedResources = {};
let exploredTiles = {};
let doorStates = {};

let crafted = {
  boots: 0,
  lantern: false,
  lanternLevel: 0,
  map: true,
  marker: 0,
  workbench: false,
  workbenchLevel: 0,
  portableWorkbench: 0,
  craftTech: 0,
  torchLevel: 0,
  machineWorkbench: false,
  machineUpgrade: 0,
  machineMaxUpgrade: 0,
  machineRecoveryUpgrade: 0,
  manualCrafter: 0,
  restStone: 0,
  potionWorkbench: 0,
  basicSanityPotion: 0,
  manualExtractor: 0,
  mysteryDevice: 0
};

let messageTimer = 0;
let craftHotkeys = {};


function setRendererColorSpace(targetRenderer) {
  if ("outputColorSpace" in targetRenderer && THREE.SRGBColorSpace) {
    targetRenderer.outputColorSpace = THREE.SRGBColorSpace;
  } else if ("outputEncoding" in targetRenderer && THREE.sRGBEncoding) {
    targetRenderer.outputEncoding = THREE.sRGBEncoding;
  }
}

function configureCanvasTexture(texture, useColor = true) {
  if (useColor && "colorSpace" in texture && THREE.SRGBColorSpace) {
    texture.colorSpace = THREE.SRGBColorSpace;
  } else if (useColor && "encoding" in texture && THREE.sRGBEncoding) {
    texture.encoding = THREE.sRGBEncoding;
  }

  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
}

function textureNoise(seed) {
  let value = seed >>> 0;

  return function nextNoise() {
    value += 0x6D2B79F5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shadeHex(hex, amount) {
  const clean = hex.replace("#", "");
  const r = clamp(parseInt(clean.slice(0, 2), 16) + amount, 0, 255);
  const g = clamp(parseInt(clean.slice(2, 4), 16) + amount, 0, 255);
  const b = clamp(parseInt(clean.slice(4, 6), 16) + amount, 0, 255);
  return `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
}

function createGridTexture(base, alt, line) {
  const textureCanvas = document.createElement("canvas");
  textureCanvas.width = 128;
  textureCanvas.height = 128;
  const textureCtx = textureCanvas.getContext("2d");

  textureCtx.fillStyle = base;
  textureCtx.fillRect(0, 0, 128, 128);
  textureCtx.fillStyle = alt;
  textureCtx.fillRect(0, 0, 64, 64);
  textureCtx.fillRect(64, 64, 64, 64);
  textureCtx.strokeStyle = line;
  textureCtx.lineWidth = 2;
  textureCtx.strokeRect(0, 0, 128, 128);
  textureCtx.beginPath();
  textureCtx.moveTo(64, 0);
  textureCtx.lineTo(64, 128);
  textureCtx.moveTo(0, 64);
  textureCtx.lineTo(128, 64);
  textureCtx.stroke();

  const texture = new THREE.CanvasTexture(textureCanvas);
  return configureCanvasTexture(texture, true);
}

function createStoneWallTexture(bumpOnly) {
  const textureCanvas = document.createElement("canvas");
  textureCanvas.width = 256;
  textureCanvas.height = 256;
  const textureCtx = textureCanvas.getContext("2d");
  const rng = textureNoise(bumpOnly ? 9017 : 4821);

  textureCtx.fillStyle = bumpOnly ? "#858585" : "#615f58";
  textureCtx.fillRect(0, 0, 256, 256);

  const mortar = bumpOnly ? "#585858" : "#3f3d38";
  const blockH = 38;

  for (let row = 0; row < 8; row++) {
    const y0 = row * blockH - 10;
    const offset = row % 2 === 0 ? -24 : 10;

    for (let col = -1; col < 6; col++) {
      const blockW = 52 + Math.floor(rng() * 26);
      const x0 = offset + col * 54 + Math.floor(rng() * 8);
      const shade = bumpOnly ? 104 + Math.floor(rng() * 56) : Math.floor(rng() * 36) - 12;

      textureCtx.fillStyle = bumpOnly ? `rgb(${shade},${shade},${shade})` : shadeHex("#69665d", shade);
      textureCtx.fillRect(x0 + 2, y0 + 2, blockW - 4, blockH - 4);

      textureCtx.strokeStyle = mortar;
      textureCtx.lineWidth = 2;
      textureCtx.strokeRect(x0 + 1, y0 + 1, blockW - 2, blockH - 2);

      for (let p = 0; p < 8; p++) {
        const px = x0 + 6 + rng() * Math.max(6, blockW - 12);
        const py = y0 + 6 + rng() * Math.max(6, blockH - 12);
        const alpha = bumpOnly ? 0.28 : 0.14;
        textureCtx.fillStyle = `rgba(255,255,255,${alpha * rng()})`;
        textureCtx.fillRect(px, py, 1.2 + rng() * 2, 1.2 + rng() * 2);
      }

      if (rng() > 0.57) {
        textureCtx.strokeStyle = bumpOnly ? "rgba(48,48,48,0.66)" : "rgba(24,23,21,0.34)";
        textureCtx.lineWidth = 1;
        textureCtx.beginPath();
        textureCtx.moveTo(x0 + 8 + rng() * (blockW - 16), y0 + 8);
        textureCtx.lineTo(x0 + 10 + rng() * (blockW - 20), y0 + blockH - 8);
        textureCtx.stroke();
      }
    }
  }

  const texture = new THREE.CanvasTexture(textureCanvas);
  return configureCanvasTexture(texture, !bumpOnly);
}

function createDoorTexture(bumpOnly) {
  const textureCanvas = document.createElement("canvas");
  textureCanvas.width = 256;
  textureCanvas.height = 256;
  const textureCtx = textureCanvas.getContext("2d");
  const rng = textureNoise(bumpOnly ? 7461 : 3187);

  textureCtx.fillStyle = bumpOnly ? "#8b8b8b" : "#68401f";
  textureCtx.fillRect(0, 0, 256, 256);

  const plankW = 42;
  for (let x0 = 0; x0 < 256; x0 += plankW) {
    const shade = bumpOnly ? 102 + Math.floor(rng() * 58) : Math.floor(rng() * 34) - 10;
    textureCtx.fillStyle = bumpOnly ? `rgb(${shade},${shade},${shade})` : shadeHex("#774920", shade);
    textureCtx.fillRect(x0, 0, plankW, 256);

    textureCtx.strokeStyle = bumpOnly ? "#4f4f4f" : "rgba(37,20,9,0.55)";
    textureCtx.lineWidth = 3;
    textureCtx.beginPath();
    textureCtx.moveTo(x0 + plankW - 1, 0);
    textureCtx.lineTo(x0 + plankW - 1, 256);
    textureCtx.stroke();

    for (let gy = 8; gy < 256; gy += 18 + Math.floor(rng() * 12)) {
      textureCtx.strokeStyle = bumpOnly ? "rgba(42,42,42,0.42)" : "rgba(255,210,138,0.08)";
      textureCtx.lineWidth = 1;
      textureCtx.beginPath();
      textureCtx.moveTo(x0 + 6 + rng() * 6, gy);
      textureCtx.quadraticCurveTo(x0 + 18 + rng() * 12, gy + 5, x0 + plankW - 7, gy + rng() * 8);
      textureCtx.stroke();
    }
  }

  for (const y0 of [58, 128, 198]) {
    textureCtx.fillStyle = bumpOnly ? "#3a3a3a" : "#29231f";
    textureCtx.fillRect(0, y0, 256, 12);
    textureCtx.fillStyle = bumpOnly ? "#b0b0b0" : "rgba(213,177,103,0.20)";
    textureCtx.fillRect(0, y0, 256, 2);
  }

  const texture = new THREE.CanvasTexture(textureCanvas);
  return configureCanvasTexture(texture, !bumpOnly);
}

function resizeCanvas() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderPixelRatio = Math.min(window.devicePixelRatio || 1, 2);

  renderer.setPixelRatio(renderPixelRatio);
  renderer.setSize(w, h, false);

  hudCanvas.width = Math.floor(w * renderPixelRatio);
  hudCanvas.height = Math.floor(h * renderPixelRatio);
  hudCanvas.style.width = `${w}px`;
  hudCanvas.style.height = `${h}px`;
  ctx.setTransform(renderPixelRatio, 0, 0, renderPixelRatio, 0, 0);

  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}

function requestGamePointerLock() {
  if (!gameStarted || settingsOpen || testOpen || document.pointerLockElement === canvas) return;

  try {
    const result = canvas.requestPointerLock();
    if (result && typeof result.catch === "function") result.catch(() => {});
  } catch {
    // Some browsers block pointer lock from local files or embedded previews. The game can still start.
  }
}

function getStoredDay() {
  const raw = localStorage.getItem("mta_day");
  if (raw) return Number(raw);

  const now = new Date();
  return Math.floor(now.getTime() / 86400000);
}

function getDailySeed(value) {
  return value * 92821 + 173;
}

function saveProgress() {
  localStorage.setItem("mta_day", String(day));
  localStorage.setItem("mta_inventory", JSON.stringify(inventory));
  localStorage.setItem("mta_crafted", JSON.stringify(crafted));
  localStorage.setItem("mta_collected_resources", JSON.stringify(collectedResources));
  localStorage.setItem("mta_explored_tiles", JSON.stringify(exploredTiles));
  localStorage.setItem("mta_door_states", JSON.stringify(doorStates));
  localStorage.setItem("mta_survival", JSON.stringify({ sanity, lightPower, torchPower, lanternFuelTimer, debugInfiniteLantern }));
}

function normalizeCraftedProgress() {
  crafted.boots = crafted.boots === true ? 1 : clamp(Number(crafted.boots) || 0, 0, CRAFT_COSTS.boots.length);
  crafted.marker = crafted.marker === true ? 1 : clamp(Number(crafted.marker) || 0, 0, CRAFT_COSTS.marker.length);

  const oldLantern = crafted.lantern === true ? 1 : 0;
  crafted.lanternLevel = clamp(Number(crafted.lanternLevel) || oldLantern, 0, CRAFT_COSTS.lantern.length);
  crafted.lantern = crafted.lanternLevel > 0;

  const oldPortable = crafted.portableWorkbench === true || crafted.portableBench === true ? 1 : 0;
  crafted.portableWorkbench = clamp(Number(crafted.portableWorkbench) || oldPortable, 0, CRAFT_COSTS.portableWorkbench.length);
  delete crafted.portableBench;

  crafted.craftTech = clamp(Number(crafted.craftTech) || 0, 0, CRAFT_COSTS.craftTech.length);
  crafted.torchLevel = clamp(Number(crafted.torchLevel) || 0, 0, CRAFT_COSTS.torch.length);
  torchPower = clamp(Number(torchPower) || 0, 0, getTorchMax());
  lightPower = clamp(Number(lightPower) || 0, 0, getLightMax());
  crafted.machineWorkbench = crafted.machineWorkbench === true;
  crafted.machineUpgrade = clamp(Number(crafted.machineUpgrade) || 0, 0, CRAFT_COSTS.machineUpgrade.length);
  crafted.machineMaxUpgrade = clamp(Number(crafted.machineMaxUpgrade) || Number(crafted.machineUpgrade) || 0, 0, CRAFT_COSTS.machineMaxUpgrade.length);
  crafted.machineRecoveryUpgrade = clamp(Number(crafted.machineRecoveryUpgrade) || 0, 0, CRAFT_COSTS.machineRecoveryUpgrade.length);
  crafted.workbenchLevel = clamp(Number(crafted.workbenchLevel) || (crafted.workbench === true ? 1 : 0), 0, CRAFT_COSTS.workbench.length);
  crafted.manualCrafter = clamp(Number(crafted.manualCrafter) || 0, 0, CRAFT_COSTS.manualCrafter.length);
  crafted.restStone = clamp(Number(crafted.restStone) || 0, 0, CRAFT_COSTS.restStone.length);
  crafted.potionWorkbench = clamp(Number(crafted.potionWorkbench) || 0, 0, CRAFT_COSTS.potionWorkbench.length);
  crafted.basicSanityPotion = clamp(Number(crafted.basicSanityPotion) || 0, 0, CRAFT_COSTS.basicSanityPotion.length);
  crafted.manualExtractor = clamp(Number(crafted.manualExtractor) || 0, 0, CRAFT_COSTS.manualExtractor.length);
  crafted.mysteryDevice = clamp(Number(crafted.mysteryDevice) || 0, 0, CRAFT_COSTS.mysteryDevice.length);

  // v10부터 이동식 제작대와 고정 제작대는 완전히 분리한다.
  // 이전 저장의 hasWorkbench만 고정 제작대로 인정하고, portableWorkbench는 휴대용 단계로만 유지한다.
  crafted.workbench = crafted.workbench === true || crafted.hasWorkbench === true || crafted.workbenchLevel > 0;
  if (crafted.workbench && crafted.workbenchLevel <= 0) crafted.workbenchLevel = 1;
  delete crafted.hasWorkbench;
  crafted.map = true;
}

function loadProgress() {
  try {
    const inv = JSON.parse(localStorage.getItem("mta_inventory") || "null");
    const craft = JSON.parse(localStorage.getItem("mta_crafted") || "null");
    const collected = JSON.parse(localStorage.getItem("mta_collected_resources") || "null");
    const explored = JSON.parse(localStorage.getItem("mta_explored_tiles") || "null");
    const doors = JSON.parse(localStorage.getItem("mta_door_states") || "null");
    const survival = JSON.parse(localStorage.getItem("mta_survival") || "null");

    if (inv) inventory = { ...inventory, ...inv };
    if (craft) crafted = { ...crafted, ...craft };
    if (collected) collectedResources = collected;
    if (explored) exploredTiles = explored;
    if (doors && typeof doors === "object") doorStates = doors;
    if (survival && typeof survival === "object") {
      const savedSanity = Number(survival.sanity);
      const savedLight = Number(survival.lightPower);
      const savedTorch = Number(survival.torchPower);
      sanity = Number.isFinite(savedSanity) ? clamp(savedSanity, 0, sanityMax) : sanity;
      lightPower = Number.isFinite(savedLight) ? clamp(savedLight, 0, getLightMax()) : lightPower;
      torchPower = Number.isFinite(savedTorch) ? clamp(savedTorch, 0, getTorchMax()) : torchPower;
      lanternFuelTimer = Math.max(0, Number(survival.lanternFuelTimer) || 0);
      debugInfiniteLantern = survival.debugInfiniteLantern === true;
    }
    inventory.coal = Number(inventory.coal) || 0;
    normalizeCraftedProgress();
  } catch {
    inventory = { wood: 0, stone: 0, crystal: 0, coal: 0 };
    collectedResources = {};
    exploredTiles = {};
    doorStates = {};
    crafted = { boots: 0, lantern: false, lanternLevel: 0, map: true, marker: 0, workbench: false, workbenchLevel: 0, portableWorkbench: 0, craftTech: 0, torchLevel: 0, machineWorkbench: false, machineUpgrade: 0, machineMaxUpgrade: 0, machineRecoveryUpgrade: 0, manualCrafter: 0, restStone: 0, potionWorkbench: 0, basicSanityPotion: 0, manualExtractor: 0, mysteryDevice: 0 };
  }
}

function loadSettings() {
  try {
    const savedControls = JSON.parse(localStorage.getItem("mta_controls") || "null");
    const savedSensitivity = Number(localStorage.getItem("mta_mouse_sensitivity"));

    if (savedControls) controls = { ...DEFAULT_CONTROLS, ...savedControls };
    if (Number.isFinite(savedSensitivity) && savedSensitivity > 0) {
      mouseSensitivity = clamp(savedSensitivity, 0.5, 2);
    }
  } catch {
    controls = { ...DEFAULT_CONTROLS };
    mouseSensitivity = 1;
  }

  updateSettingsUI();
}

function saveSettings() {
  localStorage.setItem("mta_controls", JSON.stringify(controls));
  localStorage.setItem("mta_mouse_sensitivity", String(mouseSensitivity));
}

function formatKey(code) {
  if (code.startsWith("Key")) return code.replace("Key", "");
  if (code.startsWith("Digit")) return code.replace("Digit", "");
  if (code === "Space") return "Space";
  if (code === "ShiftLeft" || code === "ShiftRight") return "Shift";
  if (code === "ControlLeft" || code === "ControlRight") return "Ctrl";
  if (code === "AltLeft" || code === "AltRight") return "Alt";
  if (code === "ArrowUp") return "↑";
  if (code === "ArrowDown") return "↓";
  if (code === "ArrowLeft") return "←";
  if (code === "ArrowRight") return "→";
  return code;
}

function updateSettingsUI() {
  for (const button of bindButtons) {
    const action = button.dataset.action;
    const value = button.querySelector("strong");

    if (value) value.textContent = formatKey(controls[action]);
    button.classList.toggle("waiting", bindingAction === action);
  }

  sensitivitySlider.value = String(mouseSensitivity);
  sensitivityValue.textContent = `${mouseSensitivity.toFixed(1)}x`;
}

function openSettings() {
  settingsOpen = true;
  mapOpen = false;
  showCraft = false;
  inventoryOpen = false;
  gathering = null;
  bindingAction = null;
  settingsScreen.classList.remove("hidden");

  if (document.pointerLockElement === canvas) document.exitPointerLock();

  updateSettingsUI();
}

function closeSettings() {
  settingsOpen = false;
  bindingAction = null;
  settingsScreen.classList.add("hidden");
  updateSettingsUI();

  requestGamePointerLock();
}

function resetGameProgress() {
  localStorage.removeItem("mta_day");
  localStorage.removeItem("mta_inventory");
  localStorage.removeItem("mta_crafted");
  localStorage.removeItem("mta_collected_resources");
  localStorage.removeItem("mta_explored_tiles");
  localStorage.removeItem("mta_door_states");
  localStorage.removeItem("mta_survival");

  day = getStoredDay();
  mazeSeed = getDailySeed(day);
  mapOpen = false;
  showCraft = false;
  inventoryOpen = false;
  gathering = null;
  stamina = staminaMax;
  runLockedByStamina = false;
  sprintActive = false;
  staminaRecoverWait = 0;
  sanity = sanityMax;
  lightPower = 60;
  torchPower = 0;
  lanternFuelTimer = 0;
  gameOver = false;
  inventory = { wood: 0, stone: 0, crystal: 0, coal: 0 };
  collectedResources = {};
  exploredTiles = {};
  doorStates = {};
  crafted = { boots: 0, lantern: false, lanternLevel: 0, map: true, marker: 0, workbench: false, workbenchLevel: 0, portableWorkbench: 0, craftTech: 0, torchLevel: 0, machineWorkbench: false, machineUpgrade: 0, machineMaxUpgrade: 0, machineRecoveryUpgrade: 0, manualCrafter: 0, restStone: 0, potionWorkbench: 0, basicSanityPotion: 0, manualExtractor: 0, mysteryDevice: 0 };

  generateMaze();
  saveProgress();
}

function syncTestPanel() {
  testWood.value = String(inventory.wood);
  testStone.value = String(inventory.stone);
  testCrystal.value = String(inventory.crystal);
  if (testCoal) testCoal.value = String(inventory.coal || 0);
  testStamina.value = String(Math.round(stamina));
  if (testSanity) testSanity.value = String(Math.round(sanity));
  if (testLight) testLight.value = String(Math.round(lightPower));
  testBoots.value = String(getUpgradeLevel("boots"));
  testMarker.value = String(getUpgradeLevel("marker"));
  if (testWorkbench) testWorkbench.checked = crafted.workbench === true;
  if (testLantern) testLantern.value = String(crafted.lanternLevel || 0);
  if (testPortableWorkbench) testPortableWorkbench.value = String(getCraftTechLevel());
  if (testInfiniteLantern) testInfiniteLantern.checked = debugInfiniteLantern;
}

function openTestPanel() {
  if (!gameStarted) return;

  testOpen = true;
  mapOpen = false;
  showCraft = false;
  gathering = null;
  testPanel.classList.remove("hidden");
  syncTestPanel();

  if (document.pointerLockElement === canvas) document.exitPointerLock();
}

function closeTestPanel() {
  testOpen = false;
  testPanel.classList.add("hidden");

  if (gameStarted && !settingsOpen) requestGamePointerLock();
}

function readTestNumber(input, min, max) {
  return Math.round(clamp(Number(input.value) || 0, min, max));
}

function applyTestValues(showToast = true) {
  inventory.wood = readTestNumber(testWood, 0, 999);
  inventory.stone = readTestNumber(testStone, 0, 999);
  inventory.crystal = readTestNumber(testCrystal, 0, 999);
  inventory.coal = testCoal ? readTestNumber(testCoal, 0, 999) : (inventory.coal || 0);

  crafted.boots = readTestNumber(testBoots, 0, CRAFT_COSTS.boots.length);
  crafted.marker = readTestNumber(testMarker, 0, CRAFT_COSTS.marker.length);
  crafted.workbench = testWorkbench ? testWorkbench.checked : crafted.workbench;
  crafted.workbenchLevel = crafted.workbench ? Math.max(1, Number(crafted.workbenchLevel) || 1) : 0;
  crafted.lanternLevel = testLantern ? readTestNumber(testLantern, 0, CRAFT_COSTS.lantern.length) : crafted.lanternLevel;
  crafted.lantern = crafted.lanternLevel > 0;
  crafted.craftTech = testPortableWorkbench ? readTestNumber(testPortableWorkbench, 0, CRAFT_COSTS.craftTech.length) : crafted.craftTech;
  debugInfiniteLantern = testInfiniteLantern ? testInfiniteLantern.checked : debugInfiniteLantern;
  crafted.map = true;

  normalizeCraftedProgress();

  staminaMax = getStaminaMax();
  lightMax = getLightMax();

  stamina = readTestNumber(testStamina, 0, staminaMax);
  sanity = testSanity ? readTestNumber(testSanity, 0, sanityMax) : sanity;
  lightPower = testLight ? readTestNumber(testLight, 0, getLightMax()) : lightPower;
  torchPower = clamp(torchPower, 0, getTorchMax());

  installBaseWorkbenchIfUnlocked();
  rebuildWorld();
  saveProgress();
  syncTestPanel();
  updateRenderSettings(true);
  if (showToast) showMessage("테스트 값 적용");
}

function queueTestApply(message) {
  if (testApplyInProgress) return;
  testApplyInProgress = true;
  applyTestBtn.disabled = true;
  fillTestBtn.disabled = true;

  requestAnimationFrame(() => {
    try {
      applyTestValues(false);
      if (message) showMessage(message);
    } catch (error) {
      console.error(error);
      showMessage("테스트 값 적용 중 오류가 발생했습니다.");
    } finally {
      testApplyInProgress = false;
      applyTestBtn.disabled = false;
      fillTestBtn.disabled = false;
    }
  });
}

function createRng(seed) {
  let value = seed >>> 0;

  return function rng() {
    value += 0x6D2B79F5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randInt(rng, max) {
  return Math.floor(rng() * max);
}

function degToRad(deg) {
  return deg * Math.PI / 180;
}

function cosd(deg) {
  return Math.cos(degToRad(deg));
}

function sind(deg) {
  return Math.sin(degToRad(deg));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function showMessage(text) {
  messageBox.textContent = text;
  messageBox.classList.add("show");
  messageTimer = 180;
}

function hideMessage() {
  messageTimer = 0;
  messageBox.classList.remove("show");
}

function updateMessage() {
  if (messageTimer > 0) {
    messageTimer--;

    if (messageTimer <= 0) {
      messageBox.classList.remove("show");
    }
  }
}

function getDoorStatesForDay() {
  const key = String(day);

  if (!doorStates[key] || Array.isArray(doorStates[key]) || typeof doorStates[key] !== "object") {
    doorStates[key] = {};
  }

  return doorStates[key];
}

function isDoorOpen(tx, ty) {
  return getDoorStatesForDay()[getResourceKey(tx, ty)] === true;
}

function setDoorOpen(tx, ty, open) {
  const doors = getDoorStatesForDay();
  const key = getResourceKey(tx, ty);

  if (open) doors[key] = true;
  else delete doors[key];
}

function isSolidTile(tx, ty) {
  if (tx < 0 || tx >= mapW || ty < 0 || ty >= mapH) return true;

  const tile = level[ty][tx];

  return tile === TILE.WALL || (tile === TILE.MAZE_DOOR && !isDoorOpen(tx, ty));
}

function isWalkable(tx, ty) {
  if (tx < 0 || tx >= mapW || ty < 0 || ty >= mapH) return false;
  return !isSolidTile(tx, ty);
}

function circleOverlapsTile(px, py, tx, ty, radius) {
  const closestX = clamp(px, tx, tx + 1);
  const closestY = clamp(py, ty, ty + 1);
  return Math.hypot(px - closestX, py - closestY) < radius;
}

function canOccupyPosition(px, py) {
  const radius = CONFIG.playerRadius;
  const minTx = Math.floor(px - radius);
  const maxTx = Math.floor(px + radius);
  const minTy = Math.floor(py - radius);
  const maxTy = Math.floor(py + radius);

  for (let ty = minTy; ty <= maxTy; ty++) {
    for (let tx = minTx; tx <= maxTx; tx++) {
      if (isSolidTile(tx, ty) && circleOverlapsTile(px, py, tx, ty, radius)) {
        return false;
      }
    }
  }

  return true;
}

function wouldDoorBlockPlayer(tx, ty) {
  return circleOverlapsTile(x, y, tx, ty, CONFIG.playerRadius + 0.06);
}

function getLightRatio() {
  return clamp(lightPower / getLightMax(), 0, 1);
}

function getPortableWorkbenchLevel() {
  return clamp(Number(crafted.portableWorkbench) || 0, 0, CRAFT_COSTS.portableWorkbench.length);
}

function getLanternLevel() {
  return clamp(Number(crafted.lanternLevel) || 0, 0, CRAFT_COSTS.lantern.length);
}

function isLanternActive() {
  return debugInfiniteLantern || getLanternLevel() > 0;
}

function getCurrentFov() {
  // 빛이 줄어들 때 화면이 줌인/줌아웃되면 멀미가 날 수 있으므로 FOV는 고정한다.
  return isLanternActive() ? CONFIG.lanternFov : CONFIG.mazeFov;
}

function getCurrentRayDepth() {
  // 시야 밝기는 어두움 효과와 조명으로만 표현하고, 카메라 줌에는 연결하지 않는다.
  return isLanternActive() ? CONFIG.lanternRayDepth : CONFIG.mazeRayDepth;
}

function isInsideCentralBase(tx, ty) {
  if (!centralBaseBounds) return false;

  return (
    tx > centralBaseBounds.startX &&
    tx < centralBaseBounds.endX &&
    ty > centralBaseBounds.startY &&
    ty < centralBaseBounds.endY
  );
}

function updateSceneFromPosition() {
  const nextScene = isInsideCentralBase(Math.floor(x), Math.floor(y)) ? "base" : "maze";
  scene = nextScene;
}

function getResourceKey(tx, ty) {
  return `${tx},${ty}`;
}

function getCollectedForDay() {
  const key = String(day);

  if (!Array.isArray(collectedResources[key])) {
    collectedResources[key] = [];
  }

  return collectedResources[key];
}

function markResourceCollected(tx, ty) {
  const collected = getCollectedForDay();
  const key = getResourceKey(tx, ty);

  if (!collected.includes(key)) {
    collected.push(key);
  }
}

function applyCollectedResources() {
  const collected = collectedResources[String(day)];

  if (!Array.isArray(collected)) return;

  for (const key of collected) {
    const [tx, ty] = key.split(",").map(Number);

    if (
      Number.isInteger(tx) &&
      Number.isInteger(ty) &&
      tx >= 0 &&
      tx < mapW &&
      ty >= 0 &&
      ty < mapH &&
      RESOURCE_TYPES[level[ty][tx]]
    ) {
      level[ty][tx] = TILE.EMPTY;
    }
  }
}

function getExploredForDay() {
  const key = String(day);

  if (!exploredTiles[key] || Array.isArray(exploredTiles[key])) {
    const oldTiles = Array.isArray(exploredTiles[key]) ? exploredTiles[key] : [];
    exploredTiles[key] = {};

    for (const tileKey of oldTiles) {
      exploredTiles[key][tileKey] = true;
    }
  }

  return exploredTiles[key];
}

function isTileExplored(tx, ty) {
  const explored = exploredTiles[String(day)];

  if (!explored) return false;
  if (Array.isArray(explored)) return explored.includes(getResourceKey(tx, ty));

  return explored[getResourceKey(tx, ty)] === true;
}

function markTileExplored(tx, ty) {
  if (tx < 0 || tx >= mapW || ty < 0 || ty >= mapH) return false;

  const explored = getExploredForDay();
  const key = getResourceKey(tx, ty);

  if (explored[key]) return false;

  explored[key] = true;
  return true;
}

function revealCentralBaseOnMap() {
  if (!centralBaseBounds) return false;

  let changed = false;

  for (let yy = centralBaseBounds.startY - 1; yy <= centralBaseBounds.endY + 1; yy++) {
    for (let xx = centralBaseBounds.startX - 1; xx <= centralBaseBounds.endX + 1; xx++) {
      changed = markTileExplored(xx, yy) || changed;
    }
  }

  return changed;
}

function revealAroundPlayer() {
  if (!crafted.map) return false;

  if (scene === "base") {
    return revealCentralBaseOnMap();
  }

  const radius = lightPower > 60 || isLanternActive() ? 4 : 2;
  const px = Math.floor(x);
  const py = Math.floor(y);
  let changed = false;

  for (let yy = py - radius; yy <= py + radius; yy++) {
    for (let xx = px - radius; xx <= px + radius; xx++) {
      if (Math.hypot(xx - px, yy - py) <= radius + 0.35) {
        changed = markTileExplored(xx, yy) || changed;
      }
    }
  }

  return changed;
}

function getTileAhead() {
  const maxDist = CONFIG.interactDistance + 0.35;
  let last = { tx: Math.floor(x), ty: Math.floor(y), tile: level[Math.floor(y)]?.[Math.floor(x)] ?? TILE.EMPTY };

  for (let dist = 0.28; dist <= maxDist; dist += 0.08) {
    const tx = Math.floor(x + cosd(dir) * dist);
    const ty = Math.floor(y + sind(dir) * dist);

    if (tx < 0 || tx >= mapW || ty < 0 || ty >= mapH) {
      return { tx, ty, tile: TILE.WALL };
    }

    const tile = level[ty][tx];
    last = { tx, ty, tile };

    if (tile !== TILE.EMPTY) return last;
  }

  return last;
}

function generateMaze() {
  const cells = CONFIG.mazeCells;
  mapW = cells * 2 + 1;
  mapH = cells * 2 + 1;

  const rng = createRng(mazeSeed);
  level = Array.from({ length: mapH }, () => Array(mapW).fill(TILE.WALL));

  const visited = Array.from({ length: cells }, () => Array(cells).fill(false));
  const stack = [{ x: 0, y: 0 }];

  visited[0][0] = true;
  level[1][1] = TILE.EMPTY;

  const dirs = [
    { x: 0, y: -1 },
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: -1, y: 0 }
  ];

  while (stack.length > 0) {
    const current = stack[stack.length - 1];
    const candidates = [];

    for (const d of dirs) {
      const nx = current.x + d.x;
      const ny = current.y + d.y;

      if (nx >= 0 && nx < cells && ny >= 0 && ny < cells && !visited[ny][nx]) {
        candidates.push({ x: nx, y: ny, dx: d.x, dy: d.y });
      }
    }

    if (candidates.length === 0) {
      stack.pop();
      continue;
    }

    const next = candidates[randInt(rng, candidates.length)];

    const cx = current.x * 2 + 1;
    const cy = current.y * 2 + 1;
    const nx = next.x * 2 + 1;
    const ny = next.y * 2 + 1;

    level[cy + next.dy][cx + next.dx] = TILE.EMPTY;
    level[ny][nx] = TILE.EMPTY;

    visited[next.y][next.x] = true;
    stack.push({ x: next.x, y: next.y });
  }

  for (let i = 0; i < cells * 3; i++) {
    const xx = 1 + randInt(rng, mapW - 2);
    const yy = 1 + randInt(rng, mapH - 2);

    if (level[yy][xx] === TILE.WALL) {
      const horizontal = level[yy][xx - 1] === TILE.EMPTY && level[yy][xx + 1] === TILE.EMPTY;
      const vertical = level[yy - 1][xx] === TILE.EMPTY && level[yy + 1][xx] === TILE.EMPTY;

      if (horizontal || vertical) {
        level[yy][xx] = TILE.EMPTY;
      }
    }
  }

  carveCentralBaseInMaze();
  placeResources(rng);
  applyCollectedResources();

  level[mapH - 2][mapW - 2] = TILE.EXIT;

  x = centralBaseSpawn.x;
  y = centralBaseSpawn.y;
  dir = centralBaseSpawn.dir;
  pitch = 0;
  updateSceneFromPosition();
  revealAroundPlayer();
  rebuildWorld();
  syncCamera();
}

function getBaseWorkbenchTile() {
  if (!centralBaseBounds) return null;

  const centerX = Math.floor((centralBaseBounds.startX + centralBaseBounds.endX) / 2);
  const centerY = Math.floor((centralBaseBounds.startY + centralBaseBounds.endY) / 2);

  return { x: centralBaseBounds.startX + 1, y: centerY - 2 };
}

function installBaseWorkbenchIfUnlocked() {
  if (getWorkbenchLevel() < 1) return false;

  const pos = getBaseWorkbenchTile();
  if (!pos) return false;
  if (pos.x < 0 || pos.x >= mapW || pos.y < 0 || pos.y >= mapH) return false;

  level[pos.y][pos.x] = TILE.WORKBENCH;
  return true;
}

function carveCentralBaseInMaze() {
  const size = CONFIG.baseSize;
  const startX = Math.floor((mapW - size) / 2);
  const startY = Math.floor((mapH - size) / 2);
  const endX = startX + size - 1;
  const endY = startY + size - 1;
  const centerX = Math.floor((startX + endX) / 2);
  const centerY = Math.floor((startY + endY) / 2);
  const doorX = centerX;
  const doorY = centerY;

  centralBaseBounds = { startX, startY, endX, endY };

  for (let yy = startY; yy <= endY; yy++) {
    for (let xx = startX; xx <= endX; xx++) {
      const border = xx === startX || xx === endX || yy === startY || yy === endY;
      level[yy][xx] = border ? TILE.WALL : TILE.EMPTY;
    }
  }

  if (size >= 11) {
    level[startY + 3][startX + 3] = TILE.WALL;
    level[startY + 3][endX - 3] = TILE.WALL;
    level[endY - 3][startX + 3] = TILE.WALL;
    level[endY - 3][endX - 3] = TILE.WALL;
  }

  // 튜토리얼 자원: 처음 기본 방에는 제작대/보관함 없이 재료만 놓인다.
  // 제작 기술 Lv1 재료와 첫 횃불 제작 재료를 같이 둔다.
  level[centerY + 1][centerX - 1] = TILE.WOOD;
  level[centerY + 1][centerX + 1] = TILE.STONE;
  level[centerY + 2][centerX - 1] = TILE.WOOD;
  level[centerY + 2][centerX + 1] = TILE.COAL;

  // 고정 제작대를 따로 만든 뒤에는 기본 위치에 제작대가 설치된다.
  installBaseWorkbenchIfUnlocked();

  carveRingAroundCentralBase(startX, startY, endX, endY);

  level[startY][doorX] = TILE.MAZE_DOOR;
  level[endY][doorX] = TILE.MAZE_DOOR;
  level[doorY][startX] = TILE.MAZE_DOOR;
  level[doorY][endX] = TILE.MAZE_DOOR;

  level[startY - 1][doorX] = TILE.EMPTY;
  level[endY + 1][doorX] = TILE.EMPTY;
  level[doorY][startX - 1] = TILE.EMPTY;
  level[doorY][endX + 1] = TILE.EMPTY;

  connectCentralBaseToMaze(doorX, startY - 2, 0, -1);
  connectCentralBaseToMaze(doorX, endY + 2, 0, 1);
  connectCentralBaseToMaze(startX - 2, doorY, -1, 0);
  connectCentralBaseToMaze(endX + 2, doorY, 1, 0);

  centralBaseSpawn = {
    x: centerX + 0.5,
    y: endY - 1.8,
    dir: -90
  };
}

function carveRingAroundCentralBase(startX, startY, endX, endY) {
  for (let xx = startX - 1; xx <= endX + 1; xx++) {
    level[startY - 1][xx] = TILE.EMPTY;
    level[endY + 1][xx] = TILE.EMPTY;
  }

  for (let yy = startY - 1; yy <= endY + 1; yy++) {
    level[yy][startX - 1] = TILE.EMPTY;
    level[yy][endX + 1] = TILE.EMPTY;
  }
}

function connectCentralBaseToMaze(tx, ty, dx, dy) {
  while (tx > 0 && tx < mapW - 1 && ty > 0 && ty < mapH - 1) {
    const wasOpen = level[ty][tx] !== TILE.WALL;
    level[ty][tx] = TILE.EMPTY;

    if (wasOpen) return;

    tx += dx;
    ty += dy;
  }
}

function isNearCentralBase(tx, ty) {
  if (!centralBaseBounds) return false;

  return (
    tx >= centralBaseBounds.startX - 1 &&
    tx <= centralBaseBounds.endX + 1 &&
    ty >= centralBaseBounds.startY - 1 &&
    ty <= centralBaseBounds.endY + 1
  );
}

function placeResources(rng) {
  const possible = [];

  for (let yy = 1; yy < mapH - 1; yy++) {
    for (let xx = 1; xx < mapW - 1; xx++) {
      if (level[yy][xx] === TILE.EMPTY && !isNearCentralBase(xx, yy)) {
        possible.push({ x: xx, y: yy });
      }
    }
  }

  const count = Math.floor(possible.length * CONFIG.resourceDensity);

  for (let i = 0; i < count; i++) {
    if (possible.length === 0) break;

    const index = randInt(rng, possible.length);
    const pos = possible.splice(index, 1)[0];
    const roll = rng();

    if (roll < 0.42) {
      level[pos.y][pos.x] = TILE.WOOD;
    } else if (roll < 0.70) {
      level[pos.y][pos.x] = TILE.STONE;
    } else if (roll < 0.86) {
      level[pos.y][pos.x] = TILE.COAL;
    } else {
      level[pos.y][pos.x] = TILE.CRYSTAL;
    }
  }
}

function changeMazeDay() {
  day++;
  mazeSeed = getDailySeed(day);
  gathering = null;
  saveProgress();

  generateMaze();
  showMessage(`DAY ${day} - 미로가 변경되었습니다.`);
}

function startGathering(target) {
  const resource = RESOURCE_TYPES[target.tile];
  const config = CONFIG.gather[resource];

  if (!resource || !config) return false;

  if (gathering) {
    showMessage("이미 채집 중입니다.");
    return true;
  }

  if (stamina < config.minStamina) {
    showMessage("숨이 찹니다. 잠깐 쉬었다가 채집하세요.");
    return true;
  }

  gathering = {
    tx: target.tx,
    ty: target.ty,
    tile: target.tile,
    resource,
    progress: 0,
    duration: config.duration,
    staminaCost: config.staminaCost,
    name: RESOURCE_NAMES[resource]
  };

  hideMessage();
  return true;
}

function cancelGathering(text) {
  gathering = null;

  if (text) showMessage(text);
}

function updateGathering() {
  if (!gathering) return;

  if (keys[controls.forward] || keys[controls.left] || keys[controls.back] || keys[controls.right]) {
    cancelGathering("움직여서 채집이 중단되었습니다.");
    return;
  }

  const dx = x - (gathering.tx + 0.5);
  const dy = y - (gathering.ty + 0.5);
  const tooFar = Math.hypot(dx, dy) > CONFIG.interactDistance + 0.65;

  if (
    tooFar ||
    gathering.tx < 0 ||
    gathering.tx >= mapW ||
    gathering.ty < 0 ||
    gathering.ty >= mapH ||
    level[gathering.ty][gathering.tx] !== gathering.tile
  ) {
    cancelGathering("채집이 끊겼습니다.");
    return;
  }

  const staminaPerFrame = gathering.staminaCost / gathering.duration;

  if (stamina <= 0) {
    cancelGathering("기운이 바닥나 채집을 멈췄습니다.");
    return;
  }

  stamina = Math.max(0, stamina - staminaPerFrame);
  gathering.progress++;

  if (gathering.progress < gathering.duration) return;

  inventory[gathering.resource]++;
  markResourceCollected(gathering.tx, gathering.ty);
  level[gathering.ty][gathering.tx] = TILE.EMPTY;
  gathering = null;
  rebuildWorld();
  saveProgress();
}

function interact() {
  const target = getTileAhead();

  if (target.tile === TILE.MAZE_DOOR) {
    const open = isDoorOpen(target.tx, target.ty);

    if (open && wouldDoorBlockPlayer(target.tx, target.ty)) {
      showMessage("문 사이에서 조금 벗어난 뒤 닫을 수 있습니다.");
      return;
    }

    setDoorOpen(target.tx, target.ty, !open);
    setDoorVisualTarget(target.tx, target.ty);
    saveProgress();
    showMessage(open ? "문을 닫았습니다." : "문을 열었습니다.");
    return;
  }

  if (target.tile === TILE.WORKBENCH) {
    if (getWorkbenchLevel() < 1) {
      showMessage("제작 기술 Lv2를 연구한 뒤 제작대를 만들 수 있습니다.");
      return;
    }

    showCraft = !showCraft;
    showMessage(showCraft ? "제작대를 열었습니다." : "제작창을 닫았습니다.");
    return;
  }

  if (target.tile === TILE.STORAGE) {
    showMessage("보관함은 이번 튜토리얼 구조에서 사용하지 않습니다.");
    return;
  }

  if (target.tile === TILE.EXIT) {
    showMessage("미로 깊은 곳의 출구입니다. 아직 다음 지역은 준비 중입니다.");
    return;
  }

  if (RESOURCE_TYPES[target.tile]) {
    startGathering(target);
    return;
  }

  showMessage("상호작용할 대상이 없습니다.");
}

function canOpenCraftPanel() {
  return true;
}

function canUseMainWorkbench() {
  return scene === "base" && getWorkbenchLevel() >= 1;
}

function canUsePortableWorkbench() {
  return false;
}

function canUseWorkbench() {
  return true;
}

function getUpgradeLevel(item) {
  return clamp(Number(crafted[item]) || 0, 0, CRAFT_COSTS[item]?.length || 0);
}

function getNextUpgradeCost(item) {
  return CRAFT_COSTS[item]?.[getUpgradeLevel(item)] || null;
}

function hasMaterials(cost) {
  if (!cost) return false;

  return (
    inventory.wood >= (cost.wood || 0) &&
    inventory.stone >= (cost.stone || 0) &&
    inventory.crystal >= (cost.crystal || 0) &&
    (inventory.coal || 0) >= (cost.coal || 0)
  );
}

function spendMaterials(cost) {
  inventory.wood -= cost.wood || 0;
  inventory.stone -= cost.stone || 0;
  inventory.crystal -= cost.crystal || 0;
  inventory.coal = (inventory.coal || 0) - (cost.coal || 0);
}

function formatCost(cost) {
  if (!cost) return "강화 완료";

  const parts = [];

  if (cost.wood) parts.push(`나무 ${cost.wood}`);
  if (cost.stone) parts.push(`돌 ${cost.stone}`);
  if (cost.crystal) parts.push(`수정 ${cost.crystal}`);
  if (cost.coal) parts.push(`석탄 ${cost.coal}`);

  return parts.join(" / ");
}

function getCraftTechLevel() {
  return clamp(Number(crafted.craftTech) || 0, 0, CRAFT_COSTS.craftTech.length);
}

function getTorchLevel() {
  return clamp(Number(crafted.torchLevel) || 0, 0, CRAFT_COSTS.torch.length);
}

function getTorchMax() {
  if (getCraftTechLevel() < 1) return 0;
  const torchMaxByLevel = [180, 250, 300, 360];
  return torchMaxByLevel[getTorchLevel()] || torchMaxByLevel[torchMaxByLevel.length - 1];
}

function getLightMax() {
  const lightMaxByLanternLevel = [100, 200, 300];
  return lightMaxByLanternLevel[getLanternLevel()] || lightMaxByLanternLevel[lightMaxByLanternLevel.length - 1];
}

function getLightDecayPerFrame() {
  const lightDecayPerSecond = [10, 8, 5];
  const perSecond = lightDecayPerSecond[getLanternLevel()] || lightDecayPerSecond[lightDecayPerSecond.length - 1];
  return perSecond / 60;
}

function getStaminaMax() {
  return getUpgradeLevel("boots") >= 1 ? 150 : 100;
}

function getRunStaminaDrainPerFrame() {
  return (getUpgradeLevel("boots") >= 1 ? 30 : 40) / 60;
}

function getRunStartStaminaThreshold() {
  return getStaminaMax() * CONFIG.runStartStaminaRatio;
}

function getRunResumeStaminaThreshold() {
  return getStaminaMax() * CONFIG.runResumeStaminaRatio;
}

function canStartRunning() {
  return stamina >= getRunStartStaminaThreshold() && !runLockedByStamina;
}

function getMachineUpgradeLevel() {
  return clamp(Number(crafted.machineUpgrade) || 0, 0, CRAFT_COSTS.machineUpgrade.length);
}

function getWorkbenchLevel() {
  return clamp(Number(crafted.workbenchLevel) || (crafted.workbench === true ? 1 : 0), 0, CRAFT_COSTS.workbench.length);
}

function getMachineMaxUpgradeLevel() {
  return clamp(Number(crafted.machineMaxUpgrade) || 0, 0, CRAFT_COSTS.machineMaxUpgrade.length);
}

function getMachineRecoveryUpgradeLevel() {
  return clamp(Number(crafted.machineRecoveryUpgrade) || 0, 0, CRAFT_COSTS.machineRecoveryUpgrade.length);
}

function getManualCrafterLevel() {
  return clamp(Number(crafted.manualCrafter) || 0, 0, CRAFT_COSTS.manualCrafter.length);
}

function getRestStoneLevel() {
  return clamp(Number(crafted.restStone) || 0, 0, CRAFT_COSTS.restStone.length);
}

function getPotionWorkbenchLevel() {
  return clamp(Number(crafted.potionWorkbench) || 0, 0, CRAFT_COSTS.potionWorkbench.length);
}

function getBasicSanityPotionLevel() {
  return clamp(Number(crafted.basicSanityPotion) || 0, 0, CRAFT_COSTS.basicSanityPotion.length);
}

function getManualExtractorLevel() {
  return clamp(Number(crafted.manualExtractor) || 0, 0, CRAFT_COSTS.manualExtractor.length);
}

function getMysteryDeviceLevel() {
  return clamp(Number(crafted.mysteryDevice) || 0, 0, CRAFT_COSTS.mysteryDevice.length);
}

function isCraftUnlocked(item) {
  const techLevel = getCraftTechLevel();
  const torchLevel = getTorchLevel();
  const lanternLevel = getLanternLevel();
  const workbenchLevel = getWorkbenchLevel();

  if (item === "craftTech") return techLevel < CRAFT_COSTS.craftTech.length;
  if (item === "torchUse") return techLevel >= 1 && torchPower < getTorchMax();
  if (item === "torch") return techLevel >= 1 && torchLevel < CRAFT_COSTS.torch.length;

  if (item === "workbench") return techLevel >= 2 && workbenchLevel < CRAFT_COSTS.workbench.length;
  if (item === "machineWorkbench") return workbenchLevel >= 1 && crafted.machineWorkbench !== true;
  if (item === "machineMaxUpgrade") return crafted.machineWorkbench === true && getMachineMaxUpgradeLevel() < CRAFT_COSTS.machineMaxUpgrade.length;
  if (item === "machineRecoveryUpgrade") return crafted.machineWorkbench === true && getMachineMaxUpgradeLevel() >= 1 && getMachineRecoveryUpgradeLevel() < CRAFT_COSTS.machineRecoveryUpgrade.length;
  if (item === "manualCrafter") return workbenchLevel >= 3 && getManualCrafterLevel() < CRAFT_COSTS.manualCrafter.length;
  if (item === "restStone") return getManualCrafterLevel() >= 1 && getRestStoneLevel() < CRAFT_COSTS.restStone.length;
  if (item === "potionWorkbench") return workbenchLevel >= 3 && getPotionWorkbenchLevel() < CRAFT_COSTS.potionWorkbench.length;
  if (item === "basicSanityPotion") return getPotionWorkbenchLevel() >= 1 && getBasicSanityPotionLevel() < CRAFT_COSTS.basicSanityPotion.length;
  if (item === "manualExtractor") return workbenchLevel >= 1 && getManualExtractorLevel() < CRAFT_COSTS.manualExtractor.length;
  if (item === "mysteryDevice") return techLevel >= 5 && getManualExtractorLevel() >= 1 && getMysteryDeviceLevel() < CRAFT_COSTS.mysteryDevice.length;
  if (item === "lantern") return techLevel >= 3 && lanternLevel < CRAFT_COSTS.lantern.length;
  if (item === "boots") return techLevel >= 3 && workbenchLevel >= 1;
  if (item === "marker") return techLevel >= 3 && workbenchLevel >= 1 && crafted.map;

  if (item === "portableWorkbench") return false;
  if (item === "machineUpgrade") return false;
  return false;
}

function getCostForCraftItem(item) {
  const techLevel = getCraftTechLevel();
  const torchLevel = getTorchLevel();
  const lanternLevel = getLanternLevel();
  const workbenchLevel = getWorkbenchLevel();

  if (item === "craftTech") return CRAFT_COSTS.craftTech[techLevel];
  if (item === "workbench") return CRAFT_COSTS.workbench[workbenchLevel];
  if (item === "torch") return CRAFT_COSTS.torch[torchLevel];
  if (item === "torchUse") return CRAFT_COSTS.torchUse;
  if (item === "lantern") return CRAFT_COSTS.lantern[lanternLevel];
  if (item === "machineWorkbench") return CRAFT_COSTS.machineWorkbench[0];
  if (item === "machineMaxUpgrade") return CRAFT_COSTS.machineMaxUpgrade[getMachineMaxUpgradeLevel()];
  if (item === "machineRecoveryUpgrade") return CRAFT_COSTS.machineRecoveryUpgrade[getMachineRecoveryUpgradeLevel()];
  if (item === "manualCrafter") return CRAFT_COSTS.manualCrafter[getManualCrafterLevel()];
  if (item === "restStone") return CRAFT_COSTS.restStone[getRestStoneLevel()];
  if (item === "potionWorkbench") return CRAFT_COSTS.potionWorkbench[getPotionWorkbenchLevel()];
  if (item === "basicSanityPotion") return CRAFT_COSTS.basicSanityPotion[getBasicSanityPotionLevel()];
  if (item === "manualExtractor") return CRAFT_COSTS.manualExtractor[getManualExtractorLevel()];
  if (item === "mysteryDevice") return CRAFT_COSTS.mysteryDevice[getMysteryDeviceLevel()];
  if (item === "boots") return getNextUpgradeCost("boots");
  if (item === "marker") return getNextUpgradeCost("marker");
  return null;
}

function canCraft(item) {
  if (!isCraftUnlocked(item)) return false;

  if (item === "craftTech" && getCraftTechLevel() === 0) {
    return scene === "base" && hasMaterials(getCostForCraftItem(item));
  }

  if (item === "workbench" && getWorkbenchLevel() === 0) {
    return scene === "base" && getCraftTechLevel() >= 2 && hasMaterials(getCostForCraftItem(item));
  }

  if (["workbench", "machineWorkbench", "machineMaxUpgrade", "machineRecoveryUpgrade", "manualCrafter", "restStone", "potionWorkbench", "basicSanityPotion", "manualExtractor", "mysteryDevice", "boots", "marker"].includes(item)) {
    return canUseMainWorkbench() && hasMaterials(getCostForCraftItem(item));
  }

  return hasMaterials(getCostForCraftItem(item));
}

function craft(item) {
  if (!isCraftUnlocked(item)) {
    showMessage("아직 테크트리 조건을 만족하지 못했습니다.");
    return;
  }

  if (!canCraft(item)) {
    showMessage("재료가 부족하거나 현재 제작 단계에서 만들 수 없습니다.");
    return;
  }

  const cost = getCostForCraftItem(item);
  spendMaterials(cost);

  if (item === "craftTech") {
    crafted.craftTech = getCraftTechLevel() + 1;
    saveProgress();
    showMessage(`제작 기술 Lv ${crafted.craftTech} 연구 완료`);
    return;
  }

  if (item === "workbench") {
    crafted.workbenchLevel = getWorkbenchLevel() + 1;
    crafted.workbench = true;
    installBaseWorkbenchIfUnlocked();
    rebuildWorld();
    saveProgress();
    showMessage(`제작대 Lv ${crafted.workbenchLevel} 제작 완료`);
    return;
  }

  if (item === "torch") {
    crafted.torchLevel = getTorchLevel() + 1;
    torchPower = clamp(torchPower, 0, getTorchMax());
    saveProgress();
    showMessage(`횃불 업그레이드 ${crafted.torchLevel} 완료`);
    return;
  }

  if (item === "torchUse") {
    const maxTorch = getTorchMax();
    const gain = Math.max(0, maxTorch - torchPower);
    torchPower = maxTorch;
    saveProgress();
    showMessage(`횃불을 만들었습니다. 횃불 +${Math.round(gain)}L`);
    return;
  }

  if (item === "lantern") {
    crafted.lanternLevel = getLanternLevel() + 1;
    crafted.lantern = true;
    lightPower = clamp(lightPower, 0, getLightMax());
    lanternFuelTimer = 0;
    saveProgress();
    updateRenderSettings(true);
    showMessage(`랜턴 Lv ${crafted.lanternLevel} 제작/강화 완료`);
    return;
  }

  if (item === "machineWorkbench") {
    crafted.machineWorkbench = true;
    saveProgress();
    showMessage("기계 제작대 Lv 1 제작 완료");
    return;
  }

  if (item === "machineMaxUpgrade") {
    crafted.machineMaxUpgrade = getMachineMaxUpgradeLevel() + 1;
    crafted.machineUpgrade = Math.max(Number(crafted.machineUpgrade) || 0, crafted.machineMaxUpgrade);
    saveProgress();
    showMessage(`기계 최대치 업그레이드 ${crafted.machineMaxUpgrade} 완료`);
    return;
  }

  if (item === "machineRecoveryUpgrade") {
    crafted.machineRecoveryUpgrade = getMachineRecoveryUpgradeLevel() + 1;
    saveProgress();
    showMessage(`기계 회복 속도 업그레이드 ${crafted.machineRecoveryUpgrade} 완료`);
    return;
  }

  if (item === "manualCrafter") {
    crafted.manualCrafter = getManualCrafterLevel() + 1;
    saveProgress();
    showMessage("수동 제작기 Lv 1 제작 완료");
    return;
  }

  if (item === "restStone") {
    crafted.restStone = getRestStoneLevel() + 1;
    saveProgress();
    showMessage("안식의 돌 제작 완료");
    return;
  }

  if (item === "potionWorkbench") {
    crafted.potionWorkbench = getPotionWorkbenchLevel() + 1;
    saveProgress();
    showMessage("포션 제작기 Lv 1 제작 완료");
    return;
  }

  if (item === "basicSanityPotion") {
    crafted.basicSanityPotion = getBasicSanityPotionLevel() + 1;
    sanity = clamp(sanity + 15, 0, sanityMax);
    saveProgress();
    showMessage("초급 정신력 회복 포션 제작 완료. 정신력 +15");
    return;
  }

  if (item === "manualExtractor") {
    crafted.manualExtractor = getManualExtractorLevel() + 1;
    saveProgress();
    showMessage("수동 원석기 Lv 1 제작 완료");
    return;
  }

  if (item === "mysteryDevice") {
    crafted.mysteryDevice = getMysteryDeviceLevel() + 1;
    saveProgress();
    showMessage(`미정 장치 Lv ${crafted.mysteryDevice} 제작 완료`);
    return;
  }

  if (item === "boots") {
    crafted.boots = getUpgradeLevel("boots") + 1;
    saveProgress();
    showMessage(`러너 부츠 Lv ${crafted.boots} 강화 완료`);
    return;
  }

  if (item === "marker") {
    crafted.marker = getUpgradeLevel("marker") + 1;
    saveProgress();
    showMessage(`지도 업그레이드 Lv ${crafted.marker} 완료`);
    return;
  }
}


function movePlayer(nx, ny) {
  if (canOccupyPosition(nx, y)) x = nx;
  if (canOccupyPosition(x, ny)) y = ny;
}

function updateMovement() {
  const fx = cosd(dir);
  const fy = sind(dir);
  const rx = cosd(dir + 90);
  const ry = sind(dir + 90);

  let ix = 0;
  let iy = 0;

  if (keys[controls.forward]) { ix += fx; iy += fy; }
  if (keys[controls.back]) { ix -= fx; iy -= fy; }
  if (keys[controls.left]) { ix -= rx; iy -= ry; }
  if (keys[controls.right]) { ix += rx; iy += ry; }

  const moving = ix !== 0 || iy !== 0;

  staminaMax = getStaminaMax();
  stamina = clamp(stamina, 0, staminaMax);

  const wantsToRun = keys[controls.run] && moving;

  // 기력이 0이 되면 약 0.5초 동안 완전히 멈춘 뒤 회복이 시작된다.
  // 회복이 한 번 시작되면 걷거나 Shift를 누르고 있어도 중간에 멈추지 않고 계속 찬다.
  if (runLockedByStamina) {
    sprintActive = false;

    if (!staminaRecoveryStarted) {
      if (moving || keys[controls.run]) {
        staminaRecoverWait = 0;
      } else {
        staminaRecoverWait++;
        if (staminaRecoverWait >= CONFIG.staminaExhaustRecoverDelay) {
          staminaRecoveryStarted = true;
        }
      }
    }

    if (staminaRecoveryStarted && stamina < staminaMax) {
      stamina = Math.min(staminaMax, stamina + 0.35);
    }

    if (stamina >= getRunResumeStaminaThreshold()) {
      runLockedByStamina = false;
      staminaRecoverWait = 0;
      staminaRecoveryStarted = false;
    }
  } else {
    if (!wantsToRun) {
      sprintActive = false;
    }

    if (wantsToRun && !sprintActive && stamina >= getRunStartStaminaThreshold()) {
      sprintActive = true;
    }

    const running = wantsToRun && sprintActive && stamina > 0;

    if (running) {
      stamina = Math.max(0, stamina - getRunStaminaDrainPerFrame());

      if (stamina <= 0) {
        stamina = 0;
        sprintActive = false;
        runLockedByStamina = true;
        staminaRecoverWait = 0;
        staminaRecoveryStarted = false;
      }
    } else if (stamina < staminaMax) {
      stamina = Math.min(staminaMax, stamina + 0.35);
    }
  }

  const runningNow = wantsToRun && sprintActive && !runLockedByStamina && stamina > 0;
  let speed = runningNow ? CONFIG.runSpeed : CONFIG.walkSpeed;

  speed *= 1 + getUpgradeLevel("boots") * 0.05;

  const len = Math.hypot(ix, iy);

  if (len > 0) {
    movePlayer(x + (ix / len) * speed, y + (iy / len) * speed);
  }
}


function updateSurvivalSystems() {
  if (!gameStarted || gameOver) return;

  const inMaze = scene !== "base";
  const lanternLevel = getLanternLevel();

  if (debugInfiniteLantern) {
    lightPower = getLightMax();
  } else {
    if (inMaze && lanternLevel > 0) {
      lanternFuelTimer--;
      if (lanternFuelTimer <= 0) {
        const interval = CONFIG.lanternFuelIntervals[lanternLevel] || CONFIG.lanternFuelIntervals[1];
        if ((inventory.coal || 0) > 0) {
          inventory.coal--;
          lightPower = getLightMax();
          lanternFuelTimer = interval;
          saveProgress();
        } else {
          lanternFuelTimer = Math.floor(interval / 3);
        }
      }
    }

    if (inMaze) {
      if (torchPower > 0) {
        torchPower = clamp(torchPower - CONFIG.torchDecay, 0, getTorchMax());
      } else {
        lightPower = clamp(lightPower - getLightDecayPerFrame(), 0, getLightMax());
      }
    } else {
      lightPower = clamp(lightPower + CONFIG.baseLightRecover, 0, getLightMax());
    }
  }

  if (inMaze && lightPower <= 0) {
    sanity = clamp(sanity - CONFIG.sanityDrainAtDark, 0, sanityMax);
  } else if (!inMaze) {
    sanity = clamp(sanity + CONFIG.sanityRecoverInBase, 0, sanityMax);
  }

  if (sanity <= 0) triggerGameOver();
}

function triggerGameOver() {
  if (gameOver) return;
  gameOver = true;
  showCraft = false;
  mapOpen = false;
  gathering = null;
  for (const code of Object.keys(keys)) keys[code] = false;
  showMessage("정신력이 바닥났습니다. 게임이 초기화됩니다.");

  setTimeout(() => {
    resetGameProgress();
    gameStarted = true;
    gameOver = false;
    showMessage("중앙 방에서 다시 시작합니다.");
  }, 900);
}

function update() {
  if (!gameStarted || settingsOpen || testOpen || gameOver) return;

  if (!mapOpen && !gathering) {
    const lookScale = mouseSensitivity * CONFIG.rotSpeed * 180 / Math.PI;
    dir += mouse.dx * lookScale;
    pitch = clamp(pitch - mouse.dy * lookScale, -72, 72);
  }

  mouse.dx = 0;
  mouse.dy = 0;

  if (gathering) updateGathering();
  else updateMovement();

  updateDoorAnimations();
  updateSceneFromPosition();
  updateSurvivalSystems();
  if (revealAroundPlayer()) saveProgress();
  updateMessage();
}

function clearWorld() {
  doorVisuals.clear();
  if (!worldRoot) return;

  worldRoot.traverse((object) => {
    if ((object.isMesh || object.isInstancedMesh) && object.geometry) {
      object.geometry.dispose();
    }
  });

  scene3d.remove(worldRoot);
  worldRoot = null;
}

function addInstancedTiles(tiles, geometry, material, yPos, rotationY = 0) {
  if (tiles.length === 0) {
    geometry.dispose();
    return null;
  }

  const mesh = new THREE.InstancedMesh(geometry, material, tiles.length);
  tempEuler.set(0, rotationY, 0);
  tempQuaternion.setFromEuler(tempEuler);
  tempScale.set(1, 1, 1);

  let minX = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxZ = -Infinity;

  for (let i = 0; i < tiles.length; i++) {
    const tile = tiles[i];
    tempPosition.set(tile.x + 0.5, yPos, tile.y + 0.5);
    tempMatrix.compose(tempPosition, tempQuaternion, tempScale);
    mesh.setMatrixAt(i, tempMatrix);

    if (tile.x < minX) minX = tile.x;
    if (tile.y < minZ) minZ = tile.y;
    if (tile.x > maxX) maxX = tile.x;
    if (tile.y > maxZ) maxZ = tile.y;
  }

  mesh.instanceMatrix.needsUpdate = true;

  if (mesh.geometry.computeBoundingSphere) {
    const center = new THREE.Vector3((minX + maxX + 1) / 2, yPos, (minZ + maxZ + 1) / 2);
    const dx = maxX - minX + 1;
    const dz = maxZ - minZ + 1;
    const radius = Math.sqrt(dx * dx + dz * dz) * 0.5 + WALL_HEIGHT;
    mesh.geometry.boundingSphere = new THREE.Sphere(center, radius);
  }

  // InstancedMesh는 기본 bounding sphere가 원점 기준이라 큰 맵에서는 벽이 통째로 잘릴 수 있다.
  // 벽/자원 오브젝트가 사라지지 않도록 컬링을 끈다.
  mesh.frustumCulled = false;
  worldRoot.add(mesh);
  return mesh;
}


function addDoorBox(group, width, height, depth, material, px, py, pz) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
  mesh.position.set(px, py, pz);
  group.add(mesh);
  return mesh;
}

function addDoorHandle(group, px, py, pz) {
  const handle = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 10), materials.doorMetal);
  handle.position.set(px, py, pz);
  group.add(handle);
  return handle;
}

function isDoorPassage(tx, ty) {
  if (tx < 0 || tx >= mapW || ty < 0 || ty >= mapH) return false;
  const tile = level[ty][tx];
  return tile !== TILE.WALL && tile !== TILE.MAZE_DOOR;
}

function getDoorRotationY(tx, ty) {
  const eastWest = isDoorPassage(tx - 1, ty) || isDoorPassage(tx + 1, ty);
  const northSouth = isDoorPassage(tx, ty - 1) || isDoorPassage(tx, ty + 1);

  return eastWest && !northSouth ? Math.PI / 2 : 0;
}

function getDoorSwingDirection(tx, ty) {
  if (centralBaseBounds) {
    if (tx === centralBaseBounds.startX) return -1;
    if (tx === centralBaseBounds.endX) return 1;
    if (ty === centralBaseBounds.startY) return -1;
    if (ty === centralBaseBounds.endY) return 1;
  }

  // 중앙 방 문이 아닌 문이 추가될 경우에도 같은 축 기준으로 안쪽처럼 보이도록 기본값을 둔다.
  return -1;
}

function getDoorTargetRotation(tx, ty) {
  return isDoorOpen(tx, ty) ? getDoorSwingDirection(tx, ty) * DOOR_OPEN_ANGLE : 0;
}

function setDoorVisualTarget(tx, ty) {
  const visual = doorVisuals.get(getResourceKey(tx, ty));
  if (!visual) return;

  visual.targetRotation = getDoorTargetRotation(tx, ty);
}

function updateDoorAnimations() {
  for (const visual of doorVisuals.values()) {
    const current = visual.panel.rotation.y;
    const diff = visual.targetRotation - current;

    if (Math.abs(diff) < 0.001) {
      visual.panel.rotation.y = visual.targetRotation;
      continue;
    }

    visual.panel.rotation.y += diff * DOOR_ANIMATION_SPEED;
  }
}

function addDetailedDoors(tiles) {
  for (const tile of tiles) {
    const group = new THREE.Group();
    const key = getResourceKey(tile.x, tile.y);
    const targetRotation = getDoorTargetRotation(tile.x, tile.y);

    group.position.set(tile.x + 0.5, 0, tile.y + 0.5);
    group.rotation.y = getDoorRotationY(tile.x, tile.y);

    addDoorBox(group, 0.13, 2.18, 0.24, materials.doorFrame, -0.515, 1.09, 0);
    addDoorBox(group, 0.13, 2.18, 0.24, materials.doorFrame, 0.515, 1.09, 0);
    addDoorBox(group, 1.13, 0.16, 0.24, materials.doorFrame, 0, 2.21, 0);
    addDoorBox(group, 1.02, 0.08, 0.24, materials.doorFrame, 0, 0.04, 0);

    const panel = new THREE.Group();
    panel.position.set(-0.39, 0, 0);
    panel.rotation.y = targetRotation;
    group.add(panel);

    doorVisuals.set(key, {
      panel,
      tx: tile.x,
      ty: tile.y,
      targetRotation
    });

    const panelX = (localX) => localX + 0.39;
    addDoorBox(panel, 0.78, 1.92, 0.14, materials.door, panelX(0), 0.96, 0);

    for (const zSide of [-0.101, 0.101]) {
      addDoorBox(panel, 0.70, 0.07, 0.028, materials.doorMetal, panelX(0), 0.66, zSide);
      addDoorBox(panel, 0.70, 0.07, 0.028, materials.doorMetal, panelX(0), 1.21, zSide);
      addDoorBox(panel, 0.70, 0.07, 0.028, materials.doorMetal, panelX(0), 1.76, zSide);
      addDoorBox(panel, 0.022, 1.72, 0.026, materials.doorFrame, panelX(-0.20), 1.03, zSide);
      addDoorBox(panel, 0.022, 1.72, 0.026, materials.doorFrame, panelX(0.20), 1.03, zSide);
      addDoorHandle(panel, panelX(0.29), 1.04, zSide * 1.28);
    }

    worldRoot.add(group);
  }
}

function tileNoise(tx, ty, seed = 0) {
  const n = Math.sin((tx + 1) * 127.1 + (ty + 1) * 311.7 + seed * 74.7) * 43758.5453123;
  return n - Math.floor(n);
}

function createWoodPileModel() {
  const group = new THREE.Group();

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, 0.12, 12), resourceMaterials.woodCore);
  base.position.set(0, 0.06, 0);
  base.scale.set(1.2, 1, 1.08);
  group.add(base);

  const logs = [
    [-0.11, 0.16, -0.12, 0.84, 0.12],
    [0.14, 0.19, 0.08, 0.76, -0.08],
    [0.02, 0.28, -0.02, 0.64, 0.18],
    [-0.15, 0.27, 0.16, 0.58, -0.12]
  ];

  logs.forEach((entry, idx) => {
    const [px, py, pz, len, rotX] = entry;
    const radius = 0.09 - idx * 0.006;
    const log = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.92, radius, len, 12), resourceMaterials.woodBark);
    log.rotation.z = Math.PI / 2;
    log.rotation.x = rotX;
    log.position.set(px, py, pz);
    group.add(log);

    const endGeo = new THREE.CylinderGeometry(radius * 0.95, radius * 0.95, 0.03, 12);
    const endA = new THREE.Mesh(endGeo, resourceMaterials.woodCore);
    endA.rotation.z = Math.PI / 2;
    endA.position.set(px - len / 2, py, pz);
    group.add(endA);
    const endB = endA.clone();
    endB.position.x = px + len / 2;
    group.add(endB);
  });

  const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.46, 8), resourceMaterials.woodBark);
  branch.position.set(0.18, 0.38, 0.07);
  branch.rotation.z = -0.82;
  branch.rotation.x = 0.22;
  group.add(branch);

  const leaf1 = new THREE.Mesh(new THREE.IcosahedronGeometry(0.08, 0), resourceMaterials.leaf);
  leaf1.position.set(0.27, 0.5, 0.12);
  leaf1.scale.set(1.0, 0.62, 0.86);
  group.add(leaf1);

  const leaf2 = leaf1.clone();
  leaf2.position.set(0.22, 0.46, -0.02);
  leaf2.scale.set(0.72, 0.52, 0.6);
  group.add(leaf2);

  return group;
}

function createStoneClusterModel() {
  const group = new THREE.Group();

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.4, 0.08, 10), resourceMaterials.stoneDark);
  base.position.set(0, 0.04, 0);
  base.scale.set(1.12, 1, 1.0);
  group.add(base);

  const rocks = [
    [-0.18, 0.16, -0.06, 0.18, resourceMaterials.stoneDark],
    [0.15, 0.15, 0.12, 0.16, resourceMaterials.stoneLight],
    [0.06, 0.23, -0.14, 0.15, resourceMaterials.stoneDark],
    [-0.02, 0.27, 0.04, 0.22, resourceMaterials.stoneLight],
    [0.2, 0.24, -0.02, 0.11, resourceMaterials.stoneDark]
  ];

  rocks.forEach((entry, idx) => {
    const [px, py, pz, s, mat] = entry;
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), mat);
    rock.position.set(px, py, pz);
    rock.rotation.set(idx * 0.35, idx * 0.55, idx * 0.18);
    group.add(rock);
  });

  return group;
}

function createCrystalClusterModel() {
  const group = new THREE.Group();

  const base = new THREE.Mesh(new THREE.DodecahedronGeometry(0.25, 0), resourceMaterials.stoneDark);
  base.position.set(0, 0.14, 0);
  base.scale.set(1.25, 0.72, 1.06);
  group.add(base);

  const shardData = [
    [0, 0.58, 0, 0.36, resourceMaterials.crystalCore, 1.7],
    [-0.16, 0.42, 0.08, 0.22, resourceMaterials.crystalShard, 1.24],
    [0.17, 0.39, -0.1, 0.21, resourceMaterials.crystalShard, 1.18],
    [0.06, 0.35, 0.18, 0.17, resourceMaterials.crystalShard, 1.02],
    [-0.08, 0.31, -0.17, 0.16, resourceMaterials.crystalShard, 0.92]
  ];

  shardData.forEach((entry, idx) => {
    const [px, py, pz, s, mat, sy] = entry;
    const shard = new THREE.Mesh(new THREE.OctahedronGeometry(s, 0), mat);
    shard.position.set(px, py, pz);
    shard.rotation.set(0.15 * idx, 0.35 * idx, 0.08 * idx);
    shard.scale.set(0.44, sy, 0.44);
    group.add(shard);
  });

  const glowOrb = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 10), resourceMaterials.crystalShard);
  glowOrb.position.set(0.02, 0.72, 0.04);
  group.add(glowOrb);

  return group;
}

function createCoalPileModel() {
  const group = new THREE.Group();

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.39, 0.07, 10), materials.coal);
  base.position.set(0, 0.035, 0);
  group.add(base);

  const pieces = [
    [-0.14, 0.12, -0.07, 0.16],
    [0.13, 0.13, 0.09, 0.15],
    [0.06, 0.18, -0.13, 0.14],
    [-0.02, 0.22, 0.03, 0.19],
    [0.19, 0.21, -0.01, 0.11]
  ];

  pieces.forEach((entry, idx) => {
    const [px, py, pz, s] = entry;
    const mat = idx === 3 ? resourceMaterials.coalGlow : materials.coal;
    const lump = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), mat);
    lump.position.set(px, py, pz);
    lump.rotation.set(idx * 0.32, idx * 0.54, idx * 0.21);
    group.add(lump);
  });

  for (let i = 0; i < 5; i++) {
    const ember = new THREE.Mesh(new THREE.SphereGeometry(0.017 + i * 0.003, 8, 8), resourceMaterials.coalGlow);
    ember.position.set(-0.08 + i * 0.05, 0.24 + (i % 2) * 0.03, 0.04 - i * 0.02);
    group.add(ember);
  }

  return group;
}

function addResourceModels(tiles, type) {
  if (!tiles.length) return;

  for (const tile of tiles) {
    let group;
    if (type === "wood") group = createWoodPileModel();
    else if (type === "stone") group = createStoneClusterModel();
    else if (type === "crystal") group = createCrystalClusterModel();
    else if (type === "coal") group = createCoalPileModel();
    else continue;

    const n = tileNoise(tile.x, tile.y, 1);
    group.position.set(tile.x + 0.5, 0.01, tile.y + 0.5);
    group.rotation.y = n * Math.PI * 2;
    const scale = 0.95 + tileNoise(tile.x, tile.y, 2) * 0.22;
    group.scale.setScalar(scale);
    worldRoot.add(group);
  }
}

function rebuildWorld() {
  clearWorld();

  worldRoot = new THREE.Group();
  worldRoot.name = "maze-world";
  scene3d.add(worldRoot);

  floorTexture.repeat.set(Math.max(2, mapW / 4), Math.max(2, mapH / 4));
  ceilingTexture.repeat.set(Math.max(2, mapW / 5), Math.max(2, mapH / 5));

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(mapW, mapH), materials.floor);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(mapW / 2, FLOOR_Y, mapH / 2);
  worldRoot.add(floor);

  if (centralBaseBounds) {
    const baseW = centralBaseBounds.endX - centralBaseBounds.startX + 1;
    const baseH = centralBaseBounds.endY - centralBaseBounds.startY + 1;
    const baseFloor = new THREE.Mesh(new THREE.PlaneGeometry(baseW, baseH), materials.baseFloor);
    baseFloor.rotation.x = -Math.PI / 2;
    baseFloor.position.set(centralBaseBounds.startX + baseW / 2, FLOOR_Y + 0.006, centralBaseBounds.startY + baseH / 2);
    worldRoot.add(baseFloor);

    const baseLight = new THREE.PointLight(0xd8bd78, 1.15, 14, 2);
    baseLight.position.set(centralBaseBounds.startX + baseW / 2, CEILING_Y - 0.25, centralBaseBounds.startY + baseH / 2);
    worldRoot.add(baseLight);
  }

  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(mapW, mapH), materials.ceiling);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(mapW / 2, CEILING_Y, mapH / 2);
  worldRoot.add(ceiling);

  const tiles = {
    wall: [],
    door: [],
    wood: [],
    stone: [],
    crystal: [],
    coal: [],
    workbench: [],
    storage: [],
    exit: []
  };

  for (let yy = 0; yy < mapH; yy++) {
    for (let xx = 0; xx < mapW; xx++) {
      const tile = level[yy][xx];
      const pos = { x: xx, y: yy };

      if (tile === TILE.WALL) tiles.wall.push(pos);
      else if (tile === TILE.MAZE_DOOR) tiles.door.push(pos);
      else if (tile === TILE.WOOD) tiles.wood.push(pos);
      else if (tile === TILE.STONE) tiles.stone.push(pos);
      else if (tile === TILE.CRYSTAL) tiles.crystal.push(pos);
      else if (tile === TILE.COAL) tiles.coal.push(pos);
      else if (tile === TILE.WORKBENCH) tiles.workbench.push(pos);
      else if (tile === TILE.STORAGE) tiles.storage.push(pos);
      else if (tile === TILE.EXIT) tiles.exit.push(pos);
    }
  }

  addInstancedTiles(tiles.wall, new THREE.BoxGeometry(1.02, WALL_HEIGHT, 1.02), materials.wall, WALL_HEIGHT / 2);
  addInstancedTiles(tiles.wall, new THREE.BoxGeometry(1.04, 0.11, 1.04), materials.wallTrim, 0.055);
  addInstancedTiles(tiles.wall, new THREE.BoxGeometry(1.04, 0.08, 1.04), materials.wallTrim, WALL_HEIGHT - 0.04);
  addDetailedDoors(tiles.door);
  addResourceModels(tiles.wood, "wood");
  addResourceModels(tiles.stone, "stone");
  addResourceModels(tiles.crystal, "crystal");
  addResourceModels(tiles.coal, "coal");
  addInstancedTiles(tiles.workbench, new THREE.BoxGeometry(0.86, 0.52, 0.62), materials.workbench, 0.26);
  addInstancedTiles(tiles.storage, new THREE.BoxGeometry(0.78, 0.78, 0.78), materials.storage, 0.39);
  addInstancedTiles(tiles.exit, new THREE.BoxGeometry(0.7, 1.55, 0.08), materials.exit, 0.78);
}

function syncCamera() {
  const pitchForward = cosd(pitch);
  camera.position.set(x, EYE_HEIGHT, y);
  lookTarget.set(
    x + cosd(dir) * pitchForward,
    EYE_HEIGHT + sind(pitch),
    y + sind(dir) * pitchForward
  );
  camera.lookAt(lookTarget);
}

function updateRenderSettings(force = false) {
  const lightRatio = getLightRatio();
  const nextFov = getCurrentFov();
  const baseFar = scene === "base" ? 26 : getCurrentRayDepth() + 4;
  const nextFar = Math.max(baseFar, 12 + lightRatio * 26);

  if (force || Math.abs(camera.fov - nextFov) > 0.01 || Math.abs(camera.far - nextFar) > 0.01) {
    camera.fov = nextFov;
    camera.far = nextFar;
    camera.updateProjectionMatrix();
  }

  const fogDensity = scene === "base" ? 0.022 : 0.13 - lightRatio * 0.095;
  scene3d.fog.density = clamp(fogDensity, 0.028, 0.13);

  eyeLight.intensity = 0.55 + lightRatio * 2.45;
  eyeLight.distance = 5 + lightRatio * 21;
  ambientLight.intensity = scene === "base" ? 0.76 : 0.25 + lightRatio * 0.36;
  hemiLight.intensity = scene === "base" ? 0.45 : 0.18 + lightRatio * 0.22;
}

function draw() {
  const w = window.innerWidth;
  const h = window.innerHeight;

  syncCamera();
  updateRenderSettings();
  renderer.render(scene3d, camera);

  ctx.clearRect(0, 0, w, h);

  drawVisionMask(w, h);

  if (!gameStarted) return;

  drawHUD(w, h);
  drawGatheringOverlay(w, h);
  if (getUpgradeLevel("marker") >= 2 && !mapOpen) drawMiniMap(w, h);

  if (mapOpen) drawFullMap(w, h);
  if (inventoryOpen) drawInventoryPanel(w, h);
  if (showCraft) drawCraftPanel(w, h);
}

function drawVisionMask(w, h) {
  const lightRatio = getLightRatio();
  const outer = Math.max(w, h) * (0.42 + lightRatio * 0.58);
  const inner = Math.max(w, h) * (0.07 + lightRatio * 0.21);
  const edgeDarkness = 0.92 - lightRatio * 0.56;
  const midDarkness = 0.46 - lightRatio * 0.36;

  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.scale(1.65, 1);

  const gradient = ctx.createRadialGradient(0, 0, inner, 0, 0, outer);

  gradient.addColorStop(0, "rgba(0,0,0,0)");
  gradient.addColorStop(0.62, `rgba(0,0,0,${clamp(midDarkness, 0.03, 0.5)})`);
  gradient.addColorStop(1, `rgba(0,0,0,${clamp(edgeDarkness, 0.22, 0.94)})`);

  ctx.fillStyle = gradient;
  ctx.fillRect(-w, -h, w * 2, h * 2);
  ctx.restore();
}

function roundedRectPath(x0, y0, w0, h0, r) {
  const radius = Math.min(r, w0 / 2, h0 / 2);

  ctx.beginPath();
  ctx.moveTo(x0 + radius, y0);
  ctx.lineTo(x0 + w0 - radius, y0);
  ctx.quadraticCurveTo(x0 + w0, y0, x0 + w0, y0 + radius);
  ctx.lineTo(x0 + w0, y0 + h0 - radius);
  ctx.quadraticCurveTo(x0 + w0, y0 + h0, x0 + w0 - radius, y0 + h0);
  ctx.lineTo(x0 + radius, y0 + h0);
  ctx.quadraticCurveTo(x0, y0 + h0, x0, y0 + h0 - radius);
  ctx.lineTo(x0, y0 + radius);
  ctx.quadraticCurveTo(x0, y0, x0 + radius, y0);
}

function drawPanel(x0, y0, w0, h0, r, fill, stroke) {
  roundedRectPath(x0, y0, w0, h0, r);
  ctx.fillStyle = fill;
  ctx.fill();

  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

function drawOrnatePanel(x0, y0, w0, h0, accent = "rgba(183,146,83,0.36)") {
  ctx.save();
  const bg = ctx.createLinearGradient(x0, y0, x0, y0 + h0);
  bg.addColorStop(0, "rgba(14,11,8,0.90)");
  bg.addColorStop(0.52, "rgba(9,8,7,0.86)");
  bg.addColorStop(1, "rgba(4,4,4,0.86)");
  drawPanel(x0, y0, w0, h0, 1, bg, accent);

  ctx.strokeStyle = "rgba(0,0,0,0.52)";
  ctx.strokeRect(x0 + 4.5, y0 + 4.5, w0 - 9, h0 - 9);
  ctx.strokeStyle = "rgba(225,196,131,0.12)";
  ctx.strokeRect(x0 + 10.5, y0 + 10.5, w0 - 21, h0 - 21);

  const corner = 12;
  const inner = 6;
  ctx.strokeStyle = "rgba(214,182,117,0.42)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x0 + inner, y0 + corner); ctx.lineTo(x0 + inner, y0 + inner); ctx.lineTo(x0 + corner, y0 + inner);
  ctx.moveTo(x0 + w0 - corner, y0 + inner); ctx.lineTo(x0 + w0 - inner, y0 + inner); ctx.lineTo(x0 + w0 - inner, y0 + corner);
  ctx.moveTo(x0 + inner, y0 + h0 - corner); ctx.lineTo(x0 + inner, y0 + h0 - inner); ctx.lineTo(x0 + corner, y0 + h0 - inner);
  ctx.moveTo(x0 + w0 - corner, y0 + h0 - inner); ctx.lineTo(x0 + w0 - inner, y0 + h0 - inner); ctx.lineTo(x0 + w0 - inner, y0 + h0 - corner);
  ctx.stroke();
  ctx.restore();
}

function drawEldenDivider(x0, y0, w0) {
  ctx.save();
  ctx.strokeStyle = "rgba(182,151,95,0.28)";
  ctx.beginPath();
  ctx.moveTo(x0, y0); ctx.lineTo(x0 + w0, y0);
  ctx.stroke();
  ctx.fillStyle = "rgba(210,175,108,0.46)";
  ctx.fillRect(x0 + w0 / 2 - 20, y0 - 0.5, 40, 1);
  ctx.restore();
}

function drawResourcePill(label, value, x0, y0, w0, color) {
  drawPanel(x0, y0, w0, 24, 8, "rgba(255,255,255,0.07)", "rgba(255,255,255,0.08)");

  ctx.fillStyle = color;
  ctx.fillRect(x0 + 9, y0 + 8, 8, 8);
  ctx.fillStyle = "#e8dfcd";
  ctx.font = "12px Arial";
  ctx.fillText(`${label} ${value}`, x0 + 23, y0 + 16);
}

function drawStatusBar(x0, y0, label, value, max, width, fill) {
  const ratio = clamp(value / Math.max(1, max), 0, 1);
  const barH = 16;
  const labelY = y0 - 12;

  ctx.save();
  ctx.font = "bold 15px Georgia, serif";
  ctx.textAlign = "left";
  ctx.fillStyle = "rgba(215,198,162,0.96)";
  ctx.fillText(label, x0, labelY);

  ctx.textAlign = "right";
  ctx.fillStyle = "rgba(182,164,131,0.86)";
  ctx.font = "14px Georgia, serif";
  ctx.fillText(`${Math.round(value)} / ${Math.round(max)}`, x0 + width, labelY);

  ctx.fillStyle = "rgba(0,0,0,0.64)";
  ctx.fillRect(x0 - 5, y0 - 4, width + 10, barH + 8);

  const bg = ctx.createLinearGradient(x0, y0, x0, y0 + barH);
  bg.addColorStop(0, "rgba(32,28,23,0.98)");
  bg.addColorStop(1, "rgba(7,7,6,0.98)");
  ctx.fillStyle = bg;
  ctx.fillRect(x0, y0, width, barH);
  ctx.strokeStyle = "rgba(176,141,86,0.34)";
  ctx.strokeRect(x0 - 0.5, y0 - 0.5, width + 1, barH + 1);

  if (ratio > 0) {
    const fillW = width * ratio;
    const grad = ctx.createLinearGradient(x0, y0, x0, y0 + barH);
    grad.addColorStop(0, fill);
    grad.addColorStop(1, "rgba(18,10,7,0.95)");
    ctx.fillStyle = grad;
    ctx.fillRect(x0, y0, fillW, barH);
    ctx.fillStyle = "rgba(255,232,185,0.22)";
    ctx.fillRect(x0 + 1, y0 + 1, Math.max(0, fillW - 2), 3);
  }

  ctx.restore();
}

function drawHUD(w, h) {
  const showTorchBar = getTorchLevel() > 0 || torchPower > 0;
  const rowGap = 41;
  const barW = 252;
  const barCount = showTorchBar ? 4 : 3;
  const panelW = 320;
  const panelH = 62 + barCount * rowGap + 12;
  const x0 = 16;
  const y0 = Math.max(16, h - panelH - 16);
  const barX = x0 + 22;
  let barY = y0 + 60;

  drawOrnatePanel(x0, y0, panelW, panelH, "rgba(184,147,83,0.30)");

  ctx.save();
  ctx.fillStyle = "rgba(217,194,145,0.88)";
  ctx.font = "bold 16px Georgia, serif";
  ctx.textAlign = "left";
  ctx.fillText("상태", x0 + 18, y0 + 22);
  drawEldenDivider(x0 + 16, y0 + 32, panelW - 32);
  ctx.restore();

  if (showTorchBar) {
    drawStatusBar(barX, barY, "횃불", torchPower, Math.max(1, getTorchMax()), barW - 20, "rgba(201,92,42,0.96)");
    barY += rowGap;
  }
  drawStatusBar(barX, barY, "빛", lightPower, getLightMax(), barW - 20, "rgba(218,172,68,0.96)");
  barY += rowGap;
  drawStatusBar(barX, barY, "정신력", sanity, sanityMax, barW - 20, "rgba(96,124,163,0.94)");
  barY += rowGap;
  drawStatusBar(barX, barY, "기력", stamina, staminaMax, barW - 20, "rgba(126,170,92,0.94)");

  ctx.strokeStyle = "rgba(226,209,173,0.34)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(w / 2 - 6, h / 2); ctx.lineTo(w / 2 + 6, h / 2);
  ctx.moveTo(w / 2, h / 2 - 6); ctx.lineTo(w / 2, h / 2 + 6);
  ctx.stroke();
}

function drawGatheringOverlay(w, h) {
  if (!gathering) return;

  const progress = clamp(gathering.progress / Math.max(1, gathering.duration), 0, 1);
  const boxW = Math.min(400, w - 40);
  const boxH = 88;
  const x0 = Math.floor(w * 0.5 - boxW / 2);
  const y0 = h - 184;

  drawOrnatePanel(x0, y0, boxW, boxH, "rgba(177,138,78,0.30)");

  ctx.save();
  ctx.textAlign = "left";
  ctx.fillStyle = "rgba(230,210,167,0.94)";
  ctx.font = "bold 18px Georgia, serif";
  ctx.fillText(`채집 중 · ${gathering.name}`, x0 + 20, y0 + 28);

  ctx.textAlign = "right";
  ctx.fillStyle = "rgba(184,168,135,0.82)";
  ctx.font = "14px Georgia, serif";
  ctx.fillText(`${Math.round(progress * 100)}%`, x0 + boxW - 18, y0 + 28);

  drawEldenDivider(x0 + 18, y0 + 36, boxW - 36);

  const barX = x0 + 20;
  const barY = y0 + 48;
  const barW = boxW - 40;
  const barH = 14;
  ctx.fillStyle = "rgba(0,0,0,0.62)";
  ctx.fillRect(barX - 3, barY - 3, barW + 6, barH + 6);
  ctx.fillStyle = "rgba(25,21,16,0.98)";
  ctx.fillRect(barX, barY, barW, barH);
  ctx.strokeStyle = "rgba(151,116,63,0.36)";
  ctx.strokeRect(barX - 0.5, barY - 0.5, barW + 1, barH + 1);
  if (progress > 0) {
    const fillW = barW * progress;
    const grad = ctx.createLinearGradient(barX, barY, barX, barY + barH);
    grad.addColorStop(0, "rgba(202,152,79,0.98)");
    grad.addColorStop(1, "rgba(90,57,29,0.98)");
    ctx.fillStyle = grad;
    ctx.fillRect(barX, barY, fillW, barH);
    ctx.fillStyle = "rgba(255,234,184,0.18)";
    ctx.fillRect(barX + 1, barY + 1, Math.max(0, fillW - 2), 3);
  }

  ctx.textAlign = "left";
  ctx.fillStyle = "rgba(166,149,119,0.66)";
  ctx.font = "13px Georgia, serif";
  ctx.fillText("움직이면 채집이 취소됩니다.", x0 + 20, y0 + 75);
  ctx.restore();
}

function getMapTileColor(tile, explored) {
  if (!explored) return "rgba(9,8,7,0.96)";
  if (tile === TILE.WALL) return "rgba(48,44,39,1)";
  if (tile === TILE.MAZE_DOOR) return "rgba(126,92,46,1)";
  if (tile === TILE.WORKBENCH) return "rgba(147,112,63,1)";
  if (tile === TILE.WOOD) return "rgba(131,92,49,1)";
  if (tile === TILE.STONE) return "rgba(121,126,136,1)";
  if (tile === TILE.CRYSTAL) return "rgba(96,170,215,1)";
  if (tile === TILE.COAL) return "rgba(67,59,56,1)";
  if (tile === TILE.EXIT) return "rgba(183,94,68,1)";
  return "rgba(170,154,126,1)";
}

function drawPlayerMapMarker(cx, cy, size, len) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(degToRad(dir));
  ctx.fillStyle = "rgba(228,210,176,0.96)";
  ctx.beginPath();
  ctx.moveTo(len, 0);
  ctx.lineTo(-size, size * 0.82);
  ctx.lineTo(-size * 0.56, 0);
  ctx.lineTo(-size, -size * 0.82);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawFullMap(w, h) {
  const boxW = Math.min(w - 80, 620);
  const boxH = Math.min(h - 80, 620);
  const x0 = Math.floor((w - boxW) / 2);
  const y0 = Math.floor((h - boxH) / 2);
  const drawW = boxW - 48;
  const drawH = boxH - 72;
  const cell = Math.min(drawW / mapW, drawH / mapH);
  const mapDrawW = cell * mapW;
  const mapDrawH = cell * mapH;
  const mapX = x0 + (boxW - mapDrawW) / 2;
  const mapY = y0 + 46;

  drawOrnatePanel(x0, y0, boxW, boxH, "rgba(184,147,83,0.32)");
  ctx.save();
  ctx.fillStyle = "rgba(230,211,172,0.94)";
  ctx.font = "bold 18px Georgia, serif";
  ctx.textAlign = "left";
  ctx.fillText(`지도 · Day ${day}`, x0 + 22, y0 + 24);
  ctx.fillStyle = "rgba(173,156,124,0.62)";
  ctx.font = "12px Georgia, serif";
  ctx.textAlign = "right";
  ctx.fillText("M 닫기", x0 + boxW - 22, y0 + 24);
  drawEldenDivider(x0 + 20, y0 + 30, boxW - 40);

  for (let yy = 0; yy < mapH; yy++) {
    for (let xx = 0; xx < mapW; xx++) {
      const explored = isTileExplored(xx, yy);
      ctx.fillStyle = getMapTileColor(level[yy][xx], explored);
      ctx.fillRect(mapX + xx * cell, mapY + yy * cell, Math.ceil(cell), Math.ceil(cell));
    }
  }

  ctx.strokeStyle = "rgba(201,171,112,0.18)";
  ctx.strokeRect(mapX - 0.5, mapY - 0.5, mapDrawW + 1, mapDrawH + 1);
  drawPlayerMapMarker(mapX + x * cell, mapY + y * cell, Math.max(3, cell * 0.35), Math.max(5, cell * 0.55));
  ctx.restore();
}

function drawInventoryPanel(w, h) {
  const boxW = Math.min(w - 80, 500);
  const boxH = 316;
  const x0 = Math.floor((w - boxW) / 2);
  const y0 = Math.floor((h - boxH) / 2);
  const rows = [
    ["나무", inventory.wood, "rgba(160,114,59,0.95)"],
    ["돌", inventory.stone, "rgba(132,137,146,0.95)"],
    ["수정", inventory.crystal, "rgba(103,176,224,0.95)"],
    ["석탄", inventory.coal || 0, "rgba(98,86,81,0.95)"]
  ];

  drawOrnatePanel(x0, y0, boxW, boxH, "rgba(184,147,83,0.32)");
  ctx.save();
  ctx.fillStyle = "rgba(231,212,173,0.94)";
  ctx.font = "bold 22px Georgia, serif";
  ctx.textAlign = "left";
  ctx.fillText("인벤토리", x0 + 24, y0 + 30);
  ctx.fillStyle = "rgba(171,152,120,0.72)";
  ctx.font = "14px Georgia, serif";
  ctx.textAlign = "right";
  ctx.fillText("I 닫기", x0 + boxW - 24, y0 + 30);
  drawEldenDivider(x0 + 22, y0 + 38, boxW - 44);

  rows.forEach((row, idx) => {
    const rowY = y0 + 60 + idx * 50;
    drawPanel(x0 + 22, rowY, boxW - 44, 38, 1, "rgba(17,15,12,0.72)", "rgba(177,143,84,0.18)");
    ctx.fillStyle = row[2];
    ctx.fillRect(x0 + 38, rowY + 14, 12, 12);
    ctx.fillStyle = "rgba(224,207,173,0.92)";
    ctx.font = "16px Georgia, serif";
    ctx.textAlign = "left";
    ctx.fillText(row[0], x0 + 60, rowY + 25);
    ctx.textAlign = "right";
    ctx.fillStyle = "rgba(204,188,156,0.9)";
    ctx.fillText(String(row[1]), x0 + boxW - 40, rowY + 25);
  });

  ctx.fillStyle = "rgba(168,149,118,0.64)";
  ctx.font = "13px Georgia, serif";
  ctx.textAlign = "left";
  ctx.fillText("중앙 방과 미로에서 얻은 재료입니다.", x0 + 24, y0 + boxH - 24);
  ctx.restore();
}

function drawMiniMap(w, h) {
  const size = 188;
  const radius = 12;
  const x0 = w - size - 24;
  const y0 = w < 760 ? 132 : 22;
  const cells = radius * 2 + 1;
  const cell = size / cells;
  const px = Math.floor(x);
  const py = Math.floor(y);

  drawOrnatePanel(x0 - 12, y0 - 34, size + 24, size + 48, "rgba(184,147,83,0.28)");
  ctx.fillStyle = "rgba(224,205,162,0.9)";
  ctx.font = "bold 15px Georgia, serif";
  ctx.textAlign = "center";
  ctx.fillText("지도", x0 + size / 2, y0 - 14);
  ctx.textAlign = "left";

  for (let yy = -radius; yy <= radius; yy++) {
    for (let xx = -radius; xx <= radius; xx++) {
      const tx = px + xx;
      const ty = py + yy;
      const sx = x0 + (xx + radius) * cell;
      const sy = y0 + (yy + radius) * cell;
      const inBounds = tx >= 0 && tx < mapW && ty >= 0 && ty < mapH;
      const tile = inBounds ? level[ty][tx] : TILE.WALL;
      const explored = inBounds && isTileExplored(tx, ty);
      ctx.fillStyle = getMapTileColor(tile, explored);
      ctx.fillRect(sx, sy, Math.ceil(cell), Math.ceil(cell));
    }
  }

  ctx.strokeStyle = "rgba(198,166,104,0.18)";
  ctx.strokeRect(x0 - 0.5, y0 - 0.5, size + 1, size + 1);
  drawPlayerMapMarker(x0 + size / 2, y0 + size / 2, 5, 14);
}

function drawCraftRow(x0, y0, key, title, cost, note, done) {
  const rowW = 452;
  const rowH = 52;
  const fill = done ? "rgba(62,58,38,0.42)" : "rgba(17,13,9,0.56)";
  drawPanel(x0, y0, rowW, rowH, 2, fill, "rgba(190,165,115,0.15)");

  ctx.fillStyle = "rgba(7,5,3,0.64)";
  ctx.fillRect(x0 + 10, y0 + 10, 30, 30);
  ctx.strokeStyle = "rgba(214,180,108,0.28)";
  ctx.strokeRect(x0 + 10.5, y0 + 10.5, 29, 29);

  ctx.fillStyle = "rgba(219,199,152,0.86)";
  ctx.font = "bold 15px Georgia, serif";
  ctx.textAlign = "center";
  ctx.fillText(key, x0 + 25, y0 + 31);

  ctx.textAlign = "left";
  ctx.fillStyle = "rgba(229,215,184,0.94)";
  ctx.font = "bold 16px Georgia, serif";
  ctx.fillText(title, x0 + 54, y0 + 20);

  ctx.fillStyle = "rgba(190,176,140,0.72)";
  ctx.font = "13px Georgia, serif";
  ctx.fillText(done ? note : `${cost}  ·  ${note}`, x0 + 54, y0 + 38);
}

function drawCraftRow(x0, y0, key, title, cost, note, done) {
  const rowW = 404;
  const rowH = 44;
  const fill = done ? "rgba(62,58,38,0.42)" : "rgba(17,13,9,0.56)";
  drawPanel(x0, y0, rowW, rowH, 2, fill, "rgba(190,165,115,0.15)");

  ctx.fillStyle = "rgba(7,5,3,0.64)";
  ctx.fillRect(x0 + 8, y0 + 8, 26, 26);
  ctx.strokeStyle = "rgba(214,180,108,0.28)";
  ctx.strokeRect(x0 + 8.5, y0 + 8.5, 25, 25);

  ctx.fillStyle = "rgba(219,199,152,0.86)";
  ctx.font = "bold 13px Georgia, serif";
  ctx.textAlign = "center";
  ctx.fillText(key, x0 + 21, y0 + 27);

  ctx.textAlign = "left";
  ctx.fillStyle = "rgba(229,215,184,0.94)";
  ctx.font = "bold 14px Georgia, serif";
  ctx.fillText(title, x0 + 48, y0 + 17);

  ctx.fillStyle = "rgba(190,176,140,0.62)";
  ctx.font = "11px Georgia, serif";
  ctx.fillText(done ? note : `${cost}  ·  ${note}`, x0 + 48, y0 + 33);
}

function getMachineUpgradeName(level) {
  if (level <= 0) return "기계 업그레이드";
  if (level === 1) return "기계 업그레이드 I";
  return "기계 업그레이드 II";
}

function getVisibleCraftRows() {
  const rows = [];
  const techLevel = getCraftTechLevel();
  const torchLevel = getTorchLevel();
  const lanternLevel = getLanternLevel();
  const workbenchLevel = getWorkbenchLevel();
  const bootsLevel = getUpgradeLevel("boots");
  const markerLevel = getUpgradeLevel("marker");

  function add(item, title, cost, note, done = false) {
    rows.push({ item, title, cost, note, done });
  }

  if (isCraftUnlocked("craftTech")) {
    const techNames = ["제작 기술 Lv 1", "제작 기술 Lv 2", "제작 기술 Lv 3", "제작 기술 Lv 4", "제작 기술 Lv 5"];
    const notes = ["기초 제작 해금", "제작대와 횃불 계열 해금", "랜턴과 보조 제작품 해금", "상위 제작 확장", "후반 장치 계열 해금"];
    add("craftTech", techNames[techLevel] || "제작 기술", formatCost(getCostForCraftItem("craftTech")), notes[techLevel] || "새 제작품 해금");
  }

  if (isCraftUnlocked("torchUse")) {
    add("torchUse", "횃불 만들기", formatCost(getCostForCraftItem("torchUse")), `횃불 ${Math.round(torchPower)}/${getTorchMax()}L`);
  }

  if (isCraftUnlocked("torch")) {
    const names = ["횃불 업그레이드 I", "횃불 업그레이드 II", "횃불 업그레이드 III"];
    add("torch", names[torchLevel] || "횃불 업그레이드", formatCost(getCostForCraftItem("torch")), "횃불 최대치 증가");
  }

  if (isCraftUnlocked("workbench")) {
    const names = ["제작대 Lv 1", "제작대 Lv 2", "제작대 Lv 3"];
    add("workbench", names[workbenchLevel] || "제작대", formatCost(getCostForCraftItem("workbench")), workbenchLevel === 0 ? "메인공간 기본 위치에 설치" : "제작 기능 확장");
  }

  if (isCraftUnlocked("machineWorkbench")) {
    add("machineWorkbench", "기계 제작대 Lv 1", formatCost(getCostForCraftItem("machineWorkbench")), "기계 업그레이드 해금");
  }

  if (isCraftUnlocked("machineMaxUpgrade")) {
    const names = ["기계 최대치 업그레이드 I", "기계 최대치 업그레이드 II", "기계 최대치 업그레이드 III"];
    add("machineMaxUpgrade", names[getMachineMaxUpgradeLevel()] || "기계 최대치 업그레이드", formatCost(getCostForCraftItem("machineMaxUpgrade")), "기계 저장 한계 증가");
  }

  if (isCraftUnlocked("machineRecoveryUpgrade")) {
    const names = ["기계 회복 속도 업그레이드 I", "기계 회복 속도 업그레이드 II"];
    add("machineRecoveryUpgrade", names[getMachineRecoveryUpgradeLevel()] || "기계 회복 속도 업그레이드", formatCost(getCostForCraftItem("machineRecoveryUpgrade")), "기계 회복 효율 증가");
  }

  if (isCraftUnlocked("manualCrafter")) {
    add("manualCrafter", "수동 제작기 Lv 1", formatCost(getCostForCraftItem("manualCrafter")), "상위 수동 제작품 해금");
  }

  if (isCraftUnlocked("restStone")) {
    add("restStone", "안식의 돌", formatCost(getCostForCraftItem("restStone")), "이동 속도 + / 정신력 감소 완화");
  }

  if (isCraftUnlocked("potionWorkbench")) {
    add("potionWorkbench", "포션 제작기 Lv 1", formatCost(getCostForCraftItem("potionWorkbench")), "정신력 회복 포션 해금");
  }

  if (isCraftUnlocked("basicSanityPotion")) {
    add("basicSanityPotion", "초급 정신력 회복 포션", formatCost(getCostForCraftItem("basicSanityPotion")), "제작 즉시 정신력 +15");
  }

  if (isCraftUnlocked("manualExtractor")) {
    add("manualExtractor", "수동 원석기 Lv 1", formatCost(getCostForCraftItem("manualExtractor")), "후반 장치 계열 선행 조건");
  }

  if (isCraftUnlocked("mysteryDevice")) {
    const names = ["미정 장치 Lv 1", "미정 장치 Lv 2"];
    add("mysteryDevice", names[getMysteryDeviceLevel()] || "미정 장치", formatCost(getCostForCraftItem("mysteryDevice")), "후반 확장 제작품");
  }

  if (isCraftUnlocked("lantern")) {
    const names = ["랜턴 Lv 1", "랜턴 Lv 2"];
    add("lantern", names[lanternLevel] || "랜턴", formatCost(getCostForCraftItem("lantern")), "석탄으로 빛 유지");
  }

  if (isCraftUnlocked("boots") && bootsLevel < CRAFT_COSTS.boots.length) {
    add("boots", "다른 아이템", formatCost(getCostForCraftItem("boots")), "이동 보조 제작품");
  }

  if (isCraftUnlocked("marker") && markerLevel < CRAFT_COSTS.marker.length) {
    add("marker", "지도 보강", formatCost(getCostForCraftItem("marker")), markerLevel + 1 >= 2 ? "미니맵 활성화" : "내 위치 표시");
  }

  return rows;
}


function drawCraftPanel(w, h) {
  const rows = getVisibleCraftRows();
  craftHotkeys = {};

  const rowH = 56;
  const boxW = Math.min(482, w - 30);
  const boxH = Math.min(h - 52, 102 + Math.max(1, rows.length) * rowH + 34);
  const x0 = Math.max(16, w - boxW - 18);
  const y0 = 18;

  drawOrnatePanel(x0, y0, boxW, boxH, "rgba(184,147,83,0.28)");

  ctx.fillStyle = "rgba(232,213,174,0.95)";
  ctx.font = "bold 22px Georgia, serif";
  ctx.textAlign = "left";
  ctx.fillText("제작", x0 + 24, y0 + 30);
  ctx.fillStyle = "rgba(177,160,127,0.72)";
  ctx.font = "14px Georgia, serif";
  ctx.fillText("조건이 맞는 작업만 드러납니다.", x0 + 24, y0 + 50);
  drawEldenDivider(x0 + 22, y0 + 60, boxW - 44);

  if (rows.length === 0) {
    ctx.fillStyle = "rgba(220,204,166,0.72)";
    ctx.font = "15px Georgia, serif";
    ctx.fillText("지금 만들 수 있는 것이 없습니다.", x0 + 24, y0 + 102);
  }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const key = String((i % 9) + 1);
    craftHotkeys[`Digit${key}`] = row.item;
    drawCraftRow(x0 + 14, y0 + 72 + i * rowH, key, row.title, row.cost, row.note, row.done);
  }

  ctx.fillStyle = "rgba(170,152,120,0.64)";
  ctx.font = "13px Georgia, serif";
  ctx.fillText("C 닫기", x0 + 24, y0 + boxH - 18);
}

function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

startBtn.addEventListener("click", () => {
  gameStarted = true;
  menu.classList.add("hidden");
  loadProgress();
  loadSettings();
  generateMaze();
  requestGamePointerLock();
  showMessage("C로 제작창을 열고, 방 안 자원으로 제작 기술 Lv1부터 연구하세요.");
});

closeSettingsBtn.addEventListener("click", closeSettings);

resetControlsBtn.addEventListener("click", () => {
  controls = { ...DEFAULT_CONTROLS };
  mouseSensitivity = 1;
  saveSettings();
  updateSettingsUI();
});

resetGameBtn.addEventListener("click", () => {
  if (!confirm("진행 상황을 초기화할까요? 키 설정은 유지됩니다.")) return;

  resetGameProgress();
  closeSettings();
  showMessage("게임 진행이 초기화되었습니다.");
});

closeTestBtn.addEventListener("click", closeTestPanel);
applyTestBtn.addEventListener("click", () => queueTestApply("테스트 값 적용"));

fillTestBtn.addEventListener("click", () => {
  testWood.value = "99";
  testStone.value = "99";
  testCrystal.value = "99";
  if (testCoal) testCoal.value = "99";
  testBoots.value = String(CRAFT_COSTS.boots.length);
  testMarker.value = String(CRAFT_COSTS.marker.length);
  if (testWorkbench) testWorkbench.checked = true;
  if (testLantern) testLantern.value = String(CRAFT_COSTS.lantern.length);
  if (testPortableWorkbench) testPortableWorkbench.value = String(CRAFT_COSTS.craftTech.length);
  if (testInfiniteLantern) testInfiniteLantern.checked = true;

  testStamina.value = "150";
  if (testSanity) testSanity.value = "100";
  if (testLight) testLight.value = "300";

  queueTestApply("테스트 값 적용 - 넉넉히 채우기 완료");
});

sensitivitySlider.addEventListener("input", () => {
  mouseSensitivity = clamp(Number(sensitivitySlider.value), 0.5, 2);
  saveSettings();
  updateSettingsUI();
});

for (const button of bindButtons) {
  button.addEventListener("click", () => {
    bindingAction = button.dataset.action;
    updateSettingsUI();
  });
}

window.addEventListener("resize", resizeCanvas);
window.addEventListener("blur", () => {
  for (const code of Object.keys(keys)) keys[code] = false;
});

window.addEventListener("keydown", (e) => {
  if (bindingAction) {
    e.preventDefault();

    if (e.code !== "Escape") {
      controls[bindingAction] = e.code;
      saveSettings();
    }

    bindingAction = null;
    updateSettingsUI();
    return;
  }

  if (e.code === "Escape") {
    if (testOpen) {
      closeTestPanel();
      return;
    }

    if (settingsOpen) closeSettings();
    else openSettings();
    return;
  }

  if (settingsOpen) return;
  if (!gameStarted) return;

  if (e.code === "Equal") {
    if (testOpen) closeTestPanel();
    else openTestPanel();
    return;
  }

  if (testOpen) return;

  if (e.code === "KeyI") {
    inventoryOpen = !inventoryOpen;
    showCraft = false;
    mapOpen = false;
    return;
  }

  if (e.code === controls.map) {
    mapOpen = !mapOpen;
    inventoryOpen = false;
    return;
  }

  if (e.code === controls.reroll) {
    changeMazeDay();
    return;
  }

  if (e.code === controls.interact) {
    interact();
    return;
  }

  if (e.code === controls.craft) {
    showCraft = !showCraft;
    inventoryOpen = false;
    return;
  }

  if (showCraft && craftHotkeys[e.code]) {
    craft(craftHotkeys[e.code]);
    return;
  }

  keys[e.code] = true;
});

window.addEventListener("keyup", (e) => {
  keys[e.code] = false;

  if (e.code === controls.run) {
    sprintActive = false;
  }
});

window.addEventListener("mousemove", (e) => {
  if (document.pointerLockElement === canvas) {
    mouse.dx += e.movementX;
    mouse.dy += e.movementY;
  }
});

canvas.addEventListener("click", () => {
  requestGamePointerLock();
});

loadSettings();
loadProgress();
resizeCanvas();
generateMaze();
gameLoop();
