/**
 * Music Theory Training Module - Version 2 (Percentage-based Piano)
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
    toggleCircle: document.getElementById('toggle-circle')
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
    
    // Initialize the piano keyboard with percentage-based layout
    initPercentagePianoKeyboard();
    
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
        visualizationArea.style.minHeight = '180px';
        
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

// Initialize piano keyboard with percentage-based layout - VERSION 2 IMPLEMENTATION
function initPercentagePianoKeyboard() {
    // Clear existing content
    elements.pianoContainer.innerHTML = '';
    
    // Create a wrapper for the keyboard with percentage width
    const keyboardWrapper = document.createElement('div');
    keyboardWrapper.className = 'piano-keyboard-wrapper dynamic-piano-keyboard';
    elements.pianoContainer.appendChild(keyboardWrapper);
    
    // Define key layout
    const octaveStart = 4; // Start from middle C (C4)
    const numOctaves = 2;
    
    // White key positions in an octave (C, D, E, F, G, A, B)
    const whiteKeys = [0, 2, 4, 5, 7, 9, 11];
    // Black key positions in an octave (C#, D#, F#, G#, A#)
    const blackKeys = [1, 3, 6, 8, 10];
    
    // Total number of white keys across all octaves
    const totalWhiteKeys = whiteKeys.length * numOctaves;
    
    // Create white keys with percentage-based sizing
    for (let octave = 0; octave < numOctaves; octave++) {
        for (let i = 0; i < whiteKeys.length; i++) {
            const note = 12 * (octaveStart + octave) + whiteKeys[i];
            const noteName = getMidiNoteName(note);
            
            const key = document.createElement('div');
            key.className = 'piano-key white-key';
            key.dataset.note = note;
            
            // Position using percentages
            const keyIndex = octave * whiteKeys.length + i;
            const leftPosition = (keyIndex / totalWhiteKeys) * 100;
            
            // No need to set width - it's handled in CSS with calc(100% / 14)
            // No need to set left - it's handled in CSS with nth-child selectors
            
            // Add note label
            const label = document.createElement('div');
            label.className = 'key-label';
            label.textContent = noteName.replace(/\d+$/, ''); // Remove octave number
            key.appendChild(label);
            
            // Add click event
            key.addEventListener('click', () => {
                playPianoKey(note);
            });
            
            keyboardWrapper.appendChild(key);
        }
    }
    
    // Create black keys with percentage-based sizing
    for (let octave = 0; octave < numOctaves; octave++) {
        for (let i = 0; i < blackKeys.length; i++) {
            const note = 12 * (octaveStart + octave) + blackKeys[i];
            const noteName = getMidiNoteName(note);
            
            const key = document.createElement('div');
            key.className = 'piano-key black-key';
            key.dataset.note = note;
            
            // Position is handled by CSS nth-child selectors in the CSS file
            
            // Add note label
            const label = document.createElement('div');
            label.className = 'key-label';
            label.textContent = noteName.replace(/\d+$/, ''); // Remove octave number
            key.appendChild(label);
            
            // Add click event
            key.addEventListener('click', () => {
                playPianoKey(note);
            });
            
            keyboardWrapper.appendChild(key);
        }
    }
    
    // Force a display update
    setTimeout(() => {
        const wrapper = document.querySelector('.piano-keyboard-wrapper');
        if (wrapper) {
            wrapper.style.display = 'block';
            wrapper.style.visibility = 'visible';
        }
    }, 50);
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

// For simplicity, this version is not implementing all functions
// In a real implementation, you'd include all the missing functions
// that were in the original version

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