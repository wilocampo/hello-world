class PokemonGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.gridSize = 80;
        this.cols = 9;
        this.rows = 5;
        
        // Game state
        this.sunCount = 50;
        this.lives = 3;
        this.waveNumber = 1;
        this.isPaused = false;
        this.gameOver = false;
        this.waveInProgress = false;
        
        // Game objects
        this.placedPokemon = [];
        this.attackingPokemon = [];
        this.projectiles = [];
        this.sunDrops = [];
        this.selectedPokemon = null;
        
        // Pokemon types
        this.pokemonTypes = {
            bulbasaur: {
                name: 'Bulbasaur',
                icon: '🌱',
                cost: 25,
                health: 100,
                damage: 20,
                range: 120,
                attackSpeed: 1000,
                lastAttack: 0,
                color: '#4ade80'
            },
            charmander: {
                name: 'Charmander',
                icon: '🔥',
                cost: 50,
                health: 150,
                damage: 35,
                range: 140,
                attackSpeed: 800,
                lastAttack: 0,
                color: '#f97316'
            },
            squirtle: {
                name: 'Squirtle',
                icon: '💧',
                cost: 75,
                health: 200,
                damage: 25,
                range: 160,
                attackSpeed: 1200,
                lastAttack: 0,
                color: '#06b6d4'
            },
            pikachu: {
                name: 'Pikachu',
                icon: '⚡',
                cost: 100,
                health: 120,
                damage: 50,
                range: 180,
                attackSpeed: 600,
                lastAttack: 0,
                color: '#fbbf24'
            }
        };
        
        // Attacking Pokemon types
        this.attackerTypes = {
            rattata: { name: 'Rattata', icon: '🐀', health: 80, speed: 0.5, damage: 10, color: '#6b7280' },
            zubat: { name: 'Zubat', icon: '🦇', health: 60, speed: 0.8, damage: 15, color: '#7c3aed' },
            ekans: { name: 'Ekans', icon: '🐍', health: 100, speed: 0.4, damage: 20, color: '#059669' },
            meowth: { name: 'Meowth', icon: '🐱', health: 70, speed: 0.7, damage: 12, color: '#fbbf24' }
        };
        
        this.setupEventListeners();
        this.startGameLoop();
        this.generateSun();
    }
    
    setupEventListeners() {
        // Pokemon selection
        document.querySelectorAll('.pokemon-card').forEach(card => {
            card.addEventListener('click', () => {
                this.selectPokemon(card.dataset.pokemon);
            });
        });
        
        // Canvas click for placement
        this.canvas.addEventListener('click', (e) => {
            this.handleCanvasClick(e);
        });
        
        // Control buttons
        document.getElementById('startWave').addEventListener('click', () => {
            this.startWave();
        });
        
        document.getElementById('pauseGame').addEventListener('click', () => {
            this.togglePause();
        });
        
        document.getElementById('restartGame').addEventListener('click', () => {
            this.restartGame();
        });
    }
    
    selectPokemon(pokemonType) {
        // Remove previous selection
        document.querySelectorAll('.pokemon-card').forEach(card => {
            card.classList.remove('selected');
        });
        
        // Add selection to clicked card
        document.querySelector(`[data-pokemon="${pokemonType}"]`).classList.add('selected');
        this.selectedPokemon = pokemonType;
    }
    
    handleCanvasClick(e) {
        if (this.gameOver || this.isPaused) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const gridX = Math.floor(x / this.gridSize);
        const gridY = Math.floor(y / this.gridSize);
        
        if (gridX >= 0 && gridX < this.cols && gridY >= 0 && gridY < this.rows) {
            this.placePokemon(gridX, gridY);
        }
    }
    
    placePokemon(gridX, gridY) {
        if (!this.selectedPokemon) return;
        
        const pokemonType = this.pokemonTypes[this.selectedPokemon];
        if (this.sunCount < pokemonType.cost) return;
        
        // Check if position is already occupied
        const isOccupied = this.placedPokemon.some(pokemon => 
            pokemon.gridX === gridX && pokemon.gridY === gridY
        );
        
        if (isOccupied) return;
        
        // Place Pokemon
        this.placedPokemon.push({
            type: this.selectedPokemon,
            gridX: gridX,
            gridY: gridY,
            x: gridX * this.gridSize + this.gridSize / 2,
            y: gridY * this.gridSize + this.gridSize / 2,
            health: pokemonType.health,
            lastAttack: 0
        });
        
        this.sunCount -= pokemonType.cost;
        this.updateUI();
    }
    
    startWave() {
        if (this.waveInProgress) return;
        
        this.waveInProgress = true;
        const attackerTypes = Object.keys(this.attackerTypes);
        const numAttackers = 5 + this.waveNumber * 2;
        
        for (let i = 0; i < numAttackers; i++) {
            setTimeout(() => {
                this.spawnAttacker(attackerTypes[Math.floor(Math.random() * attackerTypes.length)]);
            }, i * 1000);
        }
        
        setTimeout(() => {
            this.waveInProgress = false;
            this.waveNumber++;
            this.updateUI();
        }, numAttackers * 1000 + 5000);
    }
    
    spawnAttacker(type) {
        const attackerType = this.attackerTypes[type];
        this.attackingPokemon.push({
            type: type,
            x: this.canvas.width,
            y: Math.random() * (this.rows * this.gridSize) + this.gridSize / 2,
            health: attackerType.health,
            maxHealth: attackerType.health,
            speed: attackerType.speed,
            damage: attackerType.damage
        });
    }
    
    togglePause() {
        this.isPaused = !this.isPaused;
        document.getElementById('pauseGame').textContent = this.isPaused ? 'Resume' : 'Pause';
    }
    
    restartGame() {
        this.sunCount = 50;
        this.lives = 3;
        this.waveNumber = 1;
        this.isPaused = false;
        this.gameOver = false;
        this.waveInProgress = false;
        
        this.placedPokemon = [];
        this.attackingPokemon = [];
        this.projectiles = [];
        this.sunDrops = [];
        this.selectedPokemon = null;
        
        document.querySelectorAll('.pokemon-card').forEach(card => {
            card.classList.remove('selected');
        });
        
        document.getElementById('pauseGame').textContent = 'Pause';
        this.updateUI();
    }
    
    generateSun() {
        setInterval(() => {
            if (!this.gameOver && !this.isPaused) {
                this.sunDrops.push({
                    x: Math.random() * (this.canvas.width - 40) + 20,
                    y: -20,
                    collected: false
                });
            }
        }, 5000);
    }
    
    update() {
        if (this.gameOver || this.isPaused) return;
        
        this.updateSunDrops();
        this.updateAttackingPokemon();
        this.updatePlacedPokemon();
        this.updateProjectiles();
        this.checkCollisions();
    }
    
    updateSunDrops() {
        this.sunDrops.forEach(drop => {
            if (!drop.collected) {
                drop.y += 0.5;
            }
        });
        
        this.sunDrops = this.sunDrops.filter(drop => drop.y < this.canvas.height + 20);
    }
    
    updateAttackingPokemon() {
        this.attackingPokemon.forEach(attacker => {
            attacker.x -= attacker.speed;
            
            // Check if attacker reached the base
            if (attacker.x <= 0) {
                this.lives--;
                this.updateUI();
                
                if (this.lives <= 0) {
                    this.gameOver = true;
                }
            }
        });
        
        this.attackingPokemon = this.attackingPokemon.filter(attacker => attacker.x > -50);
    }
    
    updatePlacedPokemon() {
        const currentTime = Date.now();
        
        this.placedPokemon.forEach(pokemon => {
            const pokemonType = this.pokemonTypes[pokemon.type];
            
            // Find nearest attacker in range
            let nearestAttacker = null;
            let nearestDistance = Infinity;
            
            this.attackingPokemon.forEach(attacker => {
                const distance = Math.sqrt(
                    Math.pow(pokemon.x - attacker.x, 2) + 
                    Math.pow(pokemon.y - attacker.y, 2)
                );
                
                if (distance <= pokemonType.range && distance < nearestDistance) {
                    nearestDistance = distance;
                    nearestAttacker = attacker;
                }
            });
            
            // Attack if in range and cooldown is ready
            if (nearestAttacker && currentTime - pokemon.lastAttack >= pokemonType.attackSpeed) {
                this.projectiles.push({
                    x: pokemon.x,
                    y: pokemon.y,
                    targetX: nearestAttacker.x,
                    targetY: nearestAttacker.y,
                    damage: pokemonType.damage,
                    speed: 3,
                    type: pokemon.type
                });
                
                pokemon.lastAttack = currentTime;
            }
        });
    }
    
    updateProjectiles() {
        this.projectiles.forEach(projectile => {
            const dx = projectile.targetX - projectile.x;
            const dy = projectile.targetY - projectile.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 0) {
                projectile.x += (dx / distance) * projectile.speed;
                projectile.y += (dy / distance) * projectile.speed;
            }
        });
        
        this.projectiles = this.projectiles.filter(projectile => {
            const distance = Math.sqrt(
                Math.pow(projectile.targetX - projectile.x, 2) + 
                Math.pow(projectile.targetY - projectile.y, 2)
            );
            return distance > 5;
        });
    }
    
    checkCollisions() {
        // Check projectile hits
        this.projectiles.forEach((projectile, projectileIndex) => {
            this.attackingPokemon.forEach((attacker, attackerIndex) => {
                const distance = Math.sqrt(
                    Math.pow(projectile.x - attacker.x, 2) + 
                    Math.pow(projectile.y - attacker.y, 2)
                );
                
                if (distance < 20) {
                    attacker.health -= projectile.damage;
                    this.projectiles.splice(projectileIndex, 1);
                    
                    if (attacker.health <= 0) {
                        this.attackingPokemon.splice(attackerIndex, 1);
                        this.sunCount += 10;
                        this.updateUI();
                    }
                }
            });
        });
        
        // Check sun collection
        this.sunDrops.forEach(drop => {
            if (!drop.collected) {
                const mouseX = this.canvas.width / 2; // Simplified mouse position
                const mouseY = this.canvas.height / 2;
                const distance = Math.sqrt(
                    Math.pow(mouseX - drop.x, 2) + 
                    Math.pow(mouseY - drop.y, 2)
                );
                
                if (distance < 30) {
                    drop.collected = true;
                    this.sunCount += 25;
                    this.updateUI();
                }
            }
        });
    }
    
    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.drawGrid();
        this.drawPlacedPokemon();
        this.drawAttackingPokemon();
        this.drawProjectiles();
        this.drawSunDrops();
        this.drawUI();
        
        if (this.gameOver) {
            this.drawGameOver();
        }
    }
    
    drawGrid() {
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.lineWidth = 1;
        
        for (let x = 0; x <= this.cols; x++) {
            this.ctx.beginPath();
            this.ctx.moveTo(x * this.gridSize, 0);
            this.ctx.lineTo(x * this.gridSize, this.rows * this.gridSize);
            this.ctx.stroke();
        }
        
        for (let y = 0; y <= this.rows; y++) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y * this.gridSize);
            this.ctx.lineTo(this.cols * this.gridSize, y * this.gridSize);
            this.ctx.stroke();
        }
    }
    
    drawPlacedPokemon() {
        this.placedPokemon.forEach(pokemon => {
            const pokemonType = this.pokemonTypes[pokemon.type];
            
            // Draw Pokemon
            this.ctx.font = '40px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(pokemonType.icon, pokemon.x, pokemon.y + 10);
            
            // Draw health bar
            const healthBarWidth = 60;
            const healthBarHeight = 6;
            const healthPercentage = pokemon.health / pokemonType.health;
            
            this.ctx.fillStyle = '#ff0000';
            this.ctx.fillRect(pokemon.x - healthBarWidth/2, pokemon.y - 30, healthBarWidth, healthBarHeight);
            
            this.ctx.fillStyle = '#00ff00';
            this.ctx.fillRect(pokemon.x - healthBarWidth/2, pokemon.y - 30, healthBarWidth * healthPercentage, healthBarHeight);
        });
    }
    
    drawAttackingPokemon() {
        this.attackingPokemon.forEach(attacker => {
            const attackerType = this.attackerTypes[attacker.type];
            
            // Draw attacker
            this.ctx.font = '30px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(attackerType.icon, attacker.x, attacker.y + 8);
            
            // Draw health bar
            const healthBarWidth = 50;
            const healthBarHeight = 4;
            const healthPercentage = attacker.health / attacker.maxHealth;
            
            this.ctx.fillStyle = '#ff0000';
            this.ctx.fillRect(attacker.x - healthBarWidth/2, attacker.y - 25, healthBarWidth, healthBarHeight);
            
            this.ctx.fillStyle = '#00ff00';
            this.ctx.fillRect(attacker.x - healthBarWidth/2, attacker.y - 25, healthBarWidth * healthPercentage, healthBarHeight);
        });
    }
    
    drawProjectiles() {
        this.projectiles.forEach(projectile => {
            const pokemonType = this.pokemonTypes[projectile.type];
            
            this.ctx.fillStyle = pokemonType.color;
            this.ctx.beginPath();
            this.ctx.arc(projectile.x, projectile.y, 4, 0, Math.PI * 2);
            this.ctx.fill();
        });
    }
    
    drawSunDrops() {
        this.sunDrops.forEach(drop => {
            if (!drop.collected) {
                this.ctx.font = '30px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.fillText('☀️', drop.x, drop.y);
            }
        });
    }
    
    drawUI() {
        // Draw selected Pokemon preview
        if (this.selectedPokemon) {
            this.ctx.font = '20px Arial';
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillText(`Selected: ${this.pokemonTypes[this.selectedPokemon].name}`, 10, 30);
        }
    }
    
    drawGameOver() {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.fillStyle = 'white';
        this.ctx.font = '48px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Game Over!', this.canvas.width / 2, this.canvas.height / 2 - 50);
        
        this.ctx.font = '24px Arial';
        this.ctx.fillText(`Waves Survived: ${this.waveNumber - 1}`, this.canvas.width / 2, this.canvas.height / 2);
        this.ctx.fillText('Click Restart to play again', this.canvas.width / 2, this.canvas.height / 2 + 50);
    }
    
    updateUI() {
        document.getElementById('sunCount').textContent = this.sunCount;
        document.getElementById('waveNumber').textContent = this.waveNumber;
        document.getElementById('lives').textContent = this.lives;
    }
    
    startGameLoop() {
        const gameLoop = () => {
            this.update();
            this.draw();
            requestAnimationFrame(gameLoop);
        };
        gameLoop();
    }
}

// Initialize the game when the page loads
window.addEventListener('load', () => {
    new PokemonGame();
});