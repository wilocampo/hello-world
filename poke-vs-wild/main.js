/*
	Poké vs Wild - Canvas Tower Defense
	Author: Cursor Assistant
	No external assets. Simple shapes and labels represent Pokémon.
*/

// ---------- Constants ----------
const GRID_ROWS = 5;
const GRID_COLS = 9;
const TILE_SIZE = 100;
const CANVAS_WIDTH = GRID_COLS * TILE_SIZE;
const CANVAS_HEIGHT = GRID_ROWS * TILE_SIZE;

const MS_PER_SEC = 1000;

// Energy and game pacing
const START_ENERGY = 150;
const ENERGY_FROM_ODDISH = 25;
const ODDISH_INTERVAL_MS = 8000;

// Spawn pacing
const INITIAL_SPAWN_INTERVAL_MS = 3500;
const MIN_SPAWN_INTERVAL_MS = 1400;
const SPAWN_ACCELERATION_MS = 30; // decreases interval over time
const GAME_TARGET_SECONDS = 120; // survive this long to trigger no-new-spawn state

// UI and visuals
const COLORS = {
	gridLight: '#1e6a2a',
	gridDark: '#185824',
	unitText: '#071a0b',
	unitStroke: 'rgba(0,0,0,0.25)',
	enemyFill: '#7b1e1e',
	enemyStroke: 'rgba(0,0,0,0.25)',
	projectile: '#ffd166',
	projectileWater: '#4cd3ff',
	projectileElectric: '#ffe74c',
	healthBack: 'rgba(0,0,0,0.25)',
	healthGood: '#60d394',
	healthMid: '#ffb84c',
	healthLow: '#ff6b6b',
	selection: '#4cd3ff',
};

// ---------- Canvas and DOM ----------
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const energyText = document.getElementById('energyText');
const timeText = document.getElementById('timeText');
const statusText = document.getElementById('statusText');
const cardsContainer = document.getElementById('cards');
const pauseBtn = document.getElementById('pauseBtn');
const restartBtn = document.getElementById('restartBtn');

// ---------- Helpers ----------
function clamp(value, min, max) {
	return Math.max(min, Math.min(max, value));
}

function formatTime(secondsFloat) {
	const seconds = Math.floor(secondsFloat);
	const m = Math.floor(seconds / 60);
	const s = seconds % 60;
	return `${m}:${s.toString().padStart(2, '0')}`;
}

function lerp(a, b, t) {
	return a + (b - a) * t;
}

function showToast(message) {
	let toast = document.querySelector('.toast');
	if (!toast) {
		toast = document.createElement('div');
		toast.className = 'toast';
		document.body.appendChild(toast);
	}
	toast.textContent = message;
	toast.classList.add('show');
	setTimeout(() => toast.classList.remove('show'), 1200);
}

// ---------- Grid ----------
class Grid {
	constructor(rows, cols, tileSize) {
		this.rows = rows;
		this.cols = cols;
		this.tileSize = tileSize;
	}

	draw(context) {
		for (let r = 0; r < this.rows; r++) {
			for (let c = 0; c < this.cols; c++) {
				const x = c * this.tileSize;
				const y = r * this.tileSize;
				context.fillStyle = (r + c) % 2 === 0 ? COLORS.gridLight : COLORS.gridDark;
				context.fillRect(x, y, this.tileSize, this.tileSize);
			}
		}
	}

	cellFromPoint(x, y) {
		const col = Math.floor(x / this.tileSize);
		const row = Math.floor(y / this.tileSize);
		if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) return null;
		return { row, col };
	}

	worldFromCell(row, col) {
		return { x: col * this.tileSize, y: row * this.tileSize };
	}
}

// ---------- Entities ----------
class Entity {
	constructor(x, y) {
		this.x = x;
		this.y = y;
	}
}

class Unit extends Entity {
	constructor(row, col, name, color, cost, maxHealth) {
		const { x, y } = grid.worldFromCell(row, col);
		super(x + TILE_SIZE / 2, y + TILE_SIZE / 2);
		this.row = row;
		this.col = col;
		this.name = name;
		this.color = color;
		this.cost = cost;
		this.maxHealth = maxHealth;
		this.health = maxHealth;
		this.isAlive = true;
		this.width = 72;
		this.height = 72;
	}

	update(dtMs, game) {}

	draw(context) {
		context.save();
		context.translate(this.x, this.y);
		context.fillStyle = this.color;
		context.strokeStyle = COLORS.unitStroke;
		context.lineWidth = 2;
		roundedRect(context, -this.width/2, -this.height/2, this.width, this.height, 14);
		context.fill();
		context.stroke();

		// label
		context.fillStyle = COLORS.unitText;
		context.font = 'bold 14px ui-sans-serif, system-ui';
		context.textAlign = 'center';
		context.textBaseline = 'middle';
		context.fillText(this.name, 0, 0);

		// health bar
		drawHealthBar(context, 0, -this.height / 2 - 10, this.health, this.maxHealth, 56);
		context.restore();
	}

	applyDamage(amount) {
		this.health -= amount;
		if (this.health <= 0) {
			this.isAlive = false;
		}
	}
}

class Oddish extends Unit {
	constructor(row, col) {
		super(row, col, 'Oddish', '#6bd66b', 50, 120);
		this.timeSinceEnergy = 0;
	}

	update(dtMs, game) {
		this.timeSinceEnergy += dtMs;
		if (this.timeSinceEnergy >= ODDISH_INTERVAL_MS) {
			this.timeSinceEnergy = 0;
			game.addEnergy(ENERGY_FROM_ODDISH);
			showFloatingText(`+${ENERGY_FROM_ODDISH}`, this.x, this.y - 50, '#a3f7a3');
		}
	}
}

class Bulbasaur extends Unit {
	constructor(row, col) {
		super(row, col, 'Bulbasaur', '#7ed957', 100, 140);
		this.fireCooldownMs = 0;
		this.fireIntervalMs = 1500;
	}

	update(dtMs, game) {
		this.fireCooldownMs -= dtMs;
		if (this.fireCooldownMs <= 0) {
			if (game.hasEnemyInRow(this.row)) {
				this.fireCooldownMs = this.fireIntervalMs;
				const proj = new Projectile(this.x + 30, this.y, 6, 0, 5.2, 20, 'seed');
				game.projectiles.push(proj);
			}
		}
	}
}

class Pikachu extends Unit {
	constructor(row, col) {
		super(row, col, 'Pikachu', '#ffe066', 150, 110);
		this.fireCooldownMs = 0;
		this.fireIntervalMs = 700;
	}

	update(dtMs, game) {
		this.fireCooldownMs -= dtMs;
		if (this.fireCooldownMs <= 0) {
			if (game.hasEnemyInRow(this.row)) {
				this.fireCooldownMs = this.fireIntervalMs;
				const proj = new Projectile(this.x + 30, this.y, 6, 0, 6.6, 10, 'electric');
				game.projectiles.push(proj);
			}
		}
	}
}

class Squirtle extends Unit {
	constructor(row, col) {
		super(row, col, 'Squirtle', '#66d0ff', 125, 130);
		this.fireCooldownMs = 0;
		this.fireIntervalMs = 1200;
	}

	update(dtMs, game) {
		this.fireCooldownMs -= dtMs;
		if (this.fireCooldownMs <= 0) {
			if (game.hasEnemyInRow(this.row)) {
				this.fireCooldownMs = this.fireIntervalMs;
				const proj = new Projectile(this.x + 30, this.y, 6, 0, 5.4, 10, 'water', {
					slowAmount: 0.5,
					slowDurationMs: 2000,
				});
				game.projectiles.push(proj);
			}
		}
	}
}

class Snorlax extends Unit {
	constructor(row, col) {
		super(row, col, 'Snorlax', '#98a6b3', 75, 400);
	}
}

class Enemy extends Entity {
	constructor(row, name, color, maxHealth, speed) {
		const { x, y } = grid.worldFromCell(row, GRID_COLS - 1);
		super(x + TILE_SIZE + 40, y + TILE_SIZE / 2);
		this.row = row;
		this.name = name;
		this.color = color;
		this.maxHealth = maxHealth;
		this.health = maxHealth;
		this.baseSpeed = speed;
		this.speed = speed; // may be slowed
		this.isAlive = true;
		this.width = 64;
		this.height = 64;
		this.eating = false;
		this.damagePerSecond = 18; // damage to units when overlapping
		this.slowTimerMs = 0;
	}

	applyDamage(amount) {
		this.health -= amount;
		if (this.health <= 0) {
			this.isAlive = false;
		}
	}

	applySlow(slowAmount, durationMs) {
		this.speed = Math.max(0.05, this.baseSpeed * (1 - slowAmount));
		this.slowTimerMs = Math.max(this.slowTimerMs, durationMs);
	}

	update(dtMs, game) {
		// Handle slow decay
		if (this.slowTimerMs > 0) {
			this.slowTimerMs -= dtMs;
			if (this.slowTimerMs <= 0) {
				this.speed = this.baseSpeed;
			}
		}

		// Check collision with unit in this row and column overlap
		const col = Math.floor(this.x / TILE_SIZE);
		if (col >= 0 && col < GRID_COLS) {
			const unit = game.unitsByCell[this.row][col];
			if (unit && unit.isAlive && this.overlapsUnit(unit)) {
				// Eat the unit
				this.eating = true;
				unit.applyDamage((this.damagePerSecond * dtMs) / MS_PER_SEC);
				if (!unit.isAlive) {
					// Clear the cell when unit dies
					game.unitsByCell[unit.row][unit.col] = null;
					showFloatingText('KO!', unit.x, unit.y - 36, '#ff6b6b');
				}
			} else {
				this.eating = false;
			}
		}

		if (!this.eating) {
			this.x -= this.speed; // Move left
		}

		// Loss condition
		if (this.x - this.width / 2 <= 0) {
			game.triggerLoss();
		}
	}

	overlapsUnit(unit) {
		return (
			Math.abs(this.y - unit.y) < (this.height + unit.height) / 2 &&
			Math.abs(this.x - unit.x) < (this.width + unit.width) / 2
		);
	}

	draw(context) {
		context.save();
		context.translate(this.x, this.y);
		context.fillStyle = this.color;
		context.strokeStyle = COLORS.enemyStroke;
		context.lineWidth = 2;
		roundedRect(context, -this.width/2, -this.height/2, this.width, this.height, 10);
		context.fill();
		context.stroke();

		context.fillStyle = '#fff';
		context.font = 'bold 12px ui-sans-serif, system-ui';
		context.textAlign = 'center';
		context.textBaseline = 'middle';
		context.fillText(this.name, 0, 0);

		drawHealthBar(context, 0, -this.height / 2 - 10, this.health, this.maxHealth, 56);
		context.restore();
	}
}

class Projectile extends Entity {
	constructor(x, y, width, height, speed, damage, kind, extra = {}) {
		super(x, y);
		this.width = width;
		this.height = height;
		this.speed = speed;
		this.damage = damage;
		this.row = Math.floor(y / TILE_SIZE);
		this.kind = kind; // 'seed' | 'electric' | 'water'
		this.extra = extra;
		this.isAlive = true;
	}

	update(dtMs, game) {
		this.x += this.speed;
		// Check collision with first enemy in row (leftmost)
		const enemies = game.enemies.filter(e => e.row === this.row && e.isAlive);
		for (let i = 0; i < enemies.length; i++) {
			const enemy = enemies[i];
			if (this.overlaps(enemy)) {
				enemy.applyDamage(this.damage);
				if (this.kind === 'water') {
					enemy.applySlow(this.extra.slowAmount || 0.5, this.extra.slowDurationMs || 1500);
				}
				this.isAlive = false;
				showHitSparks(this.x, this.y, this.kind);
				break;
			}
		}

		if (this.x > CANVAS_WIDTH + 40) {
			this.isAlive = false;
		}
	}

	overlaps(enemy) {
		return (
			Math.abs(this.y - enemy.y) < (this.height + enemy.height) / 2 &&
			Math.abs(this.x - enemy.x) < (this.width + enemy.width) / 2
		);
	}

	draw(context) {
		context.save();
		context.translate(this.x, this.y);
		switch (this.kind) {
			case 'seed': context.fillStyle = COLORS.projectile; break;
			case 'electric': context.fillStyle = COLORS.projectileElectric; break;
			case 'water': context.fillStyle = COLORS.projectileWater; break;
		}
		context.beginPath();
		context.arc(0, 0, this.width, 0, Math.PI * 2);
		context.fill();
		context.restore();
	}
}

// ---------- Game ----------
class Game {
	constructor() {
		this.reset();
	}

	reset() {
		this.units = [];
		this.unitsByCell = Array.from({ length: GRID_ROWS }, () => Array(GRID_COLS).fill(null));
		this.enemies = [];
		this.projectiles = [];
		this.energy = START_ENERGY;
		this.selectedCardId = null;
		this.running = true;
		this.lost = false;
		this.win = false;
		this.timeElapsedMs = 0;
		this.spawnIntervalMs = INITIAL_SPAWN_INTERVAL_MS;
		this.spawnTimerMs = 2000; // slight delay before first spawn
		this.allowSpawns = true;
	}

	addEnergy(amount) {
		this.energy += amount;
	}

	spendEnergy(amount) {
		if (this.energy >= amount) {
			this.energy -= amount;
			return true;
		}
		return false;
	}

	placeUnit(row, col, card) {
		if (this.unitsByCell[row][col]) {
			showToast('Tile occupied');
			return false;
		}
		if (!this.spendEnergy(card.cost)) {
			showToast('Not enough energy');
			return false;
		}
		const unit = card.create(row, col);
		this.units.push(unit);
		this.unitsByCell[row][col] = unit;
		return true;
	}

	removeUnit(row, col) {
		const unit = this.unitsByCell[row][col];
		if (!unit) return;
		this.unitsByCell[row][col] = null;
		unit.isAlive = false;
		this.energy += Math.floor(unit.cost * 0.5);
		showFloatingText(`+${Math.floor(unit.cost * 0.5)}`, unit.x, unit.y - 50, '#a3f7a3');
	}

	spawnEnemy() {
		const row = Math.floor(Math.random() * GRID_ROWS);
		const kind = randomEnemyKind();
		this.enemies.push(new Enemy(row, kind.name, kind.color, kind.hp, kind.speed));
	}

	hasEnemyInRow(row) {
		return this.enemies.some(e => e.row === row && e.isAlive && e.x > 0);
	}

	triggerLoss() {
		this.lost = true;
		this.running = false;
		statusText.textContent = 'Defeat';
	}

	maybeTriggerWin() {
		if (!this.allowSpawns && this.enemies.every(e => !e.isAlive || e.x < -100)) {
			this.win = true;
			this.running = false;
			statusText.textContent = 'Victory!';
		}
	}

	update(dtMs) {
		if (!this.running) return;
		this.timeElapsedMs += dtMs;
		if (this.timeElapsedMs / MS_PER_SEC >= GAME_TARGET_SECONDS) {
			this.allowSpawns = false;
		}

		// Spawn handling
		if (this.allowSpawns) {
			this.spawnTimerMs -= dtMs;
			if (this.spawnTimerMs <= 0) {
				this.spawnEnemy();
				this.spawnIntervalMs = clamp(this.spawnIntervalMs - SPAWN_ACCELERATION_MS, MIN_SPAWN_INTERVAL_MS, INITIAL_SPAWN_INTERVAL_MS);
				this.spawnTimerMs = this.spawnIntervalMs;
			}
		}

		// Update units
		for (let i = this.units.length - 1; i >= 0; i--) {
			const u = this.units[i];
			if (!u.isAlive) { this.units.splice(i, 1); continue; }
			u.update(dtMs, this);
		}

		// Update enemies
		for (let i = this.enemies.length - 1; i >= 0; i--) {
			const e = this.enemies[i];
			if (!e.isAlive) { this.enemies.splice(i, 1); continue; }
			e.update(dtMs, this);
		}

		// Update projectiles
		for (let i = this.projectiles.length - 1; i >= 0; i--) {
			const p = this.projectiles[i];
			if (!p.isAlive) { this.projectiles.splice(i, 1); continue; }
			p.update(dtMs, this);
		}

		this.maybeTriggerWin();
	}

	draw(context) {
		grid.draw(context);

		// Draw selection highlight when hovering over a valid tile
		if (hoverCell) {
			const { x, y } = grid.worldFromCell(hoverCell.row, hoverCell.col);
			context.save();
			context.strokeStyle = COLORS.selection;
			context.lineWidth = 3;
			context.setLineDash([10, 8]);
			context.strokeRect(x + 3, y + 3, TILE_SIZE - 6, TILE_SIZE - 6);
			context.restore();
		}

		// Draw units
		this.units.forEach(u => u.draw(context));

		// Draw enemies
		this.enemies.forEach(e => e.draw(context));

		// Draw projectiles
		this.projectiles.forEach(p => p.draw(context));
	}
}

// ---------- Cards (Placement UI) ----------
const CARD_DEFS = [
	{ id: 'oddish', name: 'Oddish', cost: 50, color: '#6bd66b', desc: 'Generates energy', create: (r, c) => new Oddish(r, c) },
	{ id: 'bulbasaur', name: 'Bulbasaur', cost: 100, color: '#7ed957', desc: 'Shoots seeds', create: (r, c) => new Bulbasaur(r, c) },
	{ id: 'squirtle', name: 'Squirtle', cost: 125, color: '#66d0ff', desc: 'Slows enemies', create: (r, c) => new Squirtle(r, c) },
	{ id: 'pikachu', name: 'Pikachu', cost: 150, color: '#ffe066', desc: 'Fast shooter', create: (r, c) => new Pikachu(r, c) },
	{ id: 'snorlax', name: 'Snorlax', cost: 75, color: '#98a6b3', desc: 'Big blocker', create: (r, c) => new Snorlax(r, c) },
	{ id: 'shovel', name: 'Shovel', cost: 0, color: '#c6cad1', desc: 'Remove unit', create: null },
];

function renderCards(selectedId) {
	cardsContainer.innerHTML = '';
	CARD_DEFS.forEach(card => {
		const div = document.createElement('div');
		div.className = `card${selectedId === card.id ? ' active' : ''}`;
		div.dataset.id = card.id;
		div.innerHTML = `
			<div class="card-title"><span>${card.name}</span><span>${card.cost}</span></div>
			<div class="card-sub">${card.desc}</div>
		`;
		div.addEventListener('click', () => {
			game.selectedCardId = card.id;
			renderCards(game.selectedCardId);
		});
		cardsContainer.appendChild(div);
	});
}

// ---------- Visual helpers ----------
function roundedRect(context, x, y, w, h, r) {
	context.beginPath();
	context.moveTo(x + r, y);
	context.arcTo(x + w, y, x + w, y + h, r);
	context.arcTo(x + w, y + h, x, y + h, r);
	context.arcTo(x, y + h, x, y, r);
	context.arcTo(x, y, x + w, y, r);
	context.closePath();
}

function drawHealthBar(context, cx, cy, hp, maxHp, width) {
	const ratio = clamp(hp / maxHp, 0, 1);
	const color = ratio > 0.6 ? COLORS.healthGood : ratio > 0.3 ? COLORS.healthMid : COLORS.healthLow;
	context.save();
	context.translate(cx, cy);
	context.fillStyle = COLORS.healthBack;
	context.fillRect(-width/2, -3, width, 6);
	context.fillStyle = color;
	context.fillRect(-width/2, -3, width * ratio, 6);
	context.restore();
}

const floatingTexts = [];
function showFloatingText(text, x, y, color = '#fff') {
	floatingTexts.push({ text, x, y, color, life: 900 });
}

function drawFloatingTexts(dtMs, context) {
	for (let i = floatingTexts.length - 1; i >= 0; i--) {
		const ft = floatingTexts[i];
		ft.life -= dtMs;
		ft.y -= 0.03 * dtMs;
		if (ft.life <= 0) { floatingTexts.splice(i, 1); continue; }
		const alpha = clamp(ft.life / 900, 0, 1);
		context.save();
		context.globalAlpha = alpha;
		context.fillStyle = ft.color;
		context.font = 'bold 16px ui-sans-serif, system-ui';
		context.textAlign = 'center';
		context.fillText(ft.text, ft.x, ft.y);
		context.restore();
	}
}

const hitSparks = [];
function showHitSparks(x, y, kind) {
	const color = kind === 'water' ? COLORS.projectileWater : kind === 'electric' ? COLORS.projectileElectric : COLORS.projectile;
	for (let i = 0; i < 6; i++) {
		hitSparks.push({ x, y, vx: (Math.random()*2-1)*1.6, vy: (Math.random()*2-1)*1.6, life: 300, color });
	}
}

function drawHitSparks(dtMs, context) {
	for (let i = hitSparks.length - 1; i >= 0; i--) {
		const s = hitSparks[i];
		s.life -= dtMs;
		s.x += s.vx * (dtMs/16);
		s.y += s.vy * (dtMs/16);
		if (s.life <= 0) { hitSparks.splice(i, 1); continue; }
		const alpha = clamp(s.life / 300, 0, 1);
		ctx.save();
		ctx.globalAlpha = alpha;
		ctx.fillStyle = s.color;
		ctx.fillRect(s.x, s.y, 3, 3);
		ctx.restore();
	}
}

// ---------- Enemy kinds ----------
function randomEnemyKind() {
	const roll = Math.random();
	if (roll < 0.6) return { name: 'Rattata', color: '#9b4a4a', hp: 60, speed: 0.6 };
	if (roll < 0.88) return { name: 'Zubat', color: '#7b5ad6', hp: 90, speed: 0.8 };
	return { name: 'Onix', color: '#6b7c8c', hp: 200, speed: 0.35 };
}

// ---------- Input ----------
let hoverCell = null;

canvas.addEventListener('mousemove', (e) => {
	const rect = canvas.getBoundingClientRect();
	const x = e.clientX - rect.left;
	const y = e.clientY - rect.top;
	const cell = grid.cellFromPoint(x, y);
	hoverCell = cell;
});

canvas.addEventListener('mouseleave', () => {
	hoverCell = null;
});

canvas.addEventListener('contextmenu', (e) => {
	e.preventDefault();
});

canvas.addEventListener('mousedown', (e) => {
	if (!game.running) return;
	const rect = canvas.getBoundingClientRect();
	const x = e.clientX - rect.left;
	const y = e.clientY - rect.top;
	const cell = grid.cellFromPoint(x, y);
	if (!cell) return;
	const card = CARD_DEFS.find(c => c.id === game.selectedCardId);
	if (e.button === 2) {
		game.removeUnit(cell.row, cell.col);
		return;
	}
	if (!card) { showToast('Select a card first'); return; }
	if (card.id === 'shovel') {
		game.removeUnit(cell.row, cell.col);
		return;
	}
	const placed = game.placeUnit(cell.row, cell.col, card);
	if (placed) {
		showFloatingText(`-${card.cost}`, (cell.col + 0.5) * TILE_SIZE, (cell.row + 0.5) * TILE_SIZE - 50, '#ffd166');
	}
});

pauseBtn.addEventListener('click', () => {
	if (game.running) {
		game.running = false;
		statusText.textContent = 'Paused';
		pauseBtn.textContent = 'Resume';
	} else {
		if (!game.lost && !game.win) {
			game.running = true;
			statusText.textContent = 'Playing';
			pauseBtn.textContent = 'Pause';
		}
	}
});

restartBtn.addEventListener('click', () => {
	game.reset();
	renderCards(game.selectedCardId);
	statusText.textContent = 'Playing';
	pauseBtn.textContent = 'Pause';
});

// ---------- Main Loop ----------
const grid = new Grid(GRID_ROWS, GRID_COLS, TILE_SIZE);
const game = new Game();
renderCards(game.selectedCardId);

let lastTs = performance.now();
function loop(ts) {
	const dtMs = ts - lastTs;
	lastTs = ts;

	ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
	game.update(dtMs);
	game.draw(ctx);
	energyText.textContent = game.energy.toString();
	timeText.textContent = formatTime(game.timeElapsedMs / MS_PER_SEC);
	if (game.lost) statusText.textContent = 'Defeat';
	if (game.win) statusText.textContent = 'Victory!';

	drawFloatingTexts(dtMs, ctx);
	drawHitSparks(dtMs, ctx);

	requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// ---------- Initial selection ----------
game.selectedCardId = 'oddish';
renderCards(game.selectedCardId);

// ---------- Resize handling (fixed canvas size, but keep crisp) ----------
function resizeCanvasForDPI() {
	// Keep logical size; the CSS ensures pixel-perfect display.
	canvas.width = CANVAS_WIDTH;
	canvas.height = CANVAS_HEIGHT;
}
resizeCanvasForDPI();

