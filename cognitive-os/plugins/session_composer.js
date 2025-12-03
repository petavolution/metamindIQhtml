/**
 * Cognitive OS - Session Composer
 *
 * AI-driven session planning that recommends training modules
 * based on skill weaknesses, recent activity, and variety needs.
 *
 * Core innovation: Replaces manual module selection with intelligent recommendations.
 */

const SessionComposer = (function() {
    'use strict';

    // ============================================
    // SESSION COMPOSITION ALGORITHM
    // ============================================

    /**
     * Compose an intelligent training session
     *
     * @param {number} duration - Target duration in minutes (default: 20)
     * @returns {object} Session plan with module recommendations
     */
    function composeSession(duration = 20) {
        if (typeof SkillGraph === 'undefined') {
            console.warn('[SessionComposer] SkillGraph not available');
            return null;
        }

        // Identify weak skills
        const weakSkills = SkillGraph.getWeakestSkills(5);

        // Get recent training history
        const recentModules = getRecentModules(7); // last 7 days

        // Calculate fatigue level
        const fatigueLevel = estimateFatigue();

        // Build session plan
        const session = {
            recommendedModules: [],
            focusSkills: weakSkills.slice(0, 2),
            variety: true,
            duration,
            fatigueLevel,
            reasoning: []
        };

        // Allocate time: 60% focus on weaknesses, 40% variety
        const focusTime = duration * 0.6;
        const varietyTime = duration * 0.4;

        // Select modules for weak skills (avoid recent modules)
        const focusModules = selectModulesForSkills(
            weakSkills.slice(0, 2).map(s => s.id),
            recentModules
        );

        if (focusModules.length > 0) {
            session.recommendedModules.push({
                moduleId: focusModules[0],
                duration: focusTime / 2,
                reason: `Targets weak skill: ${weakSkills[0].name}`,
                priority: 'focus'
            });
            session.reasoning.push(`Focus on ${weakSkills[0].name} (Rating: ${Math.round(weakSkills[0].rating)})`);

            if (focusModules.length > 1) {
                session.recommendedModules.push({
                    moduleId: focusModules[1],
                    duration: focusTime / 2,
                    reason: `Targets weak skill: ${weakSkills[1].name}`,
                    priority: 'focus'
                });
                session.reasoning.push(`Also train ${weakSkills[1].name} (Rating: ${Math.round(weakSkills[1].rating)})`);
            }
        }

        // Add variety module (avoid recent and focus modules)
        const avoidModules = [...recentModules, ...focusModules];
        const varietyModule = selectVarietyModule(avoidModules);

        if (varietyModule) {
            session.recommendedModules.push({
                moduleId: varietyModule,
                duration: varietyTime,
                reason: 'Provides training variety',
                priority: 'variety'
            });
            session.reasoning.push('Added variety module for balanced training');
        }

        // Adjust for fatigue
        if (fatigueLevel > 0.5) {
            session.recommendedModules = session.recommendedModules.slice(0, 2);
            session.reasoning.push('⚠️ High fatigue detected - reduced session length');
        }

        return session;
    }

    /**
     * Select modules that train specific skills
     */
    function selectModulesForSkills(skillIds, avoidModules = []) {
        const moduleScores = {};

        // Score each module based on skill overlap
        Object.entries(SkillGraph.MODULE_SKILLS).forEach(([moduleId, moduleSkills]) => {
            if (avoidModules.includes(moduleId)) return;

            const overlap = skillIds.filter(id => moduleSkills.includes(id)).length;
            if (overlap > 0) {
                moduleScores[moduleId] = overlap;
            }
        });

        // Sort by score (descending)
        return Object.entries(moduleScores)
            .sort(([, a], [, b]) => b - a)
            .map(([moduleId]) => moduleId);
    }

    /**
     * Select a variety module (one not recently trained)
     */
    function selectVarietyModule(avoidModules = []) {
        const allModules = Object.keys(SkillGraph.MODULE_SKILLS);
        const available = allModules.filter(m => !avoidModules.includes(m));

        if (available.length === 0) {
            return allModules[Math.floor(Math.random() * allModules.length)];
        }

        return available[Math.floor(Math.random() * available.length)];
    }

    /**
     * Get modules trained in the last N days
     */
    function getRecentModules(days = 7) {
        if (typeof PerformanceTracker === 'undefined') {
            return [];
        }

        const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
        const history = PerformanceTracker.getSessionHistory();

        const recentModules = new Set();
        history.forEach(session => {
            if (session.timestamp > cutoff) {
                recentModules.add(session.moduleId);
            }
        });

        return Array.from(recentModules);
    }

    /**
     * Estimate user fatigue level (0-1)
     */
    function estimateFatigue() {
        if (typeof PerformanceTracker === 'undefined') {
            return 0;
        }

        const todayStart = new Date().setHours(0, 0, 0, 0);
        const history = PerformanceTracker.getSessionHistory();

        let todaySessions = 0;
        let todayTrials = 0;

        history.forEach(session => {
            if (session.timestamp > todayStart) {
                todaySessions++;
                todayTrials += session.trials || 0;
            }
        });

        // Fatigue model: 0 = fresh, 1 = exhausted
        // Assumes fatigue after 3 sessions or 100 trials
        return Math.min(1.0, Math.max(
            todaySessions / 3,
            todayTrials / 100
        ));
    }

    // ============================================
    // RECOMMENDATION EXPLANATIONS
    // ============================================

    /**
     * Generate human-readable explanation for session plan
     */
    function explainSession(session) {
        if (!session) return 'No session plan available';

        let explanation = `**Recommended ${session.duration}-Minute Training Session**\n\n`;

        explanation += `**Focus Areas:**\n`;
        session.focusSkills.forEach(skill => {
            const level = SkillGraph.getSkillLevel(skill.rating);
            explanation += `• ${skill.name} (${level.label} - Rating: ${Math.round(skill.rating)})\n`;
        });

        explanation += `\n**Training Plan:**\n`;
        session.recommendedModules.forEach((mod, idx) => {
            explanation += `${idx + 1}. ${getModuleName(mod.moduleId)} (${mod.duration} min)\n`;
            explanation += `   → ${mod.reason}\n`;
        });

        if (session.fatigueLevel > 0.3) {
            explanation += `\n**Note:** Fatigue level: ${Math.round(session.fatigueLevel * 100)}%\n`;
        }

        explanation += `\n**Why this plan?**\n`;
        session.reasoning.forEach(reason => {
            explanation += `• ${reason}\n`;
        });

        return explanation;
    }

    /**
     * Get friendly module name
     */
    function getModuleName(moduleId) {
        const names = {
            'symbol_memory': 'Symbol Memory',
            'morph_matrix': 'Morph Matrix',
            'expand_vision': 'Expand Vision',
            'neural_synthesis': 'Neural Synthesis',
            'music_theory': 'Music Theory',
            'psychoacoustic_wizard': 'Psychoacoustic Wizard'
        };
        return names[moduleId] || moduleId;
    }

    /**
     * Get module URL
     */
    function getModuleUrl(moduleId) {
        return `../staticHTML/${moduleId}.html`;
    }

    // ============================================
    // UI RENDERING
    // ============================================

    /**
     * Render session plan as HTML
     */
    function renderSessionPlan(container, session) {
        if (!session) {
            container.innerHTML = '<p>Unable to generate session plan. Please complete at least one training module first.</p>';
            return;
        }

        let html = `
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 8px; color: white; margin-bottom: 20px;">
                <h3 style="margin: 0 0 10px 0;">🎯 Your Personalized Training Plan</h3>
                <p style="margin: 0; opacity: 0.9;">Based on your cognitive profile and recent activity</p>
            </div>

            <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                <h4 style="margin: 0 0 10px 0; color: #333;">Focus Areas</h4>
                ${session.focusSkills.map(skill => {
                    const level = SkillGraph.getSkillLevel(skill.rating);
                    return `
                        <div style="display: flex; justify-content: space-between; align-items: center; margin: 8px 0; padding: 8px; background: white; border-radius: 4px;">
                            <span style="color: #333;">${skill.name}</span>
                            <span style="background: ${level.color}; color: white; padding: 4px 12px; border-radius: 4px; font-size: 12px;">
                                ${level.label} (${Math.round(skill.rating)})
                            </span>
                        </div>
                    `;
                }).join('')}
            </div>

            <div>
                <h4 style="margin: 0 0 15px 0; color: #333;">Recommended Modules</h4>
                ${session.recommendedModules.map((mod, idx) => `
                    <div style="background: white; padding: 15px; border-radius: 8px; margin-bottom: 10px; border-left: 4px solid ${mod.priority === 'focus' ? '#667eea' : '#4CAF50'};">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                            <strong style="color: #333;">${idx + 1}. ${getModuleName(mod.moduleId)}</strong>
                            <span style="color: #666; font-size: 14px;">${mod.duration} min</span>
                        </div>
                        <div style="color: #666; font-size: 14px; margin-bottom: 10px;">${mod.reason}</div>
                        <a href="${getModuleUrl(mod.moduleId)}"
                           style="display: inline-block; background: #0078ff; color: white; padding: 8px 16px; border-radius: 4px; text-decoration: none; font-size: 14px;">
                            Start Training →
                        </a>
                    </div>
                `).join('')}
            </div>

            ${session.fatigueLevel > 0.5 ? `
                <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 12px; border-radius: 4px; margin-top: 20px;">
                    <strong style="color: #856404;">⚠️ High Fatigue Detected</strong>
                    <p style="margin: 5px 0 0 0; color: #856404; font-size: 14px;">Consider taking a break. Training effectiveness decreases with fatigue.</p>
                </div>
            ` : ''}

            <div style="margin-top: 20px; padding: 15px; background: #e8f4f8; border-radius: 8px;">
                <strong style="color: #333;">💡 Why this plan?</strong>
                <ul style="margin: 10px 0 0 0; padding-left: 20px; color: #666;">
                    ${session.reasoning.map(reason => `<li>${reason}</li>`).join('')}
                </ul>
            </div>
        `;

        container.innerHTML = html;
    }

    // ============================================
    // PUBLIC API
    // ============================================

    return {
        // Core functions
        composeSession,
        explainSession,

        // UI functions
        renderSessionPlan,

        // Utilities
        getRecentModules,
        estimateFatigue,
        getModuleName,
        getModuleUrl
    };

})();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SessionComposer;
}

console.log('[SessionComposer] AI-driven session planning loaded');
