/**
 * Info Cluster - Chunking Strategy Training
 *
 * Trains: Working memory expansion through chunking strategies
 * Cognitive Skills: wm.visual, wm.sequence, control.switching
 */

(function() {
    'use strict';

    // ============================================
    // CONFIGURATION
    // ============================================

    const CONFIG = {
        TOTAL_TRIALS: 20,
        BASE_SEQUENCE_LENGTH: 5,
        MAX_SEQUENCE_LENGTH: 12,
        MEMORIZE_TIME_PER_ITEM: 800,   // ms
        MIN_MEMORIZE_TIME: 3000,        // ms
        MAX_MEMORIZE_TIME: 10000,       // ms
        FEEDBACK_DURATION: 1500,        // ms
        INTER_TRIAL_DELAY: 800,         // ms
    };

    const SEQUENCE_TYPES = {
        NUMBERS: 'numbers',
        LETTERS: 'letters',
        COLORS: 'colors',
        PATTERNS: 'patterns'
    };

    const COLORS = [
        { name: 'red', value: '#e74c3c' },
        { name: 'blue', value: '#3498db' },
        { name: 'green', value: '#2ecc71' },
        { name: 'yellow', value: '#f1c40f' },
        { name: 'purple', value: '#9b59b6' },
        { name: 'orange', value: '#e67e22' },
        { name: 'pink', value: '#fd79a8' },
        { name: 'cyan', value: '#00cec9' }
    ];

    const PATTERNS = ['●', '■', '▲', '★', '◆', '♥', '♦', '♣'];

    // ============================================
    // GAME STATE
    // ============================================

    const GameState = {
        // Session data
        level: 1,
        score: 0,
        trialNumber: 0,
        totalTrials: CONFIG.TOTAL_TRIALS,

        // Current trial
        currentSequence: [],
        currentType: null,
        userRecall: [],
        sequenceLength: CONFIG.BASE_SEQUENCE_LENGTH,
        memorizeTime: 0,
        trialStartTime: 0,

        // Performance tracking
        trials: [],
        typeStats: {
            numbers: { correct: 0, total: 0, avgAccuracy: 0 },
            letters: { correct: 0, total: 0, avgAccuracy: 0 },
            colors: { correct: 0, total: 0, avgAccuracy: 0 },
            patterns: { correct: 0, total: 0, avgAccuracy: 0 }
        },
        longestSequence: 0,

        // UI state
        gameActive: false,
        currentPhase: 'memorize', // 'memorize' or 'recall'
        timerInterval: null
    };

    // ============================================
    // SEQUENCE GENERATION
    // ============================================

    function randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    function randomChoice(array) {
        return array[Math.floor(Math.random() * array.length)];
    }

    function generateSequence(type, length) {
        const sequence = [];

        switch(type) {
            case SEQUENCE_TYPES.NUMBERS:
                for (let i = 0; i < length; i++) {
                    sequence.push(randomInt(0, 9));
                }
                break;

            case SEQUENCE_TYPES.LETTERS:
                const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
                for (let i = 0; i < length; i++) {
                    sequence.push(randomChoice(letters));
                }
                break;

            case SEQUENCE_TYPES.COLORS:
                for (let i = 0; i < length; i++) {
                    sequence.push(randomChoice(COLORS));
                }
                break;

            case SEQUENCE_TYPES.PATTERNS:
                for (let i = 0; i < length; i++) {
                    sequence.push(randomChoice(PATTERNS));
                }
                break;
        }

        return sequence;
    }

    function selectSequenceType(trialNumber) {
        // Cycle through types to ensure balanced practice
        const types = Object.values(SEQUENCE_TYPES);
        return types[trialNumber % types.length];
    }

    // ============================================
    // RENDERING
    // ============================================

    function renderSequence(sequence, type, containerId) {
        const container = document.getElementById(containerId);
        container.innerHTML = '';

        sequence.forEach((item, index) => {
            const element = document.createElement('div');
            element.className = `sequence-item ${type} fade-in`;
            element.style.animationDelay = `${index * 0.1}s`;

            switch(type) {
                case SEQUENCE_TYPES.NUMBERS:
                case SEQUENCE_TYPES.LETTERS:
                case SEQUENCE_TYPES.PATTERNS:
                    element.textContent = item;
                    break;

                case SEQUENCE_TYPES.COLORS:
                    element.className = 'sequence-item color-swatch fade-in';
                    element.style.setProperty('--swatch-color', item.value);
                    element.style.animationDelay = `${index * 0.1}s`;
                    break;
            }

            container.appendChild(element);
        });
    }

    function renderRecallOptions(sequence, type) {
        const container = document.getElementById('recall-options');
        container.innerHTML = '';

        // Create shuffled options
        const shuffled = [...sequence].sort(() => Math.random() - 0.5);

        shuffled.forEach((item, index) => {
            const element = document.createElement('div');
            element.className = `recall-option ${type}`;
            element.dataset.value = type === SEQUENCE_TYPES.COLORS ? item.name : item;
            element.dataset.index = index;

            switch(type) {
                case SEQUENCE_TYPES.NUMBERS:
                case SEQUENCE_TYPES.LETTERS:
                case SEQUENCE_TYPES.PATTERNS:
                    element.textContent = item;
                    break;

                case SEQUENCE_TYPES.COLORS:
                    element.style.setProperty('--swatch-color', item.value);
                    element.style.background = item.value;
                    break;
            }

            element.addEventListener('click', () => handleRecallClick(item, element));
            container.appendChild(element);
        });
    }

    function updateStats() {
        document.getElementById('level').textContent = GameState.level;
        document.getElementById('score').textContent = Math.round(GameState.score);

        const accuracy = GameState.trials.length > 0
            ? (GameState.trials.reduce((sum, t) => sum + t.accuracy, 0) / GameState.trials.length) * 100
            : 0;
        document.getElementById('accuracy').textContent = `${accuracy.toFixed(0)}%`;

        document.getElementById('trial').textContent =
            `${GameState.trialNumber}/${GameState.totalTrials}`;
    }

    function updatePhaseText(text) {
        document.getElementById('phase-text').textContent = text;
    }

    function startTimer(duration) {
        const timerFill = document.getElementById('timer-fill');
        const startTime = Date.now();
        const endTime = startTime + duration;

        if (GameState.timerInterval) {
            clearInterval(GameState.timerInterval);
        }

        GameState.timerInterval = setInterval(() => {
            const now = Date.now();
            const remaining = endTime - now;
            const percent = (remaining / duration) * 100;

            timerFill.style.width = `${Math.max(0, percent)}%`;

            if (remaining <= 0) {
                clearInterval(GameState.timerInterval);
                timerFill.style.width = '0%';
            }
        }, 50);
    }

    function showFeedback(type, message) {
        const feedback = document.getElementById('feedback-display');
        feedback.className = `feedback-display ${type}`;
        feedback.textContent = message;
        feedback.classList.remove('hidden');

        setTimeout(() => {
            feedback.classList.add('hidden');
        }, CONFIG.FEEDBACK_DURATION);
    }

    // ============================================
    // TRIAL MANAGEMENT
    // ============================================

    function startTrial() {
        GameState.trialNumber++;
        GameState.userRecall = [];

        // Determine sequence parameters
        GameState.currentType = selectSequenceType(GameState.trialNumber - 1);
        GameState.sequenceLength = Math.min(
            CONFIG.MAX_SEQUENCE_LENGTH,
            CONFIG.BASE_SEQUENCE_LENGTH + Math.floor(GameState.level / 2)
        );

        // Generate sequence
        GameState.currentSequence = generateSequence(
            GameState.currentType,
            GameState.sequenceLength
        );

        // Calculate memorization time
        GameState.memorizeTime = Math.min(
            CONFIG.MAX_MEMORIZE_TIME,
            Math.max(
                CONFIG.MIN_MEMORIZE_TIME,
                GameState.sequenceLength * CONFIG.MEMORIZE_TIME_PER_ITEM
            )
        );

        // Start memorization phase
        startMemorizationPhase();
    }

    function startMemorizationPhase() {
        GameState.currentPhase = 'memorize';
        GameState.trialStartTime = performance.now();

        updatePhaseText(`Memorize the sequence... (${GameState.sequenceLength} items)`);
        updateStats();

        // Show sequence
        renderSequence(
            GameState.currentSequence,
            GameState.currentType,
            'sequence-container'
        );

        // Hide recall area
        document.getElementById('recall-area').classList.add('hidden');

        // Start timer
        startTimer(GameState.memorizeTime);

        // Transition to recall after memorize time
        setTimeout(() => {
            startRecallPhase();
        }, GameState.memorizeTime);
    }

    function startRecallPhase() {
        GameState.currentPhase = 'recall';

        updatePhaseText('Recall: Click items in the correct order');

        // Clear sequence display
        document.getElementById('sequence-container').innerHTML = '';

        // Show recall area
        document.getElementById('recall-area').classList.remove('hidden');

        // Render options
        renderRecallOptions(GameState.currentSequence, GameState.currentType);

        // Clear previous recall
        document.getElementById('recall-sequence').innerHTML = '';
    }

    function handleRecallClick(item, element) {
        if (element.classList.contains('selected')) return;

        // Add to user recall
        GameState.userRecall.push(item);

        // Mark as selected
        element.classList.add('selected');

        // Add to recall display
        const recallContainer = document.getElementById('recall-sequence');
        const recallElement = document.createElement('div');
        recallElement.className = `recall-item ${GameState.currentType}`;

        switch(GameState.currentType) {
            case SEQUENCE_TYPES.NUMBERS:
            case SEQUENCE_TYPES.LETTERS:
            case SEQUENCE_TYPES.PATTERNS:
                recallElement.textContent = item;
                break;

            case SEQUENCE_TYPES.COLORS:
                recallElement.style.background = item.value;
                break;
        }

        recallContainer.appendChild(recallElement);

        // Auto-submit if sequence complete
        if (GameState.userRecall.length === GameState.currentSequence.length) {
            setTimeout(() => evaluateTrial(), 500);
        }
    }

    function clearRecall() {
        GameState.userRecall = [];
        document.getElementById('recall-sequence').innerHTML = '';

        // Unselect all options
        document.querySelectorAll('.recall-option').forEach(el => {
            el.classList.remove('selected');
        });
    }

    function submitRecall() {
        if (GameState.userRecall.length === 0) {
            showFeedback('incorrect', 'Please select at least one item!');
            return;
        }

        evaluateTrial();
    }

    function evaluateTrial() {
        const totalTime = performance.now() - GameState.trialStartTime;

        // Calculate accuracy
        let correct = 0;
        const minLength = Math.min(
            GameState.userRecall.length,
            GameState.currentSequence.length
        );

        for (let i = 0; i < minLength; i++) {
            const expected = GameState.currentSequence[i];
            const actual = GameState.userRecall[i];

            // Handle color comparison
            if (GameState.currentType === SEQUENCE_TYPES.COLORS) {
                if (expected.name === actual.name) correct++;
            } else {
                if (expected === actual) correct++;
            }
        }

        const accuracy = correct / GameState.currentSequence.length;

        // Estimate chunking (simple heuristic based on recall speed)
        const avgTimePerItem = (totalTime - GameState.memorizeTime) / GameState.userRecall.length;
        const estimatedChunkSize = avgTimePerItem < 400 ? 3 : avgTimePerItem < 700 ? 2 : 1;

        // Record trial
        const trial = {
            trialNumber: GameState.trialNumber,
            type: GameState.currentType,
            sequenceLength: GameState.sequenceLength,
            accuracy: accuracy,
            totalTime: totalTime,
            estimatedChunkSize: estimatedChunkSize,
            level: GameState.level
        };

        GameState.trials.push(trial);

        // Update type-specific stats
        const typeStats = GameState.typeStats[GameState.currentType];
        typeStats.total++;
        if (accuracy === 1.0) typeStats.correct++;
        typeStats.avgAccuracy = ((typeStats.avgAccuracy * (typeStats.total - 1)) + accuracy) / typeStats.total;

        // Update longest sequence
        if (accuracy === 1.0) {
            GameState.longestSequence = Math.max(
                GameState.longestSequence,
                GameState.sequenceLength
            );
        }

        // Calculate score
        const basePoints = 10 * GameState.sequenceLength;
        const accuracyBonus = basePoints * accuracy;
        const levelMultiplier = GameState.level;
        const chunkBonus = estimatedChunkSize > 1 ? estimatedChunkSize * 5 : 0;

        const points = (basePoints + accuracyBonus + chunkBonus) * levelMultiplier;
        GameState.score += points;

        // Level up logic
        if (GameState.trialNumber % 5 === 0) {
            const recentTrials = GameState.trials.slice(-5);
            const avgAccuracy = recentTrials.reduce((sum, t) => sum + t.accuracy, 0) / recentTrials.length;

            if (avgAccuracy >= 0.8) {
                GameState.level = Math.min(10, GameState.level + 1);
            } else if (avgAccuracy < 0.5 && GameState.level > 1) {
                GameState.level = Math.max(1, GameState.level - 1);
            }
        }

        // Show feedback
        if (accuracy === 1.0) {
            showFeedback('correct', `Perfect! ${correct}/${GameState.currentSequence.length}`);
        } else if (accuracy >= 0.7) {
            showFeedback('partial', `Good! ${correct}/${GameState.currentSequence.length}`);
        } else {
            showFeedback('incorrect', `${correct}/${GameState.currentSequence.length} correct`);
        }

        // Continue or end
        setTimeout(() => {
            if (GameState.trialNumber >= CONFIG.TOTAL_TRIALS) {
                endGame();
            } else {
                startTrial();
            }
        }, CONFIG.FEEDBACK_DURATION + CONFIG.INTER_TRIAL_DELAY);
    }

    // ============================================
    // GAME FLOW
    // ============================================

    function startGame() {
        // Reset state
        GameState.level = 1;
        GameState.score = 0;
        GameState.trialNumber = 0;
        GameState.trials = [];
        GameState.typeStats = {
            numbers: { correct: 0, total: 0, avgAccuracy: 0 },
            letters: { correct: 0, total: 0, avgAccuracy: 0 },
            colors: { correct: 0, total: 0, avgAccuracy: 0 },
            patterns: { correct: 0, total: 0, avgAccuracy: 0 }
        };
        GameState.longestSequence = 0;
        GameState.gameActive = true;

        // Show game screen
        showScreen('game-screen');

        // Start first trial
        setTimeout(() => startTrial(), 1000);
    }

    function endGame() {
        GameState.gameActive = false;

        if (GameState.timerInterval) {
            clearInterval(GameState.timerInterval);
        }

        // Calculate statistics
        const totalTrials = GameState.trials.length;
        const overallAccuracy = GameState.trials.reduce((sum, t) => sum + t.accuracy, 0) / totalTrials;
        const avgChunkSize = GameState.trials.reduce((sum, t) => sum + t.estimatedChunkSize, 0) / totalTrials;

        // Update results screen
        document.getElementById('final-score').textContent = Math.round(GameState.score);
        document.getElementById('final-accuracy').textContent = `${(overallAccuracy * 100).toFixed(1)}%`;
        document.getElementById('longest-sequence').textContent = GameState.longestSequence;
        document.getElementById('avg-chunk').textContent = avgChunkSize.toFixed(1);

        // Type-specific breakdown
        const breakdownContainer = document.getElementById('type-breakdown');
        breakdownContainer.innerHTML = '';

        const typeNames = {
            numbers: 'Numbers',
            letters: 'Letters',
            colors: 'Colors',
            patterns: 'Patterns'
        };

        for (const [type, stats] of Object.entries(GameState.typeStats)) {
            if (stats.total === 0) continue;

            const item = document.createElement('div');
            item.className = 'type-stat-item';
            item.innerHTML = `
                <div>
                    <div class="type-stat-name">${typeNames[type]}</div>
                    <div style="font-size: 0.9em; color: #666;">
                        ${stats.correct}/${stats.total} perfect recalls
                    </div>
                </div>
                <div class="type-stat-value">${(stats.avgAccuracy * 100).toFixed(1)}%</div>
            `;
            breakdownContainer.appendChild(item);
        }

        // Generate insights
        generateInsights();

        // Show results screen
        showScreen('results-screen');
    }

    function generateInsights() {
        const insights = [];

        const overallAccuracy = GameState.trials.reduce((sum, t) => sum + t.accuracy, 0) / GameState.trials.length;
        const avgChunkSize = GameState.trials.reduce((sum, t) => sum + t.estimatedChunkSize, 0) / GameState.trials.length;

        // Accuracy insights
        if (overallAccuracy >= 0.85) {
            insights.push({
                type: 'positive',
                text: `Excellent memory performance! ${(overallAccuracy * 100).toFixed(0)}% average accuracy.`
            });
        } else if (overallAccuracy < 0.6) {
            insights.push({
                type: 'negative',
                text: `Practice chunking strategies to improve recall. Current accuracy: ${(overallAccuracy * 100).toFixed(0)}%.`
            });
        }

        // Chunking insights
        if (avgChunkSize >= 2.5) {
            insights.push({
                type: 'positive',
                text: `Strong chunking! Average chunk size: ${avgChunkSize.toFixed(1)}. You're grouping items effectively.`
            });
        } else if (avgChunkSize < 1.5) {
            insights.push({
                type: 'neutral',
                text: `Try grouping items into chunks of 2-4. This can expand your effective memory capacity.`
            });
        }

        // Type-specific insights
        let bestType = null;
        let worstType = null;
        let bestAccuracy = 0;
        let worstAccuracy = 1;

        for (const [type, stats] of Object.entries(GameState.typeStats)) {
            if (stats.total === 0) continue;

            if (stats.avgAccuracy > bestAccuracy) {
                bestAccuracy = stats.avgAccuracy;
                bestType = type;
            }
            if (stats.avgAccuracy < worstAccuracy) {
                worstAccuracy = stats.avgAccuracy;
                worstType = type;
            }
        }

        if (bestType && worstType && bestType !== worstType) {
            insights.push({
                type: 'neutral',
                text: `Strongest with ${bestType} (${(bestAccuracy * 100).toFixed(0)}%), practice more with ${worstType} (${(worstAccuracy * 100).toFixed(0)}%).`
            });
        }

        // Longest sequence insight
        if (GameState.longestSequence >= 10) {
            insights.push({
                type: 'positive',
                text: `Impressive! Successfully recalled a ${GameState.longestSequence}-item sequence perfectly.`
            });
        }

        // Render insights
        const container = document.getElementById('insights');
        container.innerHTML = '';

        insights.forEach(insight => {
            const item = document.createElement('div');
            item.className = `insight-item ${insight.type}`;
            item.textContent = insight.text;
            container.appendChild(item);
        });
    }

    // ============================================
    // UI UTILITIES
    // ============================================

    function showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.add('hidden');
        });
        document.getElementById(screenId).classList.remove('hidden');
    }

    // ============================================
    // EVENT LISTENERS
    // ============================================

    function setupEventListeners() {
        // Start button
        document.getElementById('start-button').addEventListener('click', startGame);

        // Restart button
        document.getElementById('restart-button').addEventListener('click', startGame);

        // Recall controls
        document.getElementById('clear-recall').addEventListener('click', clearRecall);
        document.getElementById('submit-recall').addEventListener('click', submitRecall);
    }

    // ============================================
    // INITIALIZATION
    // ============================================

    function init() {
        setupEventListeners();
        showScreen('start-screen');
    }

    // Start when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
