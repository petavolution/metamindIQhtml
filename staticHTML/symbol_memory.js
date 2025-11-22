// Symbol Memory - JavaScript implementation

// Game state
const state = {
    currentScreen: 'start', // 'start', 'game', 'complete'
    phase: 'memorize', // 'memorize', 'blank', 'recall', 'feedback'
    level: 1,
    score: 0,
    gridSize: 3, // Starting with 3x3 grid instead of 5x5
    symbols: [],
    modifiedPosition: null,
    memoryTime: 5000, // ms to memorize pattern
    blankTime: 1000, // ms of blank screen
    timerId: null,
    countdownId: null,
    timeRemaining: 0,
    correctAnswers: 0,
    totalQuestions: 0,
    wasModified: false,
    userSelectedModified: false,
    userSelectedPosition: null,
    difficultyFactor: 1.0
};

// Available symbols - organized by difficulty
const symbolSets = {
    easy: ['★', '♦', '♥', '◆', '□', '△', '○', '◇'],
    medium: ['♠', '♣', '▲', '▢', '▣', '◈', '◉', '●'],
    hard: ['▤', '▥', '▦', '▧', '▨', '▩', '◊', '◎', '◍', '◐', '◑', '◒', '◓', '◔', '◕']
};

// Color configurations
const colorPalettes = [
    { name: 'default', colors: ['#ff9500', '#32ff32', '#3298ff', '#ff3298', '#ffe132'] }, // Current colors
    { name: 'vibrant', colors: ['#FF5252', '#4CAF50', '#2196F3', '#FFC107', '#9C27B0'] }, // More vibrant
    { name: 'pastel', colors: ['#FFB6C1', '#AFEEEE', '#FFFACD', '#98FB98', '#D8BFD8'] }   // Pastel option
];

// Use default palette by default
let activePalette = colorPalettes[0];

// DOM elements - populated in init() after DOM is ready
let elements = {};

// Keyboard navigation currently focused element
let focusedCell = -1;

// Module name for logging
const MODULE_NAME = 'SymbolMemory';

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
        completeScreen: getElement('complete-screen'),
        startButton: getElement('start-button'),
        restartButton: getElement('restart-button'),
        symbolGrid: getElement('symbol-grid'),
        phaseText: getElement('phase-text'),
        answerPanel: getElement('answer-panel'),
        positionPanel: getElement('position-panel'),
        yesButton: getElement('yes-button'),
        noButton: getElement('no-button'),
        resultMessage: getElement('result-message'),
        levelDisplay: getElement('level'),
        scoreDisplay: getElement('score'),
        timeRemainingDisplay: getElement('time-remaining'),
        finalScoreDisplay: getElement('final-score'),
        correctAnswersDisplay: getElement('correct-answers'),
        totalQuestionsDisplay: getElement('total-questions')
    };

    // Validate required elements
    const requiredElements = ['startScreen', 'gameScreen', 'startButton', 'symbolGrid'];
    const missing = requiredElements.filter(name => !elements[name]);
    if (missing.length > 0) {
        log('error', `Missing required elements: ${missing.join(', ')}`);
        return; // Cannot proceed without required elements
    }

    // Set up event listeners with error handling
    addClickListener(elements.startButton, startGame, 'startButton');
    addClickListener(elements.restartButton, startGame, 'restartButton');
    addClickListener(elements.yesButton, () => answerChanged(true), 'yesButton');
    addClickListener(elements.noButton, () => answerChanged(false), 'noButton');

    // Add keyboard event listeners
    document.addEventListener('keydown', function(e) {
        try {
            handleKeyDown(e);
        } catch (err) {
            log('error', `Error in keydown handler: ${err.message}`, err);
        }
    });

    // Show initial screen
    showScreen('start');
    log('info', 'Module initialized successfully');
}

// Handle keyboard navigation
function handleKeyDown(e) {
    // Space to restart current level
    if (e.code === 'Space' && state.currentScreen === 'game') {
        restartLevel();
        return;
    }
    
    // Only handle navigation in recall phase with position panel visible
    if (state.phase !== 'recall' || 
        elements.positionPanel.classList.contains('hidden') ||
        state.currentScreen !== 'game') {
        
        // Handle yes/no choices with keyboard
        if (state.phase === 'recall' && !elements.answerPanel.classList.contains('hidden')) {
            if (e.key === 'y' || e.key === 'Y') {
                answerChanged(true);
                return;
            } else if (e.key === 'n' || e.key === 'N') {
                answerChanged(false);
                return;
            }
        }
        return;
    }
    
    const cells = elements.symbolGrid.querySelectorAll('.symbol-cell');
    if (cells.length === 0) return;
    
    // Initialize focused cell if not set
    if (focusedCell === -1) {
        focusedCell = 0;
    }
    
    // Remove highlight from current focus
    if (focusedCell >= 0 && focusedCell < cells.length) {
        cells[focusedCell].classList.remove('highlighted');
    }
    
    // Handle arrow key navigation
    switch (e.key) {
        case 'ArrowUp':
            focusedCell = Math.max(0, focusedCell - state.gridSize);
            break;
        case 'ArrowDown':
            focusedCell = Math.min(cells.length - 1, focusedCell + state.gridSize);
            break;
        case 'ArrowLeft':
            focusedCell = Math.max(0, focusedCell - 1);
            break;
        case 'ArrowRight':
            focusedCell = Math.min(cells.length - 1, focusedCell + 1);
            break;
        case 'Enter':
            // Select the current cell
            selectPosition(focusedCell);
            return;
    }
    
    // Highlight the new focused cell
    cells[focusedCell].classList.add('highlighted');
    
    // Prevent default scrolling behavior
    e.preventDefault();
}

// Show the specified screen with transition
function showScreen(screenName) {
    state.currentScreen = screenName;
    
    // Hide all screens
    elements.startScreen.classList.add('hidden');
    elements.gameScreen.classList.add('hidden');
    elements.completeScreen.classList.add('hidden');
    
    // Show requested screen
    switch(screenName) {
        case 'start':
            elements.startScreen.classList.remove('hidden');
            break;
        case 'game':
            elements.gameScreen.classList.remove('hidden');
            break;
        case 'complete':
            // Update final stats
            elements.completeScreen.classList.remove('hidden');
            elements.finalScoreDisplay.textContent = state.score;
            elements.correctAnswersDisplay.textContent = state.correctAnswers;
            elements.totalQuestionsDisplay.textContent = state.totalQuestions;
            
            // Add accuracy percentage
            const accuracy = state.totalQuestions > 0 
                ? Math.round((state.correctAnswers / state.totalQuestions) * 100) 
                : 0;
            
            // Check if accuracy element exists, create if not
            let accuracyElement = document.getElementById('accuracy');
            if (!accuracyElement) {
                const resultsDiv = elements.completeScreen.querySelector('.results');
                if (resultsDiv) {
                    accuracyElement = document.createElement('p');
                    accuracyElement.id = 'accuracy';
                    resultsDiv.insertBefore(accuracyElement, resultsDiv.children[2]);
                }
            }
            
            if (accuracyElement) {
                accuracyElement.textContent = `Accuracy: ${accuracy}%`;
            }
            break;
    }
}

// Start the game
function startGame() {
    // Clear any timers
    clearAllTimers();
    
    // Reset game state
    state.score = 0;
    state.level = 1;
    state.correctAnswers = 0;
    state.totalQuestions = 0;
    state.difficultyFactor = 1.0;
    
    // Update UI
    updateStats();
    
    // Start first level
    startLevel();
    
    // Move to game screen
    showScreen('game');
}

// Start the current level
function startLevel() {
    // Reset phase-specific state
    state.phase = 'memorize';
    state.userSelectedModified = false;
    state.userSelectedPosition = null;
    focusedCell = -1;
    
    // Generate pattern
    generatePattern();
    
    // Update UI
    updatePhaseUI();
    
    // Start the timer
    startTimer();
}

// Restart the current level
function restartLevel() {
    // Clear any running timers
    clearAllTimers();
    
    // Hide panels
    elements.answerPanel.classList.add('hidden');
    elements.positionPanel.classList.add('hidden');
    elements.resultMessage.classList.remove('visible');
    
    // Start the level again
    startLevel();
}

// Clear all active timers
function clearAllTimers() {
    if (state.timerId) {
        clearTimeout(state.timerId);
        state.timerId = null;
    }
    if (state.countdownId) {
        clearInterval(state.countdownId);
        state.countdownId = null;
    }
}

// Generate a pattern of symbols
function generatePattern() {
    // Determine grid dimensions based on level - start with 3x3 and increase by 1 each level
    const size = Math.min(state.level + 2, 8); // 3x3 at level 1, max size 8x8
    state.gridSize = size;
    
    // Choose symbol set based on level
    let symbolSet;
    if (state.level <= 3) {
        symbolSet = symbolSets.easy;
    } else if (state.level <= 7) {
        symbolSet = symbolSets.medium;
    } else {
        symbolSet = symbolSets.hard;
    }
    
    // Generate random symbols
    state.symbols = [];
    for (let i = 0; i < size * size; i++) {
        const symbolIndex = Math.floor(Math.random() * symbolSet.length);
        const colorIndex = Math.floor(Math.random() * activePalette.colors.length);
        
        state.symbols.push({
            symbol: symbolSet[symbolIndex],
            colorClass: `symbol-color-${colorIndex + 1}`,
            colorValue: activePalette.colors[colorIndex]
        });
    }
    
    // Determine if this pattern will be modified (50% chance)
    state.wasModified = Math.random() < 0.5;
    
    // If modified, select a random position to modify
    if (state.wasModified) {
        state.modifiedPosition = Math.floor(Math.random() * (size * size));
        
        // Store original symbol to avoid picking the same one
        const originalSymbol = state.symbols[state.modifiedPosition].symbol;
        let newSymbolIndex;
        
        do {
            newSymbolIndex = Math.floor(Math.random() * symbolSet.length);
        } while (symbolSet[newSymbolIndex] === originalSymbol);
        
        // Create a copy of the modified symbol (to be used during recall phase)
        state.modifiedSymbol = {
            symbol: symbolSet[newSymbolIndex],
            colorClass: state.symbols[state.modifiedPosition].colorClass,
            colorValue: state.symbols[state.modifiedPosition].colorValue
        };
    } else {
        state.modifiedPosition = null;
    }
    
    // Render the grid
    renderGrid();
}

// Render the symbol grid
function renderGrid() {
    // Clear the grid
    elements.symbolGrid.innerHTML = '';
    
    // Calculate cell size based on grid size - smaller grids for higher levels
    const cellSize = Math.max(35, 70 - (state.gridSize * 3)); // Adaptive cell size
    
    // Set the grid size
    elements.symbolGrid.style.gridTemplateColumns = `repeat(${state.gridSize}, ${cellSize}px)`;
    elements.symbolGrid.style.gridTemplateRows = `repeat(${state.gridSize}, ${cellSize}px)`;
    
    // Adjust gap for larger grids
    const gap = Math.max(5, 10 - state.gridSize);
    elements.symbolGrid.style.gap = `${gap}px`;
    
    // Add cells to the grid
    for (let i = 0; i < state.symbols.length; i++) {
        const cell = document.createElement('div');
        cell.className = `symbol-cell ${state.symbols[i].colorClass}`;
        
        // Use modified symbol during recall phase if applicable
        if (state.phase === 'recall' && state.wasModified && i === state.modifiedPosition) {
            cell.textContent = state.modifiedSymbol.symbol;
            cell.className = `symbol-cell ${state.modifiedSymbol.colorClass}`;
            // Apply direct color style
            cell.style.color = state.modifiedSymbol.colorValue;
        } else {
            cell.textContent = state.symbols[i].symbol;
            // Apply direct color style
            cell.style.color = state.symbols[i].colorValue;
        }
        
        // Set font size based on cell size
        cell.style.fontSize = `${Math.max(16, cellSize * 0.6)}px`;
        
        // Add click handler for position selection
        cell.addEventListener('click', () => selectPosition(i));
        
        elements.symbolGrid.appendChild(cell);
    }
    
    // In feedback phase, highlight the modified position
    if (state.phase === 'feedback' && state.wasModified) {
        const cells = elements.symbolGrid.querySelectorAll('.symbol-cell');
        cells[state.modifiedPosition].classList.add('modified');
        
        // Highlight user's selection if incorrect
        if (state.userSelectedPosition !== null && 
            state.userSelectedPosition !== state.modifiedPosition && 
            state.userSelectedModified) {
            cells[state.userSelectedPosition].classList.add('incorrect');
        }
    }
}

// Update the UI based on current phase
function updatePhaseUI() {
    // Update phase text
    switch(state.phase) {
        case 'memorize':
            elements.phaseText.textContent = `Memorize the pattern (Level ${state.level})`;
            elements.phaseText.className = 'phase-text memorize';
            elements.symbolGrid.style.opacity = '1';
            
            // Hide answer panel and position panel
            elements.answerPanel.classList.add('hidden');
            elements.positionPanel.classList.add('hidden');
            elements.resultMessage.classList.remove('visible');
            break;
        case 'blank':
            // Blank phase - grid is hidden temporarily
            elements.phaseText.textContent = 'Get Ready...';
            elements.phaseText.className = 'phase-text';
            elements.symbolGrid.style.opacity = '0';
            break;
        case 'recall':
            elements.phaseText.textContent = 'Was anything changed?';
            elements.phaseText.className = 'phase-text recall';
            elements.symbolGrid.style.opacity = '1';
            
            // Show answer panel
            elements.answerPanel.classList.remove('hidden');
            elements.positionPanel.classList.add('hidden');
            break;
        case 'feedback':
            // Show feedback
            elements.phaseText.textContent = 'Feedback';
            elements.phaseText.className = 'phase-text';
            
            // Hide answer panel, show result
            elements.answerPanel.classList.add('hidden');
            if (state.userSelectedModified && !state.wasModified) {
                elements.positionPanel.classList.add('hidden');
            }
            elements.resultMessage.classList.add('visible');
            break;
    }
    
    // Render the grid with current state
    renderGrid();
}

// Start the timer for the current phase
function startTimer() {
    // Clear any existing timers
    clearAllTimers();
    
    // Set the time based on phase and level
    let time = 0;
    if (state.phase === 'memorize') {
        // Calculate memory time based on:
        // 1. Base time (5000ms)
        // 2. Reduced for lower levels, increased for higher levels
        // 3. Adjusted for grid size (larger grid = more time)
        // For a 3x3 grid starting point, we need to adjust the formula
        let gridSizeFactor = state.gridSize / 3; // Normalize grid size based on 3x3 start
        time = state.memoryTime - (state.level * 200) + (gridSizeFactor * 700);
        time = Math.max(time, 2000) * state.difficultyFactor; // Minimum 2 seconds
        state.timeRemaining = Math.ceil(time / 1000);
    } else if (state.phase === 'blank') {
        time = state.blankTime;
        state.timeRemaining = Math.ceil(time / 1000);
    }
    
    elements.timeRemainingDisplay.textContent = state.timeRemaining;
    
    // Set up countdown display
    if (state.phase === 'memorize' || state.phase === 'blank') {
        // Update the display every second
        state.countdownId = setInterval(() => {
            state.timeRemaining--;
            elements.timeRemainingDisplay.textContent = state.timeRemaining;
            
            if (state.timeRemaining <= 0) {
                clearInterval(state.countdownId);
                state.countdownId = null;
            }
        }, 1000);
        
        // Set the main timer for phase transition
        state.timerId = setTimeout(() => {
            clearInterval(state.countdownId);
            state.countdownId = null;
            nextPhase();
        }, time);
    }
}

// Move to the next phase
function nextPhase() {
    switch(state.phase) {
        case 'memorize':
            state.phase = 'blank';
            break;
        case 'blank':
            state.phase = 'recall';
            break;
        case 'recall':
            state.phase = 'feedback';
            break;
        case 'feedback':
            // Move to the next level or end game
            if (state.level >= 10) { // End after 10 levels
                completeGame();
            } else {
                state.level++;
                
                // Adjust difficulty factor based on performance
                if (state.totalQuestions > 0) {
                    const accuracy = state.correctAnswers / state.totalQuestions;
                    if (accuracy > 0.8) {
                        // Increase difficulty for very accurate players
                        state.difficultyFactor = Math.max(0.7, state.difficultyFactor - 0.05);
                    } else if (accuracy < 0.3) {
                        // Decrease difficulty for struggling players
                        state.difficultyFactor = Math.min(1.3, state.difficultyFactor + 0.05);
                    }
                }
                
                startLevel();
                return; // Exit early to start new level
            }
            break;
    }
    
    // Update UI for the new phase
    updatePhaseUI();
    
    // Start timer for next phase if needed
    if (state.phase === 'memorize' || state.phase === 'blank') {
        startTimer();
    }
}

// Handle the Yes/No answer
function answerChanged(answer) {
    // Store user's answer
    state.userSelectedModified = answer;
    state.totalQuestions++;
    
    if (answer) {
        // User thinks a symbol was changed
        // Show the position panel
        elements.positionPanel.classList.remove('hidden');
    } else {
        // User thinks no symbol was changed
        checkAnswer();
    }
}

// Handle position selection
function selectPosition(position) {
    // Only respond to clicks in recall phase when position panel is visible
    if (state.phase !== 'recall' || elements.positionPanel.classList.contains('hidden')) {
        return;
    }
    
    // Store the selected position
    state.userSelectedPosition = position;
    
    // Update focus for keyboard navigation
    focusedCell = position;
    
    // Check the answer
    checkAnswer();
}

// Check if the user's answer is correct
function checkAnswer() {
    let isCorrect = false;
    
    if (!state.userSelectedModified && !state.wasModified) {
        // Correctly identified no change
        isCorrect = true;
        elements.resultMessage.textContent = 'Correct! There was no change.';
        elements.resultMessage.className = 'result-message correct';
    } else if (state.userSelectedModified && state.wasModified) {
        if (state.userSelectedPosition === state.modifiedPosition) {
            // Correctly identified the changed position
            isCorrect = true;
            elements.resultMessage.textContent = 'Correct! You found the changed symbol.';
            elements.resultMessage.className = 'result-message correct';
        } else {
            // Identified wrong position
            isCorrect = false;
            elements.resultMessage.textContent = 'Wrong position. The highlighted symbol was changed.';
            elements.resultMessage.className = 'result-message incorrect';
        }
    } else if (state.userSelectedModified && !state.wasModified) {
        // Incorrectly said there was a change
        isCorrect = false;
        elements.resultMessage.textContent = 'Incorrect. No symbols were changed.';
        elements.resultMessage.className = 'result-message incorrect';
    } else if (!state.userSelectedModified && state.wasModified) {
        // Missed a change
        isCorrect = false;
        elements.resultMessage.textContent = 'Incorrect. A symbol was changed (highlighted).';
        elements.resultMessage.className = 'result-message incorrect';
    }
    
    // Update score and statistics
    if (isCorrect) {
        // Base score based on level, with bonus for larger grid sizes
        const gridSizeBonus = state.gridSize - 4; // Bonus for larger grids
        const baseScore = 10 * state.level;
        const totalScore = baseScore + (gridSizeBonus * 2);
        
        state.score += totalScore;
        state.correctAnswers++;
    }
    
    // Update UI
    updateStats();
    
    // Move to feedback phase
    state.phase = 'feedback';
    updatePhaseUI();
    
    // Automatically proceed to next level after feedback period
    const feedbackTime = isCorrect ? 2000 : 3000; // Shorter time for correct answers
    state.timerId = setTimeout(() => {
        nextPhase();
    }, feedbackTime);
}

// Update level and score displays
function updateStats() {
    if (elements.levelDisplay) elements.levelDisplay.textContent = state.level;
    if (elements.scoreDisplay) elements.scoreDisplay.textContent = state.score;
}

// Complete the game
function completeGame() {
    showScreen('complete');

    // Save progress to localStorage
    if (typeof MetaMind !== 'undefined' && MetaMind.Progress) {
        const accuracy = state.totalQuestions > 0
            ? Math.round((state.correctAnswers / state.totalQuestions) * 100)
            : 0;
        MetaMind.Progress.saveSession('symbol_memory', {
            score: state.score,
            level: state.level,
            accuracy: accuracy,
            gridSize: state.gridSize
        });
        log('info', `Progress saved: score=${state.score}, level=${state.level}`);
    }
}

// Initialize the game when the DOM is loaded
document.addEventListener('DOMContentLoaded', init); 