import { GameState } from "../../shared/game/game-state.js";
import { bindButton } from "../../shared/ui/game-shell.js";
import { setText } from "../../shared/ui/dom.js";
import { loadHighscore, saveHighscore } from "../../shared/utils/highscore.js";
import { registerServiceWorker } from "../../shared/utils/pwa.js";
import { playCollectSound } from "../../shared/utils/sound.js";
import { createHorizontalDragControl } from "../../shared/utils/touch.js";

const canvas = document.querySelector("#game-canvas");
const context = canvas.getContext("2d");
const startPanel = document.querySelector("#start-panel");

const GAME_ID = "autorennen";
const FRUIT_TYPES = [
  { kind: "apple", label: "Apfel", points: 1, radius: 18, color: "#ef4444" },
  { kind: "banana", label: "Banane", points: 2, radius: 20, color: "#ffd84d" },
  { kind: "strawberry", label: "Erdbeere", points: 3, radius: 17, color: "#f05a79" },
];

const OBSTACLE_TYPES = [
  { kind: "bomb", radius: 22, label: "Bombe" },
  { kind: "wall", width: 86, height: 40, label: "Mauer" },
];

let state = GameState.READY;
let score = 0;
let highscore = loadHighscore(GAME_ID);
let lastTime = 0;
let distance = 0;
let spawnTimer = 0;
let obstacleTimer = 0;
let elapsedTime = 0;
let width = 0;
let height = 0;
let road = { x: 0, y: 0, width: 0, height: 0 };
let car = { x: 0, y: 0, width: 58, height: 92, targetX: 0 };
let fruits = [];
let obstacles = [];
let popups = [];
let keys = { left: false, right: false };
let dragStartTargetX = 0;

setText("#highscore", highscore);
resizeCanvas();
resetGame();
requestAnimationFrame(loop);

registerServiceWorker({
  scriptUrl: "../../service-worker.js",
  scope: "../../",
});

bindButton("#start-button", startGame);
bindButton("#pause-button", togglePause);
bindButton("#restart-button", () => {
  resetGame();
  startGame();
});

bindHoldButton("#left-button", "left");
bindHoldButton("#right-button", "right");

createHorizontalDragControl(canvas, {
  onStart() {
    dragStartTargetX = car.targetX;
  },
  onMove({ dx }) {
    if (state !== GameState.RUNNING) return;
    car.targetX = dragStartTargetX + dx * 1.08;
    clampCarToRoad();
  },
});

window.addEventListener("resize", () => {
  resizeCanvas();
  clampCarToRoad();
});

window.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft") {
    keys.left = true;
    event.preventDefault();
  }
  if (event.key === "ArrowRight") {
    keys.right = true;
    event.preventDefault();
  }
  if (event.key === " " || event.key === "Escape") {
    togglePause();
    event.preventDefault();
  }
});

window.addEventListener("keyup", (event) => {
  if (event.key === "ArrowLeft") keys.left = false;
  if (event.key === "ArrowRight") keys.right = false;
});

function bindHoldButton(selector, direction) {
  const button = document.querySelector(selector);
  if (!button) return;

  const setHeld = (held) => {
    keys[direction] = held;
    button.classList.toggle("is-held", held);
  };

  button.addEventListener("pointerdown", (event) => {
    button.setPointerCapture(event.pointerId);
    setHeld(true);
  });
  button.addEventListener("pointerup", () => setHeld(false));
  button.addEventListener("pointercancel", () => setHeld(false));
  button.addEventListener("pointerleave", () => setHeld(false));
}

function startGame() {
  if (state === GameState.GAME_OVER) {
    resetGame();
  }

  state = GameState.RUNNING;
  startPanel.classList.add("is-hidden");
}

function togglePause() {
  if (state === GameState.READY || state === GameState.GAME_OVER) return;
  state = state === GameState.PAUSED ? GameState.RUNNING : GameState.PAUSED;
  startPanel.classList.toggle("is-hidden", state !== GameState.PAUSED);
  if (state === GameState.PAUSED) {
    startPanel.querySelector("h1").textContent = "Pause";
    startPanel.querySelector("#start-button span:last-child").textContent = "Weiter";
  }
}

function resetGame() {
  score = 0;
  distance = 0;
  elapsedTime = 0;
  spawnTimer = 0.5;
  obstacleTimer = 2.8;
  fruits = [];
  obstacles = [];
  popups = [];
  state = GameState.READY;
  car.x = road.x + road.width / 2;
  car.targetX = car.x;
  startPanel.classList.remove("is-hidden");
  startPanel.querySelector("h1").textContent = "Autorennen";
  startPanel.querySelector("#start-button span:last-child").textContent = "Start";
  setText("#score", score);
  setText("#highscore", highscore);
}

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const ratio = Math.min(window.devicePixelRatio || 1, 2);

  width = Math.max(1, rect.width);
  height = Math.max(1, rect.height);
  canvas.width = Math.floor(width * ratio);
  canvas.height = Math.floor(height * ratio);
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.imageSmoothingEnabled = false;

  const roadWidth = Math.min(width * 0.68, 430);
  road = {
    x: (width - roadWidth) / 2,
    y: -20,
    width: roadWidth,
    height: height + 40,
  };

  car.width = Math.max(48, Math.min(72, road.width * 0.18));
  car.height = car.width * 1.55;
  car.y = height - car.height - Math.max(30, height * 0.08);
}

function loop(timestamp) {
  const delta = Math.min(0.035, (timestamp - lastTime) / 1000 || 0);
  lastTime = timestamp;

  if (state === GameState.RUNNING) {
    update(delta);
  }

  draw();
  requestAnimationFrame(loop);
}

function update(delta) {
  elapsedTime += delta;

  const speed = getGameSpeed();
  distance += speed * delta;
  spawnTimer -= delta;
  obstacleTimer -= delta;

  if (spawnTimer <= 0) {
    spawnFruit();
    spawnTimer = random(0.72, 1.12);
  }

  if (obstacleTimer <= 0) {
    spawnObstacle();
    obstacleTimer = Math.max(1.85, random(2.8, 4.1) - elapsedTime * 0.006);
  }

  updateCar(delta);
  updateFruits(delta, speed);
  updateObstacles(delta, speed);
  updatePopups(delta);
}

function getGameSpeed() {
  const warmupTime = Math.max(0, elapsedTime - 5);
  return Math.min(335, 132 + warmupTime * 2.45 + score * 0.35);
}

function updateCar(delta) {
  const keyboardMove = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
  if (keyboardMove !== 0) {
    car.targetX += keyboardMove * 360 * delta;
  }

  clampCarToRoad();
  car.x += (car.targetX - car.x) * Math.min(1, 14 * delta);
}

function updateFruits(delta, speed) {
  for (const fruit of fruits) {
    fruit.y += speed * delta;
    fruit.spin += delta * 2.2;
  }

  fruits = fruits.filter((fruit) => {
    if (fruit.y - fruit.radius > height) return false;

    if (circleHitsCar(fruit.x, fruit.y, fruit.radius * 0.65)) {
      collectFruit(fruit);
      return false;
    }

    return true;
  });
}

function updateObstacles(delta, speed) {
  for (const obstacle of obstacles) {
    obstacle.y += speed * delta;
    obstacle.spin += delta * 2;
  }

  obstacles = obstacles.filter((obstacle) => {
    const outside = obstacle.y - (obstacle.radius || obstacle.height) > height;
    if (outside) return false;

    const hit = obstacle.kind === "bomb"
      ? circleHitsCar(obstacle.x, obstacle.y, obstacle.radius * 0.78)
      : rectHitsCar(
        obstacle.x - obstacle.width / 2,
        obstacle.y - obstacle.height / 2,
        obstacle.width,
        obstacle.height
      );

    if (hit) {
      endGame(obstacle.kind === "bomb" ? "Bumm!" : "Angefahren!");
      return false;
    }

    return true;
  });
}

function updatePopups(delta) {
  for (const popup of popups) {
    popup.y -= 42 * delta;
    popup.life -= delta;
  }
  popups = popups.filter((popup) => popup.life > 0);
}

function collectFruit(fruit) {
  score += fruit.points;
  highscore = saveHighscore(GAME_ID, score);
  setText("#score", score);
  setText("#highscore", highscore);
  popups.push({ x: fruit.x, y: fruit.y, text: `+${fruit.points}`, life: 0.85 });
  playCollectSound();
}

function endGame(message) {
  state = GameState.GAME_OVER;
  highscore = saveHighscore(GAME_ID, score);
  keys.left = false;
  keys.right = false;
  setText("#highscore", highscore);
  popups.push({ x: car.x, y: car.y - 18, text: message, life: 1.2 });
  startPanel.classList.remove("is-hidden");
  startPanel.querySelector("h1").textContent = "Nochmal?";
  startPanel.querySelector("#start-button span:last-child").textContent = "Start";
}

function spawnFruit() {
  const type = FRUIT_TYPES[Math.floor(Math.random() * FRUIT_TYPES.length)];
  const margin = Math.max(34, road.width * 0.14);
  fruits.push({
    ...type,
    x: random(road.x + margin, road.x + road.width - margin),
    y: -type.radius - 10,
    spin: random(0, Math.PI * 2),
  });
}

function spawnObstacle() {
  if (elapsedTime < 2.5) return;

  const type = OBSTACLE_TYPES[Math.random() < 0.62 ? 0 : 1];
  const margin = Math.max(42, road.width * 0.16);
  obstacles.push({
    ...type,
    x: random(road.x + margin, road.x + road.width - margin),
    y: -Math.max(type.radius || 0, type.height || 0) - 18,
    spin: random(0, Math.PI * 2),
  });
}

function clampCarToRoad() {
  const minX = road.x + car.width * 0.65;
  const maxX = road.x + road.width - car.width * 0.65;
  car.targetX = Math.max(minX, Math.min(maxX, car.targetX || road.x + road.width / 2));
  car.x = Math.max(minX, Math.min(maxX, car.x || car.targetX));
}

function circleHitsCar(x, y, radius) {
  const box = carHitbox();
  const closestX = Math.max(box.left, Math.min(x, box.right));
  const closestY = Math.max(box.top, Math.min(y, box.bottom));
  return (x - closestX) ** 2 + (y - closestY) ** 2 < radius ** 2;
}

function rectHitsCar(x, y, w, h) {
  const box = carHitbox();
  return (
    x < box.right &&
    x + w > box.left &&
    y < box.bottom &&
    y + h > box.top
  );
}

function carHitbox() {
  return {
    left: car.x - car.width * 0.43,
    right: car.x + car.width * 0.43,
    top: car.y + car.height * 0.08,
    bottom: car.y + car.height * 0.9,
  };
}

function draw() {
  drawWorld();
  drawRoad();
  drawFruits();
  drawObstacles();
  drawCar();
  drawPopups();

  if (state === GameState.PAUSED) {
    context.fillStyle = "rgba(23, 50, 77, 0.08)";
    context.fillRect(0, 0, width, height);
  }
}

function drawWorld() {
  const gradient = context.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "#92ddf4");
  gradient.addColorStop(0.35, "#a8e36f");
  gradient.addColorStop(1, "#55b95f");
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);

  context.fillStyle = "rgba(255, 212, 95, 0.95)";
  context.beginPath();
  context.arc(width - 62, 58, 34, 0, Math.PI * 2);
  context.fill();
}

function drawRoad() {
  const roadX = crisp(road.x);
  const roadY = crisp(road.y);
  const roadWidth = crisp(road.width);
  const roadHeight = crisp(road.height);
  const roadCenter = crisp(road.x + road.width / 2);

  context.fillStyle = "#596877";
  roundedRect(roadX, roadY, roadWidth, roadHeight, 32);
  context.fill();

  context.strokeStyle = "rgba(255, 255, 255, 0.72)";
  context.lineWidth = 10;
  context.setLineDash([]);
  context.beginPath();
  context.moveTo(crisp(road.x + 18), crisp(road.y + 18));
  context.lineTo(crisp(road.x + 18), crisp(road.y + road.height - 18));
  context.moveTo(crisp(road.x + road.width - 18), crisp(road.y + 18));
  context.lineTo(crisp(road.x + road.width - 18), crisp(road.y + road.height - 18));
  context.stroke();

  context.strokeStyle = "#fff7bd";
  context.lineWidth = 10;
  context.lineCap = "round";
  context.setLineDash([36, 42]);
  context.lineDashOffset = -Math.round(distance % 78);
  context.beginPath();
  context.moveTo(roadCenter, roadY);
  context.lineTo(roadCenter, roadY + roadHeight);
  context.stroke();
  context.setLineDash([]);
}

function drawCar() {
  const x = crisp(car.x - car.width / 2);
  const y = crisp(car.y);

  context.fillStyle = "rgba(23, 50, 77, 0.24)";
  roundedRect(x + 5, y + car.height - 6, car.width - 10, 14, 8);
  context.fill();

  context.fillStyle = "#df2f46";
  roundedRect(x, y, car.width, car.height, car.width * 0.28);
  context.fill();

  context.fillStyle = "#ff7762";
  roundedRect(x + car.width * 0.15, y + 8, car.width * 0.7, car.height * 0.42, 16);
  context.fill();

  context.fillStyle = "#a7eaff";
  roundedRect(x + car.width * 0.22, y + 16, car.width * 0.56, car.height * 0.22, 10);
  context.fill();

  context.fillStyle = "#26374a";
  drawTire(x - 6, y + car.height * 0.2, 10, car.height * 0.22);
  drawTire(x + car.width - 4, y + car.height * 0.2, 10, car.height * 0.22);
  drawTire(x - 6, y + car.height * 0.64, 10, car.height * 0.22);
  drawTire(x + car.width - 4, y + car.height * 0.64, 10, car.height * 0.22);

  context.fillStyle = "#fff4a8";
  context.beginPath();
  context.arc(x + car.width * 0.24, y + 6, 4, 0, Math.PI * 2);
  context.arc(x + car.width * 0.76, y + 6, 4, 0, Math.PI * 2);
  context.fill();
}

function drawTire(x, y, w, h) {
  roundedRect(x, y, w, h, 5);
  context.fill();
}

function drawFruits() {
  for (const fruit of fruits) {
    if (fruit.kind === "apple") drawApple(fruit);
    if (fruit.kind === "banana") drawBanana(fruit);
    if (fruit.kind === "strawberry") drawStrawberry(fruit);
  }
}

function drawObstacles() {
  for (const obstacle of obstacles) {
    if (obstacle.kind === "bomb") drawBomb(obstacle);
    if (obstacle.kind === "wall") drawWall(obstacle);
  }
}

function drawBomb(obstacle) {
  context.save();
  context.translate(crisp(obstacle.x), crisp(obstacle.y));
  context.rotate(Math.sin(obstacle.spin) * 0.08);

  context.fillStyle = "rgba(23, 50, 77, 0.2)";
  context.beginPath();
  context.ellipse(4, obstacle.radius * 0.92, obstacle.radius * 0.8, 7, 0, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = "#222f3e";
  context.beginPath();
  context.arc(0, 2, obstacle.radius, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = "#4b5d70";
  context.beginPath();
  context.arc(-7, -6, obstacle.radius * 0.48, 0, Math.PI * 2);
  context.fill();

  context.strokeStyle = "#5c3b22";
  context.lineWidth = 5;
  context.lineCap = "round";
  context.beginPath();
  context.moveTo(10, -16);
  context.quadraticCurveTo(19, -28, 29, -21);
  context.stroke();

  context.fillStyle = "#ffd45f";
  context.beginPath();
  context.arc(32, -20, 7, 0, Math.PI * 2);
  context.fill();

  context.restore();
}

function drawWall(obstacle) {
  const x = crisp(obstacle.x - obstacle.width / 2);
  const y = crisp(obstacle.y - obstacle.height / 2);

  context.fillStyle = "rgba(23, 50, 77, 0.22)";
  roundedRect(x + 4, y + obstacle.height - 2, obstacle.width - 8, 10, 5);
  context.fill();

  context.fillStyle = "#bf6b4b";
  roundedRect(x, y, obstacle.width, obstacle.height, 7);
  context.fill();

  context.strokeStyle = "#f3b18e";
  context.lineWidth = 3;
  context.beginPath();
  context.moveTo(x + obstacle.width / 3, y + 2);
  context.lineTo(x + obstacle.width / 3, y + obstacle.height - 2);
  context.moveTo(x + obstacle.width * 0.66, y + 2);
  context.lineTo(x + obstacle.width * 0.66, y + obstacle.height - 2);
  context.moveTo(x + 4, y + obstacle.height / 2);
  context.lineTo(x + obstacle.width - 4, y + obstacle.height / 2);
  context.stroke();
}

function drawApple(fruit) {
  const x = crisp(fruit.x);
  const y = crisp(fruit.y);

  context.fillStyle = fruit.color;
  context.beginPath();
  context.arc(x - 6, y + 2, fruit.radius * 0.72, 0, Math.PI * 2);
  context.arc(x + 6, y + 2, fruit.radius * 0.72, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#2f8f4e";
  context.beginPath();
  context.ellipse(x + 8, y - 18, 8, 4, -0.6, 0, Math.PI * 2);
  context.fill();
}

function drawBanana(fruit) {
  context.save();
  context.translate(crisp(fruit.x), crisp(fruit.y));
  context.rotate(Math.sin(fruit.spin) * 0.2 - 0.35);
  context.strokeStyle = "#ffd84d";
  context.lineWidth = 15;
  context.lineCap = "round";
  context.beginPath();
  context.arc(0, -3, fruit.radius, 0.15 * Math.PI, 0.85 * Math.PI);
  context.stroke();
  context.strokeStyle = "#c58a20";
  context.lineWidth = 4;
  context.beginPath();
  context.arc(0, -3, fruit.radius, 0.15 * Math.PI, 0.85 * Math.PI);
  context.stroke();
  context.restore();
}

function drawStrawberry(fruit) {
  const x = crisp(fruit.x);
  const y = crisp(fruit.y);

  context.fillStyle = fruit.color;
  context.beginPath();
  context.moveTo(x, y + fruit.radius);
  context.bezierCurveTo(x - 24, y - 3, x - 13, y - 22, x, y - 12);
  context.bezierCurveTo(x + 13, y - 22, x + 24, y - 3, x, y + fruit.radius);
  context.fill();
  context.fillStyle = "#2f8f4e";
  context.beginPath();
  context.moveTo(x, y - 14);
  context.lineTo(x - 12, y - 24);
  context.lineTo(x + 12, y - 24);
  context.closePath();
  context.fill();
}

function drawPopups() {
  context.font = "900 28px ui-rounded, system-ui, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  for (const popup of popups) {
    context.globalAlpha = Math.max(0, popup.life / 0.85);
    context.fillStyle = "#fffefa";
    context.strokeStyle = "rgba(23, 50, 77, 0.35)";
    context.lineWidth = 5;
    context.strokeText(popup.text, popup.x, popup.y);
    context.fillText(popup.text, popup.x, popup.y);
    context.globalAlpha = 1;
  }
}

function roundedRect(x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + w, y, x + w, y + h, radius);
  context.arcTo(x + w, y + h, x, y + h, radius);
  context.arcTo(x, y + h, x, y, radius);
  context.arcTo(x, y, x + w, y, radius);
  context.closePath();
}

function crisp(value) {
  return Math.round(value);
}

function random(min, max) {
  return min + Math.random() * (max - min);
}
