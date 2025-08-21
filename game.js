class PokemonVsPokemon {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.gameRunning = false;
        this.gamePaused = false;
        this.sunCount = 50;
        this.waveNumber = 1;
        this.selectedPokemon = null;
        
        // Game grid
        this.gridSize = 80;
        this.gridCols = 9;
        this.gridRows = 5;
        this.gridOffsetX = 50;
        this.gridOffsetY = 100;
        
        // Game objects
        this.playerPokemon = [];
        this.enemyPokemon = [];
        this.projectiles = [];
        this.sunDrops = [];
        this.waveTimer = 0;
        this.sunDropTimer = 0;
        
        // Pokemon definitions
        this.pokemonTypes = {
            pikachu: {
                name: 'Pikachu',
                icon: '⚡',
                cost: 25,
                health: 100,
                attack: 25,
                attackSpeed: 1000,
                range: 150,
                color: '#FFD700'
            },
            bulbasaur: {
                name: 'Bulbasaur',
                icon: '🌱',
                cost: 50,
                health: 150,
                attack: 20,
                attackSpeed: 1200,
                range: 120,
                color: '#32CD32'
            },
            charizard: {
                name: 'Charizard',
                icon: '🔥',
                cost: 100,
                health: 200,
                attack: 40,
                attackSpeed: 1500,
                range: 180,
                color: '#FF4500'
            },
            squirtle: {
                name: 'Squirtle',
                icon: '💧',
                cost: 75,
                health: 180,
                attack: 30,
                attackSpeed: 1100,
                range: 140,
                color: '#4169E1'
            }
        };
        
        this.enemyTypes = [
            { name: 'Rattata', icon: '🐀', health: 80, speed: 0.5, damage: 10, color: '#8B4513' },
            { name: 'Zubat', icon: '🦇', health: 60, speed: 0.8, damage: 15, color: '#4B0082' },
            { name: 'Geodude', icon: '🪨', health: 120, speed: 0.3, damage: 20, color: '#696969' },
            { name: 'Gastly', icon: '👻', health: 70, speed: 0.6, damage: 12, color: '#9370DB' }
        ];
        
        this.setupEventListeners();
        this.draw();
    }
    
    setupEventListeners() {
        // Pokemon selection
        document.querySelectorAll('.pokemon-option').forEach(option => {
            option.addEventListener('click', () => {
                this.selectPokemon(option.dataset.pokemon);
            });
        });
        
        // Canvas click for placing Pokemon
        this.canvas.addEventListener('click', (e) => {
            if (!this.gameRunning || this.gamePaused) return;
            this.handleCanvasClick(e);
        });
        
        // Control buttons
        document.getElementById('startGame').addEventListener('click', () => this.startGame());
        document.getElementById('pauseGame').addEventListener('click', () => this.togglePause());
        document.getElementById('restartGame').addEventListener('click', () => this.restartGame());
        
        // Sun drop collection
        this.canvas.addEventListener('click', (e) => {
            if (!this.gameRunning || this.gamePaused) return;
            this.collectSunDrops(e);
        });
    }
    
    selectPokemon(pokemonType) {
        // Remove previous selection
        document.querySelectorAll('.pokemon-option').forEach(option => {
            option.classList.remove('selected');
        });
        
        // Add selection to clicked option
        document.querySelector(`[data-pokemon="${pokemonType}"]`).classList.add('selected');
        this.selectedPokemon = pokemonType;
    }
    
    handleCanvasClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        if (this.selectedPokemon) {
            const gridX = Math.floor((x - this.gridOffsetX) / this.gridSize);
            const gridY = Math.floor((y - this.gridOffsetY) / this.gridSize);
            
            if (this.isValidGridPosition(gridX, gridY) && this.canAffordPokemon()) {
                this.placePokemon(gridX, gridY);
            }
        }
    }
    
    isValidGridPosition(gridX, gridY) {
        return gridX >= 0 && gridX < this.gridCols && gridY >= 0 && gridY < this.gridRows;
    }
    
    canAffordPokemon() {
        if (!this.selectedPokemon) return false;
        return this.sunCount >= this.pokemonTypes[this.selectedPokemon].cost;
    }
    
    placePokemon(gridX, gridY) {
        // Check if position is already occupied
        const existingPokemon = this.playerPokemon.find(p => p.gridX === gridX && p.gridY === gridY);
        if (existingPokemon) return;
        
        const pokemonType = this.pokemonTypes[this.selectedPokemon];
        const x = this.gridOffsetX + gridX * this.gridSize + this.gridSize / 2;
        const y = this.gridOffsetY + gridY * this.gridSize + this.gridSize / 2;
        
        this.playerPokemon.push({
            type: this.selectedPokemon,
            x: x,
            y: y,
            gridX: gridX,
            gridY: gridY,
            health: pokemonType.health,
            maxHealth: pokemonType.health,
            attack: pokemonType.attack,
            attackSpeed: pokemonType.attackSpeed,
            lastAttack: 0,
            range: pokemonType.range,
            color: pokemonType.color
        });
        
        this.sunCount -= pokemonType.cost;
        this.updateUI();
    }
    
    collectSunDrops(e) {
        const rect = this.canvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;
        
        this.sunDrops = this.sunDrops.filter(drop => {
            const distance = Math.sqrt((clickX - drop.x) ** 2 + (clickY - drop.y) ** 2);
            if (distance < 30) {
                this.sunCount += 25;
                this.updateUI();
                return false;
            }
            return true;
        });
    }
    
    startGame() {
        this.gameRunning = true;
        this.gamePaused = false;
        this.gameLoop();
    }
    
    togglePause() {
        this.gamePaused = !this.gamePaused;
        if (!this.gamePaused) {
            this.gameLoop();
        }
    }
    
    restartGame() {
        this.gameRunning = false;
        this.gamePaused = false;
        this.sunCount = 50;
        this.waveNumber = 1;
        this.playerPokemon = [];
        this.enemyPokemon = [];
        this.projectiles = [];
        this.sunDrops = [];
        this.waveTimer = 0;
        this.sunDropTimer = 0;
        this.selectedPokemon = null;
        
        document.querySelectorAll('.pokemon-option').forEach(option => {
            option.classList.remove('selected');
        });
        
        this.updateUI();
        this.draw();
    }
    
    gameLoop() {
        if (!this.gameRunning || this.gamePaused) return;
        
        this.update();
        this.draw();
        
        requestAnimationFrame(() => this.gameLoop());
    }
    
    update() {
        const currentTime = Date.now();
        
        // Generate sun drops
        this.sunDropTimer += 16; // Assuming 60 FPS
        if (this.sunDropTimer > 10000) { // Every 10 seconds
            this.generateSunDrop();
            this.sunDropTimer = 0;
        }
        
        // Spawn enemy waves
        this.waveTimer += 16;
        if (this.waveTimer > 15000) { // Every 15 seconds
            this.spawnWave();
            this.waveTimer = 0;
        }
        
        // Update enemy Pokemon
        this.enemyPokemon.forEach(enemy => {
            enemy.x -= enemy.speed;
            
            // Check if enemy reached the end
            if (enemy.x < this.gridOffsetX) {
                this.gameOver();
                return;
            }
        });
        
        // Update projectiles
        this.projectiles.forEach(projectile => {
            projectile.x += projectile.speedX;
            projectile.y += projectile.speedY;
            
            // Check collision with enemies
            this.enemyPokemon.forEach((enemy, enemyIndex) => {
                const distance = Math.sqrt((projectile.x - enemy.x) ** 2 + (projectile.y - enemy.y) ** 2);
                if (distance < 20) {
                    enemy.health -= projectile.damage;
                    this.projectiles.splice(this.projectiles.indexOf(projectile), 1);
                    
                    if (enemy.health <= 0) {
                        this.enemyPokemon.splice(enemyIndex, 1);
                    }
                }
            });
        });
        
        // Remove projectiles that are off screen
        this.projectiles = this.projectiles.filter(projectile => 
            projectile.x > 0 && projectile.x < this.canvas.width &&
            projectile.y > 0 && projectile.y < this.canvas.height
        );
        
        // Player Pokemon attack logic
        this.playerPokemon.forEach(pokemon => {
            if (currentTime - pokemon.lastAttack > pokemon.attackSpeed) {
                const target = this.findTarget(pokemon);
                if (target) {
                    this.shootProjectile(pokemon, target);
                    pokemon.lastAttack = currentTime;
                }
            }
        });
    }
    
    generateSunDrop() {
        const x = Math.random() * (this.canvas.width - 100) + 50;
        const y = Math.random() * (this.canvas.height - 100) + 50;
        
        this.sunDrops.push({
            x: x,
            y: y,
            collected: false
        });
    }
    
    spawnWave() {
        const numEnemies = Math.min(3 + this.waveNumber, 8);
        const enemyType = this.enemyTypes[Math.floor(Math.random() * this.enemyTypes.length)];
        
        for (let i = 0; i < numEnemies; i++) {
            const y = this.gridOffsetY + Math.floor(Math.random() * this.gridRows) * this.gridSize + this.gridSize / 2;
            
            this.enemyPokemon.push({
                type: enemyType,
                x: this.canvas.width + i * 100,
                y: y,
                health: enemyType.health,
                maxHealth: enemyType.health,
                speed: enemyType.speed,
                damage: enemyType.damage,
                color: enemyType.color
            });
        }
        
        this.waveNumber++;
        this.updateUI();
    }
    
    findTarget(pokemon) {
        let closestEnemy = null;
        let closestDistance = Infinity;
        
        this.enemyPokemon.forEach(enemy => {
            const distance = Math.sqrt((pokemon.x - enemy.x) ** 2 + (pokemon.y - enemy.y) ** 2);
            if (distance <= pokemon.range && distance < closestDistance) {
                closestEnemy = enemy;
                closestDistance = distance;
            }
        });
        
        return closestEnemy;
    }
    
    shootProjectile(pokemon, target) {
        const dx = target.x - pokemon.x;
        const dy = target.y - pokemon.y;
        const distance = Math.sqrt(dx ** 2 + dy ** 2);
        
        this.projectiles.push({
            x: pokemon.x,
            y: pokemon.y,
            speedX: (dx / distance) * 5,
            speedY: (dy / distance) * 5,
            damage: pokemon.attack,
            color: pokemon.color
        });
    }
    
    gameOver() {
        this.gameRunning = false;
        alert(`Game Over! You survived ${this.waveNumber - 1} waves!`);
    }
    
    updateUI() {
        document.getElementById('sunCount').textContent = this.sunCount;
        document.getElementById('waveNumber').textContent = this.waveNumber;
    }
    
    draw() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw grid
        this.drawGrid();
        
        // Draw player Pokemon
        this.playerPokemon.forEach(pokemon => {
            this.drawPokemon(pokemon, true);
        });
        
        // Draw enemy Pokemon
        this.enemyPokemon.forEach(enemy => {
            this.drawPokemon(enemy, false);
        });
        
        // Draw projectiles
        this.projectiles.forEach(projectile => {
            this.drawProjectile(projectile);
        });
        
        // Draw sun drops
        this.sunDrops.forEach(drop => {
            this.drawSunDrop(drop);
        });
        
        // Draw base
        this.drawBase();
    }
    
    drawGrid() {
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.lineWidth = 1;
        
        for (let x = 0; x <= this.gridCols; x++) {
            this.ctx.beginPath();
            this.ctx.moveTo(this.gridOffsetX + x * this.gridSize, this.gridOffsetY);
            this.ctx.lineTo(this.gridOffsetX + x * this.gridSize, this.gridOffsetY + this.gridRows * this.gridSize);
            this.ctx.stroke();
        }
        
        for (let y = 0; y <= this.gridRows; y++) {
            this.ctx.beginPath();
            this.ctx.moveTo(this.gridOffsetX, this.gridOffsetY + y * this.gridSize);
            this.ctx.lineTo(this.gridOffsetX + this.gridCols * this.gridSize, this.gridOffsetY + y * this.gridSize);
            this.ctx.stroke();
        }
    }
    
    drawPokemon(pokemon, isPlayer) {
        const size = 30;
        
        // Draw Pokemon circle
        this.ctx.fillStyle = pokemon.color;
        this.ctx.beginPath();
        this.ctx.arc(pokemon.x, pokemon.y, size, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Draw Pokemon icon
        this.ctx.fillStyle = 'white';
        this.ctx.font = '20px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(pokemon.type.icon || '❓', pokemon.x, pokemon.y + 7);
        
        // Draw health bar
        const healthBarWidth = 40;
        const healthBarHeight = 4;
        const healthPercentage = pokemon.health / pokemon.maxHealth;
        
        this.ctx.fillStyle = 'red';
        this.ctx.fillRect(pokemon.x - healthBarWidth/2, pokemon.y - size - 10, healthBarWidth, healthBarHeight);
        
        this.ctx.fillStyle = 'green';
        this.ctx.fillRect(pokemon.x - healthBarWidth/2, pokemon.y - size - 10, healthBarWidth * healthPercentage, healthBarHeight);
    }
    
    drawProjectile(projectile) {
        this.ctx.fillStyle = projectile.color;
        this.ctx.beginPath();
        this.ctx.arc(projectile.x, projectile.y, 3, 0, Math.PI * 2);
        this.ctx.fill();
    }
    
    drawSunDrop(drop) {
        this.ctx.fillStyle = '#FFD700';
        this.ctx.beginPath();
        this.ctx.arc(drop.x, drop.y, 15, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.fillStyle = '#FFA500';
        this.ctx.font = '20px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('☀️', drop.x, drop.y + 7);
    }
    
    drawBase() {
        this.ctx.fillStyle = '#8B4513';
        this.ctx.fillRect(0, this.gridOffsetY, 30, this.gridRows * this.gridSize);
        
        this.ctx.fillStyle = '#654321';
        this.ctx.fillRect(0, this.gridOffsetY, 30, 10);
        this.ctx.fillRect(0, this.gridOffsetY + this.gridRows * this.gridSize - 10, 30, 10);
    }
}

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', () => {
    new PokemonVsPokemon();
});