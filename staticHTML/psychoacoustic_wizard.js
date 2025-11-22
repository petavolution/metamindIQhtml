/**
 * Psychoacoustic Wizard
 * A rhythm game that trains audio-visual synchronization and timing precision.
 */

// Module name for logging
const MODULE_NAME = 'PsychoacousticWizard';

// Helper function for logging
function log(level, message, data) {
    if (typeof MetaMind !== 'undefined' && MetaMind.Debug) {
        MetaMind.Debug[level](MODULE_NAME, message, data);
    } else {
        const logFn = level === 'error' ? console.error :
                      level === 'warn' ? console.warn : console.log;
        logFn(`[${MODULE_NAME}]`, message, data || '');
    }
}

// Safe event listener attachment
function addClickListener(element, handler, name) {
    if (element) {
        element.addEventListener('click', function(e) {
            try {
                handler(e);
            } catch (err) {
                log('error', `Error in ${name} handler: ${err.message}`, err);
            }
        });
        return true;
    }
    log('warn', `Cannot attach ${name} handler - element not found`);
    return false;
}

// Audio Context for Web Audio API
let audioContext;
let masterGainNode;

// Game canvas and context
let noteHighwayCanvas;
let noteHighwayCtx;
let energyCanvas;
let energyCtx;
let visualizerCanvas;
let visualizerCtx;

// Game state
const gameState = {
    active: false,
    paused: false,
    score: 0,
    combo: 0,
    maxCombo: 0,
    multiplier: 1,
    energy: 50, // 0-100 scale
    level: 1,
    tempo: 60, // BPM
    gameTime: 0,
    lastUpdateTime: 0,
    notes: [],
    keyState: {}, // Tracks which keys are pressed
    notesHit: 0,
    notesMissed: 0,
    perfectPatterns: 0,
    hitResults: [] // Stores visual feedback for hits
};

// Game settings
const settings = {
    lanes: 7,
    noteSpeed: 300, // pixels per second
    hitWindow: 0.15, // seconds
    perfectWindow: 0.05, // seconds
    goodWindow: 0.10, // seconds
    feedbackDuration: 1000, // ms
    laneWidth: 0, // calculated based on canvas width
    targetLineY: 0, // calculated
    keyMapping: {
        'KeyA': 0,
        'KeyS': 1,
        'KeyD': 2,
        'KeyF': 3,
        'KeyG': 4,
        'KeyH': 5,
        'KeyJ': 6
    },
    patterns: [] // Will hold rhythm patterns
};

// UI elements
let elements = {};

// Animation frame ID
let animationId;

// Initialize the game
function init() {
    log('info', 'Initializing module');

    // Get DOM elements - populated after DOM is ready
    elements = {
        startScreen: document.getElementById('start-screen'),
        gameScreen: document.getElementById('game-screen'),
        pauseScreen: document.getElementById('pause-screen'),
        resultsScreen: document.getElementById('results-screen'),
        score: document.getElementById('score'),
        combo: document.getElementById('combo'),
        multiplier: document.getElementById('multiplier'),
        level: document.getElementById('level'),
        energyFill: document.getElementById('energy-fill'),
        feedbackText: document.getElementById('feedback-text'),
        tempoDisplay: document.getElementById('tempo-display'),
        finalScore: document.getElementById('final-score'),
        maxCombo: document.getElementById('max-combo'),
        maxLevel: document.getElementById('max-level'),
        peakEnergy: document.getElementById('peak-energy'),
        notesHit: document.getElementById('notes-hit'),
        notesMissed: document.getElementById('notes-missed'),
        accuracy: document.getElementById('accuracy'),
        perfectPatterns: document.getElementById('perfect-patterns')
    };

    // Validate required elements
    const requiredElements = ['startScreen', 'gameScreen', 'score', 'combo'];
    const missing = requiredElements.filter(name => !elements[name]);
    if (missing.length > 0) {
        log('error', `Missing required elements: ${missing.join(', ')}`);
        return;
    }

    // Set up canvas elements safely
    const noteHighwayContainer = document.getElementById('note-highway');
    if (noteHighwayContainer) {
        noteHighwayCanvas = document.createElement('canvas');
        noteHighwayCanvas.className = 'note-highway-canvas';
        noteHighwayContainer.appendChild(noteHighwayCanvas);
        noteHighwayCtx = noteHighwayCanvas.getContext('2d');
    } else {
        log('warn', 'Note highway container not found');
    }

    visualizerCanvas = document.getElementById('audio-visualizer');
    if (visualizerCanvas) {
        visualizerCtx = visualizerCanvas.getContext('2d');
    } else {
        log('warn', 'Audio visualizer canvas not found');
    }

    // Add event listeners with safe attachment
    addClickListener(document.getElementById('start-button'), startGame, 'startButton');
    addClickListener(document.getElementById('pause-button'), pauseGame, 'pauseButton');
    addClickListener(document.getElementById('resume-button'), resumeGame, 'resumeButton');
    addClickListener(document.getElementById('restart-button'), restartGame, 'restartButton');
    addClickListener(document.getElementById('play-again-button'), restartGame, 'playAgainButton');

    // Add keyboard event listeners with error handling
    window.addEventListener('keydown', function(e) {
        try { handleKeyDown(e); }
        catch (err) { log('error', `Error in keydown handler: ${err.message}`, err); }
    });
    window.addEventListener('keyup', function(e) {
        try { handleKeyUp(e); }
        catch (err) { log('error', `Error in keyup handler: ${err.message}`, err); }
    });

    // Initialize patterns
    try {
        initializePatterns();
    } catch (err) {
        log('error', `Failed to initialize patterns: ${err.message}`, err);
    }

    // Handle window resize
    window.addEventListener('resize', resizeGame);
    resizeGame();

    log('info', 'Module initialized successfully');
}

// Generate rhythm patterns
function initializePatterns() {
    // Level 1: Simple quarter notes (4/4 time)
    const level1 = [];
    for (let i = 0; i < 8; i++) {
        // Simple C-E-G pattern
        const pitch = "CEGCEGCG"[i % 8];
        const lane = "0246024"[i % 7]; // Map to lanes
        level1.push({
            lane: parseInt(lane),
            time: i * (60 / gameState.tempo), // Quarter notes
            duration: 0.25,
            hit: false,
            missed: false
        });
    }
    settings.patterns.push(level1);

    // Level 2: Eighth notes (4/4 time)
    const level2 = [];
    for (let i = 0; i < 16; i++) {
        // More complex pattern
        let lane;
        if (i % 8 === 0) {
            lane = 0; // Downbeat
        } else if (i % 4 === 0) {
            lane = 3; // Backbeat
        } else if (i % 2 === 0) {
            lane = 2; // Even eighth
        } else {
            lane = 4; // Odd eighth
        }
        
        level2.push({
            lane: lane,
            time: i * (30 / gameState.tempo), // Eighth notes
            duration: 0.125,
            hit: false,
            missed: false
        });
    }
    settings.patterns.push(level2);

    // Level 3: Sixteenth notes and complex patterns
    const level3 = [];
    for (let i = 0; i < 32; i++) {
        // Complex pattern
        let lane = i % 7; // Use all lanes
        
        // Emphasize downbeats
        if (i % 16 === 0) lane = 0;
        else if (i % 8 === 0) lane = 3;
        
        level3.push({
            lane: lane,
            time: i * (15 / gameState.tempo), // Sixteenth notes
            duration: 0.0625,
            hit: false,
            missed: false
        });
    }
    settings.patterns.push(level3);

    // Level 4: Syncopated patterns
    const level4 = [];
    const syncopation = [0, 2, 3, 6, 8, 10, 12, 14]; // Syncopated rhythm
    for (let i = 0; i < syncopation.length; i++) {
        const beat = syncopation[i];
        level4.push({
            lane: i % settings.lanes,
            time: beat * (15 / gameState.tempo),
            duration: 0.125,
            hit: false,
            missed: false
        });
    }
    settings.patterns.push(level4);

    // Level 5: Complex mixed rhythms with triplets
    const level5 = [];
    // Triplets
    for (let i = 0; i < 12; i++) {
        level5.push({
            lane: i % settings.lanes,
            time: i * (20 / gameState.tempo),
            duration: 0.1,
            hit: false,
            missed: false
        });
    }
    // Add sixteenth runs
    for (let i = 0; i < 16; i++) {
        level5.push({
            lane: (i * 2) % settings.lanes,
            time: 12 * (20 / gameState.tempo) + i * (15 / gameState.tempo),
            duration: 0.06,
            hit: false,
            missed: false
        });
    }
    settings.patterns.push(level5);
}

// Start new game
function startGame() {
    log('info', 'Starting game');

    // Initialize Audio Context if needed
    if (!audioContext) {
        try {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            masterGainNode = audioContext.createGain();
            masterGainNode.gain.value = 0.3; // Default volume
            masterGainNode.connect(audioContext.destination);
            initializeAudio();
            log('info', 'Audio context initialized');
        } catch (e) {
            log('error', 'Web Audio API not supported', e);
            alert('Your browser does not support the Web Audio API. Sound may not work correctly.');
        }
    }

    // Reset game state
    gameState.active = true;
    gameState.paused = false;
    gameState.score = 0;
    gameState.combo = 0;
    gameState.maxCombo = 0;
    gameState.multiplier = 1;
    gameState.energy = 50;
    gameState.level = 1;
    gameState.tempo = 60;
    gameState.gameTime = 0;
    gameState.lastUpdateTime = audioContext ? audioContext.currentTime : 0;
    gameState.notes = [];
    gameState.hitResults = [];
    gameState.notesHit = 0;
    gameState.notesMissed = 0;
    gameState.perfectPatterns = 0;

    // Update UI safely
    if (elements.score) elements.score.textContent = gameState.score;
    if (elements.combo) elements.combo.textContent = gameState.combo;
    if (elements.multiplier) elements.multiplier.textContent = `x${gameState.multiplier}`;
    if (elements.level) elements.level.textContent = gameState.level;
    if (elements.energyFill) elements.energyFill.style.height = `${gameState.energy}%`;
    if (elements.tempoDisplay) elements.tempoDisplay.textContent = `${Math.round(gameState.tempo)} BPM`;

    // Initialize note highway
    try {
        initializeNoteHighway();
    } catch (err) {
        log('error', `Failed to initialize note highway: ${err.message}`, err);
    }

    // Show game screen safely
    if (elements.startScreen) elements.startScreen.classList.add('hidden');
    if (elements.gameScreen) elements.gameScreen.classList.remove('hidden');

    // Start game loop
    if (animationId) {
        cancelAnimationFrame(animationId);
    }
    gameLoop();
}

// Initialize audio samples
function initializeAudio() {
    // We'll use simple oscillators for notes
    // In a full implementation, you could preload samples here
}

// Initialize the note highway with pattern
function initializeNoteHighway() {
    // Clear existing notes
    gameState.notes = [];

    // Get pattern for current level
    const patternIndex = Math.min(gameState.level - 1, settings.patterns.length - 1);
    const pattern = settings.patterns[patternIndex];

    // Add lead time for notes to scroll onto screen
    const futureTime = 3.0; // 3 seconds lead time

    // Add notes from pattern
    pattern.forEach(note => {
        gameState.notes.push({
            lane: note.lane,
            time: audioContext.currentTime + note.time + futureTime,
            duration: note.duration,
            hit: false,
            missed: false
        });
    });
}

// Main game loop
function gameLoop() {
    if (!gameState.active || gameState.paused) return;

    // Calculate time delta
    const now = audioContext.currentTime;
    const dt = now - gameState.lastUpdateTime;
    gameState.lastUpdateTime = now;
    gameState.gameTime += dt;

    // Update game state
    update(dt);

    // Render
    render();

    // Continue loop
    animationId = requestAnimationFrame(gameLoop);
}

// Update game state
function update(dt) {
    // Check for missed notes
    const now = audioContext.currentTime;
    let allNotesProcessed = true;

    gameState.notes.forEach(note => {
        if (note.hit || note.missed) return;
        
        // If note is past the hit window and wasn't hit
        if (now > note.time + settings.hitWindow) {
            note.missed = true;
            handleNoteMiss(note);
            allNotesProcessed = false;
        } else if (now < note.time + settings.hitWindow) {
            allNotesProcessed = false;
        }
    });

    // Check if pattern is complete
    if (allNotesProcessed) {
        handlePatternComplete();
    }

    // Update hit result animations
    gameState.hitResults = gameState.hitResults.filter(result => {
        result.age += dt * 1000; // Convert to ms
        return result.age < settings.feedbackDuration;
    });

    // Update energy decay
    gameState.energy = Math.max(0, gameState.energy - 0.1 * dt);
    elements.energyFill.style.height = `${gameState.energy}%`;
}

// Handle pattern completion
function handlePatternComplete() {
    // Check if all notes were hit
    const allHit = gameState.notes.every(note => note.hit);
    
    // Check if all hits were perfect
    const allPerfect = gameState.notes.every(note => {
        return note.hit && note.hitAccuracy === 'perfect';
    });

    // Increment perfect patterns count
    if (allPerfect) {
        gameState.perfectPatterns++;
    }

    // Increase level
    if (allHit && gameState.level < 5) {
        gameState.level++;
        elements.level.textContent = gameState.level;
        
        // Increase tempo
        increaseTempo(10);
    }

    // Give energy bonus for completing the pattern
    if (allHit) {
        gameState.energy = Math.min(100, gameState.energy + 10);
    }

    // Initialize new pattern
    initializeNoteHighway();
}

// Handle note hit
function handleNoteHit(laneIndex) {
    const now = audioContext.currentTime;
    
    // Find the closest unhit note in this lane
    let closestNote = null;
    let closestDelta = Infinity;
    
    gameState.notes.forEach(note => {
        if (note.hit || note.missed) return;
        if (note.lane !== laneIndex) return;
        
        const delta = Math.abs(now - note.time);
        if (delta < settings.hitWindow && delta < closestDelta) {
            closestDelta = delta;
            closestNote = note;
        }
    });
    
    // If no note found in hit window
    if (!closestNote) return false;
    
    // Mark note as hit
    closestNote.hit = true;
    
    // Calculate accuracy
    let accuracy;
    if (closestDelta < settings.perfectWindow) {
        accuracy = 'perfect';
    } else if (closestDelta < settings.goodWindow) {
        accuracy = 'good';
    } else {
        accuracy = 'okay';
    }
    closestNote.hitAccuracy = accuracy;
    
    // Track hit timing
    closestNote.hitTiming = now - closestNote.time;
    
    // Update combo
    gameState.combo++;
    gameState.maxCombo = Math.max(gameState.maxCombo, gameState.combo);
    
    // Update multiplier based on combo
    if (gameState.combo >= 40) {
        gameState.multiplier = 4;
    } else if (gameState.combo >= 20) {
        gameState.multiplier = 3;
    } else if (gameState.combo >= 10) {
        gameState.multiplier = 2;
    } else {
        gameState.multiplier = 1;
    }
    
    // Score points
    let points;
    if (accuracy === 'perfect') {
        points = 300;
        gameState.energy = Math.min(100, gameState.energy + 2);
    } else if (accuracy === 'good') {
        points = 200;
        gameState.energy = Math.min(100, gameState.energy + 1);
    } else {
        points = 100;
        gameState.energy = Math.min(100, gameState.energy + 0.5);
    }
    
    // Apply multiplier
    points *= gameState.multiplier;
    gameState.score += points;
    
    // Update stats
    gameState.notesHit++;
    
    // Update UI
    elements.score.textContent = gameState.score;
    elements.combo.textContent = gameState.combo;
    elements.multiplier.textContent = `x${gameState.multiplier}`;
    elements.energyFill.style.height = `${gameState.energy}%`;
    
    // Add visual feedback
    showHitFeedback(accuracy, laneIndex);
    
    // Play audio feedback
    playHitSound(laneIndex, accuracy);
    
    return true;
}

// Handle note miss
function handleNoteMiss(note) {
    // Reset combo
    gameState.combo = 0;
    
    // Update UI
    elements.combo.textContent = gameState.combo;
    elements.multiplier.textContent = 'x1';
    gameState.multiplier = 1;
    
    // Decrease energy
    gameState.energy = Math.max(0, gameState.energy - 5);
    elements.energyFill.style.height = `${gameState.energy}%`;
    
    // Update stats
    gameState.notesMissed++;
    
    // Check for game over if energy is zero
    if (gameState.energy <= 0) {
        // In a full implementation, you could end the game here
        // For this demo, we'll just keep going
    }
}

// Increase tempo
function increaseTempo(amount) {
    gameState.tempo += amount;
    elements.tempoDisplay.textContent = `${Math.round(gameState.tempo)} BPM`;
    
    // Show tempo change feedback
    elements.feedbackText.textContent = `Tempo: ${Math.round(gameState.tempo)} BPM`;
    elements.feedbackText.classList.add('visible');
    setTimeout(() => {
        elements.feedbackText.classList.remove('visible');
    }, 2000);
}

// Play hit sound
function playHitSound(laneIndex, accuracy) {
    if (!audioContext) return;
    
    // Create oscillator
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    // Set frequency based on lane
    const baseFrequency = 261.63; // C4
    const scale = [0, 2, 4, 5, 7, 9, 11]; // Major scale intervals
    const frequency = baseFrequency * Math.pow(2, scale[laneIndex] / 12);
    
    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';
    
    // Connect nodes
    oscillator.connect(gainNode);
    gainNode.connect(masterGainNode);
    
    // Set envelope
    const now = audioContext.currentTime;
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.5, now + 0.01);
    
    // Different decay based on accuracy
    if (accuracy === 'perfect') {
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
        oscillator.type = 'triangle';
    } else if (accuracy === 'good') {
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        oscillator.type = 'sine';
    } else {
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        oscillator.type = 'sine';
    }
    
    // Start and stop
    oscillator.start(now);
    oscillator.stop(now + 0.5);
}

// Show hit feedback
function showHitFeedback(accuracy, laneIndex) {
    // Add hit result
    gameState.hitResults.push({
        accuracy: accuracy,
        lane: laneIndex,
        age: 0
    });
    
    // Show indicator on key
    const keyIndicator = document.querySelector(`.key-indicator[data-key="${String.fromCharCode(65 + laneIndex)}"]`);
    
    if (keyIndicator) {
        keyIndicator.classList.add('active');
        
        if (accuracy === 'perfect') {
            keyIndicator.classList.add('correct');
        }
        
        setTimeout(() => {
            keyIndicator.classList.remove('active');
            keyIndicator.classList.remove('correct');
        }, 100);
    }
}

// Render the game
function render() {
    // Clear canvases
    clearCanvases();
    
    // Render note highway
    renderNoteHighway();
    
    // Render visualizer
    renderVisualizer();
}

// Clear all canvases
function clearCanvases() {
    noteHighwayCtx.clearRect(0, 0, noteHighwayCanvas.width, noteHighwayCanvas.height);
    visualizerCtx.clearRect(0, 0, visualizerCanvas.width, visualizerCanvas.height);
}

// Render the note highway
function renderNoteHighway() {
    // Draw lanes
    for (let i = 0; i < settings.lanes; i++) {
        const laneX = i * settings.laneWidth;
        noteHighwayCtx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        noteHighwayCtx.fillRect(laneX, 0, settings.laneWidth, noteHighwayCanvas.height);
    }
    
    // Draw target line
    noteHighwayCtx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    noteHighwayCtx.fillRect(0, settings.targetLineY, noteHighwayCanvas.width, 3);
    
    // Draw notes
    const now = audioContext.currentTime;
    
    gameState.notes.forEach(note => {
        if (note.hit || note.missed) return;
        
        const timeToTarget = note.time - now;
        // Only draw notes within the visible window
        if (timeToTarget < 3.0 && timeToTarget > -0.5) {
            const y = settings.targetLineY - (timeToTarget * settings.noteSpeed);
            const x = note.lane * settings.laneWidth;
            
            // Color based on timing (closer = brighter)
            const opacity = Math.min(1.0, 1.0 - Math.abs(timeToTarget) / 3.0);
            
            noteHighwayCtx.fillStyle = `rgba(0, 120, 255, ${opacity})`;
            noteHighwayCtx.fillRect(x + 5, y - 20, settings.laneWidth - 10, 20);
            
            // Add glow for upcoming notes
            if (timeToTarget < settings.hitWindow * 3) {
                noteHighwayCtx.beginPath();
                noteHighwayCtx.arc(x + settings.laneWidth / 2, y - 10, 
                                   settings.laneWidth / 2 * (1 + Math.sin(now * 5) * 0.2), 
                                   0, Math.PI * 2);
                noteHighwayCtx.fillStyle = `rgba(0, 150, 255, ${0.2 * opacity})`;
                noteHighwayCtx.fill();
            }
        }
    });
    
    // Draw hit results
    gameState.hitResults.forEach(result => {
        const x = result.lane * settings.laneWidth + settings.laneWidth / 2;
        const y = settings.targetLineY;
        const progress = result.age / settings.feedbackDuration;
        
        // Text rises and fades
        const yOffset = -40 * progress;
        const opacity = 1 - progress;
        
        noteHighwayCtx.fillStyle = getAccuracyColor(result.accuracy, opacity);
        noteHighwayCtx.font = 'bold 16px Arial';
        noteHighwayCtx.textAlign = 'center';
        noteHighwayCtx.fillText(getAccuracyText(result.accuracy), x, y + yOffset);
    });
}

// Get color for accuracy rating
function getAccuracyColor(accuracy, opacity) {
    switch (accuracy) {
        case 'perfect':
            return `rgba(255, 215, 0, ${opacity})`; // Gold
        case 'good':
            return `rgba(0, 200, 0, ${opacity})`; // Green
        default:
            return `rgba(0, 150, 255, ${opacity})`; // Blue
    }
}

// Get text for accuracy rating
function getAccuracyText(accuracy) {
    switch (accuracy) {
        case 'perfect':
            return 'PERFECT!';
        case 'good':
            return 'GOOD!';
        default:
            return 'OK';
    }
}

// Render audio visualizer
function renderVisualizer() {
    const width = visualizerCanvas.width;
    const height = visualizerCanvas.height;
    
    // Create a gradient background
    const gradient = visualizerCtx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, 'rgba(0, 50, 100, 0.5)');
    gradient.addColorStop(1, 'rgba(0, 20, 40, 0.5)');
    visualizerCtx.fillStyle = gradient;
    visualizerCtx.fillRect(0, 0, width, height);
    
    // Draw energy-based visualization
    const barCount = 32;
    const barWidth = width / barCount;
    
    for (let i = 0; i < barCount; i++) {
        // Use energy and game time to create dynamic visualization
        const energyFactor = gameState.energy / 100;
        const timeFactor = (audioContext.currentTime * 5) % 1000;
        
        // Generate a value using sine waves
        const value = Math.abs(Math.sin(i * 0.2 + timeFactor * 0.01)) * 
                     energyFactor * 
                     (0.5 + 0.5 * Math.sin(i * 0.1 + timeFactor * 0.02));
        
        const barHeight = value * height * 0.8;
        
        // Color based on energy level
        let hue;
        if (gameState.energy > 75) {
            hue = 60; // Yellow/gold
        } else if (gameState.energy > 50) {
            hue = 200; // Blue
        } else if (gameState.energy > 25) {
            hue = 270; // Purple
        } else {
            hue = 0; // Red
        }
        
        visualizerCtx.fillStyle = `hsla(${hue}, 80%, 60%, 0.8)`;
        visualizerCtx.fillRect(i * barWidth, height - barHeight, barWidth - 1, barHeight);
    }
}

// Handle key down events
function handleKeyDown(event) {
    if (!gameState.active || gameState.paused) return;
    
    // Check if the key matches a lane
    const keyCode = event.code;
    const laneMapping = settings.keyMapping;
    
    if (laneMapping[keyCode] !== undefined && !gameState.keyState[keyCode]) {
        const laneIndex = laneMapping[keyCode];
        gameState.keyState[keyCode] = true;
        
        // Try to hit a note
        handleNoteHit(laneIndex);
    }
    
    // Pause on Escape key
    if (keyCode === 'Escape') {
        pauseGame();
    }
}

// Handle key up events
function handleKeyUp(event) {
    const keyCode = event.code;
    gameState.keyState[keyCode] = false;
}

// Pause the game
function pauseGame() {
    if (!gameState.active) return;
    
    gameState.paused = true;
    elements.gameScreen.classList.add('hidden');
    elements.pauseScreen.classList.remove('hidden');
    
    // Stop animation
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
}

// Resume the game
function resumeGame() {
    if (!gameState.active) return;
    
    gameState.paused = false;
    elements.pauseScreen.classList.add('hidden');
    elements.gameScreen.classList.remove('hidden');
    
    // Resume the game loop
    gameState.lastUpdateTime = audioContext.currentTime;
    gameLoop();
}

// Restart the game
function restartGame() {
    // Show start screen
    elements.pauseScreen.classList.add('hidden');
    elements.resultsScreen.classList.add('hidden');
    elements.startScreen.classList.remove('hidden');
    
    // Stop game
    gameState.active = false;
}

// End the game and show results
function endGame() {
    gameState.active = false;
    
    // Calculate final stats
    const totalNotes = gameState.notesHit + gameState.notesMissed;
    const accuracy = totalNotes > 0 ? Math.round((gameState.notesHit / totalNotes) * 100) : 0;
    
    // Update results screen
    elements.finalScore.textContent = gameState.score;
    elements.maxCombo.textContent = gameState.maxCombo;
    elements.maxLevel.textContent = gameState.level;
    elements.peakEnergy.textContent = Math.round(gameState.energy) + '%';
    elements.notesHit.textContent = gameState.notesHit;
    elements.notesMissed.textContent = gameState.notesMissed;
    elements.accuracy.textContent = accuracy + '%';
    elements.perfectPatterns.textContent = gameState.perfectPatterns;
    
    // Show results screen
    elements.gameScreen.classList.add('hidden');
    elements.resultsScreen.classList.remove('hidden');
    
    // Stop animation
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }

    // Save progress to localStorage
    if (typeof MetaMind !== 'undefined' && MetaMind.Progress) {
        MetaMind.Progress.saveSession('psychoacoustic_wizard', {
            score: gameState.score,
            level: gameState.level,
            accuracy: accuracy,
            maxCombo: gameState.maxCombo
        });
        log('info', `Progress saved: score=${gameState.score}, level=${gameState.level}`);
    }
}

// Resize the game to fit the screen
function resizeGame() {
    // Get container dimensions
    const container = document.getElementById('note-highway');
    const width = container.clientWidth;
    const height = container.clientHeight;
    
    // Resize note highway canvas
    noteHighwayCanvas.width = width;
    noteHighwayCanvas.height = height;
    
    // Resize visualizer canvas
    visualizerCanvas.width = visualizerCanvas.clientWidth;
    visualizerCanvas.height = visualizerCanvas.clientHeight;
    
    // Update settings
    settings.laneWidth = width / settings.lanes;
    settings.targetLineY = height - 80;
}

// Initialize on load
document.addEventListener('DOMContentLoaded', init); 