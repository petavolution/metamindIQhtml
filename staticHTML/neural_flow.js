/**
 * Neural Flow - Cognitive Flexibility Training
 *
 * Trains: Task-switching, Processing speed, Cognitive control
 * Cognitive Skills: control.switching, speed.processing, control.conflict
 */

(function() {
    'use strict';

    // ============================================
    // CONFIGURATION
    // ============================================

    const CONFIG = {
        TOTAL_TRIALS: 40,
        TRIALS_PER_LEVEL: 8,
        MAX_LEVEL: 5,
        BASE_TIME_LIMIT: 3000,      // ms
        MIN_TIME_LIMIT: 800,        // ms
        TIME_DECREASE_PER_LEVEL: 400, // ms
        RULE_SWITCH_PROBABILITY: 0.3, // 30% chance to switch rule
        FEEDBACK_DURATION: 600,     // ms
        INTER_TRIAL_DELAY: 400,     // ms
    };

    const RULES = {
        COLOR: 'COLOR',
        SHAPE: 'SHAPE',
        SIZE: 'SIZE'
    };

    const COLORS = {
        RED: { name: 'red', value: '#e74c3c' },
        BLUE: { name: 'blue', value: '#3498db' },
        GREEN: { name: 'green', value: '#2ecc71' },
        YELLOW: { name: 'yellow', value: '#f1c40f' },
        PURPLE: { name: 'purple', value: '#9b59b6' }
    };

    const SHAPES = {
        CIRCLE: 'circle',
        SQUARE: 'square',
        TRIANGLE: 'triangle'
    };

    const SIZES = {
        SMALL: 'small',
        MEDIUM: 'medium',
        LARGE: 'large'
    };

    // ============================================
    // GAME STATE
    // ============================================

    const GameState = {
        // Session data
        level: 1,
        score: 0,
        streak: 0,
        bestStreak: 0,
        trialNumber: 0,

        // Current trial
        currentRule: null,
        previousRule: null,
        targetShape: null,
        stimulusShape: null,
        isMatch: false,
        trialStartTime: 0,
        timeLimit: CONFIG.BASE_TIME_LIMIT,

        // Performance tracking
        trials: [],
        ruleStats: {
            COLOR: { correct: 0, total: 0, times: [] },
            SHAPE: { correct: 0, total: 0, times: [] },
            SIZE: { correct: 0, total: 0, times: [] }
        },
        switchCosts: [], // RT difference on switch vs non-switch trials

        // UI state
        gameActive: false,
        awaitingResponse: false
    };

    // ============================================
    // SHAPE GENERATION
    // ============================================

    function randomChoice(array) {
        return array[Math.floor(Math.random() * array.length)];
    }

    function createRandomShape() {
        return {
            color: randomChoice(Object.values(COLORS)),
            shape: randomChoice(Object.values(SHAPES)),
            size: randomChoice(Object.values(SIZES))
        };
    }

    function createMatchingShape(target, rule) {
        const newShape = createRandomShape();

        switch(rule) {
            case RULES.COLOR:
                newShape.color = target.color;
                break;
            case RULES.SHAPE:
                newShape.shape = target.shape;
                break;
            case RULES.SIZE:
                newShape.size = target.size;
                break;
        }

        return newShape;
    }

    function createNonMatchingShape(target, rule) {
        let newShape;
        let attempts = 0;
        const maxAttempts = 20;

        do {
            newShape = createRandomShape();
            attempts++;

            if (attempts > maxAttempts) {
                // Force non-match on relevant dimension
                switch(rule) {
                    case RULES.COLOR:
                        const colors = Object.values(COLORS).filter(c => c.name !== target.color.name);
                        newShape.color = randomChoice(colors);
                        break;
                    case RULES.SHAPE:
                        const shapes = Object.values(SHAPES).filter(s => s !== target.shape);
                        newShape.shape = randomChoice(shapes);
                        break;
                    case RULES.SIZE:
                        const sizes = Object.values(SIZES).filter(s => s !== target.size);
                        newShape.size = randomChoice(sizes);
                        break;
                }
                break;
            }
        } while (shapesMatchByRule(target, newShape, rule));

        return newShape;
    }

    function shapesMatchByRule(shape1, shape2, rule) {
        switch(rule) {
            case RULES.COLOR:
                return shape1.color.name === shape2.color.name;
            case RULES.SHAPE:
                return shape1.shape === shape2.shape;
            case RULES.SIZE:
                return shape1.size === shape2.size;
            default:
                return false;
        }
    }

    // ============================================
    // RULE SELECTION
    // ============================================

    function selectNextRule() {
        const shouldSwitch = Math.random() < CONFIG.RULE_SWITCH_PROBABILITY || GameState.currentRule === null;

        if (shouldSwitch || GameState.currentRule === null) {
            const rules = Object.values(RULES);
            const availableRules = GameState.currentRule
                ? rules.filter(r => r !== GameState.currentRule)
                : rules;
            return randomChoice(availableRules);
        }

        return GameState.currentRule;
    }

    // ============================================
    // RENDERING
    // ============================================

    function renderShape(shapeData, containerId) {
        const container = document.getElementById(containerId);
        container.innerHTML = '';

        const shapeElement = document.createElement('div');
        shapeElement.className = `shape ${shapeData.shape} ${shapeData.size}`;

        if (shapeData.shape === SHAPES.TRIANGLE) {
            shapeElement.style.borderBottomColor = shapeData.color.value;
        } else {
            shapeElement.style.backgroundColor = shapeData.color.value;
        }

        container.appendChild(shapeElement);
    }

    function updateStats() {
        document.getElementById('level').textContent = GameState.level;
        document.getElementById('score').textContent = Math.round(GameState.score);
        document.getElementById('streak').textContent = GameState.streak;
    }

    function updateRuleDisplay() {
        const ruleText = document.getElementById('current-rule');
        ruleText.textContent = `Match by ${GameState.currentRule}`;

        // Add animation on rule change
        ruleText.style.animation = 'none';
        setTimeout(() => {
            ruleText.style.animation = 'pulse 0.5s ease';
        }, 10);
    }

    function showFeedback(correct) {
        const feedback = document.getElementById('feedback-display');
        feedback.className = `feedback-display ${correct ? 'correct' : 'incorrect'}`;
        feedback.textContent = correct ? '✓ CORRECT' : '✗ INCORRECT';
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

        // Update time limit based on level
        GameState.timeLimit = Math.max(
            CONFIG.MIN_TIME_LIMIT,
            CONFIG.BASE_TIME_LIMIT - ((GameState.level - 1) * CONFIG.TIME_DECREASE_PER_LEVEL)
        );

        // Select rule (may switch)
        GameState.previousRule = GameState.currentRule;
        GameState.currentRule = selectNextRule();

        // Generate shapes
        GameState.targetShape = createRandomShape();
        GameState.isMatch = Math.random() < 0.5;

        GameState.stimulusShape = GameState.isMatch
            ? createMatchingShape(GameState.targetShape, GameState.currentRule)
            : createNonMatchingShape(GameState.targetShape, GameState.currentRule);

        // Render
        updateRuleDisplay();
        renderShape(GameState.targetShape, 'target-shape');
        renderShape(GameState.stimulusShape, 'stimulus-shape');
        updateStats();

        // Start timer
        GameState.trialStartTime = performance.now();
        GameState.awaitingResponse = true;

        // Auto-timeout
        setTimeout(() => {
            if (GameState.awaitingResponse) {
                handleResponse(null); // Timeout = wrong
            }
        }, GameState.timeLimit);
    }

    function handleResponse(userSaidMatch) {
        if (!GameState.awaitingResponse) return;

        GameState.awaitingResponse = false;
        const reactionTime = performance.now() - GameState.trialStartTime;
        const correct = userSaidMatch === GameState.isMatch;

        // Determine if this was a switch trial
        const wasSwitch = GameState.previousRule !== null &&
                         GameState.previousRule !== GameState.currentRule;

        // Record trial
        const trial = {
            trialNumber: GameState.trialNumber,
            rule: GameState.currentRule,
            wasSwitch: wasSwitch,
            correct: correct,
            reactionTime: reactionTime,
            timeLimit: GameState.timeLimit,
            level: GameState.level
        };

        GameState.trials.push(trial);

        // Update rule-specific stats
        const ruleStats = GameState.ruleStats[GameState.currentRule];
        ruleStats.total++;
        if (correct) {
            ruleStats.correct++;
            ruleStats.times.push(reactionTime);
        }

        // Track switch costs
        if (wasSwitch && correct) {
            GameState.switchCosts.push({
                rt: reactionTime,
                rule: GameState.currentRule
            });
        }

        // Update score and streak
        if (correct) {
            const speedBonus = Math.max(0, (GameState.timeLimit - reactionTime) / GameState.timeLimit);
            const levelMultiplier = GameState.level;
            const switchBonus = wasSwitch ? 1.5 : 1.0;

            const points = (10 + speedBonus * 10) * levelMultiplier * switchBonus;
            GameState.score += points;
            GameState.streak++;
            GameState.bestStreak = Math.max(GameState.bestStreak, GameState.streak);
        } else {
            GameState.streak = 0;
        }

        // Show feedback
        showFeedback(correct);

        // Level up logic
        if (GameState.trialNumber % CONFIG.TRIALS_PER_LEVEL === 0) {
            const recentTrials = GameState.trials.slice(-CONFIG.TRIALS_PER_LEVEL);
            const accuracy = recentTrials.filter(t => t.correct).length / recentTrials.length;

            if (accuracy >= 0.75 && GameState.level < CONFIG.MAX_LEVEL) {
                GameState.level++;
            }
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
        GameState.streak = 0;
        GameState.bestStreak = 0;
        GameState.trialNumber = 0;
        GameState.currentRule = null;
        GameState.previousRule = null;
        GameState.trials = [];
        GameState.ruleStats = {
            COLOR: { correct: 0, total: 0, times: [] },
            SHAPE: { correct: 0, total: 0, times: [] },
            SIZE: { correct: 0, total: 0, times: [] }
        };
        GameState.switchCosts = [];
        GameState.gameActive = true;

        // Show game screen
        showScreen('game-screen');

        // Start first trial
        setTimeout(() => startTrial(), 1000);
    }

    function endGame() {
        GameState.gameActive = false;

        // Calculate statistics
        const totalTrials = GameState.trials.length;
        const correctTrials = GameState.trials.filter(t => t.correct);
        const accuracy = totalTrials > 0 ? (correctTrials.length / totalTrials) * 100 : 0;

        const allReactionTimes = correctTrials.map(t => t.reactionTime);
        const avgRT = allReactionTimes.length > 0
            ? allReactionTimes.reduce((a, b) => a + b, 0) / allReactionTimes.length
            : 0;

        // Update results screen
        document.getElementById('final-score').textContent = Math.round(GameState.score);
        document.getElementById('final-accuracy').textContent = `${accuracy.toFixed(1)}%`;
        document.getElementById('best-streak').textContent = GameState.bestStreak;
        document.getElementById('avg-time').textContent = `${Math.round(avgRT)}ms`;

        // Rule-specific breakdown
        const breakdownContainer = document.getElementById('rule-breakdown');
        breakdownContainer.innerHTML = '';

        for (const [ruleName, stats] of Object.entries(GameState.ruleStats)) {
            if (stats.total === 0) continue;

            const ruleAccuracy = (stats.correct / stats.total) * 100;
            const ruleAvgRT = stats.times.length > 0
                ? stats.times.reduce((a, b) => a + b, 0) / stats.times.length
                : 0;

            const item = document.createElement('div');
            item.className = 'rule-stat-item';
            item.innerHTML = `
                <div>
                    <div class="rule-stat-name">Match by ${ruleName}</div>
                    <div style="font-size: 0.9em; color: #666;">
                        ${stats.correct}/${stats.total} correct • ${Math.round(ruleAvgRT)}ms avg
                    </div>
                </div>
                <div class="rule-stat-value">${ruleAccuracy.toFixed(1)}%</div>
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
        const totalTrials = GameState.trials.length;
        const correctTrials = GameState.trials.filter(t => t.correct);
        const accuracy = correctTrials.length / totalTrials;

        // Accuracy insights
        if (accuracy >= 0.9) {
            insights.push({
                type: 'positive',
                text: `Excellent accuracy (${(accuracy * 100).toFixed(1)}%)! Your cognitive control is strong.`
            });
        } else if (accuracy < 0.7) {
            insights.push({
                type: 'negative',
                text: `Accuracy could improve. Try slowing down slightly to ensure correct responses.`
            });
        }

        // Speed insights
        const avgRT = correctTrials.reduce((sum, t) => sum + t.reactionTime, 0) / correctTrials.length;
        if (avgRT < 1000) {
            insights.push({
                type: 'positive',
                text: `Fast processing speed! Average reaction time: ${Math.round(avgRT)}ms.`
            });
        }

        // Switch cost analysis
        const switchTrials = GameState.trials.filter(t => t.wasSwitch && t.correct);
        const nonSwitchTrials = GameState.trials.filter(t => !t.wasSwitch && t.correct);

        if (switchTrials.length > 3 && nonSwitchTrials.length > 3) {
            const switchRT = switchTrials.reduce((sum, t) => sum + t.reactionTime, 0) / switchTrials.length;
            const nonSwitchRT = nonSwitchTrials.reduce((sum, t) => sum + t.reactionTime, 0) / nonSwitchTrials.length;
            const switchCost = switchRT - nonSwitchRT;

            if (switchCost < 200) {
                insights.push({
                    type: 'positive',
                    text: `Low switch cost (${Math.round(switchCost)}ms). You adapt quickly to new rules!`
                });
            } else if (switchCost > 500) {
                insights.push({
                    type: 'negative',
                    text: `High switch cost (${Math.round(switchCost)}ms). Practice will improve your mental flexibility.`
                });
            }
        }

        // Rule-specific insights
        for (const [ruleName, stats] of Object.entries(GameState.ruleStats)) {
            if (stats.total < 5) continue;
            const ruleAccuracy = stats.correct / stats.total;

            if (ruleAccuracy < 0.6) {
                insights.push({
                    type: 'negative',
                    text: `Struggled with ${ruleName} matching (${(ruleAccuracy * 100).toFixed(0)}%). Focus on this dimension.`
                });
            } else if (ruleAccuracy > 0.95) {
                insights.push({
                    type: 'positive',
                    text: `Mastered ${ruleName} matching (${(ruleAccuracy * 100).toFixed(0)}%)!`
                });
            }
        }

        // Streak insights
        if (GameState.bestStreak >= 10) {
            insights.push({
                type: 'positive',
                text: `Impressive ${GameState.bestStreak}-trial streak! Excellent sustained attention.`
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
    // INPUT HANDLING
    // ============================================

    function setupEventListeners() {
        // Start button
        document.getElementById('start-button').addEventListener('click', startGame);

        // Restart button
        document.getElementById('restart-button').addEventListener('click', startGame);

        // Keyboard input
        document.addEventListener('keydown', (e) => {
            if (!GameState.gameActive || !GameState.awaitingResponse) return;

            if (e.key === 'ArrowLeft') {
                handleResponse(false); // NO MATCH
            } else if (e.key === 'ArrowRight') {
                handleResponse(true); // MATCH
            }
        });
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
