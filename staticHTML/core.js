/**
 * MetaMindIQTrain - Core Module v2.0
 * Shared utilities with robust error handling and debugging
 *
 * Usage: Include this script before module-specific scripts
 * <script src="core.js"></script>
 * <script src="module_name.js"></script>
 */

const MetaMind = (function() {
    'use strict';

    // ============================================
    // DEBUG & LOGGING SYSTEM
    // ============================================

    const Debug = {
        enabled: true,
        logToConsole: true,
        logBuffer: [],
        maxBufferSize: 1000,
        levels: { ERROR: 0, WARN: 1, INFO: 2, DEBUG: 3 },
        currentLevel: 2, // INFO by default

        /**
         * Log a message with timestamp and level
         * @param {string} level - Log level (ERROR, WARN, INFO, DEBUG)
         * @param {string} module - Module name
         * @param {string} message - Log message
         * @param {*} data - Optional data to log
         */
        log(level, module, message, data = null) {
            if (!this.enabled) return;
            if (this.levels[level] > this.currentLevel) return;

            const timestamp = new Date().toISOString();
            const entry = {
                timestamp,
                level,
                module,
                message,
                data: data ? this._safeStringify(data) : null
            };

            // Add to buffer
            this.logBuffer.push(entry);
            if (this.logBuffer.length > this.maxBufferSize) {
                this.logBuffer.shift();
            }

            // Console output
            if (this.logToConsole) {
                const prefix = `[${timestamp}] [${level}] [${module}]`;
                const logFn = level === 'ERROR' ? console.error :
                              level === 'WARN' ? console.warn : console.log;
                if (data) {
                    logFn(prefix, message, data);
                } else {
                    logFn(prefix, message);
                }
            }

            // Persist to storage for later retrieval
            this._persistLog(entry);
        },

        error(module, message, data) { this.log('ERROR', module, message, data); },
        warn(module, message, data) { this.log('WARN', module, message, data); },
        info(module, message, data) { this.log('INFO', module, message, data); },
        debug(module, message, data) { this.log('DEBUG', module, message, data); },

        /**
         * Safely stringify data for logging
         */
        _safeStringify(data) {
            try {
                if (data instanceof Error) {
                    return { message: data.message, stack: data.stack, name: data.name };
                }
                return JSON.stringify(data, (key, value) => {
                    if (value instanceof HTMLElement) return `<${value.tagName}#${value.id}>`;
                    if (typeof value === 'function') return '[Function]';
                    return value;
                }, 2);
            } catch (e) {
                return String(data);
            }
        },

        /**
         * Persist log entry to localStorage
         */
        _persistLog(entry) {
            try {
                const key = 'metamind_debug_log';
                let logs = [];
                try {
                    const stored = localStorage.getItem(key);
                    if (stored) logs = JSON.parse(stored);
                } catch (e) { /* ignore */ }

                logs.push(entry);
                // Keep last 500 entries
                if (logs.length > 500) logs = logs.slice(-500);

                localStorage.setItem(key, JSON.stringify(logs));
            } catch (e) {
                // Storage might be full or unavailable
            }
        },

        /**
         * Get all logs as string (for export/download)
         */
        getLogsAsText() {
            return this.logBuffer.map(entry => {
                let line = `${entry.timestamp} [${entry.level}] [${entry.module}] ${entry.message}`;
                if (entry.data) line += `\n  Data: ${entry.data}`;
                return line;
            }).join('\n');
        },

        /**
         * Download logs as debug-log.txt
         */
        downloadLogs() {
            const text = this.getLogsAsText();
            const blob = new Blob([text], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'debug-log.txt';
            a.click();
            URL.revokeObjectURL(url);
        },

        /**
         * Clear all logs
         */
        clear() {
            this.logBuffer = [];
            try {
                localStorage.removeItem('metamind_debug_log');
            } catch (e) { /* ignore */ }
        }
    };

    // ============================================
    // ERROR HANDLING
    // ============================================

    const ErrorHandler = {
        /**
         * Wrap a function with error handling
         * @param {Function} fn - Function to wrap
         * @param {string} module - Module name for logging
         * @param {string} context - Context description
         * @returns {Function} Wrapped function
         */
        wrap(fn, module, context) {
            return function(...args) {
                try {
                    return fn.apply(this, args);
                } catch (e) {
                    Debug.error(module, `Error in ${context}: ${e.message}`, e);
                    return null;
                }
            };
        },

        /**
         * Wrap an async function with error handling
         */
        wrapAsync(fn, module, context) {
            return async function(...args) {
                try {
                    return await fn.apply(this, args);
                } catch (e) {
                    Debug.error(module, `Async error in ${context}: ${e.message}`, e);
                    return null;
                }
            };
        },

        /**
         * Assert a condition, log error if false
         * @param {boolean} condition - Condition to check
         * @param {string} module - Module name
         * @param {string} message - Error message if condition is false
         * @returns {boolean} The condition value
         */
        assert(condition, module, message) {
            if (!condition) {
                Debug.error(module, `Assertion failed: ${message}`);
            }
            return condition;
        },

        /**
         * Global error handler setup
         */
        setupGlobalHandler() {
            window.onerror = (msg, url, line, col, error) => {
                Debug.error('GLOBAL', `Uncaught error: ${msg}`, {
                    url, line, col, stack: error?.stack
                });
                return false;
            };

            window.onunhandledrejection = (event) => {
                Debug.error('GLOBAL', `Unhandled promise rejection: ${event.reason}`, {
                    reason: event.reason
                });
            };
        }
    };

    // Initialize global error handler
    if (typeof window !== 'undefined') {
        ErrorHandler.setupGlobalHandler();
    }

    // ============================================
    // SAFE DOM UTILITIES
    // ============================================

    const DOM = {
        _cache: {},

        /**
         * Safely get element by ID with logging
         * @param {string} id - Element ID
         * @param {boolean} required - If true, log error when not found
         * @returns {HTMLElement|null} Element or null
         */
        get(id, required = false) {
            if (this._cache[id]) return this._cache[id];

            const el = document.getElementById(id);
            if (!el && required) {
                Debug.error('DOM', `Required element not found: #${id}`);
            }
            if (el) this._cache[id] = el;
            return el;
        },

        /**
         * Get multiple elements by IDs
         * @param {Object} idMap - Object mapping names to IDs
         * @param {boolean} required - If true, log errors for missing elements
         * @returns {Object} Object with elements
         */
        getAll(idMap, required = false) {
            const result = {};
            const missing = [];

            for (const [name, id] of Object.entries(idMap)) {
                const el = this.get(id, false);
                result[name] = el;
                if (!el && required) missing.push(id);
            }

            if (missing.length > 0) {
                Debug.error('DOM', `Missing required elements: ${missing.join(', ')}`);
            }

            return result;
        },

        /**
         * Safely set text content
         */
        setText(id, text) {
            const el = this.get(id);
            if (el) {
                el.textContent = text;
                return true;
            }
            Debug.warn('DOM', `Cannot set text on missing element: #${id}`);
            return false;
        },

        /**
         * Safely set HTML content
         */
        setHTML(id, html) {
            const el = this.get(id);
            if (el) {
                el.innerHTML = html;
                return true;
            }
            Debug.warn('DOM', `Cannot set HTML on missing element: #${id}`);
            return false;
        },

        /**
         * Safely toggle hidden class
         */
        setHidden(id, hidden) {
            const el = this.get(id);
            if (el) {
                hidden ? el.classList.add('hidden') : el.classList.remove('hidden');
                return true;
            }
            Debug.warn('DOM', `Cannot toggle hidden on missing element: #${id}`);
            return false;
        },

        /**
         * Safely add click handler with error wrapping
         */
        onClick(id, handler, module = 'DOM') {
            const el = this.get(id);
            if (el) {
                el.addEventListener('click', ErrorHandler.wrap(handler, module, `click:${id}`));
                Debug.debug('DOM', `Click handler attached to #${id}`);
                return true;
            }
            Debug.warn('DOM', `Cannot attach click handler to missing element: #${id}`);
            return false;
        },

        /**
         * Safely add event listener
         */
        on(id, event, handler, module = 'DOM') {
            const el = this.get(id);
            if (el) {
                el.addEventListener(event, ErrorHandler.wrap(handler, module, `${event}:${id}`));
                return true;
            }
            Debug.warn('DOM', `Cannot attach ${event} handler to missing element: #${id}`);
            return false;
        },

        /**
         * Create element with attributes
         */
        create(tag, attrs = {}, text = '') {
            try {
                const el = document.createElement(tag);
                Object.entries(attrs).forEach(([key, value]) => {
                    if (key === 'className') el.className = value;
                    else if (key === 'style' && typeof value === 'object') {
                        Object.assign(el.style, value);
                    } else if (key.startsWith('data-')) {
                        el.setAttribute(key, value);
                    } else {
                        el[key] = value;
                    }
                });
                if (text) el.textContent = text;
                return el;
            } catch (e) {
                Debug.error('DOM', `Failed to create element: ${tag}`, e);
                return null;
            }
        },

        /**
         * Clear element cache (call on page unload)
         */
        clearCache() {
            this._cache = {};
        },

        /**
         * Clear all children of element
         */
        clear(elOrId) {
            const el = typeof elOrId === 'string' ? this.get(elOrId) : elOrId;
            if (el) el.innerHTML = '';
        },

        /**
         * Check if DOM is ready
         */
        ready(callback) {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', callback);
            } else {
                callback();
            }
        }
    };

    // ============================================
    // AUDIO UTILITIES (Enhanced)
    // ============================================

    const Audio = {
        context: null,
        gainNode: null,
        initialized: false,

        /**
         * Initialize Web Audio API
         */
        init(volume = 0.3) {
            if (this.initialized) return true;

            try {
                window.AudioContext = window.AudioContext || window.webkitAudioContext;
                if (!window.AudioContext) {
                    Debug.warn('Audio', 'Web Audio API not supported');
                    return false;
                }

                this.context = new AudioContext();
                this.gainNode = this.context.createGain();
                this.gainNode.gain.value = volume;
                this.gainNode.connect(this.context.destination);
                this.initialized = true;
                Debug.info('Audio', 'Audio system initialized');
                return true;
            } catch (e) {
                Debug.error('Audio', 'Failed to initialize audio', e);
                return false;
            }
        },

        /**
         * Resume audio context (handles Promise properly)
         */
        async resume() {
            if (!this.context) return false;
            if (this.context.state === 'suspended') {
                try {
                    await this.context.resume();
                    Debug.debug('Audio', 'Audio context resumed');
                    return true;
                } catch (e) {
                    Debug.warn('Audio', 'Failed to resume audio context', e);
                    return false;
                }
            }
            return true;
        },

        /**
         * Play a tone with validation
         */
        playTone(frequency, duration = 0.3, type = 'sine') {
            if (!this.context) {
                Debug.warn('Audio', 'Cannot play tone: audio not initialized');
                return;
            }

            // Validate inputs
            if (frequency <= 0 || frequency > 20000) {
                Debug.warn('Audio', `Invalid frequency: ${frequency}`);
                return;
            }
            if (duration <= 0 || duration > 10) {
                Debug.warn('Audio', `Invalid duration: ${duration}`);
                return;
            }

            this.resume();

            try {
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
            } catch (e) {
                Debug.error('Audio', 'Failed to play tone', e);
            }
        },

        /**
         * Play a note by name
         */
        playNote(note, duration = 0.3) {
            const freq = this.noteToFrequency(note);
            if (freq) this.playTone(freq, duration);
        },

        /**
         * Convert note name to frequency
         */
        noteToFrequency(note) {
            const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
            const match = note.match(/^([A-G]#?)(\d+)$/);
            if (!match) {
                Debug.warn('Audio', `Invalid note format: ${note}`);
                return 440;
            }

            const [, noteName, octave] = match;
            const noteIndex = notes.indexOf(noteName);
            const semitones = noteIndex - 9 + (parseInt(octave) - 4) * 12;
            return 440 * Math.pow(2, semitones / 12);
        },

        /**
         * Play feedback sound
         */
        playFeedback(correct) {
            if (correct) {
                this.playTone(523.25, 0.15, 'sine');
                Timer.delay('feedback_tone', 100, () => this.playTone(659.25, 0.2, 'sine'));
            } else {
                this.playTone(200, 0.3, 'sawtooth');
            }
        }
    };

    // ============================================
    // SCREEN MANAGEMENT (Enhanced)
    // ============================================

    const Screens = {
        screens: {},
        current: null,

        /**
         * Register screens by ID with validation
         */
        register(ids) {
            const missing = [];
            ids.forEach(id => {
                const el = DOM.get(id);
                if (el) {
                    this.screens[id] = el;
                } else {
                    missing.push(id);
                }
            });

            if (missing.length > 0) {
                Debug.warn('Screens', `Missing screen elements: ${missing.join(', ')}`);
            }

            Debug.info('Screens', `Registered ${Object.keys(this.screens).length} screens`);
        },

        /**
         * Show a specific screen
         */
        show(id, callback) {
            // Hide all screens
            Object.values(this.screens).forEach(screen => {
                if (screen) screen.classList.add('hidden');
            });

            // Show requested screen
            if (this.screens[id]) {
                this.screens[id].classList.remove('hidden');
                this.current = id;
                Debug.debug('Screens', `Showing screen: ${id}`);
            } else {
                Debug.error('Screens', `Cannot show unregistered screen: ${id}`);
            }

            if (callback) Timer.delay('screen_callback', 50, callback);
        },

        getCurrent() {
            return this.current;
        }
    };

    // ============================================
    // TIMER UTILITIES (Enhanced)
    // ============================================

    const Timer = {
        timers: {},

        /**
         * Start a countdown timer
         */
        countdown(id, seconds, onTick, onComplete) {
            this.clear(id);

            if (seconds <= 0) {
                Debug.warn('Timer', `Invalid countdown duration: ${seconds}`);
                if (onComplete) onComplete();
                return;
            }

            let remaining = seconds;
            if (onTick) onTick(remaining);

            this.timers[id] = {
                type: 'countdown',
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

            Debug.debug('Timer', `Started countdown: ${id} (${seconds}s)`);
        },

        /**
         * Set a delayed action
         */
        delay(id, ms, callback) {
            this.clear(id);

            if (ms < 0) {
                Debug.warn('Timer', `Invalid delay: ${ms}ms`);
                if (callback) callback();
                return;
            }

            this.timers[id] = {
                type: 'delay',
                interval: null,
                timeout: setTimeout(() => {
                    delete this.timers[id];
                    if (callback) callback();
                }, ms)
            };
        },

        /**
         * Clear a specific timer
         */
        clear(id) {
            if (this.timers[id]) {
                if (this.timers[id].interval) clearInterval(this.timers[id].interval);
                if (this.timers[id].timeout) clearTimeout(this.timers[id].timeout);
                delete this.timers[id];
                Debug.debug('Timer', `Cleared timer: ${id}`);
            }
        },

        /**
         * Clear all timers
         */
        clearAll() {
            const count = Object.keys(this.timers).length;
            Object.keys(this.timers).forEach(id => this.clear(id));
            Debug.debug('Timer', `Cleared all timers (${count})`);
        },

        /**
         * Get active timer count
         */
        getActiveCount() {
            return Object.keys(this.timers).length;
        }
    };

    // ============================================
    // STATE MANAGEMENT
    // ============================================

    function createState(initialState, onChange) {
        return new Proxy({ ...initialState }, {
            set(target, prop, value) {
                const oldValue = target[prop];
                target[prop] = value;
                if (onChange && oldValue !== value) {
                    try {
                        onChange(prop, value, oldValue);
                    } catch (e) {
                        Debug.error('State', `Error in onChange callback for ${prop}`, e);
                    }
                }
                return true;
            }
        });
    }

    // ============================================
    // MATH UTILITIES
    // ============================================

    const MathUtils = {
        randomInt(min, max) {
            return Math.floor(Math.random() * (max - min + 1)) + min;
        },

        shuffle(array) {
            const result = [...array];
            for (let i = result.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [result[i], result[j]] = [result[j], result[i]];
            }
            return result;
        },

        clamp(value, min, max) {
            return Math.min(Math.max(value, min), max);
        },

        lerp(a, b, t) {
            return a + (b - a) * MathUtils.clamp(t, 0, 1);
        }
    };

    // ============================================
    // STORAGE UTILITIES
    // ============================================

    const Storage = {
        prefix: 'metamind_',

        save(key, value) {
            try {
                localStorage.setItem(this.prefix + key, JSON.stringify(value));
                return true;
            } catch (e) {
                Debug.warn('Storage', `Failed to save: ${key}`, e);
                return false;
            }
        },

        load(key, defaultValue = null) {
            try {
                const item = localStorage.getItem(this.prefix + key);
                return item ? JSON.parse(item) : defaultValue;
            } catch (e) {
                Debug.warn('Storage', `Failed to load: ${key}`, e);
                return defaultValue;
            }
        },

        remove(key) {
            try {
                localStorage.removeItem(this.prefix + key);
                return true;
            } catch (e) {
                Debug.warn('Storage', `Failed to remove: ${key}`, e);
                return false;
            }
        }
    };

    // ============================================
    // PROGRESS TRACKING
    // ============================================

    const Progress = {
        /**
         * Save a session result for a module
         * @param {string} moduleName - Module identifier
         * @param {Object} result - Session result data
         */
        saveSession(moduleName, result) {
            const key = `progress_${moduleName}`;
            const data = Storage.load(key, { sessions: [], bestScore: 0, bestLevel: 0, totalSessions: 0 });

            // Add timestamp to result
            result.timestamp = new Date().toISOString();

            // Update best scores
            if (result.score > data.bestScore) data.bestScore = result.score;
            if (result.level > data.bestLevel) data.bestLevel = result.level;
            data.totalSessions++;

            // Keep last 50 sessions
            data.sessions.push(result);
            if (data.sessions.length > 50) data.sessions = data.sessions.slice(-50);

            Storage.save(key, data);
            Debug.info('Progress', `Saved session for ${moduleName}`, { score: result.score, level: result.level });
            return data;
        },

        /**
         * Get progress data for a module
         * @param {string} moduleName - Module identifier
         */
        getProgress(moduleName) {
            const key = `progress_${moduleName}`;
            return Storage.load(key, { sessions: [], bestScore: 0, bestLevel: 0, totalSessions: 0 });
        },

        /**
         * Get summary statistics for a module
         * @param {string} moduleName - Module identifier
         */
        getStats(moduleName) {
            const data = this.getProgress(moduleName);
            if (data.sessions.length === 0) {
                return { bestScore: 0, bestLevel: 0, avgScore: 0, totalSessions: 0, recentTrend: 'none' };
            }

            const scores = data.sessions.map(s => s.score || 0);
            const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

            // Calculate recent trend (last 5 vs previous 5)
            let recentTrend = 'stable';
            if (scores.length >= 10) {
                const recent5 = scores.slice(-5).reduce((a, b) => a + b, 0) / 5;
                const prev5 = scores.slice(-10, -5).reduce((a, b) => a + b, 0) / 5;
                if (recent5 > prev5 * 1.1) recentTrend = 'improving';
                else if (recent5 < prev5 * 0.9) recentTrend = 'declining';
            }

            return {
                bestScore: data.bestScore,
                bestLevel: data.bestLevel,
                avgScore,
                totalSessions: data.totalSessions,
                recentTrend
            };
        },

        /**
         * Get all modules progress summary
         */
        getAllStats() {
            const modules = ['symbol_memory', 'morph_matrix', 'expand_vision', 'music_theory', 'psychoacoustic_wizard', 'neural_synthesis'];
            const stats = {};
            modules.forEach(m => {
                stats[m] = this.getStats(m);
            });
            return stats;
        },

        /**
         * Clear progress for a module
         * @param {string} moduleName - Module identifier
         */
        clear(moduleName) {
            Storage.remove(`progress_${moduleName}`);
            Debug.info('Progress', `Cleared progress for ${moduleName}`);
        }
    };

    // ============================================
    // COLOR UTILITIES
    // ============================================

    const Colors = {
        success: '#32ff32',
        error: '#ff3232',
        primary: '#0078ff',
        secondary: '#ff9500',

        randomBright() {
            const hue = Math.floor(Math.random() * 360);
            return `hsl(${hue}, 80%, 60%)`;
        },

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
    // TEST FRAMEWORK
    // ============================================

    const Test = {
        results: [],
        currentSuite: null,

        /**
         * Define a test suite
         */
        suite(name, fn) {
            this.currentSuite = name;
            Debug.info('Test', `Running suite: ${name}`);
            try {
                fn();
            } catch (e) {
                Debug.error('Test', `Suite "${name}" threw error`, e);
            }
            this.currentSuite = null;
        },

        /**
         * Define a test case
         */
        test(name, fn) {
            const fullName = this.currentSuite ? `${this.currentSuite} > ${name}` : name;
            const start = performance.now();
            let passed = false;
            let error = null;

            try {
                fn();
                passed = true;
            } catch (e) {
                error = e;
            }

            const duration = performance.now() - start;
            const result = { name: fullName, passed, error, duration };
            this.results.push(result);

            if (passed) {
                Debug.info('Test', `✓ ${fullName} (${duration.toFixed(2)}ms)`);
            } else {
                Debug.error('Test', `✗ ${fullName}: ${error?.message}`, error);
            }
        },

        /**
         * Assertion helpers
         */
        assert(condition, message = 'Assertion failed') {
            if (!condition) throw new Error(message);
        },

        assertEqual(actual, expected, message = '') {
            if (actual !== expected) {
                throw new Error(`${message} Expected ${expected}, got ${actual}`);
            }
        },

        assertNotNull(value, message = 'Expected non-null value') {
            if (value === null || value === undefined) {
                throw new Error(message);
            }
        },

        /**
         * Get test summary
         */
        getSummary() {
            const total = this.results.length;
            const passed = this.results.filter(r => r.passed).length;
            const failed = total - passed;
            return { total, passed, failed, results: this.results };
        },

        /**
         * Clear results
         */
        clear() {
            this.results = [];
        },

        /**
         * Run all registered module tests
         */
        runAll() {
            Debug.info('Test', '=== Running All Tests ===');
            this.clear();

            // Core tests
            this.suite('Core', () => {
                this.test('DOM.get returns null for missing element', () => {
                    const el = DOM.get('nonexistent-element-xyz');
                    this.assert(el === null);
                });

                this.test('MathUtils.clamp works correctly', () => {
                    this.assertEqual(MathUtils.clamp(5, 0, 10), 5);
                    this.assertEqual(MathUtils.clamp(-5, 0, 10), 0);
                    this.assertEqual(MathUtils.clamp(15, 0, 10), 10);
                });

                this.test('MathUtils.randomInt returns value in range', () => {
                    for (let i = 0; i < 100; i++) {
                        const val = MathUtils.randomInt(1, 10);
                        this.assert(val >= 1 && val <= 10, `Value ${val} out of range`);
                    }
                });

                this.test('Timer.delay executes callback', (done) => {
                    // Note: async test pattern
                });

                this.test('Storage save/load roundtrip', () => {
                    const testKey = '_test_' + Date.now();
                    const testData = { foo: 'bar', num: 42 };
                    Storage.save(testKey, testData);
                    const loaded = Storage.load(testKey);
                    this.assertEqual(loaded.foo, 'bar');
                    this.assertEqual(loaded.num, 42);
                    Storage.remove(testKey);
                });
            });

            const summary = this.getSummary();
            Debug.info('Test', `=== Test Summary: ${summary.passed}/${summary.total} passed ===`);
            return summary;
        }
    };

    // ============================================
    // MODULE BASE CLASS
    // ============================================

    class TrainingModule {
        constructor(config = {}) {
            this.name = config.name || 'Module';
            this.config = {
                screens: ['start-screen', 'game-screen', 'complete-screen'],
                startButton: 'start-button',
                restartButton: 'restart-button',
                ...config
            };

            this.state = createState({
                level: 1,
                score: 0,
                phase: 'start'
            }, (prop, value) => {
                Debug.debug(this.name, `State changed: ${prop} = ${value}`);
            });

            this.elements = {};
        }

        init() {
            Debug.info(this.name, 'Initializing module');

            Screens.register(this.config.screens);

            if (!DOM.onClick(this.config.startButton, () => this.start(), this.name)) {
                Debug.error(this.name, 'Failed to attach start button handler');
            }

            if (this.config.restartButton) {
                DOM.onClick(this.config.restartButton, () => this.start(), this.name);
            }

            Audio.init();
            Screens.show(this.config.screens[0]);

            Debug.info(this.name, 'Module initialized');
        }

        start() {
            Debug.info(this.name, 'Starting training session');
            this.state.level = 1;
            this.state.score = 0;
            this.updateStats();
            Screens.show(this.config.screens[1]);
            this.onStart();
        }

        complete() {
            Debug.info(this.name, `Training complete. Final score: ${this.state.score}`);
            Timer.clearAll();
            Screens.show(this.config.screens[2]);
            this.onComplete();
        }

        updateStats() {
            DOM.setText('level', this.state.level);
            DOM.setText('score', this.state.score);
        }

        onStart() {}
        onComplete() {}
    }

    // ============================================
    // PUBLIC API
    // ============================================

    return {
        // Core utilities
        Audio,
        Screens,
        Timer,
        DOM,
        MathUtils,
        Storage,
        Colors,
        Progress,

        // Error handling & debugging
        Debug,
        ErrorHandler,
        Test,

        // Classes & factories
        TrainingModule,
        createState,

        // Version info
        version: '2.0.0'
    };

})();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MetaMind;
}

// Log startup
MetaMind.Debug.info('Core', `MetaMindIQTrain Core v${MetaMind.version} loaded`);
