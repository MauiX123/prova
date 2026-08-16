const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const statusEl = document.getElementById("status");

const worldWidth = 1200;
const gravity = 0.24;
const keys = { ArrowLeft: false, ArrowRight: false, ArrowUp: false };

const player = {
  x: 32,
  y: 120,
  w: 12,
  h: 16,
  vx: 0,
  vy: 0,
  speed: 1.15,
  jump: 4.3,
  facing: 1,
  hp: 5,
  attacking: 0,
  attackCooldown: 0,
  shielding: false,
  hurtCooldown: 0,
  onGround: false,
};

const platforms = [
  { x: 0, y: 164, w: 220, h: 16 },
  { x: 255, y: 146, w: 80, h: 12 },
  { x: 370, y: 130, w: 80, h: 12 },
  { x: 495, y: 150, w: 100, h: 12 },
  { x: 640, y: 120, w: 100, h: 12 },
  { x: 780, y: 145, w: 160, h: 12 },
  { x: 980, y: 164, w: 220, h: 16 },
];

const enemies = [
  makeEnemy(305, 120, 255, 335),
  makeEnemy(555, 124, 495, 595),
  makeEnemy(850, 119, 780, 940),
];

function makeEnemy(x, y, minX, maxX) {
  return {
    x,
    y,
    w: 12,
    h: 16,
    vx: 0.45,
    minX,
    maxX,
    hp: 2,
    alive: true,
    attackTimer: 0,
    hurtCooldown: 0,
  };
}

function overlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function clampToPlatforms(entity, previousBottom) {
  entity.onGround = false;
  for (const platform of platforms) {
    const wasAbove = previousBottom <= platform.y;
    if (
      entity.x + entity.w > platform.x &&
      entity.x < platform.x + platform.w &&
      entity.y + entity.h >= platform.y &&
      entity.y + entity.h <= platform.y + platform.h + 8 &&
      entity.vy >= 0 &&
      wasAbove
    ) {
      entity.y = platform.y - entity.h;
      entity.vy = 0;
      entity.onGround = true;
    }
  }
}

function updatePlayer() {
  player.vx = 0;
  if (keys.ArrowLeft) {
    player.vx = -player.speed;
    player.facing = -1;
  }
  if (keys.ArrowRight) {
    player.vx = player.speed;
    player.facing = 1;
  }

  if (keys.ArrowUp && player.onGround) {
    player.vy = -player.jump;
    player.onGround = false;
  }

  const previousBottom = player.y + player.h;
  player.vy += gravity;
  player.x += player.vx;
  player.y += player.vy;

  player.x = Math.max(0, Math.min(worldWidth - player.w, player.x));
  clampToPlatforms(player, previousBottom);

  if (player.y > canvas.height + 40) {
    player.hp = Math.max(0, player.hp - 1);
    player.x = 16;
    player.y = 120;
    player.vx = 0;
    player.vy = 0;
  }

  if (player.attacking > 0) player.attacking--;
  if (player.attackCooldown > 0) player.attackCooldown--;
  if (player.hurtCooldown > 0) player.hurtCooldown--;
}

function updateEnemies() {
  for (const enemy of enemies) {
    if (!enemy.alive) continue;

    enemy.x += enemy.vx;
    if (enemy.x <= enemy.minX || enemy.x + enemy.w >= enemy.maxX) {
      enemy.vx *= -1;
    }

    if (enemy.attackTimer > 0) enemy.attackTimer--;
    if (enemy.hurtCooldown > 0) enemy.hurtCooldown--;

    if (overlap(player, enemy) && player.hurtCooldown <= 0) {
      const fromRight = enemy.x > player.x;
      const enemyInFront = (player.facing === 1 && fromRight) || (player.facing === -1 && !fromRight);
      if (!(player.shielding && enemyInFront)) {
        player.hp = Math.max(0, player.hp - 1);
      }
      player.hurtCooldown = 35;
      enemy.attackTimer = 12;
    }
  }
}

function processAttacks() {
  if (player.attacking <= 0) return;

  const swordBox = {
    x: player.facing === 1 ? player.x + player.w : player.x - 12,
    y: player.y + 4,
    w: 12,
    h: 8,
  };

  for (const enemy of enemies) {
    if (!enemy.alive) continue;
    if (overlap(swordBox, enemy) && enemy.hurtCooldown <= 0) {
      enemy.hp -= 1;
      enemy.hurtCooldown = 10;
      if (enemy.hp <= 0) enemy.alive = false;
    }
  }
}

function renderPixelSoldier(x, y, facing, shieldUp, color) {
  const dir = facing;
  ctx.fillStyle = color;
  ctx.fillRect(x + 4, y + 3, 4, 4);
  ctx.fillRect(x + 3, y + 7, 6, 7);
  ctx.fillRect(x + 2, y + 14, 3, 2);
  ctx.fillRect(x + 7, y + 14, 3, 2);

  ctx.fillStyle = "#c8a070";
  ctx.fillRect(x + 4, y + 2, 4, 3);

  ctx.fillStyle = "#dadada";
  const swordX = dir === 1 ? x + 9 : x - 4;
  ctx.fillRect(swordX, y + 8, 4, 1);

  ctx.fillStyle = shieldUp ? "#5e84b3" : "#7e5c35";
  const shieldX = dir === 1 ? x - 2 : x + 9;
  ctx.fillRect(shieldX, y + 7, 3, 5);
}

function draw() {
  const cameraX = Math.max(0, Math.min(worldWidth - canvas.width, player.x - canvas.width * 0.35));

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#8ec1eb";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < canvas.width; i += 16) {
    ctx.fillStyle = i % 32 === 0 ? "#8ab9dd" : "#8ec1eb";
    ctx.fillRect(i, 0, 16, canvas.height);
  }

  for (const platform of platforms) {
    ctx.fillStyle = "#5f3c22";
    ctx.fillRect(platform.x - cameraX, platform.y, platform.w, platform.h);
    ctx.fillStyle = "#7b4d28";
    ctx.fillRect(platform.x - cameraX, platform.y, platform.w, 3);
  }

  const goalX = worldWidth - 30 - cameraX;
  ctx.fillStyle = "#784421";
  ctx.fillRect(goalX, 120, 3, 44);
  ctx.fillStyle = "#f2d14f";
  ctx.fillRect(goalX + 3, 120, 12, 8);

  for (const enemy of enemies) {
    if (!enemy.alive) continue;
    renderPixelSoldier(enemy.x - cameraX, enemy.y, enemy.vx >= 0 ? 1 : -1, false, "#6d2f2f");
    if (enemy.attackTimer > 0) {
      ctx.fillStyle = "#f4b6b6";
      ctx.fillRect(enemy.x - cameraX + 5, enemy.y - 2, 2, 1);
    }
  }

  renderPixelSoldier(player.x - cameraX, player.y, player.facing, player.shielding, "#2d4d95");

  if (player.attacking > 0) {
    ctx.fillStyle = "#f6f2c7";
    const slashX = player.facing === 1 ? player.x + player.w + 1 : player.x - 6;
    ctx.fillRect(slashX - cameraX, player.y + 6, 4, 4);
  }

  for (let i = 0; i < player.hp; i++) {
    ctx.fillStyle = "#c64e4e";
    ctx.fillRect(8 + i * 7, 8, 5, 5);
  }
}

let won = false;
let lost = false;

function updateStatus() {
  const aliveEnemies = enemies.filter((enemy) => enemy.alive).length;

  if (player.hp <= 0 && !lost) {
    lost = true;
    statusEl.textContent = "Hai perso! Ricarica la pagina per riprovare.";
  }

  if (!won && !lost) {
    statusEl.textContent = `Briganti rimasti: ${aliveEnemies}. Avanza verso destra fino alla bandiera.`;
  }

  if (!won && !lost && aliveEnemies === 0 && player.x > worldWidth - 50) {
    won = true;
    statusEl.textContent = "Livello completato! Hai sconfitto i briganti e raggiunto la fine.";
  }
}

function tick() {
  if (!won && !lost) {
    updatePlayer();
    updateEnemies();
    processAttacks();
    updateStatus();
  }
  draw();
  requestAnimationFrame(tick);
}

document.addEventListener("keydown", (event) => {
  if (event.key in keys) {
    keys[event.key] = true;
    event.preventDefault();
  }
});

document.addEventListener("keyup", (event) => {
  if (event.key in keys) {
    keys[event.key] = false;
  }
});

canvas.addEventListener("mousedown", (event) => {
  if (event.button === 0 && player.attackCooldown <= 0 && !player.shielding && !won && !lost) {
    player.attacking = 9;
    player.attackCooldown = 14;
  }

  if (event.button === 2) {
    player.shielding = true;
  }
});

document.addEventListener("mouseup", (event) => {
  if (event.button === 2) {
    player.shielding = false;
  }
});

canvas.addEventListener("contextmenu", (event) => event.preventDefault());

updateStatus();
requestAnimationFrame(tick);
