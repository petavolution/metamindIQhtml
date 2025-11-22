// Expand Vision - JavaScript implementation

// Game state
const state = {
    currentScreen: 'start', // 'start', 'game', 'complete'
    phase: 'preparation', // 'preparation', 'active', 'completed'
    round: 0,
    totalRounds: 25,
    ovalWidth: 30,
    ovalHeight: 30,
    delay: 250, // ms
    range: 20, // Number range
    numbers: [0, 0, 0, 0],
    wordIndex: 0,
    centralContent: '',
    timerId: null,
    numberTimerId: null,
    timeRemaining: 0,
    // Positioning factors - these control how far the numbers are from center
    distanceFactorY: 0.1, // Initial Y distance (top/bottom)
    distanceFactorX: 0.1, // Initial X distance (left/right)
    distanceIncreaseFactor: 0.01 // How much to increase distance each round
};

// Word list for central display
const wordList = [
    "relaxing", "breathing", "focusing", "widening", 
    "brain", "energy", "power", "vision"
];

// DOM elements
const elements = {
    startScreen: document.getElementById('start-screen'),
    gameScreen: document.getElementById('game-screen'),
    completeScreen: document.getElementById('complete-screen'),
    startButton: document.getElementById('start-button'),
    restartButton: document.getElementById('restart-button'),
    oval: document.getElementById('focus-oval'),
    centralContent: document.getElementById('central-content'),
    focusPoint: document.getElementById('focus-point'),
    numberTop: document.getElementById('number-top'),
    numberRight: document.getElementById('number-right'),
    numberBottom: document.getElementById('number-bottom'),
    numberLeft: document.getElementById('number-left'),
    roundDisplay: document.getElementById('round'),
    totalRoundsDisplay: document.getElementById('total-rounds'),
    timeRemainingDisplay: document.getElementById('time-remaining'),
    sumPrompt: document.getElementById('sum-prompt'),
    sumResult: document.getElementById('sum-result'),
    sumValue: document.getElementById('sum-value'),
    completedRounds: document.getElementById('completed-rounds'),
    phaseText: document.getElementById('phase-text')
};

// Initialize the game
function init() {
    // Set up event listeners
    elements.startButton.addEventListener('click', startGame);
    elements.restartButton.addEventListener('click', startGame);
    
    // Add keyboard event listener
    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space' && state.currentScreen === 'game') {
            resetGame();
        }
    });
    
    // Show initial screen
    showScreen('start');
}

// Show the specified screen
function showScreen(screenName) {
    state.currentScreen = screenName;
    elements.startScreen.classList.add('hidden');
    elements.gameScreen.classList.add('hidden');
    elements.completeScreen.classList.add('hidden');
    
    switch(screenName) {
        case 'start':
            elements.startScreen.classList.remove('hidden');
            break;
        case 'game':
            elements.gameScreen.classList.remove('hidden');
            break;
        case 'complete':
            elements.completeScreen.classList.remove('hidden');
            elements.completedRounds.textContent = state.round;
            break;
    }
}

// Start the game
function startGame() {
    // Reset game state
    resetGame();
    
    // Move to game screen
    showScreen('game');
    
    // Start with preparation phase
    startPreparationPhase();
}

// Reset the game state
function resetGame() {
    // Clear any running timers
    if (state.timerId) clearTimeout(state.timerId);
    if (state.numberTimerId) clearTimeout(state.numberTimerId);
    
    // Reset state values
    state.phase = 'preparation';
    state.round = 0;
    state.ovalWidth = 30;
    state.ovalHeight = 30;
    state.delay = 250;
    state.distanceFactorY = 0.1;
    state.distanceFactorX = 0.1;
    
    // Reset UI
    updateUI();
    
    // Choose a random word
    state.wordIndex = Math.floor(Math.random() * wordList.length);
    state.centralContent = wordList[state.wordIndex];
    
    // Hide numbers and focus point
    hideNumbers();
    elements.focusPoint.classList.add('hidden');
    elements.sumPrompt.classList.remove('visible');
    elements.sumResult.classList.remove('visible');
    
    // Update the central content
    elements.centralContent.textContent = state.centralContent;
    
    // Update stats
    elements.roundDisplay.textContent = state.round;
    elements.totalRoundsDisplay.textContent = state.totalRounds;
    
    // Update phase text
    updatePhaseText();
}

// Start the preparation phase (meditative expanding circle)
function startPreparationPhase() {
    // Set phase to preparation
    state.phase = 'preparation';
    
    // Update phase text
    updatePhaseText();
    
    // Update UI for preparation
    updateUI();
    
    // Grow the oval for a few seconds as preparation
    state.ovalWidth += 5;
    state.ovalHeight += 5;
    
    // Continue growing or transition to active phase after a few cycles
    if (state.ovalWidth < 120) {
        // Continue preparation phase
        state.timerId = setTimeout(startPreparationPhase, 300);
    } else {
        // Transition to active phase (first round)
        startRound();
    }
}

// Start a new round (active phase with numbers)
function startRound() {
    // Increment round counter
    state.round++;
    
    // Update round display
    elements.roundDisplay.textContent = state.round;
    
    // Check if we've completed all rounds
    if (state.round > state.totalRounds) {
        state.phase = 'completed';
        showScreen('complete');
        return;
    }
    
    // Set to active phase
    state.phase = 'active';
    
    // Update phase text
    updatePhaseText();
    
    // Increase distance factors (numbers move further from center as rounds progress)
    state.distanceFactorX += state.distanceIncreaseFactor;
    state.distanceFactorY += state.distanceIncreaseFactor;
    
    // Generate new random numbers
    generateRandomNumbers();
    
    // Occasionally change the central word
    if (Math.random() < 0.2) { // 20% chance to change word
        state.wordIndex = (state.wordIndex + 1) % wordList.length;
        state.centralContent = wordList[state.wordIndex];
        elements.centralContent.textContent = state.centralContent;
    }
    
    // Show numbers and focus point
    showNumbers();
    elements.focusPoint.classList.remove('hidden');
    
    // Calculate delay for this round - starts longer, gets shorter as rounds progress
    // Starts at 6000ms, decreases by 200ms each round, minimum 2000ms
    state.delay = Math.max(6000 - (state.round - 1) * 200, 2000);
    
    // Update the time remaining
    state.timeRemaining = state.delay / 1000;
    elements.timeRemainingDisplay.textContent = state.timeRemaining;
    
    // Start countdown timer
    startCountdown();
    
    // Show sum prompt if it's every 5th round
    if (state.round % 5 === 0) {
        showSumPrompt();
    }
    
    // Update UI
    updateUI();
    
    // Schedule next round
    state.timerId = setTimeout(startPreparationPhase, state.delay);
}

// Update the UI based on current state
function updateUI() {
    // Update oval dimensions
    elements.oval.style.width = `${state.ovalWidth}px`;
    elements.oval.style.height = `${state.ovalHeight}px`;
    
    // Update phase-specific styles
    elements.oval.classList.remove('phase-preparation', 'phase-active');
    elements.oval.classList.add(`phase-${state.phase}`);
    
    // Update number positions based on current distance factors
    updateNumberPositions();
}

// Update the positions of the peripheral numbers
function updateNumberPositions() {
    // Calculate positions based on viewport size
    const container = document.querySelector('.vision-container');
    const containerWidth = container.offsetWidth;
    const containerHeight = container.offsetHeight;
    
    // Set positions based on current distance factors
    elements.numberTop.style.top = `${state.distanceFactorY * 100}%`;
    elements.numberBottom.style.bottom = `${state.distanceFactorY * 100}%`;
    elements.numberLeft.style.left = `${state.distanceFactorX * 100}%`;
    elements.numberRight.style.right = `${state.distanceFactorX * 100}%`;
}

// Update the phase text
function updatePhaseText() {
    if (elements.phaseText) {
        switch(state.phase) {
            case 'preparation':
                elements.phaseText.textContent = 'Focus on the center dot';
                break;
            case 'active':
                elements.phaseText.textContent = `Round ${state.round}: Calculate the numbers`;
                break;
            case 'completed':
                elements.phaseText.textContent = 'Training complete';
                break;
        }
    }
}

// Generate random numbers for peripheral vision
function generateRandomNumbers() {
    state.numbers = [];
    for (let i = 0; i < 4; i++) {
        // Generate a random number between -range/2 and range/2
        const num = Math.floor(Math.random() * state.range) - Math.floor(state.range / 2);
        state.numbers.push(num);
    }
    
    // Update number displays
    elements.numberTop.textContent = state.numbers[0];
    elements.numberRight.textContent = state.numbers[1];
    elements.numberBottom.textContent = state.numbers[2];
    elements.numberLeft.textContent = state.numbers[3];
}

// Show the peripheral numbers
function showNumbers() {
    elements.numberTop.classList.remove('hidden');
    elements.numberRight.classList.remove('hidden');
    elements.numberBottom.classList.remove('hidden');
    elements.numberLeft.classList.remove('hidden');
    
    // Add visible class with slight delay for animation
    setTimeout(() => {
        elements.numberTop.classList.add('visible');
        elements.numberRight.classList.add('visible');
        elements.numberBottom.classList.add('visible');
        elements.numberLeft.classList.add('visible');
    }, 50);
}

// Hide the peripheral numbers
function hideNumbers() {
    elements.numberTop.classList.remove('visible');
    elements.numberRight.classList.remove('visible');
    elements.numberBottom.classList.remove('visible');
    elements.numberLeft.classList.remove('visible');
    
    // Add hidden class with delay for animation
    setTimeout(() => {
        elements.numberTop.classList.add('hidden');
        elements.numberRight.classList.add('hidden');
        elements.numberBottom.classList.add('hidden');
        elements.numberLeft.classList.add('hidden');
    }, 300);
}

// Start the countdown timer
function startCountdown() {
    // Clear any existing timer
    if (state.numberTimerId) clearTimeout(state.numberTimerId);
    
    // Set up the countdown
    const updateTime = () => {
        state.timeRemaining--;
        if (state.timeRemaining >= 0) {
            elements.timeRemainingDisplay.textContent = state.timeRemaining;
            state.numberTimerId = setTimeout(updateTime, 1000);
        }
    };
    
    // Start the countdown
    state.numberTimerId = setTimeout(updateTime, 1000);
}

// Show the sum prompt
function showSumPrompt() {
    elements.sumPrompt.classList.add('visible');
    
    // Calculate the sum
    const sum = state.numbers.reduce((a, b) => a + b, 0);
    elements.sumValue.textContent = sum;
    
    // Show the result after 3 seconds
    setTimeout(() => {
        elements.sumResult.classList.add('visible');
    }, 3000);
    
    // Hide the prompt before the next round
    setTimeout(() => {
        elements.sumPrompt.classList.remove('visible');
        elements.sumResult.classList.remove('visible');
    }, state.delay - 1000);
}

// Initialize the game when the DOM is loaded
document.addEventListener('DOMContentLoaded', init); 