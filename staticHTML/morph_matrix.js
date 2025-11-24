// Morph Matrix - JavaScript implementation

// Game state
const state = {
    currentScreen: 'start', // 'start', 'game', 'results'
    level: 1,
    score: 0,
    matrixSize: 5, // Default size
    selectedPatterns: [],
    patterns: [],
    modifiedIndices: [],
    totalPatterns: 6
};

// DOM elements - populated in init() after DOM is ready
let elements = {};

// Module name for logging
const MODULE_NAME = 'MorphMatrix';

// Safe logging helper
function log(level, message, data) {
    if (typeof MetaMind !== 'undefined' && MetaMind.Debug) {
        MetaMind.Debug[level](MODULE_NAME, message, data);
    } else {
        console[level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log'](`[${MODULE_NAME}]`, message, data || '');
    }
}

// Safe element getter
function getElement(id) {
    const el = document.getElementById(id);
    if (!el) {
        log('warn', `Element not found: #${id}`);
    }
    return el;
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
    log('warn', `Cannot attach click listener: ${name} element is null`);
    return false;
}

// Initialize the game
function init() {
    log('info', 'Initializing module');

    // Populate DOM elements after DOM is ready
    elements = {
        startScreen: getElement('start-screen'),
        gameScreen: getElement('game-screen'),
        resultsScreen: getElement('results-screen'),
        startButton: getElement('start-button'),
        checkButton: getElement('check-button'),
        nextButton: getElement('next-button'),
        levelDisplay: getElement('level'),
        scoreDisplay: getElement('score'),
        finalScoreDisplay: getElement('final-score')
    };

    // Validate required elements
    const requiredElements = ['startScreen', 'gameScreen', 'startButton'];
    const missing = requiredElements.filter(name => !elements[name]);
    if (missing.length > 0) {
        log('error', `Missing required elements: ${missing.join(', ')}`);
        return;
    }

    // Set up event listeners with error handling
    addClickListener(elements.startButton, startGame, 'startButton');
    addClickListener(elements.checkButton, checkAnswers, 'checkButton');
    addClickListener(elements.nextButton, nextChallenge, 'nextButton');

    // Add click handlers to pattern containers
    for (let i = 0; i < state.totalPatterns; i++) {
        const patternElement = getElement(`pattern${i}`);
        if (patternElement) {
            addClickListener(patternElement, () => togglePatternSelection(i), `pattern${i}`);
        }
    }

    // Show initial screen
    showScreen('start');
    log('info', 'Module initialized successfully');
}

// Show the specified screen
function showScreen(screenName) {
    state.currentScreen = screenName;

    // Safely hide all screens
    if (elements.startScreen) elements.startScreen.classList.add('hidden');
    if (elements.gameScreen) elements.gameScreen.classList.add('hidden');
    if (elements.resultsScreen) elements.resultsScreen.classList.add('hidden');

    // Show requested screen
    switch(screenName) {
        case 'start':
            if (elements.startScreen) elements.startScreen.classList.remove('hidden');
            break;
        case 'game':
            if (elements.gameScreen) elements.gameScreen.classList.remove('hidden');
            break;
        case 'results':
            if (elements.resultsScreen) elements.resultsScreen.classList.remove('hidden');
            break;
    }
}

// Start the game
function startGame() {
    // Reset game state
    state.score = 0;
    state.level = 1;
    
    // Update UI
    updateStats();
    
    // Generate patterns
    generatePatterns();
    
    // Move to game screen
    showScreen('game');
}

// Update level and score displays
function updateStats() {
    elements.levelDisplay.textContent = state.level;
    elements.scoreDisplay.textContent = state.score;
    elements.finalScoreDisplay.textContent = state.score;
}

// Generate random patterns
function generatePatterns() {
    state.selectedPatterns = Array(state.totalPatterns).fill(false);
    state.patterns = [];
    
    // Create the original matrix (0 or 1 for each cell)
    const originalMatrix = [];
    for (let i = 0; i < state.matrixSize; i++) {
        const row = [];
        for (let j = 0; j < state.matrixSize; j++) {
            row.push(Math.random() < 0.5 ? 0 : 1);
        }
        originalMatrix.push(row);
    }
    
    // Add the original matrix as the first pattern
    state.patterns.push(originalMatrix);
    
    // Create rotated/modified versions for the other patterns
    for (let i = 1; i < state.totalPatterns; i++) {
        // Deep copy of the original
        let pattern = originalMatrix.map(row => [...row]);
        
        // Apply rotation (0-3 rotations, 90° each)
        const rotations = i % 4;
        for (let r = 0; r < rotations; r++) {
            pattern = rotateMatrix(pattern);
        }
        
        state.patterns.push(pattern);
    }
    
    // Select half of the non-original patterns to modify
    const numToModify = Math.floor((state.totalPatterns - 1) / 2);
    state.modifiedIndices = [];
    
    while (state.modifiedIndices.length < numToModify) {
        const idx = Math.floor(Math.random() * (state.totalPatterns - 1)) + 1;
        if (!state.modifiedIndices.includes(idx)) {
            state.modifiedIndices.push(idx);
            
            // Modify a random cell in the pattern
            const r = Math.floor(Math.random() * state.matrixSize);
            const c = Math.floor(Math.random() * state.matrixSize);
            state.patterns[idx][r][c] = 1 - state.patterns[idx][r][c]; // Toggle the cell
        }
    }
    
    // Render all patterns
    renderPatterns();
}

// Rotate a matrix 90 degrees clockwise
function rotateMatrix(matrix) {
    const n = matrix.length;
    const result = Array(n).fill().map(() => Array(n).fill(0));
    
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            result[j][n - 1 - i] = matrix[i][j];
        }
    }
    
    return result;
}

// Render all patterns on the screen
function renderPatterns() {
    // Render game screen patterns
    for (let i = 0; i < state.totalPatterns; i++) {
        const patternElement = document.getElementById(`pattern${i}`);
        if (patternElement) {
            const patternGrid = patternElement.querySelector('.pattern');
            renderPatternGrid(patternGrid, state.patterns[i]);
            
            // Clear any previous selection
            patternElement.classList.remove('selected');
        }
    }
    
    // Render results screen patterns
    for (let i = 0; i < state.totalPatterns; i++) {
        const patternElement = document.getElementById(`result-pattern${i}`);
        if (patternElement) {
            const patternGrid = patternElement.querySelector('.pattern');
            renderPatternGrid(patternGrid, state.patterns[i]);
            
            // Clear any previous result labels
            const resultLabel = patternElement.querySelector('.result-label');
            resultLabel.textContent = i === 0 ? 'ORIGINAL PATTERN' : '';
            resultLabel.classList.remove('correct', 'incorrect');
        }
    }
}

// Render a single pattern grid
function renderPatternGrid(element, matrix) {
    // Clear the grid
    element.innerHTML = '';
    
    // Set the correct grid size
    element.style.gridTemplateColumns = `repeat(${state.matrixSize}, 30px)`;
    element.style.gridTemplateRows = `repeat(${state.matrixSize}, 30px)`;
    
    // Add cells to the grid
    for (let i = 0; i < matrix.length; i++) {
        for (let j = 0; j < matrix[i].length; j++) {
            const cell = document.createElement('div');
            cell.className = `cell ${matrix[i][j] === 1 ? 'filled' : 'empty'}`;
            element.appendChild(cell);
        }
    }
}

// Toggle pattern selection
function togglePatternSelection(index) {
    if (state.currentScreen !== 'game') return;
    
    state.selectedPatterns[index] = !state.selectedPatterns[index];
    
    // Update the UI
    const patternElement = document.getElementById(`pattern${index}`);
    if (patternElement) {
        if (state.selectedPatterns[index]) {
            patternElement.classList.add('selected');
        } else {
            patternElement.classList.remove('selected');
        }
    }
}

// Check the player's answers
function checkAnswers() {
    let correctAnswers = 0;
    
    // Calculate score
    for (let i = 0; i < state.totalPatterns; i++) {
        const isModified = state.modifiedIndices.includes(i);
        const isSelected = state.selectedPatterns[i];
        
        // If not modified and selected, or modified and not selected, it's correct
        const isCorrect = (!isModified && isSelected) || (isModified && !isSelected);
        
        if (isCorrect) {
            correctAnswers++;
        }
        
        // Update result labels on the results screen
        const resultElement = document.getElementById(`result-pattern${i}`);
        if (resultElement && i > 0) { // Skip the original pattern
            const resultLabel = resultElement.querySelector('.result-label');
            resultLabel.textContent = isModified ? 'MODIFIED' : 'EXACT ROTATION';
            resultLabel.classList.add(isCorrect ? 'correct' : 'incorrect');
            
            // Show selection on results screen
            if (isSelected) {
                resultElement.classList.add('selected');
            } else {
                resultElement.classList.remove('selected');
            }
        }
    }
    
    // Update score
    state.score += correctAnswers * 10;
    
    // Perfect score bonus
    if (correctAnswers === state.totalPatterns) {
        state.score += 20;
        if (state.level < state.matrixSize) {
            state.level++;
        }
    }
    
    // Update UI
    updateStats();

    // Show results screen
    showScreen('results');

    // Save progress to localStorage
    if (typeof MetaMind !== 'undefined' && MetaMind.Progress) {
        const accuracy = Math.round((correctAnswers / state.totalPatterns) * 100);
        MetaMind.Progress.saveSession('morph_matrix', {
            score: state.score,
            level: state.level,
            accuracy: accuracy,
            matrixSize: state.matrixSize
        });
        log('info', `Progress saved: score=${state.score}, level=${state.level}`);
    }
}

// Prepare for next challenge
function nextChallenge() {
    // Generate new patterns
    generatePatterns();
    
    // Show game screen
    showScreen('game');
}

// Initialize the game when the DOM is loaded
document.addEventListener('DOMContentLoaded', init); 