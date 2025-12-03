/**
 * Cognitive OS - Module Adapter
 *
 * Bridges existing modules to Cognitive OS features without breaking them.
 * Automatically tracks skills, records performance signatures, enables assessment mode.
 *
 * Usage: Just include this file AFTER core.js in existing module HTML files.
 */

const ModuleAdapter = (function() {
    'use strict';

    // ============================================
    // AUTOMATIC MODULE DETECTION
    // ============================================

    let currentModuleId = null;
    let sessionActive = false;

    /**
     * Auto-detect which module is running based on page URL or META tags
     */
    function detectModule() {
        // Try META tag first
        const meta = document.querySelector('meta[name="module-id"]');
        if (meta) {
            return meta.content;
        }

        // Try URL path
        const path = window.location.pathname;
        if (path.includes('symbol_memory')) return 'symbol_memory';
        if (path.includes('morph_matrix')) return 'morph_matrix';
        if (path.includes('expand_vision')) return 'expand_vision';
        if (path.includes('neural_synthesis')) return 'neural_synthesis';
        if (path.includes('music_theory')) return 'music_theory';
        if (path.includes('psychoacoustic')) return 'psychoacoustic_wizard';

        return 'unknown';
    }

    // ============================================
    // ENHANCED PROGRESS TRACKING
    // ============================================

    /**
     * Wrap MetaMind.Progress.saveSession to also record performance signature
     */
    function enhanceProgressTracking() {
        if (typeof MetaMind === 'undefined' || !MetaMind.Progress) {
            console.warn('[ModuleAdapter] MetaMind.Progress not available');
            return;
        }

        const originalSaveSession = MetaMind.Progress.saveSession;

        MetaMind.Progress.saveSession = function(moduleName, result) {
            // Call original
            const progressData = originalSaveSession.call(this, moduleName, result);

            // Also record in PerformanceTracker if session is active
            if (typeof PerformanceTracker !== 'undefined' && sessionActive) {
                PerformanceTracker.recordTrial({
                    moduleId: moduleName,
                    correct: result.accuracy > 75, // Heuristic for overall session correctness
                    reactionTime: result.avgReactionTime || null,
                    difficulty: {
                        level: result.level,
                        score: result.score
                    },
                    score: result.score
                });
            }

            console.log('[ModuleAdapter] Enhanced progress saved for:', moduleName);
            return progressData;
        };
    }

    // ============================================
    // AUTOMATIC SESSION TRACKING
    // ============================================

    /**
     * Auto-start session tracking when module starts
     */
    function startAutoTracking() {
        currentModuleId = detectModule();
        console.log('[ModuleAdapter] Detected module:', currentModuleId);

        if (currentModuleId === 'unknown') {
            console.warn('[ModuleAdapter] Could not detect module ID');
            return;
        }

        // Start session when game starts
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1 && node.id === 'game-screen') {
                        if (!node.classList.contains('hidden') && !sessionActive) {
                            startSession();
                        }
                    }
                });

                mutation.removedNodes.forEach((node) => {
                    if (node.nodeType === 1 && node.id === 'complete-screen') {
                        if (sessionActive) {
                            endSession();
                        }
                    }
                });
            });
        });

        // Observe screen changes
        const container = document.body;
        if (container) {
            observer.observe(container, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['class']
            });
        }

        // Also hook into common start game patterns
        document.addEventListener('click', (e) => {
            if (e.target.id === 'start-button' && !sessionActive) {
                setTimeout(startSession, 100);
            }
        });
    }

    function startSession() {
        if (typeof PerformanceTracker !== 'undefined' && currentModuleId) {
            PerformanceTracker.startSession(currentModuleId);
            sessionActive = true;
            console.log('[ModuleAdapter] Session tracking started');

            // Show indicator
            showSessionIndicator();
        }
    }

    function endSession() {
        if (typeof PerformanceTracker !== 'undefined' && sessionActive) {
            const result = PerformanceTracker.endSession();
            sessionActive = false;
            console.log('[ModuleAdapter] Session tracking ended', result);

            // Hide indicator
            hideSessionIndicator();

            // Show skill improvements
            if (result && result.summary) {
                showSkillImprovements(result);
            }
        }
    }

    // ============================================
    // UI ENHANCEMENTS
    // ============================================

    /**
     * Show session tracking indicator
     */
    function showSessionIndicator() {
        let indicator = document.getElementById('session-indicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'session-indicator';
            indicator.style.cssText = `
                position: fixed;
                top: 10px;
                right: 10px;
                background: rgba(0, 120, 255, 0.9);
                color: white;
                padding: 8px 12px;
                border-radius: 4px;
                font-size: 12px;
                z-index: 10000;
                box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            `;
            indicator.innerHTML = '🧠 Cognitive OS Active';
            document.body.appendChild(indicator);
        }
    }

    function hideSessionIndicator() {
        const indicator = document.getElementById('session-indicator');
        if (indicator) {
            indicator.remove();
        }
    }

    /**
     * Show skill improvements after session
     */
    function showSkillImprovements(result) {
        if (typeof SkillGraph === 'undefined') return;

        const skills = SkillGraph.getModuleSkills(currentModuleId);
        if (skills.length === 0) return;

        // Create improvement notification
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 8px;
            max-width: 300px;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            animation: slideIn 0.3s ease-out;
        `;

        notification.innerHTML = `
            <style>
                @keyframes slideIn {
                    from { transform: translateX(400px); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            </style>
            <h4 style="margin: 0 0 10px 0; font-size: 16px;">🎯 Skills Trained</h4>
            <div style="font-size: 13px;">
                ${skills.map(skill => {
                    const level = SkillGraph.getSkillLevel(skill.rating);
                    return `
                        <div style="margin: 6px 0; display: flex; justify-content: space-between; align-items: center;">
                            <span>${skill.name}</span>
                            <span style="background: ${level.color}; padding: 2px 8px; border-radius: 3px; font-size: 11px;">
                                ${level.label}
                            </span>
                        </div>
                    `;
                }).join('')}
            </div>
            <div style="margin-top: 12px; font-size: 12px; opacity: 0.9;">
                Session: ${result.summary.totalTrials} trials • ${Math.round(result.summary.accuracy * 100)}% accuracy
            </div>
        `;

        document.body.appendChild(notification);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            notification.style.animation = 'slideIn 0.3s ease-out reverse';
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    }

    /**
     * Add "View Cognitive Profile" button to module pages
     */
    function addProfileButton() {
        // Wait for page to load
        setTimeout(() => {
            const startScreen = document.getElementById('start-screen');
            if (!startScreen) return;

            const button = document.createElement('button');
            button.textContent = '🧠 View Cognitive Profile';
            button.style.cssText = `
                margin-top: 20px;
                padding: 10px 20px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border: none;
                border-radius: 5px;
                cursor: pointer;
                font-size: 14px;
                font-weight: bold;
                transition: transform 0.2s;
            `;

            button.onmouseover = () => button.style.transform = 'scale(1.05)';
            button.onmouseout = () => button.style.transform = 'scale(1)';

            button.onclick = () => {
                window.location.href = '../cognitive-os/dashboard.html';
            };

            // Add button to start screen
            const container = startScreen.querySelector('.button-container') || startScreen;
            container.appendChild(button);
        }, 500);
    }

    // ============================================
    // INITIALIZATION
    // ============================================

    function init() {
        console.log('[ModuleAdapter] Initializing Cognitive OS integration...');

        // Check dependencies
        if (typeof MetaMind === 'undefined') {
            console.warn('[ModuleAdapter] MetaMind core not loaded');
            return;
        }

        // Auto-detect module
        currentModuleId = detectModule();

        // Enhance progress tracking
        enhanceProgressTracking();

        // Start auto-tracking
        startAutoTracking();

        // Add UI enhancements
        addProfileButton();

        console.log('[ModuleAdapter] Cognitive OS integration active');
    }

    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // ============================================
    // PUBLIC API
    // ============================================

    return {
        detectModule,
        startSession,
        endSession,
        getCurrentModuleId: () => currentModuleId,
        isSessionActive: () => sessionActive
    };

})();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ModuleAdapter;
}
