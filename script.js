const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const menu = document.getElementById("menu");
const startBtn = document.getElementById("startBtn");
const messageBox = document.getElementById("message");

const keys = {};
const mouse = { dx: 0 };

const TILE = {
  EMPTY: 0,
  WALL: 1,
  EXIT: 2,
  WOOD: 3,
  STONE: 4,
  CRYSTAL: 5,
  WORKBENCH: 7,
  STORAGE: 8,
  MAZE_DOOR: 9
};

const RESOURCE_TYPES = {
  [TILE.WOOD]: "wood",
  [TILE.STONE]: "stone",
  [TILE.CRYSTAL]: "crystal"
};

const RESOURCE_NAMES = {
  wood: "나무",
  stone: "돌",
  crystal: "수정"
};

const CRAFT_COSTS = {
  boots: [
    { wood: 2, stone: 1 },
    { wood: 3, stone: 2 },
    { wood: 4, stone: 3, crystal: 1 }
  ],
  marker: [
    { stone: 2, crystal: 1 },
    { stone: 3, crystal: 2 },
    { stone: 4, crystal: 3 }
  ]
};

const CONFIG = {
  mazeFov: 52,
  lanternFov: 76,
  rayCount: 420,
  mazeRayDepth: 9,
  lanternRayDepth: 30,
  rotSpeed: 0.0018,
  walkSpeed: 0.035,
  runSpeed: 0.06,
  baseSize: 9,
  mazeCells: 68,
  resourceDensity: 0.055,
  interactDistance: 1.25,
  gather: {
    wood: { duration: 72, staminaCost: 10, minStamina: 8 },
    stone: { duration: 108, staminaCost: 16, minStamina: 12 },
    crystal: { duration: 144, staminaCost: 24, minStamina: 16 }
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

let day = getStoredDay();
let mazeSeed = getDailySeed(day);

let mapOpen = false;
let showCraft = false;

let stamina = 100;
let staminaMax = 100;
let gathering = null;

let inventory = {
  wood: 0,
  stone: 0,
  crystal: 0
};

let collectedResources = {};
let exploredTiles = {};

let crafted = {
  boots: 0,
  lantern: false,
  map: false,
  marker: 0
};

let messageTimer = 0;

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
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
}

function normalizeCraftedProgress() {
  crafted.boots = crafted.boots === true ? 1 : clamp(Number(crafted.boots) || 0, 0, CRAFT_COSTS.boots.length);
  crafted.marker = crafted.marker === true ? 1 : clamp(Number(crafted.marker) || 0, 0, CRAFT_COSTS.marker.length);
  crafted.lantern = crafted.lantern === true;
  crafted.map = crafted.map === true;
}

function loadProgress() {
  try {
    const inv = JSON.parse(localStorage.getItem("mta_inventory") || "null");
    const craft = JSON.parse(localStorage.getItem("mta_crafted") || "null");
    const collected = JSON.parse(localStorage.getItem("mta_collected_resources") || "null");
    const explored = JSON.parse(localStorage.getItem("mta_explored_tiles") || "null");

    if (inv) inventory = { ...inventory, ...inv };
    if (craft) crafted = { ...crafted, ...craft };
    if (collected) collectedResources = collected;
    if (explored) exploredTiles = explored;
    normalizeCraftedProgress();
  } catch {
    inventory = { wood: 0, stone: 0, crystal: 0 };
    collectedResources = {};
    exploredTiles = {};
    crafted = { boots: 0, lantern: false, map: false, marker: 0 };
  }
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

function isWalkable(tx, ty) {
  if (tx < 0 || tx >= mapW || ty < 0 || ty >= mapH) return false;

  const tile = level[ty][tx];

  return (
    tile === TILE.EMPTY ||
    tile === TILE.EXIT ||
    tile === TILE.WOOD ||
    tile === TILE.STONE ||
    tile === TILE.CRYSTAL ||
    tile === TILE.WORKBENCH ||
    tile === TILE.STORAGE
  );
}

function getCurrentFov() {
  return crafted.lantern ? CONFIG.lanternFov : CONFIG.mazeFov;
}

function getCurrentRayDepth() {
  return crafted.lantern ? CONFIG.lanternRayDepth : CONFIG.mazeRayDepth;
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

  if (scene !== "base") {
    showCraft = false;
  }
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

  const radius = crafted.lantern ? 4 : 2;
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
  const tx = Math.floor(x + cosd(dir) * CONFIG.interactDistance);
  const ty = Math.floor(y + sind(dir) * CONFIG.interactDistance);

  if (tx < 0 || tx >= mapW || ty < 0 || ty >= mapH) {
    return { tx, ty, tile: TILE.WALL };
  }

  return { tx, ty, tile: level[ty][tx] };
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
  updateSceneFromPosition();
  revealAroundPlayer();
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

  level[centerY - 2][startX + 1] = TILE.WORKBENCH;
  level[centerY - 2][endX - 1] = TILE.STORAGE;

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

    if (roll < 0.5) {
      level[pos.y][pos.x] = TILE.WOOD;
    } else if (roll < 0.84) {
      level[pos.y][pos.x] = TILE.STONE;
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

  if (keys.KeyW || keys.KeyA || keys.KeyS || keys.KeyD) {
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
  saveProgress();
}

function interact() {
  const target = getTileAhead();

  if (target.tile === TILE.MAZE_DOOR) {
    level[target.ty][target.tx] = TILE.EMPTY;
    showMessage("문을 열었습니다.");
    return;
  }

  if (target.tile === TILE.WORKBENCH) {
    showCraft = !showCraft;
    showMessage(showCraft ? "제작창을 열었습니다." : "제작창을 닫았습니다.");
    return;
  }

  if (target.tile === TILE.STORAGE) {
    showMessage("보관함은 아직 비어 있습니다. 이후 확장 가능합니다.");
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
    inventory.crystal >= (cost.crystal || 0)
  );
}

function spendMaterials(cost) {
  inventory.wood -= cost.wood || 0;
  inventory.stone -= cost.stone || 0;
  inventory.crystal -= cost.crystal || 0;
}

function formatCost(cost) {
  if (!cost) return "강화 완료";

  const parts = [];

  if (cost.wood) parts.push(`나무 ${cost.wood}`);
  if (cost.stone) parts.push(`돌 ${cost.stone}`);
  if (cost.crystal) parts.push(`수정 ${cost.crystal}`);

  return parts.join(" / ");
}

function canCraft(item) {
  if (item === "boots") return hasMaterials(getNextUpgradeCost("boots"));
  if (item === "lantern") return inventory.wood >= 2 && inventory.crystal >= 2 && !crafted.lantern;
  if (item === "map") return inventory.wood >= 2 && inventory.stone >= 1 && !crafted.map;
  if (item === "marker") return crafted.map && hasMaterials(getNextUpgradeCost("marker"));
  return false;
}

function craft(item) {
  if (scene !== "base") {
    showMessage("제작은 메인공간에서만 가능합니다.");
    return;
  }

  if (item === "boots" && canCraft("boots")) {
    spendMaterials(getNextUpgradeCost("boots"));
    crafted.boots = getUpgradeLevel("boots") + 1;
    saveProgress();
    showMessage(`러너 부츠 Lv ${crafted.boots} 강화 완료`);
    return;
  }

  if (item === "lantern" && canCraft("lantern")) {
    inventory.wood -= 2;
    inventory.crystal -= 2;
    crafted.lantern = true;
    saveProgress();
    showMessage("랜턴 제작 완료. 시야가 넓어집니다.");
    return;
  }

  if (item === "map" && canCraft("map")) {
    inventory.wood -= 2;
    inventory.stone -= 1;
    crafted.map = true;
    revealAroundPlayer();
    saveProgress();
    showMessage("탐험 지도 제작 완료. M키로 밝혀진 길을 볼 수 있습니다.");
    return;
  }

  if (item === "marker" && canCraft("marker")) {
    spendMaterials(getNextUpgradeCost("marker"));
    crafted.marker = getUpgradeLevel("marker") + 1;
    saveProgress();
    showMessage(`위치 표식 Lv ${crafted.marker} 강화 완료`);
    return;
  }

  showMessage("재료가 부족하거나 제작 조건을 만족하지 못했습니다.");
}

function movePlayer(nx, ny) {
  if (isWalkable(Math.floor(nx), Math.floor(y))) x = nx;
  if (isWalkable(Math.floor(x), Math.floor(ny))) y = ny;
}

function updateMovement() {
  const fx = cosd(dir);
  const fy = sind(dir);
  const rx = cosd(dir + 90);
  const ry = sind(dir + 90);

  let ix = 0;
  let iy = 0;

  if (keys.KeyW) { ix += fx; iy += fy; }
  if (keys.KeyS) { ix -= fx; iy -= fy; }
  if (keys.KeyA) { ix -= rx; iy -= ry; }
  if (keys.KeyD) { ix += rx; iy += ry; }

  const moving = ix !== 0 || iy !== 0;
  const running = keys.ShiftLeft && moving && stamina > 0;
  let speed = running ? CONFIG.runSpeed : CONFIG.walkSpeed;

  speed *= 1 + getUpgradeLevel("boots") * 0.05;

  if (running) stamina = Math.max(0, stamina - 0.7);
  else stamina = Math.min(staminaMax, stamina + 0.35);

  const len = Math.hypot(ix, iy);

  if (len > 0) {
    movePlayer(x + (ix / len) * speed, y + (iy / len) * speed);
  }
}

function update() {
  if (!gameStarted) return;

  if (!mapOpen && !gathering) {
    dir += mouse.dx * CONFIG.rotSpeed * 180 / Math.PI;
  }

  mouse.dx = 0;

  if (gathering) updateGathering();
  else updateMovement();

  updateSceneFromPosition();
  if (revealAroundPlayer()) saveProgress();
  updateMessage();
}

function castRay(angle, maxDepth) {
  let rayX = x;
  let rayY = y;
  let dist = 0;

  while (dist < maxDepth) {
    rayX += cosd(angle) * 0.025;
    rayY += sind(angle) * 0.025;
    dist += 0.025;

    const tx = Math.floor(rayX);
    const ty = Math.floor(rayY);

    if (tx < 0 || tx >= mapW || ty < 0 || ty >= mapH) {
      return { dist, tile: TILE.WALL };
    }

    const tile = level[ty][tx];

    if (tile !== TILE.EMPTY) {
      return { dist, tile };
    }
  }

  return { dist: maxDepth, tile: TILE.EMPTY };
}

function draw() {
  const w = canvas.width;
  const h = canvas.height;

  ctx.fillStyle = "#101010";
  ctx.fillRect(0, 0, w, h);

  drawWorld(w, h);
  drawVisionMask(w, h);
  drawHUD(w, h);

  if (mapOpen) drawFullMap(w, h);
  if (showCraft) drawCraftPanel(w, h);
}

function drawWorld(w, h) {
  const centerY = h / 2;
  const fov = getCurrentFov();
  const rayDepth = getCurrentRayDepth();

  ctx.fillStyle = "#171717";
  ctx.fillRect(0, 0, w, centerY);

  ctx.fillStyle = "#1f1e1b";
  ctx.fillRect(0, centerY, w, h - centerY);

  const sliceW = w / CONFIG.rayCount;

  for (let i = 0; i < CONFIG.rayCount; i++) {
    const angle = dir - fov / 2 + (i / CONFIG.rayCount) * fov;
    const hit = castRay(angle, rayDepth);

    let corrected = hit.dist * cosd(angle - dir);
    corrected = Math.max(corrected, 0.1);

    const wallH = h / corrected;
    const top = centerY - wallH / 2;
    const falloff = crafted.lantern ? 14 : 25;
    const shade = clamp(210 - corrected * falloff, 26, 210);

    ctx.fillStyle = getWallColor(hit.tile, shade);
    ctx.fillRect(i * sliceW - 0.5, top, sliceW + 1, wallH);
  }
}

function drawVisionMask(w, h) {
  const outer = Math.max(w, h) * (crafted.lantern ? 0.86 : 0.44);
  const inner = Math.max(w, h) * (crafted.lantern ? 0.24 : 0.09);
  const edgeDarkness = crafted.lantern ? 0.44 : 0.92;
  const midDarkness = crafted.lantern ? 0.1 : 0.42;
  const gradient = ctx.createRadialGradient(w / 2, h / 2, inner, w / 2, h / 2, outer);

  gradient.addColorStop(0, "rgba(0,0,0,0)");
  gradient.addColorStop(0.62, `rgba(0,0,0,${midDarkness})`);
  gradient.addColorStop(1, `rgba(0,0,0,${edgeDarkness})`);

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);
}

function getWallColor(tile, shade) {
  if (tile === TILE.WALL) return `rgb(${shade}, ${shade}, ${shade})`;
  if (tile === TILE.WOOD) return `rgb(${Math.floor(shade * 0.75)}, ${Math.floor(shade * 0.52)}, ${Math.floor(shade * 0.28)})`;
  if (tile === TILE.STONE) return `rgb(${Math.floor(shade * 0.58)}, ${Math.floor(shade * 0.58)}, ${Math.floor(shade * 0.62)})`;
  if (tile === TILE.CRYSTAL) return `rgb(${Math.floor(shade * 0.55)}, ${Math.floor(shade * 0.78)}, ${shade})`;
  if (tile === TILE.MAZE_DOOR) return `rgb(${Math.floor(shade * 0.62)}, ${Math.floor(shade * 0.38)}, ${Math.floor(shade * 0.18)})`;
  if (tile === TILE.EXIT) return `rgb(${shade}, ${Math.floor(shade * 0.58)}, ${Math.floor(shade * 0.44)})`;
  if (tile === TILE.WORKBENCH) return `rgb(${Math.floor(shade * 0.8)}, ${Math.floor(shade * 0.62)}, ${Math.floor(shade * 0.36)})`;
  if (tile === TILE.STORAGE) return `rgb(${Math.floor(shade * 0.55)}, ${Math.floor(shade * 0.66)}, ${Math.floor(shade * 0.8)})`;
  return `rgb(${shade}, ${shade}, ${shade})`;
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

function drawResourcePill(label, value, x0, y0, w0, color) {
  drawPanel(x0, y0, w0, 24, 8, "rgba(255,255,255,0.07)", "rgba(255,255,255,0.08)");

  ctx.fillStyle = color;
  ctx.fillRect(x0 + 9, y0 + 8, 8, 8);
  ctx.fillStyle = "#e8dfcd";
  ctx.font = "12px Arial";
  ctx.fillText(`${label} ${value}`, x0 + 23, y0 + 16);
}

function drawHUD(w, h) {
  drawPanel(18, 18, 286, 130, 8, "rgba(20,17,13,0.76)", "rgba(224,198,142,0.18)");

  ctx.fillStyle = "#d6bd82";
  ctx.font = "bold 13px Arial";
  ctx.fillText(`DAY ${day}`, 34, 42);

  ctx.fillStyle = crafted.map ? "#bfc8b1" : "#b7aca0";
  ctx.font = "12px Arial";
  ctx.fillText(crafted.map ? "M 탐험 지도" : "지도 미제작", 206, 42);

  drawResourcePill("나무", inventory.wood, 32, 58, 78, "#9d6f3f");
  drawResourcePill("돌", inventory.stone, 116, 58, 70, "#85888c");
  drawResourcePill("수정", inventory.crystal, 192, 58, 82, "#78a9c5");

  ctx.fillStyle = "#aaa092";
  ctx.font = "12px Arial";
  ctx.fillText("기력", 32, 103);

  drawPanel(68, 93, 188, 12, 6, "rgba(255,255,255,0.12)", null);
  drawPanel(68, 93, 188 * (stamina / staminaMax), 12, 6, "#cbbf9d", null);

  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.font = "11px Arial";
  ctx.fillText(gathering ? "채집 중" : "E 상호작용", 32, 130);
  ctx.fillText("R 새 미로", 122, 130);
  ctx.fillText("C 제작", 204, 130);

  ctx.strokeStyle = "rgba(255,255,255,0.85)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(w / 2 - 8, h / 2);
  ctx.lineTo(w / 2 + 8, h / 2);
  ctx.moveTo(w / 2, h / 2 - 8);
  ctx.lineTo(w / 2, h / 2 + 8);
  ctx.stroke();

  const target = getTileAhead();

  if (gathering) {
    drawGatherProgress(w, h);
    return;
  }

  if (target.tile !== TILE.EMPTY && target.tile !== TILE.WALL) {
    const text = getInteractionText(target.tile);
    ctx.font = "bold 14px Arial";
    const boxW = Math.max(190, ctx.measureText(text).width + 46);
    const boxX = w / 2 - boxW / 2;

    drawPanel(boxX, h - 82, boxW, 38, 8, "rgba(18,15,11,0.72)", "rgba(226,206,160,0.18)");
    ctx.fillStyle = "#eee";
    ctx.textAlign = "center";
    ctx.fillText(text, w / 2, h - 58);
    ctx.textAlign = "left";
  }
}

function drawGatherProgress(w, h) {
  const boxW = 340;
  const boxH = 58;
  const x0 = w / 2 - boxW / 2;
  const y0 = h - 96;
  const ratio = clamp(gathering.progress / gathering.duration, 0, 1);

  drawPanel(x0, y0, boxW, boxH, 8, "rgba(18,15,11,0.82)", "rgba(226,206,160,0.24)");

  ctx.fillStyle = "#eadfca";
  ctx.font = "bold 14px Arial";
  ctx.textAlign = "left";
  ctx.fillText(`${gathering.name} 채집 중`, x0 + 18, y0 + 22);

  ctx.fillStyle = "#a99f8d";
  ctx.font = "12px Arial";
  ctx.fillText("움직이면 중단됩니다", x0 + 218, y0 + 22);

  drawPanel(x0 + 18, y0 + 34, boxW - 36, 10, 5, "rgba(255,255,255,0.12)", null);
  drawPanel(x0 + 18, y0 + 34, (boxW - 36) * ratio, 10, 5, "#d7b56c", null);
  ctx.textAlign = "left";
}

function getInteractionText(tile) {
  if (tile === TILE.MAZE_DOOR) return "E 문 열기";
  if (tile === TILE.WORKBENCH) return "E 제작대";
  if (tile === TILE.STORAGE) return "E 보관함";
  if (tile === TILE.WOOD) return "E 나무 채집";
  if (tile === TILE.STONE) return "E 돌 채집";
  if (tile === TILE.CRYSTAL) return "E 수정 채집";
  if (tile === TILE.EXIT) return "E 깊은 출구";
  return "E 상호작용";
}

function drawFullMap(w, h) {
  const panelW = Math.min(w - 60, 760);
  const panelH = Math.min(h - 70, 760);
  const size = Math.min(panelW, panelH);
  const startX = (w - size) / 2;
  const startY = (h - size) / 2;

  ctx.fillStyle = "rgba(0,0,0,0.78)";
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = "#151515";
  ctx.fillRect(startX - 18, startY - 46, size + 36, size + 74);

  ctx.fillStyle = "#eee";
  ctx.font = "bold 18px Arial";
  ctx.fillText(`탐험 지도 - DAY ${day}`, startX, startY - 18);

  const cell = size / Math.max(mapW, mapH);
  const ox = startX + (size - mapW * cell) / 2;
  const oy = startY + (size - mapH * cell) / 2;

  for (let yy = 0; yy < mapH; yy++) {
    for (let xx = 0; xx < mapW; xx++) {
      const tile = level[yy][xx];
      const explored = isTileExplored(xx, yy);

      if (!explored) {
        ctx.fillStyle = "#070707";
        ctx.fillRect(ox + xx * cell, oy + yy * cell, Math.ceil(cell), Math.ceil(cell));
        continue;
      }

      if (tile === TILE.WALL) ctx.fillStyle = "#4b4b4b";
      else ctx.fillStyle = "#191919";

      if (tile === TILE.WOOD) ctx.fillStyle = "#8a6139";
      if (tile === TILE.STONE) ctx.fillStyle = "#777a80";
      if (tile === TILE.CRYSTAL) ctx.fillStyle = "#80a8c8";
      if (tile === TILE.MAZE_DOOR) ctx.fillStyle = "#80562c";
      if (tile === TILE.EXIT) ctx.fillStyle = "#b06150";
      if (tile === TILE.WORKBENCH) ctx.fillStyle = "#9a7442";
      if (tile === TILE.STORAGE) ctx.fillStyle = "#63768d";

      ctx.fillRect(ox + xx * cell, oy + yy * cell, Math.ceil(cell), Math.ceil(cell));
    }
  }

  const px = ox + x * cell;
  const py = oy + y * cell;
  const markerLevel = getUpgradeLevel("marker");
  const markerRadius = markerLevel > 0 ? 3.2 + markerLevel * 0.65 : 3;
  const facingLength = markerLevel > 0 ? 10 + markerLevel * 4 : 8;

  ctx.fillStyle = markerLevel > 0 ? "#ffffff" : "#e8d9b9";
  ctx.beginPath();
  ctx.arc(px, py, markerRadius, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = markerLevel > 0 ? "#ffffff" : "rgba(255,255,255,0.7)";
  ctx.beginPath();
  ctx.moveTo(px, py);
  ctx.lineTo(px + cosd(dir) * facingLength, py + sind(dir) * facingLength);
  ctx.stroke();

  ctx.fillStyle = "#bdbdbd";
  ctx.font = "13px Arial";
  ctx.fillText("M 닫기", startX, startY + size + 22);
}

function drawCraftRow(x0, y0, key, title, cost, note, done) {
  drawPanel(x0, y0, 376, 48, 8, done ? "rgba(114,120,90,0.18)" : "rgba(255,255,255,0.055)", "rgba(255,255,255,0.07)");

  drawPanel(x0 + 12, y0 + 12, 24, 24, 7, done ? "rgba(196,210,156,0.22)" : "rgba(221,190,118,0.18)", "rgba(255,255,255,0.08)");
  ctx.fillStyle = done ? "#cbd79a" : "#e2c47c";
  ctx.font = "bold 13px Arial";
  ctx.textAlign = "center";
  ctx.fillText(key, x0 + 24, y0 + 29);

  ctx.textAlign = "left";
  ctx.fillStyle = "#eee1cc";
  ctx.font = "bold 13px Arial";
  ctx.fillText(title, x0 + 48, y0 + 19);

  ctx.fillStyle = "#b7aa96";
  ctx.font = "12px Arial";
  ctx.fillText(done ? note : cost, x0 + 48, y0 + 36);
}

function drawCraftPanel(w, h) {
  const boxW = 420;
  const boxH = 330;
  const x0 = w - boxW - 28;
  const y0 = 28;

  drawPanel(x0, y0, boxW, boxH, 8, "rgba(19,16,12,0.88)", "rgba(224,198,142,0.2)");

  ctx.fillStyle = "#d8bd78";
  ctx.font = "bold 18px Arial";
  ctx.fillText("작업대", x0 + 22, y0 + 34);

  ctx.fillStyle = "#aaa092";
  ctx.font = "12px Arial";
  ctx.fillText("숫자키로 제작", x0 + 318, y0 + 34);

  const bootsLevel = getUpgradeLevel("boots");
  const markerLevel = getUpgradeLevel("marker");
  const bootsMax = bootsLevel >= CRAFT_COSTS.boots.length;
  const markerMax = markerLevel >= CRAFT_COSTS.marker.length;
  const markerCost = crafted.map ? formatCost(getNextUpgradeCost("marker")) : "탐험 지도 필요";

  drawCraftRow(
    x0 + 22,
    y0 + 58,
    "1",
    `러너 부츠 Lv ${bootsLevel}/${CRAFT_COSTS.boots.length}`,
    formatCost(getNextUpgradeCost("boots")),
    `이동속도 +${bootsLevel * 5}%`,
    bootsMax
  );
  drawCraftRow(x0 + 22, y0 + 114, "2", "랜턴", "나무 2 / 수정 2", "시야 증가", crafted.lantern);
  drawCraftRow(x0 + 22, y0 + 170, "3", "탐험 지도", "나무 2 / 돌 1", "걸어다닌 길 기록", crafted.map);
  drawCraftRow(
    x0 + 22,
    y0 + 226,
    "4",
    `위치 표식 Lv ${markerLevel}/${CRAFT_COSTS.marker.length}`,
    markerCost,
    "지도 표시 최대 강화",
    markerMax
  );

  ctx.fillStyle = "#bdbdbd";
  ctx.font = "12px Arial";
  ctx.fillText("C 닫기", x0 + 22, y0 + 310);
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
  generateMaze();
  canvas.requestPointerLock();
  showMessage("사방의 문을 E로 열 수 있습니다.");
});

window.addEventListener("resize", resizeCanvas);

window.addEventListener("keydown", (e) => {
  if (e.code === "Escape") {
    if (document.pointerLockElement === canvas) document.exitPointerLock();
    return;
  }

  if (!gameStarted) return;

  if (e.code === "KeyM") {
    if (!crafted.map) {
      showMessage("탐험 지도를 먼저 제작해야 합니다.");
      return;
    }

    mapOpen = !mapOpen;
    return;
  }

  if (e.code === "KeyR") {
    changeMazeDay();
    return;
  }

  if (e.code === "KeyE") {
    interact();
    return;
  }

  if (e.code === "KeyC") {
    if (scene === "base") showCraft = !showCraft;
    else showMessage("제작은 메인공간에서만 가능합니다.");
    return;
  }

  if (showCraft && scene === "base") {
    if (e.code === "Digit1") craft("boots");
    if (e.code === "Digit2") craft("lantern");
    if (e.code === "Digit3") craft("map");
    if (e.code === "Digit4") craft("marker");
  }

  keys[e.code] = true;
});

window.addEventListener("keyup", (e) => {
  keys[e.code] = false;
});

window.addEventListener("mousemove", (e) => {
  if (document.pointerLockElement === canvas) {
    mouse.dx += e.movementX;
  }
});

canvas.addEventListener("click", () => {
  if (gameStarted && document.pointerLockElement !== canvas) {
    canvas.requestPointerLock();
  }
});

resizeCanvas();
generateMaze();
gameLoop();
