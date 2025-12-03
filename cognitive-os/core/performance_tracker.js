/**
 * Cognitive OS - Performance Tracker
 *
 * Tracks rich "performance signatures" for each trial:
 * - Correctness (not just binary, but error types)
 * - Reaction time & variance
 * - Difficulty parameters
 * - Skill updates
 *
 * This replaces simple score tracking with research-grade metrics.
 */

const PerformanceTracker = (function() {
    'use strict';

    // ============================================
    // SESSION TRACKING
    // ============================================

    let currentSession = null;

    /**
     * Start a new training session
     */
    function startSession(moduleId) {
        currentSession = {
            moduleId,
            startTime: Date.now(),
            trials: [],
            skillUpdates: []
        };
        console.log(`[PerformanceTracker] Started session: ${moduleId}`);
        return currentSession;
    }

    /**
     * Record a trial with full performance signature
     *
     * @param {object} trial - Trial data
     * @param {string} trial.moduleId - Module identifier
     * @param {boolean} trial.correct - Was response correct?
     * @param {string} trial.errorType - Type of error (if incorrect)
     * @param {number} trial.reactionTime - Time from stimulus to response (ms)
     * @param {object} trial.difficulty - Difficulty parameters
     * @param {number} trial.trialNumber - Trial number in session
     */
    function recordTrial(trial) {
        if (!currentSession) {
            console.warn('[PerformanceTracker] No active session');
            return null;
        }

        // Create performance signature
        const signature = {
            timestamp: Date.now(),
            moduleId: trial.moduleId || currentSession.moduleId,
            trialNumber: trial.trialNumber || (currentSession.trials.length + 1),

            // Outcome
            correct: trial.correct,
            errorType: trial.errorType || null, // 'miss', 'false_alarm', 'swap', 'intrusion', 'wrong_position'

            // Timing
            reactionTime: trial.reactionTime || null,
            thinkTime: trial.thinkTime || null,

            // Difficulty
            difficulty: trial.difficulty || {},

            // Context
            fatigueIndex: calculateFatigueIndex(currentSession.trials.length),

            // Metadata
            score: trial.score || 0
        };

        // Add to current session
        currentSession.trials.push(signature);

        // Update skill ratings
        if (typeof SkillGraph !== 'undefined') {
            const skillUpdates = SkillGraph.updateModuleSkills(signature.moduleId, {
                correct: signature.correct,
                difficulty: estimateDifficultyRating(signature.difficulty),
                reactionTime: signature.reactionTime
            });
            currentSession.skillUpdates.push(...skillUpdates);
        }

        // Persist to storage (debounced)
        debouncedSave();

        return signature;
    }

    /**
     * Calculate fatigue index based on trial count
     * Returns 0-1 where 1 = highly fatigued
     */
    function calculateFatigueIndex(trialCount) {
        // Assume fatigue increases after 15 trials
        return Math.min(1.0, Math.max(0, (trialCount - 15) / 20));
    }

    /**
     * Estimate difficulty rating from difficulty parameters
     * Maps module-specific params to unified 800-2400 scale
     */
    function estimateDifficultyRating(difficulty) {
        // Simple heuristic: average of normalized parameters
        const values = Object.values(difficulty).filter(v => typeof v === 'number');
        if (values.length === 0) return 1500;

        const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
        return 800 + (avg / 10) * 1600; // Map 0-10 to 800-2400
    }

    /**
     * End the current session and return summary
     */
    function endSession() {
        if (!currentSession) {
            console.warn('[PerformanceTracker] No active session');
            return null;
        }

        currentSession.endTime = Date.now();
        currentSession.duration = currentSession.endTime - currentSession.startTime;

        // Calculate summary statistics
        const summary = calculateSessionSummary(currentSession);

        // Save to localStorage
        saveSession(currentSession);

        console.log(`[PerformanceTracker] Session ended: ${currentSession.moduleId}`, summary);

        const session = currentSession;
        currentSession = null;
        return { session, summary };
    }

    /**
     * Calculate session summary statistics
     */
    function calculateSessionSummary(session) {
        const trials = session.trials;
        if (trials.length === 0) {
            return {
                totalTrials: 0,
                accuracy: 0,
                avgReactionTime: 0,
                errorBreakdown: {}
            };
        }

        const correct = trials.filter(t => t.correct).length;
        const rts = trials.filter(t => t.reactionTime !== null).map(t => t.reactionTime);

        // Error type breakdown
        const errorBreakdown = {};
        trials.filter(t => !t.correct && t.errorType).forEach(t => {
            errorBreakdown[t.errorType] = (errorBreakdown[t.errorType] || 0) + 1;
        });

        // Reaction time statistics
        const avgRT = rts.length > 0 ? rts.reduce((sum, rt) => sum + rt, 0) / rts.length : 0;
        const rtVariance = rts.length > 0 ? calculateVariance(rts) : 0;

        // Fatigue indicators
        const firstHalfAcc = trials.slice(0, Math.floor(trials.length / 2)).filter(t => t.correct).length / Math.floor(trials.length / 2);
        const secondHalfAcc = trials.slice(Math.floor(trials.length / 2)).filter(t => t.correct).length / Math.ceil(trials.length / 2);
        const fatigueDropoff = firstHalfAcc - secondHalfAcc;

        return {
            totalTrials: trials.length,
            accuracy: correct / trials.length,
            avgReactionTime: Math.round(avgRT),
            rtVariance: Math.round(rtVariance),
            errorBreakdown,
            fatigueDropoff: Math.round(fatigueDropoff * 100) / 100,
            skillUpdates: session.skillUpdates.length
        };
    }

    /**
     * Calculate variance of an array
     */
    function calculateVariance(values) {
        const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
        const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
        return squaredDiffs.reduce((sum, v) => sum + v, 0) / values.length;
    }

    /**
     * Save session to localStorage
     */
    function saveSession(session) {
        try {
            const key = `metamind_session_${session.moduleId}_${session.startTime}`;
            localStorage.setItem(key, JSON.stringify(session));

            // Also update session history
            const historyKey = 'metamind_session_history';
            let history = [];
            try {
                history = JSON.parse(localStorage.getItem(historyKey)) || [];
            } catch (e) {}

            history.push({
                moduleId: session.moduleId,
                timestamp: session.startTime,
                duration: session.duration,
                trials: session.trials.length,
                key
            });

            // Keep last 100 sessions
            if (history.length > 100) {
                const removed = history.shift();
                localStorage.removeItem(removed.key);
            }

            localStorage.setItem(historyKey, JSON.stringify(history));
        } catch (e) {
            console.warn('[PerformanceTracker] Failed to save session:', e);
        }
    }

    /**
     * Debounced save (to avoid excessive writes)
     */
    let saveTimeout = null;
    function debouncedSave() {
        if (saveTimeout) clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
            if (currentSession) {
                const tempKey = `metamind_session_temp_${currentSession.moduleId}`;
                try {
                    localStorage.setItem(tempKey, JSON.stringify(currentSession));
                } catch (e) {
                    console.warn('[PerformanceTracker] Failed to save temp session:', e);
                }
            }
        }, 1000);
    }

    /**
     * Get session history
     */
    function getSessionHistory(moduleId = null) {
        try {
            const history = JSON.parse(localStorage.getItem('metamind_session_history')) || [];
            if (moduleId) {
                return history.filter(s => s.moduleId === moduleId);
            }
            return history;
        } catch (e) {
            console.warn('[PerformanceTracker] Failed to load session history:', e);
            return [];
        }
    }

    /**
     * Load a specific session
     */
    function loadSession(key) {
        try {
            return JSON.parse(localStorage.getItem(key));
        } catch (e) {
            console.warn('[PerformanceTracker] Failed to load session:', e);
            return null;
        }
    }

    /**
     * Get aggregate statistics across all sessions for a module
     */
    function getModuleStats(moduleId) {
        const history = getSessionHistory(moduleId);
        const sessions = history.map(h => loadSession(h.key)).filter(s => s !== null);

        if (sessions.length === 0) {
            return {
                totalSessions: 0,
                totalTrials: 0,
                avgAccuracy: 0,
                avgReactionTime: 0
            };
        }

        const allTrials = sessions.flatMap(s => s.trials);
        const correct = allTrials.filter(t => t.correct).length;
        const rts = allTrials.filter(t => t.reactionTime !== null).map(t => t.reactionTime);

        return {
            totalSessions: sessions.length,
            totalTrials: allTrials.length,
            avgAccuracy: correct / allTrials.length,
            avgReactionTime: rts.length > 0 ? rts.reduce((sum, rt) => sum + rt, 0) / rts.length : 0,
            recentSessions: sessions.slice(-10).map(s => ({
                timestamp: s.startTime,
                trials: s.trials.length,
                accuracy: s.trials.filter(t => t.correct).length / s.trials.length
            }))
        };
    }

    /**
     * Clear all session data
     */
    function clearAllSessions() {
        const history = getSessionHistory();
        history.forEach(h => localStorage.removeItem(h.key));
        localStorage.removeItem('metamind_session_history');
        console.log('[PerformanceTracker] All session data cleared');
    }

    // ============================================
    // PUBLIC API
    // ============================================

    return {
        // Session management
        startSession,
        endSession,
        recordTrial,

        // Queries
        getSessionHistory,
        loadSession,
        getModuleStats,

        // Utilities
        calculateVariance,
        estimateDifficultyRating,

        // Data management
        clearAllSessions
    };

})();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PerformanceTracker;
}

console.log('[PerformanceTracker] Performance tracking system loaded');
