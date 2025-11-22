/**
 * Music Theory Training Module - Consolidated v2.0
 * Interactive web version of the Music Theory module
 * Features: Piano keyboard, Circle of Fifths, Waveform visualization
 */

// Module name for logging
const MODULE_NAME = 'MusicTheory';

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

// Game State
const gameState = {
    level: 1,
    score: 0,
    streak: 0,
    bestStreak: 0,
    challengeCount: 0,
    totalChallenges: 10,
    currentChallenge: null,
    selectedOption: null,
    categoryStats: {
        scales: { correct: 0, total: 0 },
        intervals: { correct: 0, total: 0 },
        chords: { correct: 0, total: 0 }
    }
};

// DOM Elements - populated in init() after DOM is ready
let screens = {};
let elements = {};
let buttons = {};

// Music Data
const musicData = {
    scales: {
        "Major": [0, 2, 4, 5, 7, 9, 11],
        "Minor": [0, 2, 3, 5, 7, 8, 10],
        "Pentatonic": [0, 2, 4, 7, 9],
        "Blues": [0, 3, 5, 6, 7, 10],
        "Whole Tone": [0, 2, 4, 6, 8, 10]
    },
    intervals: {
        "Unison": 0,
        "Minor Second": 1,
        "Major Second": 2,
        "Minor Third": 3,
        "Major Third": 4,
        "Perfect Fourth": 5,
        "Tritone": 6,
        "Perfect Fifth": 7,
        "Minor Sixth": 8,
        "Major Sixth": 9,
        "Minor Seventh": 10,
        "Major Seventh": 11,
        "Octave": 12
    },
    chords: {
        "Major": [0, 4, 7],
        "Minor": [0, 3, 7],
        "Diminished": [0, 3, 6],
        "Augmented": [0, 4, 8],
        "Suspended 4th": [0, 5, 7],
        "7th": [0, 4, 7, 10],
        "Major 7th": [0, 4, 7, 11]
    }
};

// Difficulty settings
const difficulties = {
    1: { options: 3, types: ["scales"], elements: ["Major", "Minor", "Pentatonic"] },
    2: { options: 4, types: ["scales", "intervals"], elements: ["Major", "Minor", "Pentatonic", "Blues"] },
    3: { options: 5, types: ["scales", "intervals", "chords"], elements: ["Major", "Minor", "Pentatonic", "Blues", "Whole Tone"] },
    4: { options: 6, types: ["scales", "intervals", "chords"], elements: Object.keys(musicData.scales) },
    5: { options: 8, types: ["scales", "intervals", "chords"], elements: Object.keys(musicData.scales) }
};

// Initialize the module
function init() {
    log('info', 'Initializing module');

    // Populate DOM elements after DOM is ready
    screens = {
        start: document.getElementById('start-screen'),
        game: document.getElementById('game-screen'),
        feedback: document.getElementById('feedback-screen'),
        results: document.getElementById('results-screen')
    };

    elements = {
        level: document.getElementById('level'),
        score: document.getElementById('score'),
        streak: document.getElementById('streak'),
        challengeMessage: document.getElementById('challenge-message'),
        pianoContainer: document.getElementById('piano-container'),
        waveformDisplay: document.getElementById('waveform-display'),
        circleOfFifths: document.getElementById('circle-of-fifths'),
        optionsContainer: document.getElementById('options-container'),
        feedbackMessage: document.getElementById('feedback-message'),
        correctAnswer: document.getElementById('correct-answer'),
        finalScore: document.getElementById('final-score'),
        bestStreak: document.getElementById('best-streak'),
        maxLevel: document.getElementById('max-level'),
        categoryStats: document.getElementById('category-stats')
    };

    buttons = {
        start: document.getElementById('start-button'),
        play: document.getElementById('play-button'),
        submit: document.getElementById('submit-button'),
        next: document.getElementById('next-button'),
        restart: document.getElementById('restart-button'),
        togglePiano: document.getElementById('toggle-piano'),
        toggleWaveform: document.getElementById('toggle-waveform'),
        toggleCircle: document.getElementById('toggle-circle')
    };

    // Validate required elements
    const requiredElements = ['start', 'game'];
    const missing = requiredElements.filter(name => !screens[name]);
    if (missing.length > 0) {
        log('error', `Missing required screen elements: ${missing.join(', ')}`);
        return;
    }

    // Fix visualization display issues
    fixVisualizationDisplay();

    // Set up button event listeners with safe attachment
    addClickListener(buttons.start, startGame, 'startButton');
    addClickListener(buttons.play, playCurrentChallenge, 'playButton');
    addClickListener(buttons.submit, submitAnswer, 'submitButton');
    addClickListener(buttons.next, nextChallenge, 'nextButton');
    addClickListener(buttons.restart, restartGame, 'restartButton');

    // Set up visualization toggle buttons
    addClickListener(buttons.togglePiano, () => toggleVisualization('piano'), 'togglePiano');
    addClickListener(buttons.toggleWaveform, () => toggleVisualization('waveform'), 'toggleWaveform');
    addClickListener(buttons.toggleCircle, () => toggleVisualization('circle'), 'toggleCircle');

    // Initialize the piano keyboard
    try {
        initPianoKeyboard();
    } catch (err) {
        log('error', `Failed to initialize piano keyboard: ${err.message}`, err);
    }

    // Initialize the circle of fifths
    try {
        initCircleOfFifths();
    } catch (err) {
        log('error', `Failed to initialize circle of fifths: ${err.message}`, err);
    }

    // Add window resize handler
    window.addEventListener('resize', fixVisualizationDisplay);

    log('info', 'Module initialized successfully');
}

// Fix visualization display issues
function fixVisualizationDisplay() {
    // Make sure visualization area has proper dimensions
    const visualizationArea = document.getElementById('visualization-area');
    if (!visualizationArea) return;

    // Set explicit display property
    visualizationArea.style.display = 'block';

    // Make sure visualization containers have proper dimensions and visibility
    const containers = [
        elements.pianoContainer,
        elements.waveformDisplay,
        elements.circleOfFifths
    ].filter(c => c); // Filter out null elements

    containers.forEach(container => {
        // Ensure container is visible even if not currently active
        container.style.opacity = '1';

        // Make sure hidden class only affects display, not other properties
        if (container.classList.contains('hidden')) {
            container.style.display = 'none';
        } else {
            container.style.display = 'flex';
        }
    });

    // Force active visualization to be visible (with null checks)
    const pianoActive = buttons.togglePiano && buttons.togglePiano.classList.contains('active');
    const waveformActive = buttons.toggleWaveform && buttons.toggleWaveform.classList.contains('active');
    const circleActive = buttons.toggleCircle && buttons.toggleCircle.classList.contains('active');

    if (pianoActive) {
        if (elements.pianoContainer) elements.pianoContainer.style.display = 'flex';
        if (elements.waveformDisplay) elements.waveformDisplay.style.display = 'none';
        if (elements.circleOfFifths) elements.circleOfFifths.style.display = 'none';
    } else if (waveformActive) {
        if (elements.pianoContainer) elements.pianoContainer.style.display = 'none';
        if (elements.waveformDisplay) elements.waveformDisplay.style.display = 'flex';
        if (elements.circleOfFifths) elements.circleOfFifths.style.display = 'none';
    } else if (circleActive) {
        if (elements.pianoContainer) elements.pianoContainer.style.display = 'none';
        if (elements.waveformDisplay) elements.waveformDisplay.style.display = 'none';
        if (elements.circleOfFifths) elements.circleOfFifths.style.display = 'flex';
    } else {
        // Default to piano view if nothing is active
        if (buttons.togglePiano) buttons.togglePiano.classList.add('active');
        if (elements.pianoContainer) elements.pianoContainer.style.display = 'flex';
    }

    // Create or update waveform canvas if needed
    if (elements.waveformDisplay) {
        if (!elements.waveformDisplay.querySelector('canvas')) {
            const canvas = document.createElement('canvas');
            canvas.width = elements.waveformDisplay.clientWidth || 300;
            canvas.height = elements.waveformDisplay.clientHeight || 150;
            elements.waveformDisplay.appendChild(canvas);
        } else {
            const canvas = elements.waveformDisplay.querySelector('canvas');
            canvas.width = elements.waveformDisplay.clientWidth || 300;
            canvas.height = elements.waveformDisplay.clientHeight || 150;
        }
    }
}

// Start the game
function startGame() {
    log('info', 'Starting game');

    // Initialize audio context
    if (!audioContext) {
        try {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            masterGainNode = audioContext.createGain();
            masterGainNode.gain.value = 0.3; // Default volume
            masterGainNode.connect(audioContext.destination);
            log('info', 'Audio context initialized');
        } catch (e) {
            log('error', 'Web Audio API is not supported in this browser', e);
            alert('Your browser does not support the Web Audio API. Some features may not work properly.');
        }
    }

    // Reset game state
    gameState.level = 1;
    gameState.score = 0;
    gameState.streak = 0;
    gameState.bestStreak = 0;
    gameState.challengeCount = 0;
    gameState.selectedOption = null;

    // Reset category stats
    Object.keys(gameState.categoryStats).forEach(category => {
        gameState.categoryStats[category] = { correct: 0, total: 0 };
    });

    // Update UI safely
    if (elements.level) elements.level.textContent = gameState.level;
    if (elements.score) elements.score.textContent = gameState.score;
    if (elements.streak) elements.streak.textContent = gameState.streak;

    // Switch to game screen
    switchScreen('game');

    // Generate first challenge
    try {
        generateChallenge();
    } catch (err) {
        log('error', `Failed to generate challenge: ${err.message}`, err);
    }

    // Fix visualization display
    fixVisualizationDisplay();
}

// Generate a new challenge
function generateChallenge() {
    const difficulty = difficulties[Math.min(gameState.level, 5)];
    
    // Select challenge type
    const challengeType = difficulty.types[Math.floor(Math.random() * difficulty.types.length)];
    
    // Select available elements based on difficulty
    const availableElements = difficulty.elements;
    
    // Reset selected option
    gameState.selectedOption = null;
    
    if (challengeType === 'scales') {
        generateScaleChallenge(availableElements);
    } else if (challengeType === 'intervals') {
        generateIntervalChallenge(availableElements);
    } else if (challengeType === 'chords') {
        generateChordChallenge(availableElements);
    }
    
    // Update challenge count
    gameState.challengeCount++;
    
    // Update challenge message
    updateChallengeMessage();
    
    // Generate options
    generateOptions(difficulty.options);
    
    // Clear any active highlights
    clearKeyHighlights();
}

// Generate a scale challenge
function generateScaleChallenge(availableElements) {
    // Filter scales to only include those in availableElements
    const availableScales = Object.keys(musicData.scales).filter(scale => availableElements.includes(scale));
    
    // Select a random scale
    const scaleName = availableScales[Math.floor(Math.random() * availableScales.length)];
    const scale = musicData.scales[scaleName];
    
    // Generate a root note (in MIDI numbers, C4 = 60)
    const rootNote = 60 + Math.floor(Math.random() * 12); // Random root between C4 and B4
    
    // Generate a melodic pattern from the scale
    const fullScale = scale.map(note => rootNote + note);
    
    gameState.currentChallenge = {
        type: 'scales',
        name: scaleName,
        rootNote: rootNote,
        notes: fullScale,
        correctAnswer: scaleName
    };
    
    // Update category stats
    gameState.categoryStats.scales.total++;
}

// Generate an interval challenge
function generateIntervalChallenge(availableElements) {
    // Select an interval
    const intervalNames = Object.keys(musicData.intervals);
    const intervalName = intervalNames[Math.floor(Math.random() * intervalNames.length)];
    const intervalValue = musicData.intervals[intervalName];
    
    // Generate a root note
    const rootNote = 60 + Math.floor(Math.random() * 12); // Random root between C4 and B4
    
    // Generate the interval notes
    const intervalNotes = [rootNote, rootNote + intervalValue];
    
    gameState.currentChallenge = {
        type: 'intervals',
        name: intervalName,
        rootNote: rootNote,
        notes: intervalNotes,
        correctAnswer: intervalName
    };
    
    // Update category stats
    gameState.categoryStats.intervals.total++;
}

// Generate a chord challenge
function generateChordChallenge(availableElements) {
    // Filter chords if needed (based on availableElements)
    const availableChords = Object.keys(musicData.chords);
    
    // Select a random chord
    const chordName = availableChords[Math.floor(Math.random() * availableChords.length)];
    const chord = musicData.chords[chordName];
    
    // Generate a root note
    const rootNote = 60 + Math.floor(Math.random() * 12); // Random root between C4 and B4
    
    // Generate the chord notes
    const chordNotes = chord.map(note => rootNote + note);
    
    gameState.currentChallenge = {
        type: 'chords',
        name: chordName,
        rootNote: rootNote,
        notes: chordNotes,
        correctAnswer: chordName
    };
    
    // Update category stats
    gameState.categoryStats.chords.total++;
}

// Generate options for the challenge
function generateOptions(numOptions) {
    const challenge = gameState.currentChallenge;
    let options = [];
    
    // Add the correct answer
    options.push(challenge.correctAnswer);
    
    // Add incorrect options
    let potentialOptions = [];
    if (challenge.type === 'scales') {
        potentialOptions = Object.keys(musicData.scales).filter(scale => scale !== challenge.correctAnswer);
    } else if (challenge.type === 'intervals') {
        potentialOptions = Object.keys(musicData.intervals).filter(interval => interval !== challenge.correctAnswer);
    } else if (challenge.type === 'chords') {
        potentialOptions = Object.keys(musicData.chords).filter(chord => chord !== challenge.correctAnswer);
    }
    
    // Shuffle and select additional options
    potentialOptions = shuffleArray(potentialOptions);
    while (options.length < numOptions && potentialOptions.length > 0) {
        options.push(potentialOptions.pop());
    }
    
    // Shuffle the final options
    options = shuffleArray(options);
    
    // Update the options container
    updateOptionsUI(options);
}

// Update the options UI
function updateOptionsUI(options) {
    // Clear existing options
    elements.optionsContainer.innerHTML = '';
    
    // Create option buttons
    options.forEach(option => {
        const optionButton = document.createElement('div');
        optionButton.className = 'option-button';
        optionButton.textContent = option;
        optionButton.dataset.option = option;
        
        // Add click event listener
        optionButton.addEventListener('click', () => {
            // Deselect any previously selected option
            document.querySelectorAll('.option-button.selected').forEach(el => {
                el.classList.remove('selected');
            });
            
            // Select this option
            optionButton.classList.add('selected');
            gameState.selectedOption = option;
        });
        
        elements.optionsContainer.appendChild(optionButton);
    });
}

// Update the challenge message
function updateChallengeMessage() {
    const challenge = gameState.currentChallenge;
    let message = '';
    
    if (challenge.type === 'scales') {
        message = 'Listen and identify the scale';
    } else if (challenge.type === 'intervals') {
        message = 'Listen and identify the interval';
    } else if (challenge.type === 'chords') {
        message = 'Listen and identify the chord';
    }
    
    elements.challengeMessage.textContent = message;
}

// Play the current challenge
function playCurrentChallenge() {
    if (!gameState.currentChallenge || !audioContext) return;
    
    const challenge = gameState.currentChallenge;
    const notes = challenge.notes;
    
    // Clear any existing highlights
    clearKeyHighlights();
    
    // Play each note in sequence (for scales) or simultaneously (for chords)
    if (challenge.type === 'scales') {
        playSequence(notes, 0.3);
    } else if (challenge.type === 'intervals') {
        // For intervals, play notes in sequence but closer together
        playSequence(notes, 0.15);
    } else if (challenge.type === 'chords') {
        // For chords, play notes simultaneously
        playChord(notes);
    }
}

// Play a sequence of notes
function playSequence(notes, noteDuration = 0.3) {
    const now = audioContext.currentTime;
    
    notes.forEach((note, index) => {
        // Calculate start time for this note
        const startTime = now + (index * noteDuration);
        
        // Play the note
        playNote(note, startTime, noteDuration);
        
        // Schedule UI update for key highlighting
        setTimeout(() => {
            highlightKey(note);
            
            // Remove highlight after duration
            setTimeout(() => {
                unhighlightKey(note);
            }, noteDuration * 900); // Slightly shorter than note duration
            
        }, startTime * 1000);
    });
}

// Play a chord (notes simultaneously)
function playChord(notes) {
    const now = audioContext.currentTime;
    
    // Play all notes simultaneously
    notes.forEach(note => {
        playNote(note, now, 1.0);
        highlightKey(note);
    });
    
    // Remove highlights after duration
    setTimeout(() => {
        notes.forEach(note => {
            unhighlightKey(note);
        });
    }, 1000);
}

// Play a single note
function playNote(midiNote, startTime, duration) {
    if (!audioContext) return;
    
    // Create oscillator
    const oscillator = audioContext.createOscillator();
    oscillator.type = 'sine';
    
    // Calculate frequency from MIDI note number (A4 = 69 = 440Hz)
    const frequency = 440 * Math.pow(2, (midiNote - 69) / 12);
    oscillator.frequency.value = frequency;
    
    // Create gain node for envelope
    const gainNode = audioContext.createGain();
    
    // Connect nodes
    oscillator.connect(gainNode);
    gainNode.connect(masterGainNode);
    
    // Set up envelope
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(0.7, startTime + 0.02); // Attack
    gainNode.gain.linearRampToValueAtTime(0.5, startTime + 0.1); // Decay
    gainNode.gain.setValueAtTime(0.5, startTime + duration - 0.1); // Sustain
    gainNode.gain.linearRampToValueAtTime(0, startTime + duration); // Release
    
    // Schedule oscillator
    oscillator.start(startTime);
    oscillator.stop(startTime + duration);
}

// Submit answer
function submitAnswer() {
    if (!gameState.selectedOption) {
        alert('Please select an option first');
        return;
    }
    
    const challenge = gameState.currentChallenge;
    const isCorrect = gameState.selectedOption === challenge.correctAnswer;
    
    // Update score and streak
    if (isCorrect) {
        gameState.score += 10 * gameState.level;
        gameState.streak++;
        gameState.bestStreak = Math.max(gameState.bestStreak, gameState.streak);
        
        // Update category stats
        gameState.categoryStats[challenge.type].correct++;
        
        // Level up if needed
        if (gameState.streak >= 3 && gameState.level < 5) {
            gameState.level++;
            elements.level.textContent = gameState.level;
        }
    } else {
        gameState.streak = 0;
    }
    
    // Update UI
    elements.score.textContent = gameState.score;
    elements.streak.textContent = gameState.streak;
    
    // Show feedback
    showFeedback(isCorrect);
}

// Show feedback
function showFeedback(isCorrect) {
    const challenge = gameState.currentChallenge;
    
    // Set feedback message
    elements.feedbackMessage.textContent = isCorrect ? 'Correct!' : 'Incorrect!';
    elements.feedbackMessage.className = isCorrect ? 'feedback-correct' : 'feedback-incorrect';
    
    // Set correct answer
    elements.correctAnswer.textContent = `The correct answer was: ${challenge.correctAnswer}`;
    
    // Switch to feedback screen
    switchScreen('feedback');
    
    // Play feedback sound
    if (audioContext) {
        if (isCorrect) {
            playCorrectSound();
        } else {
            playIncorrectSound();
        }
    }
}

// Play correct answer sound
function playCorrectSound() {
    const now = audioContext.currentTime;
    
    // Play a major chord arpeggio
    const notes = [60, 64, 67, 72]; // C major chord (C E G C)
    notes.forEach((note, index) => {
        playNote(note, now + index * 0.1, 0.3);
    });
}

// Play incorrect answer sound
function playIncorrectSound() {
    const now = audioContext.currentTime;
    
    // Play a dissonant interval
    playNote(60, now, 0.3); // C
    playNote(61, now, 0.3); // C#
}

// Go to next challenge
function nextChallenge() {
    // Check if we've reached the end of the game
    if (gameState.challengeCount >= gameState.totalChallenges) {
        showResults();
        return;
    }
    
    // Switch back to game screen
    switchScreen('game');
    
    // Generate new challenge
    generateChallenge();
}

// Show final results
function showResults() {
    // Set final stats
    elements.finalScore.textContent = gameState.score;
    elements.bestStreak.textContent = gameState.bestStreak;
    elements.maxLevel.textContent = gameState.level;
    
    // Generate category stats
    elements.categoryStats.innerHTML = '';
    
    for (const [category, stats] of Object.entries(gameState.categoryStats)) {
        if (stats.total === 0) continue;
        
        const accuracy = Math.round((stats.correct / stats.total) * 100);
        
        const categoryElement = document.createElement('div');
        categoryElement.className = 'category-stat';
        categoryElement.innerHTML = `
            <div class="category-name">${category.charAt(0).toUpperCase() + category.slice(1)}</div>
            <div>Accuracy: ${accuracy}% (${stats.correct}/${stats.total})</div>
            <div class="accuracy-bar">
                <div class="accuracy-fill" style="width: ${accuracy}%"></div>
            </div>
        `;
        
        elements.categoryStats.appendChild(categoryElement);
    }
    
    // Switch to results screen
    switchScreen('results');

    // Save progress to localStorage
    if (typeof MetaMind !== 'undefined' && MetaMind.Progress) {
        const totalQuestions = Object.values(gameState.categoryStats).reduce((sum, s) => sum + s.total, 0);
        const correctAnswers = Object.values(gameState.categoryStats).reduce((sum, s) => sum + s.correct, 0);
        MetaMind.Progress.saveSession('music_theory', {
            score: gameState.score,
            level: gameState.level,
            accuracy: totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0,
            bestStreak: gameState.bestStreak
        });
        log('info', `Progress saved: score=${gameState.score}, level=${gameState.level}`);
    }
}

// Restart the game
function restartGame() {
    switchScreen('start');
}

// Switch between screens
function switchScreen(screenName) {
    // Hide all screens
    for (const screen in screens) {
        screens[screen].classList.add('hidden');
    }
    
    // Show the requested screen
    screens[screenName].classList.remove('hidden');
}

// Initialize piano keyboard
function initPianoKeyboard() {
    // Clear existing content
    elements.pianoContainer.innerHTML = '';
    
    // Define key layout
    const octaveStart = 4; // Start from middle C (C4)
    const numOctaves = 2;
    
    // White key positions in an octave (C, D, E, F, G, A, B)
    const whiteKeys = [0, 2, 4, 5, 7, 9, 11];
    // Black key positions in an octave (C#, D#, F#, G#, A#)
    const blackKeys = [1, 3, 6, 8, 10];
    
    // Get keyboard width
    const keyboardWidth = elements.pianoContainer.clientWidth;
    const whiteKeyWidth = Math.min(40, keyboardWidth / (7 * numOctaves));
    const blackKeyWidth = whiteKeyWidth * 0.6;
    
    // Create white keys
    for (let octave = 0; octave < numOctaves; octave++) {
        for (let i = 0; i < whiteKeys.length; i++) {
            const note = 12 * (octaveStart + octave) + whiteKeys[i];
            const noteName = getMidiNoteName(note);
            
            const key = document.createElement('div');
            key.className = 'piano-key white-key';
            key.dataset.note = note;
            key.style.width = `${whiteKeyWidth}px`;
            key.style.left = `${(octave * 7 + i) * whiteKeyWidth}px`;
            
            // Add note label
            const label = document.createElement('div');
            label.className = 'key-label';
            label.textContent = noteName.replace(/\d+$/, ''); // Remove octave number
            key.appendChild(label);
            
            // Add click event
            key.addEventListener('click', () => {
                playPianoKey(note);
            });
            
            elements.pianoContainer.appendChild(key);
        }
    }
    
    // Create black keys
    for (let octave = 0; octave < numOctaves; octave++) {
        for (let i = 0; i < blackKeys.length; i++) {
            const note = 12 * (octaveStart + octave) + blackKeys[i];
            const noteName = getMidiNoteName(note);
            
            // Calculate x position based on corresponding white key
            const prevWhiteKeyIndex = Math.floor(blackKeys[i] / 2);
            const xPos = (octave * 7 + prevWhiteKeyIndex) * whiteKeyWidth + whiteKeyWidth * 0.7;
            
            const key = document.createElement('div');
            key.className = 'piano-key black-key';
            key.dataset.note = note;
            key.style.width = `${blackKeyWidth}px`;
            key.style.left = `${xPos}px`;
            
            // Add note label
            const label = document.createElement('div');
            label.className = 'key-label';
            label.textContent = noteName.replace(/\d+$/, ''); // Remove octave number
            key.appendChild(label);
            
            // Add click event
            key.addEventListener('click', () => {
                playPianoKey(note);
            });
            
            elements.pianoContainer.appendChild(key);
        }
    }
}

// Play a piano key
function playPianoKey(midiNote) {
    // Play the note
    if (audioContext) {
        playNote(midiNote, audioContext.currentTime, 0.5);
    }
    
    // Highlight the key
    highlightKey(midiNote);
    
    // Remove highlight after a delay
    setTimeout(() => {
        unhighlightKey(midiNote);
    }, 500);
}

// Highlight a piano key
function highlightKey(midiNote) {
    const keyElement = document.querySelector(`.piano-key[data-note="${midiNote}"]`);
    if (keyElement) {
        keyElement.classList.add('key-active');
    }
}

// Unhighlight a piano key
function unhighlightKey(midiNote) {
    const keyElement = document.querySelector(`.piano-key[data-note="${midiNote}"]`);
    if (keyElement) {
        keyElement.classList.remove('key-active');
    }
}

// Clear all key highlights
function clearKeyHighlights() {
    document.querySelectorAll('.piano-key').forEach(key => {
        key.classList.remove('key-active');
        key.classList.remove('key-highlight');
    });
}

// Initialize circle of fifths
function initCircleOfFifths() {
    // Clear existing content
    elements.circleOfFifths.innerHTML = '';
    
    // Create circle container
    const circleContainer = document.createElement('div');
    circleContainer.className = 'circle-container';
    
    // Define notes in circle of fifths
    const notes = ["C", "G", "D", "A", "E", "B", "F#", "Db", "Ab", "Eb", "Bb", "F"];
    
    // Add notes to circle
    notes.forEach((note, index) => {
        const angle = (index * 30) * Math.PI / 180;
        const radius = 70; // Distance from center
        
        // Calculate position
        const x = Math.cos(angle - Math.PI/2) * radius + 90;
        const y = Math.sin(angle - Math.PI/2) * radius + 90;
        
        // Create note element
        const noteElement = document.createElement('div');
        noteElement.className = 'note-position';
        noteElement.textContent = note;
        noteElement.dataset.note = note;
        noteElement.style.left = `${x}px`;
        noteElement.style.top = `${y}px`;
        
        circleContainer.appendChild(noteElement);
    });
    
    elements.circleOfFifths.appendChild(circleContainer);
}

// Toggle between visualization modes
function toggleVisualization(mode) {
    // Update button states
    buttons.togglePiano.classList.toggle('active', mode === 'piano');
    buttons.toggleWaveform.classList.toggle('active', mode === 'waveform');
    buttons.toggleCircle.classList.toggle('active', mode === 'circle');
    
    // First, remove hidden class from all visualizations
    elements.pianoContainer.classList.remove('hidden');
    elements.waveformDisplay.classList.remove('hidden');
    elements.circleOfFifths.classList.remove('hidden');
    
    // Hide all visualizations with inline styles
    elements.pianoContainer.style.display = 'none';
    elements.waveformDisplay.style.display = 'none';
    elements.circleOfFifths.style.display = 'none';
    
    // Show only the selected visualization
    if (mode === 'piano') {
        elements.pianoContainer.style.display = 'flex';
    } else if (mode === 'waveform') {
        elements.waveformDisplay.style.display = 'flex';
        
        // Create waveform visualization if needed
        if (gameState.currentChallenge) {
            drawWaveform();
        }
    } else if (mode === 'circle') {
        elements.circleOfFifths.style.display = 'flex';
        
        // Highlight relevant notes in circle if there's a current challenge
        if (gameState.currentChallenge) {
            highlightCircleNotes();
        }
    }
    
    // Fix any lingering display issues
    setTimeout(fixVisualizationDisplay, 50);
}

// Draw waveform visualization
function drawWaveform() {
    const canvas = elements.waveformDisplay.querySelector('canvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Create background
    ctx.fillStyle = 'rgba(0, 20, 40, 0.3)';
    ctx.fillRect(0, 0, width, height);
    
    // Only draw waveform if there's a current challenge
    if (!gameState.currentChallenge) return;
    
    // Generate simple sine wave visualization
    ctx.beginPath();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#0078ff';
    
    const centerY = height / 2;
    const amplitude = height / 3;
    const frequency = 0.02;
    
    // Draw different waveform based on challenge type
    if (gameState.currentChallenge.type === 'scales') {
        // Draw scale pattern (ascending wave)
        for (let x = 0; x < width; x++) {
            const y = centerY - Math.sin(x * frequency) * amplitude * (x / width);
            if (x === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
    } else if (gameState.currentChallenge.type === 'intervals') {
        // Draw interval pattern (two main peaks)
        for (let x = 0; x < width; x++) {
            const y = centerY - Math.sin(x * frequency * 2) * amplitude;
            if (x === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
    } else if (gameState.currentChallenge.type === 'chords') {
        // Draw chord pattern (multiple frequencies)
        for (let x = 0; x < width; x++) {
            const y = centerY - 
                    (Math.sin(x * frequency) + 
                     Math.sin(x * frequency * 1.25) + 
                     Math.sin(x * frequency * 1.5)) * amplitude / 3;
            if (x === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
    }
    
    ctx.stroke();
}

// Highlight notes in circle of fifths
function highlightCircleNotes() {
    // Remove all highlights
    document.querySelectorAll('.note-position').forEach(note => {
        note.classList.remove('note-highlight');
    });
    
    // Only highlight if there's a current challenge
    if (!gameState.currentChallenge) return;
    
    // Get notes to highlight based on challenge type
    let notes = [];
    const rootNote = 'C'; // Default root note
    
    if (gameState.currentChallenge.type === 'scales') {
        const scaleName = gameState.currentChallenge.name;
        const scale = musicData.scales[scaleName];
        
        // For scales, highlight the notes in the scale
        notes = scale.map(interval => {
            const noteIndex = (0 + interval) % 12;
            return ["C", "G", "D", "A", "E", "B", "F#", "Db", "Ab", "Eb", "Bb", "F"][noteIndex];
        });
    } else if (gameState.currentChallenge.type === 'intervals') {
        const intervalName = gameState.currentChallenge.name;
        const interval = musicData.intervals[intervalName];
        
        // For intervals, highlight the root and interval
        const intervalNoteIndex = interval % 12;
        const intervalNote = ["C", "G", "D", "A", "E", "B", "F#", "Db", "Ab", "Eb", "Bb", "F"][intervalNoteIndex];
        notes = [rootNote, intervalNote];
    } else if (gameState.currentChallenge.type === 'chords') {
        const chordName = gameState.currentChallenge.name;
        const chord = musicData.chords[chordName];
        
        // For chords, highlight the chord tones
        notes = chord.map(interval => {
            const noteIndex = (0 + interval) % 12;
            return ["C", "G", "D", "A", "E", "B", "F#", "Db", "Ab", "Eb", "Bb", "F"][noteIndex];
        });
    }
    
    // Apply highlights
    notes.forEach(note => {
        const noteElement = document.querySelector(`.note-position[data-note="${note}"]`);
        if (noteElement) {
            noteElement.classList.add('note-highlight');
        }
    });
}

// Get note name from MIDI note number
function getMidiNoteName(midiNote) {
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const noteName = noteNames[midiNote % 12];
    const octave = Math.floor(midiNote / 12) - 1;
    return `${noteName}${octave}`;
}

// Shuffle an array (Fisher-Yates algorithm)
function shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

// Initialize when the document is loaded
document.addEventListener('DOMContentLoaded', init); 