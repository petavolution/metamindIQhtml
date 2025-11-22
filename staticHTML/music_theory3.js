/**
 * Music Theory Training Module - Version 3 (CSS Grid Piano Layout)
 * Interactive web version of the Music Theory module
 */

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

// DOM Elements
const screens = {
    start: document.getElementById('start-screen'),
    game: document.getElementById('game-screen'),
    feedback: document.getElementById('feedback-screen'),
    results: document.getElementById('results-screen')
};

const elements = {
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

// Buttons
const buttons = {
    start: document.getElementById('start-button'),
    play: document.getElementById('play-button'),
    submit: document.getElementById('submit-button'),
    next: document.getElementById('next-button'),
    restart: document.getElementById('restart-button'),
    togglePiano: document.getElementById('toggle-piano'),
    toggleWaveform: document.getElementById('toggle-waveform'),
    toggleCircle: document.getElementById('toggle-circle'),
    debug: document.getElementById('debug-toggle')
};

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
    // Fix visualization display issues
    fixVisualizationDisplay();
    
    // Set up button event listeners
    buttons.start.addEventListener('click', startGame);
    buttons.play.addEventListener('click', playCurrentChallenge);
    buttons.submit.addEventListener('click', submitAnswer);
    buttons.next.addEventListener('click', nextChallenge);
    buttons.restart.addEventListener('click', restartGame);
    
    // Set up visualization toggle buttons
    buttons.togglePiano.addEventListener('click', () => toggleVisualization('piano'));
    buttons.toggleWaveform.addEventListener('click', () => toggleVisualization('waveform'));
    buttons.toggleCircle.addEventListener('click', () => toggleVisualization('circle'));
    
    // Add debug toggle if available
    if (buttons.debug) {
        buttons.debug.addEventListener('click', toggleDebugMode);
    }
    
    // Initialize the piano keyboard with CSS Grid layout
    initGridPianoKeyboard();
    
    // Initialize the circle of fifths
    initCircleOfFifths();
    
    // Add window resize handler
    window.addEventListener('resize', handleResize);
}

// Fix visualization display issues
function fixVisualizationDisplay() {
    // Make sure visualization area has proper dimensions
    const visualizationArea = document.getElementById('visualization-area');
    if (visualizationArea) {
        // Force explicit size and display properties
        visualizationArea.style.display = 'block';
        visualizationArea.style.width = '100%';
        
        // Make sure visualization containers have proper dimensions and visibility
        const containers = [
            elements.pianoContainer,
            elements.waveformDisplay, 
            elements.circleOfFifths
        ];
        
        containers.forEach(container => {
            if (container) {
                // Ensure container is visible even if not currently active
                container.style.opacity = '1';
                
                // Make sure hidden class only affects display, not other properties
                if (container.classList.contains('hidden')) {
                    container.style.display = 'none';
                } else {
                    container.style.display = 'flex';
                }
            }
        });
        
        // Force active visualization to be visible
        if (buttons.togglePiano.classList.contains('active')) {
            elements.pianoContainer.style.display = 'flex';
            elements.waveformDisplay.style.display = 'none';
            elements.circleOfFifths.style.display = 'none';
        } else if (buttons.toggleWaveform.classList.contains('active')) {
            elements.pianoContainer.style.display = 'none';
            elements.waveformDisplay.style.display = 'flex';
            elements.circleOfFifths.style.display = 'none';
        } else if (buttons.toggleCircle.classList.contains('active')) {
            elements.pianoContainer.style.display = 'none';
            elements.waveformDisplay.style.display = 'none';
            elements.circleOfFifths.style.display = 'flex';
        } else {
            // Default to piano view if nothing is active
            buttons.togglePiano.classList.add('active');
            elements.pianoContainer.style.display = 'flex';
        }
        
        // Create or update waveform canvas if needed
        if (!elements.waveformDisplay.querySelector('canvas')) {
            const canvas = document.createElement('canvas');
            canvas.width = elements.waveformDisplay.clientWidth;
            canvas.height = elements.waveformDisplay.clientHeight;
            elements.waveformDisplay.appendChild(canvas);
        } else {
            const canvas = elements.waveformDisplay.querySelector('canvas');
            canvas.width = elements.waveformDisplay.clientWidth;
            canvas.height = elements.waveformDisplay.clientHeight;
        }
    }
}

// Initialize piano keyboard with CSS Grid layout - VERSION 3 IMPLEMENTATION
function initGridPianoKeyboard() {
    // Clear existing content
    elements.pianoContainer.innerHTML = '';
    
    // Create a wrapper for the keyboard with grid layout
    const keyboardWrapper = document.createElement('div');
    keyboardWrapper.className = 'piano-keyboard-wrapper';
    elements.pianoContainer.appendChild(keyboardWrapper);
    
    // Create white keys
    createWhiteKeys(keyboardWrapper);
    
    // Create black keys in a separate container that overlays the white keys
    const blackKeysContainer = document.createElement('div');
    blackKeysContainer.className = 'black-keys-container';
    keyboardWrapper.appendChild(blackKeysContainer);
    
    // Add black keys
    createBlackKeys(blackKeysContainer);
}

// Create white keys using grid layout
function createWhiteKeys(container) {
    // Define key layout
    const octaveStart = 4; // Start from middle C (C4)
    const numOctaves = 2;
    
    // White key positions in an octave (C, D, E, F, G, A, B)
    const whiteKeys = [0, 2, 4, 5, 7, 9, 11];
    
    // Create white keys with grid layout
    for (let octave = 0; octave < numOctaves; octave++) {
        for (let i = 0; i < whiteKeys.length; i++) {
            const note = 12 * (octaveStart + octave) + whiteKeys[i];
            const noteName = getMidiNoteName(note);
            
            const key = document.createElement('div');
            key.className = 'white-key';
            key.dataset.note = note;
            
            // Add note label
            const label = document.createElement('div');
            label.className = 'key-label';
            label.textContent = noteName.replace(/\d+$/, ''); // Remove octave number
            key.appendChild(label);
            
            // Add click event
            key.addEventListener('click', () => {
                playPianoKey(note);
            });
            
            container.appendChild(key);
        }
    }
}

// Create black keys that overlay the white keys
function createBlackKeys(container) {
    // Define key layout
    const octaveStart = 4; // Start from middle C (C4)
    const numOctaves = 2;
    
    // Black key positions in an octave (C#, D#, F#, G#, A#)
    const blackKeys = [1, 3, 6, 8, 10];
    
    // Create black keys with absolute positioning
    for (let octave = 0; octave < numOctaves; octave++) {
        for (let i = 0; i < blackKeys.length; i++) {
            const note = 12 * (octaveStart + octave) + blackKeys[i];
            const noteName = getMidiNoteName(note);
            
            const key = document.createElement('div');
            key.className = 'black-key';
            key.dataset.note = note;
            
            // Position based on which white key it's next to
            // This is now handled by CSS classes with grid-column positions
            
            // Add note label
            const label = document.createElement('div');
            label.className = 'key-label';
            label.textContent = noteName.replace(/\d+$/, ''); // Remove octave number
            key.appendChild(label);
            
            // Add click event
            key.addEventListener('click', () => {
                playPianoKey(note);
            });
            
            container.appendChild(key);
        }
    }
}

// Toggle debug mode to show grid layout
function toggleDebugMode() {
    document.body.classList.toggle('debug-grid');
}

// Handle window resize
function handleResize() {
    // Update visualizations on resize for responsive layout
    fixVisualizationDisplay();
    
    // Redraw any active visualizations
    if (buttons.toggleWaveform.classList.contains('active') && gameState.currentChallenge) {
        drawWaveform();
    }
    
    if (buttons.toggleCircle.classList.contains('active') && gameState.currentChallenge) {
        highlightCircleNotes();
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

// Web Audio API Function for note playing
function playNote(midiNote, startTime, duration) {
    if (!audioContext) {
        try {
            // Create audio context on user interaction
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            masterGainNode = audioContext.createGain();
            masterGainNode.connect(audioContext.destination);
        } catch (e) {
            console.error("Web Audio API is not supported in this browser", e);
            return;
        }
    }

    const noteFreq = 440 * Math.pow(2, (midiNote - 69) / 12);
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.type = 'sine';
    oscillator.frequency.value = noteFreq;
    
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(0.5, startTime + 0.01);
    gainNode.gain.linearRampToValueAtTime(0, startTime + duration);
    
    oscillator.connect(gainNode);
    gainNode.connect(masterGainNode);
    
    oscillator.start(startTime);
    oscillator.stop(startTime + duration);
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

// Game functions
function startGame() {
    screens.start.classList.remove('active');
    screens.game.classList.add('active');
    gameState.level = 1;
    gameState.score = 0;
    gameState.streak = 0;
    gameState.challengeCount = 0;
    updateStats();
    generateChallenge();
}

function updateStats() {
    elements.level.textContent = gameState.level;
    elements.score.textContent = gameState.score;
    elements.streak.textContent = gameState.streak;
}

function generateChallenge() {
    const difficulty = difficulties[gameState.level];
    const challengeType = difficulty.types[Math.floor(Math.random() * difficulty.types.length)];
    let elements = [];
    
    if (challengeType === 'scales') {
        elements = Object.keys(musicData.scales).filter(scale => 
            difficulty.elements.includes(scale));
    } else if (challengeType === 'intervals') {
        elements = Object.keys(musicData.intervals).filter(interval => 
            interval !== "Unison" && interval !== "Octave");
    } else if (challengeType === 'chords') {
        elements = Object.keys(musicData.chords);
    }
    
    const correctAnswer = elements[Math.floor(Math.random() * elements.length)];
    
    gameState.currentChallenge = {
        type: challengeType,
        name: correctAnswer,
        rootNote: 60 // Middle C
    };
    
    displayChallenge();
}

function displayChallenge() {
    // Update challenge message
    if (gameState.currentChallenge.type === 'scales') {
        elements.challengeMessage.textContent = 'Identify this scale:';
    } else if (gameState.currentChallenge.type === 'intervals') {
        elements.challengeMessage.textContent = 'Identify this interval:';
    } else if (gameState.currentChallenge.type === 'chords') {
        elements.challengeMessage.textContent = 'Identify this chord:';
    }
    
    // Generate options
    generateOptions();
    
    // Clear previous selections
    gameState.selectedOption = null;
    clearKeyHighlights();
    
    // Play the challenge
    playCurrentChallenge();
}

function generateOptions() {
    elements.optionsContainer.innerHTML = '';
    
    const difficulty = difficulties[gameState.level];
    let possibleOptions = [];
    
    if (gameState.currentChallenge.type === 'scales') {
        possibleOptions = Object.keys(musicData.scales).filter(scale => 
            difficulty.elements.includes(scale));
    } else if (gameState.currentChallenge.type === 'intervals') {
        possibleOptions = Object.keys(musicData.intervals).filter(interval => 
            interval !== "Unison" && interval !== "Octave");
    } else if (gameState.currentChallenge.type === 'chords') {
        possibleOptions = Object.keys(musicData.chords);
    }
    
    // Ensure correct answer is included
    let options = [gameState.currentChallenge.name];
    
    // Add random options until we reach the required number
    while (options.length < difficulty.options) {
        const randomOption = possibleOptions[Math.floor(Math.random() * possibleOptions.length)];
        if (!options.includes(randomOption)) {
            options.push(randomOption);
        }
    }
    
    // Shuffle the options
    options = shuffleArray(options);
    
    // Create option elements
    options.forEach(option => {
        const optionEl = document.createElement('div');
        optionEl.className = 'option';
        optionEl.textContent = option;
        optionEl.addEventListener('click', () => {
            // Deselect all options
            document.querySelectorAll('.option').forEach(el => {
                el.classList.remove('selected');
            });
            
            // Select this option
            optionEl.classList.add('selected');
            gameState.selectedOption = option;
        });
        
        elements.optionsContainer.appendChild(optionEl);
    });
}

function playCurrentChallenge() {
    if (!gameState.currentChallenge) return;
    
    // Initialize audio context if needed
    if (!audioContext) {
        try {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            masterGainNode = audioContext.createGain();
            masterGainNode.connect(audioContext.destination);
        } catch (e) {
            console.error("Web Audio API is not supported in this browser", e);
            return;
        }
    }
    
    const rootNote = gameState.currentChallenge.rootNote;
    
    if (gameState.currentChallenge.type === 'scales') {
        const scaleIntervals = musicData.scales[gameState.currentChallenge.name];
        // Play scale ascending
        scaleIntervals.forEach((interval, index) => {
            const note = rootNote + interval;
            playNote(note, audioContext.currentTime + index * 0.5, 0.4);
            
            // Highlight key
            setTimeout(() => {
                highlightKey(note);
                setTimeout(() => {
                    unhighlightKey(note);
                }, 400);
            }, index * 500);
        });
    } else if (gameState.currentChallenge.type === 'intervals') {
        const interval = musicData.intervals[gameState.currentChallenge.name];
        // Play root note, then interval
        playNote(rootNote, audioContext.currentTime, 0.4);
        playNote(rootNote + interval, audioContext.currentTime + 0.6, 0.4);
        
        // Highlight keys
        highlightKey(rootNote);
        setTimeout(() => {
            unhighlightKey(rootNote);
        }, 400);
        
        setTimeout(() => {
            highlightKey(rootNote + interval);
            setTimeout(() => {
                unhighlightKey(rootNote + interval);
            }, 400);
        }, 600);
    } else if (gameState.currentChallenge.type === 'chords') {
        const chordIntervals = musicData.chords[gameState.currentChallenge.name];
        // Play chord tones simultaneously
        chordIntervals.forEach(interval => {
            const note = rootNote + interval;
            playNote(note, audioContext.currentTime, 0.8);
            
            // Highlight keys
            highlightKey(note);
            setTimeout(() => {
                unhighlightKey(note);
            }, 800);
        });
    }
}

function submitAnswer() {
    if (!gameState.selectedOption) {
        alert('Please select an answer');
        return;
    }
    
    const isCorrect = gameState.selectedOption === gameState.currentChallenge.name;
    
    // Update stats
    if (isCorrect) {
        gameState.score += 10 * gameState.level;
        gameState.streak++;
        if (gameState.streak > gameState.bestStreak) {
            gameState.bestStreak = gameState.streak;
        }
    } else {
        gameState.streak = 0;
    }
    
    // Update category stats
    if (!gameState.categoryStats[gameState.currentChallenge.type]) {
        gameState.categoryStats[gameState.currentChallenge.type] = { correct: 0, total: 0 };
    }
    
    gameState.categoryStats[gameState.currentChallenge.type].total++;
    if (isCorrect) {
        gameState.categoryStats[gameState.currentChallenge.type].correct++;
    }
    
    // Show feedback
    showFeedback(isCorrect);
}

function showFeedback(isCorrect) {
    screens.game.classList.remove('active');
    screens.feedback.classList.add('active');
    
    if (isCorrect) {
        elements.feedbackMessage.textContent = 'Correct!';
        elements.feedbackMessage.className = 'feedback-message correct';
        elements.correctAnswer.textContent = '';
    } else {
        elements.feedbackMessage.textContent = 'Incorrect';
        elements.feedbackMessage.className = 'feedback-message incorrect';
        elements.correctAnswer.textContent = 
            `The correct answer was: ${gameState.currentChallenge.name}`;
    }
}

function nextChallenge() {
    screens.feedback.classList.remove('active');
    screens.game.classList.add('active');
    
    // Update challenge count
    gameState.challengeCount++;
    
    // Check if level should increase
    if (gameState.streak > 0 && gameState.streak % 3 === 0 && gameState.level < 5) {
        gameState.level++;
    }
    
    // Check if game is over
    if (gameState.challengeCount >= gameState.totalChallenges) {
        showResults();
        return;
    }
    
    // Update display
    updateStats();
    
    // Generate new challenge
    generateChallenge();
}

function showResults() {
    screens.game.classList.remove('active');
    screens.results.classList.add('active');
    
    elements.finalScore.textContent = gameState.score;
    elements.bestStreak.textContent = gameState.bestStreak;
    elements.maxLevel.textContent = gameState.level;
    
    // Display category stats
    elements.categoryStats.innerHTML = '';
    
    for (const [category, stats] of Object.entries(gameState.categoryStats)) {
        if (stats.total > 0) {
            const accuracy = Math.round((stats.correct / stats.total) * 100);
            
            const categoryEl = document.createElement('div');
            categoryEl.className = 'category-stat';
            
            const nameEl = document.createElement('div');
            nameEl.className = 'category-name';
            nameEl.textContent = category.charAt(0).toUpperCase() + category.slice(1);
            
            const accuracyEl = document.createElement('div');
            accuracyEl.textContent = `Accuracy: ${accuracy}%`;
            
            const countEl = document.createElement('div');
            countEl.textContent = `${stats.correct} / ${stats.total} correct`;
            
            categoryEl.appendChild(nameEl);
            categoryEl.appendChild(accuracyEl);
            categoryEl.appendChild(countEl);
            
            elements.categoryStats.appendChild(categoryEl);
        }
    }
}

function restartGame() {
    screens.results.classList.remove('active');
    screens.start.classList.add('active');
}

// Initialize when the document is loaded
document.addEventListener('DOMContentLoaded', init); 