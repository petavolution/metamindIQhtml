/**
 * MetaMindIQTrain - Core Module
 * Shared utilities for all cognitive training modules
 *
 * Usage: Include this script before module-specific scripts
 * <script src="core.js"></script>
 * <script src="module_name.js"></script>
 */

const MetaMind = (function() {
    'use strict';

    // ============================================
    // AUDIO UTILITIES
    // ============================================

    const Audio = {
        context: null,
        gainNode: null,

        /**
         * Initialize Web Audio API
         * @param {number} volume - Initial volume (0-1)
         * @returns {boolean} Success status
         */
        init(volume = 0.3) {
            if (this.context) return true;

            try {
                window.AudioContext = window.AudioContext || window.webkitAudioContext;
                this.context = new AudioContext();
                this.gainNode = this.context.createGain();
                this.gainNode.gain.value = volume;
                this.gainNode.connect(this.context.destination);
                return true;
            } catch (e) {
                console.warn('Web Audio API not supported:', e);
                return false;
            }
        },

        /**
         * Resume audio context (required after user interaction)
         */
        resume() {
            if (this.context && this.context.state === 'suspended') {
                this.context.resume();
            }
        },

        /**
         * Play a tone at specified frequency
         * @param {number} frequency - Frequency in Hz
         * @param {number} duration - Duration in seconds
         * @param {string} type - Oscillator type (sine, square, triangle, sawtooth)
         */
        playTone(frequency, duration = 0.3, type = 'sine') {
            if (!this.context) return;
            this.resume();

            const oscillator = this.context.createOscillator();
            const envelope = this.context.createGain();

            oscillator.type = type;
            oscillator.frequency.value = frequency;

            oscillator.connect(envelope);
            envelope.connect(this.gainNode);

            const now = this.context.currentTime;
            envelope.gain.setValueAtTime(0, now);
            envelope.gain.linearRampToValueAtTime(0.5, now + 0.01);
            envelope.gain.exponentialRampToValueAtTime(0.01, now + duration);

            oscillator.start(now);
            oscillator.stop(now + duration);
        },

        /**
         * Play a note by name (C4, D#5, etc.)
         * @param {string} note - Note name with octave
         * @param {number} duration - Duration in seconds
         */
        playNote(note, duration = 0.3) {
            const freq = this.noteToFrequency(note);
            if (freq) this.playTone(freq, duration);
        },

        /**
         * Convert note name to frequency
         * @param {string} note - Note name (e.g., 'C4', 'A#3')
         * @returns {number} Frequency in Hz
         */
        noteToFrequency(note) {
            const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
            const match = note.match(/^([A-G]#?)(\d+)$/);
            if (!match) return 440;

            const [, noteName, octave] = match;
            const noteIndex = notes.indexOf(noteName);
            const semitones = noteIndex - 9 + (parseInt(octave) - 4) * 12;
            return 440 * Math.pow(2, semitones / 12);
        },

        /**
         * Play feedback sound for correct/incorrect
         * @param {boolean} correct - Whether answer was correct
         */
        playFeedback(correct) {
            if (correct) {
                this.playTone(523.25, 0.15, 'sine'); // C5
                setTimeout(() => this.playTone(659.25, 0.2, 'sine'), 100); // E5
            } else {
                this.playTone(200, 0.3, 'sawtooth');
            }
        }
    };

    // ============================================
    // SCREEN MANAGEMENT
    // ============================================

    const Screens = {
        screens: {},
        current: null,

        /**
         * Register screens by ID
         * @param {string[]} ids - Array of screen element IDs
         */
        register(ids) {
            ids.forEach(id => {
                const el = document.getElementById(id);
                if (el) this.screens[id] = el;
            });
        },

        /**
         * Show a specific screen, hide all others
         * @param {string} id - Screen ID to show
         * @param {Function} callback - Optional callback after transition
         */
        show(id, callback) {
            Object.values(this.screens).forEach(screen => {
                screen.classList.add('hidden');
            });

            if (this.screens[id]) {
                this.screens[id].classList.remove('hidden');
                this.current = id;
            }

            if (callback) setTimeout(callback, 50);
        },

        /**
         * Get current screen ID
         * @returns {string} Current screen ID
         */
        getCurrent() {
            return this.current;
        }
    };

    // ============================================
    // TIMER UTILITIES
    // ============================================

    const Timer = {
        timers: {},

        /**
         * Start a countdown timer
         * @param {string} id - Timer identifier
         * @param {number} seconds - Duration in seconds
         * @param {Function} onTick - Called each second with remaining time
         * @param {Function} onComplete - Called when timer completes
         */
        countdown(id, seconds, onTick, onComplete) {
            this.clear(id);

            let remaining = seconds;
            if (onTick) onTick(remaining);

            this.timers[id] = {
                interval: setInterval(() => {
                    remaining--;
                    if (onTick) onTick(remaining);

                    if (remaining <= 0) {
                        this.clear(id);
                        if (onComplete) onComplete();
                    }
                }, 1000),
                timeout: null
            };
        },

        /**
         * Set a delayed action
         * @param {string} id - Timer identifier
         * @param {number} ms - Delay in milliseconds
         * @param {Function} callback - Function to call
         */
        delay(id, ms, callback) {
            this.clear(id);
            this.timers[id] = {
                interval: null,
                timeout: setTimeout(() => {
                    delete this.timers[id];
                    if (callback) callback();
                }, ms)
            };
        },

        /**
         * Clear a specific timer
         * @param {string} id - Timer identifier
         */
        clear(id) {
            if (this.timers[id]) {
                if (this.timers[id].interval) clearInterval(this.timers[id].interval);
                if (this.timers[id].timeout) clearTimeout(this.timers[id].timeout);
                delete this.timers[id];
            }
        },

        /**
         * Clear all timers
         */
        clearAll() {
            Object.keys(this.timers).forEach(id => this.clear(id));
        }
    };

    // ============================================
    // STATE MANAGEMENT
    // ============================================

    /**
     * Create a reactive state object
     * @param {Object} initialState - Initial state values
     * @param {Function} onChange - Called when state changes
     * @returns {Proxy} Reactive state proxy
     */
    function createState(initialState, onChange) {
        return new Proxy(initialState, {
            set(target, prop, value) {
                const oldValue = target[prop];
                target[prop] = value;
                if (onChange && oldValue !== value) {
                    onChange(prop, value, oldValue);
                }
                return true;
            }
        });
    }

    // ============================================
    // DOM UTILITIES
    // ============================================

    const DOM = {
        /**
         * Get element by ID with caching
         * @param {string} id - Element ID
         * @returns {HTMLElement} Element
         */
        get(id) {
            return document.getElementById(id);
        },

        /**
         * Set text content of element
         * @param {string} id - Element ID
         * @param {string} text - Text content
         */
        setText(id, text) {
            const el = this.get(id);
            if (el) el.textContent = text;
        },

        /**
         * Toggle hidden class
         * @param {string} id - Element ID
         * @param {boolean} hidden - Whether to hide
         */
        setHidden(id, hidden) {
            const el = this.get(id);
            if (el) {
                hidden ? el.classList.add('hidden') : el.classList.remove('hidden');
            }
        },

        /**
         * Add click handler
         * @param {string} id - Element ID
         * @param {Function} handler - Click handler
         */
        onClick(id, handler) {
            const el = this.get(id);
            if (el) el.addEventListener('click', handler);
        },

        /**
         * Create element with attributes
         * @param {string} tag - Element tag
         * @param {Object} attrs - Attributes
         * @param {string} text - Text content
         * @returns {HTMLElement} Created element
         */
        create(tag, attrs = {}, text = '') {
            const el = document.createElement(tag);
            Object.entries(attrs).forEach(([key, value]) => {
                if (key === 'className') el.className = value;
                else if (key === 'style' && typeof value === 'object') {
                    Object.assign(el.style, value);
                } else {
                    el.setAttribute(key, value);
                }
            });
            if (text) el.textContent = text;
            return el;
        },

        /**
         * Clear all children of element
         * @param {string|HTMLElement} elOrId - Element or ID
         */
        clear(elOrId) {
            const el = typeof elOrId === 'string' ? this.get(elOrId) : elOrId;
            if (el) el.innerHTML = '';
        }
    };

    // ============================================
    // MATH UTILITIES
    // ============================================

    const MathUtils = {
        /**
         * Generate random integer in range [min, max]
         * @param {number} min - Minimum value
         * @param {number} max - Maximum value
         * @returns {number} Random integer
         */
        randomInt(min, max) {
            return Math.floor(Math.random() * (max - min + 1)) + min;
        },

        /**
         * Shuffle array in place
         * @param {Array} array - Array to shuffle
         * @returns {Array} Shuffled array
         */
        shuffle(array) {
            for (let i = array.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [array[i], array[j]] = [array[j], array[i]];
            }
            return array;
        },

        /**
         * Clamp value between min and max
         * @param {number} value - Value to clamp
         * @param {number} min - Minimum value
         * @param {number} max - Maximum value
         * @returns {number} Clamped value
         */
        clamp(value, min, max) {
            return Math.min(Math.max(value, min), max);
        },

        /**
         * Linear interpolation
         * @param {number} a - Start value
         * @param {number} b - End value
         * @param {number} t - Interpolation factor (0-1)
         * @returns {number} Interpolated value
         */
        lerp(a, b, t) {
            return a + (b - a) * t;
        }
    };

    // ============================================
    // STORAGE UTILITIES
    // ============================================

    const Storage = {
        prefix: 'metamind_',

        /**
         * Save data to localStorage
         * @param {string} key - Storage key
         * @param {*} value - Value to store
         */
        save(key, value) {
            try {
                localStorage.setItem(this.prefix + key, JSON.stringify(value));
            } catch (e) {
                console.warn('Storage save failed:', e);
            }
        },

        /**
         * Load data from localStorage
         * @param {string} key - Storage key
         * @param {*} defaultValue - Default if not found
         * @returns {*} Stored value or default
         */
        load(key, defaultValue = null) {
            try {
                const item = localStorage.getItem(this.prefix + key);
                return item ? JSON.parse(item) : defaultValue;
            } catch (e) {
                console.warn('Storage load failed:', e);
                return defaultValue;
            }
        },

        /**
         * Remove item from localStorage
         * @param {string} key - Storage key
         */
        remove(key) {
            try {
                localStorage.removeItem(this.prefix + key);
            } catch (e) {
                console.warn('Storage remove failed:', e);
            }
        }
    };

    // ============================================
    // COLOR UTILITIES
    // ============================================

    const Colors = {
        // Standard theme colors
        success: '#32ff32',
        error: '#ff3232',
        primary: '#0078ff',
        secondary: '#ff9500',

        /**
         * Generate random bright color
         * @returns {string} CSS color string
         */
        randomBright() {
            const hue = Math.floor(Math.random() * 360);
            return `hsl(${hue}, 80%, 60%)`;
        },

        /**
         * Get array of distinct colors
         * @param {number} count - Number of colors
         * @returns {string[]} Array of CSS colors
         */
        palette(count) {
            const colors = [];
            for (let i = 0; i < count; i++) {
                const hue = (i * 360 / count) % 360;
                colors.push(`hsl(${hue}, 70%, 55%)`);
            }
            return colors;
        }
    };

    // ============================================
    // MODULE BASE CLASS
    // ============================================

    class TrainingModule {
        constructor(config = {}) {
            this.config = {
                screens: ['start-screen', 'game-screen', 'complete-screen'],
                startButton: 'start-button',
                restartButton: 'restart-button',
                ...config
            };

            this.state = {
                level: 1,
                score: 0,
                phase: 'start'
            };
        }

        /**
         * Initialize the module
         */
        init() {
            Screens.register(this.config.screens);

            DOM.onClick(this.config.startButton, () => this.start());
            if (this.config.restartButton) {
                DOM.onClick(this.config.restartButton, () => this.start());
            }

            Audio.init();
            Screens.show(this.config.screens[0]);
        }

        /**
         * Start the training session
         */
        start() {
            this.state.level = 1;
            this.state.score = 0;
            this.updateStats();
            Screens.show(this.config.screens[1]);
            this.onStart();
        }

        /**
         * Complete the training session
         */
        complete() {
            Timer.clearAll();
            Screens.show(this.config.screens[2]);
            this.onComplete();
        }

        /**
         * Update stats display
         */
        updateStats() {
            DOM.setText('level', this.state.level);
            DOM.setText('score', this.state.score);
        }

        // Override these in subclass
        onStart() {}
        onComplete() {}
    }

    // ============================================
    // PUBLIC API
    // ============================================

    return {
        Audio,
        Screens,
        Timer,
        DOM,
        MathUtils,
        Storage,
        Colors,
        TrainingModule,
        createState
    };

})();

// Export for module systems if available
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MetaMind;
}
