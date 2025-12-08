/**
 * Cognitive OS - Unified Skill Graph
 *
 * Core innovation: Every module trains specific cognitive skills,
 * tracked with Elo-style ratings across all training sessions.
 *
 * This replaces per-module progress with unified cognitive skill tracking.
 */

const SkillGraph = (function() {
    'use strict';

    // ============================================
    // SKILL TAXONOMY (18 Core Cognitive Skills)
    // ============================================

    const SKILLS = {
        // Working Memory Branch
        'wm.visual': {
            id: 'wm.visual',
            name: 'Visual Working Memory',
            domain: 'memory',
            description: 'Hold visual patterns in mind',
            rating: 1500, // Elo-style rating
            confidence: 100 // Confidence in rating (increases with trials)
        },
        'wm.spatial': {
            id: 'wm.spatial',
            name: 'Spatial Working Memory',
            domain: 'memory',
            description: 'Remember locations and spatial relationships',
            rating: 1500,
            confidence: 100
        },
        'wm.sequence': {
            id: 'wm.sequence',
            name: 'Sequence Working Memory',
            domain: 'memory',
            description: 'Remember ordered sequences',
            rating: 1500,
            confidence: 100
        },
        'wm.binding': {
            id: 'wm.binding',
            name: 'Feature Binding',
            domain: 'memory',
            description: 'Link features (color, shape, position)',
            rating: 1500,
            confidence: 100
        },

        // Attention Branch
        'attn.selective': {
            id: 'attn.selective',
            name: 'Selective Attention',
            domain: 'attention',
            description: 'Focus on relevant stimuli',
            rating: 1500,
            confidence: 100
        },
        'attn.divided': {
            id: 'attn.divided',
            name: 'Divided Attention',
            domain: 'attention',
            description: 'Monitor multiple streams simultaneously',
            rating: 1500,
            confidence: 100
        },
        'attn.sustained': {
            id: 'attn.sustained',
            name: 'Sustained Attention',
            domain: 'attention',
            description: 'Maintain focus over time',
            rating: 1500,
            confidence: 100
        },
        'attn.breadth': {
            id: 'attn.breadth',
            name: 'Attentional Breadth',
            domain: 'attention',
            description: 'Expand peripheral awareness',
            rating: 1500,
            confidence: 100
        },

        // Cognitive Control
        'control.inhibition': {
            id: 'control.inhibition',
            name: 'Inhibitory Control',
            domain: 'control',
            description: 'Suppress automatic responses',
            rating: 1500,
            confidence: 100
        },
        'control.switching': {
            id: 'control.switching',
            name: 'Task Switching',
            domain: 'control',
            description: 'Switch between task rules',
            rating: 1500,
            confidence: 100
        },
        'control.conflict': {
            id: 'control.conflict',
            name: 'Conflict Monitoring',
            domain: 'control',
            description: 'Detect and resolve conflicts',
            rating: 1500,
            confidence: 100
        },

        // Perception
        'percept.discrimination': {
            id: 'percept.discrimination',
            name: 'Fine Discrimination',
            domain: 'perception',
            description: 'Distinguish similar stimuli',
            rating: 1500,
            confidence: 100
        },
        'percept.noise_robust': {
            id: 'percept.noise_robust',
            name: 'Noise Robustness',
            domain: 'perception',
            description: 'Perceive under interference',
            rating: 1500,
            confidence: 100
        },
        'percept.temporal': {
            id: 'percept.temporal',
            name: 'Temporal Resolution',
            domain: 'perception',
            description: 'Detect rapid changes',
            rating: 1500,
            confidence: 100
        },

        // Cross-Modal Integration
        'xmodal.audiovisual': {
            id: 'xmodal.audiovisual',
            name: 'Audiovisual Binding',
            domain: 'integration',
            description: 'Integrate sight and sound',
            rating: 1500,
            confidence: 100
        },
        'xmodal.sequence': {
            id: 'xmodal.sequence',
            name: 'Multimodal Sequences',
            domain: 'integration',
            description: 'Track cross-modal patterns',
            rating: 1500,
            confidence: 100
        },

        // Auditory Cognition
        'audio.pitch': {
            id: 'audio.pitch',
            name: 'Pitch Discrimination',
            domain: 'auditory',
            description: 'Distinguish pitch differences',
            rating: 1500,
            confidence: 100
        },
        'audio.rhythm': {
            id: 'audio.rhythm',
            name: 'Rhythm Timing',
            domain: 'auditory',
            description: 'Perceive temporal patterns',
            rating: 1500,
            confidence: 100
        },
        'audio.parsing': {
            id: 'audio.parsing',
            name: 'Auditory Scene Parsing',
            domain: 'auditory',
            description: 'Separate sound sources',
            rating: 1500,
            confidence: 100
        }
    };

    // ============================================
    // MODULE-TO-SKILLS MAPPING
    // ============================================

    const MODULE_SKILLS = {
        'symbol_memory': ['wm.visual', 'wm.binding', 'attn.selective'],
        'morph_matrix': ['wm.spatial', 'percept.discrimination', 'control.conflict'],
        'expand_vision': ['attn.breadth', 'attn.divided', 'percept.temporal'],
        'neural_flow': ['control.switching', 'control.conflict', 'percept.temporal'],
        'neural_synthesis': ['xmodal.audiovisual', 'xmodal.sequence', 'wm.sequence'],
        'music_theory': ['audio.pitch', 'audio.parsing', 'percept.discrimination'],
        'psychoacoustic_wizard': ['audio.rhythm', 'percept.temporal', 'control.conflict']
    };

    // ============================================
    // CORE API
    // ============================================

    /**
     * Load skill ratings from storage or use defaults
     */
    function loadSkills() {
        try {
            const stored = localStorage.getItem('metamind_skill_graph');
            if (stored) {
                const parsed = JSON.parse(stored);
                // Merge with defaults (in case new skills were added)
                Object.keys(SKILLS).forEach(skillId => {
                    if (parsed[skillId]) {
                        SKILLS[skillId].rating = parsed[skillId].rating;
                        SKILLS[skillId].confidence = parsed[skillId].confidence;
                    }
                });
                console.log('[SkillGraph] Loaded skill ratings from storage');
            }
        } catch (e) {
            console.warn('[SkillGraph] Failed to load skills:', e);
        }
    }

    /**
     * Save skill ratings to storage
     */
    function saveSkills() {
        try {
            localStorage.setItem('metamind_skill_graph', JSON.stringify(SKILLS));
        } catch (e) {
            console.warn('[SkillGraph] Failed to save skills:', e);
        }
    }

    /**
     * Update skill rating based on trial outcome
     * Uses Elo-style rating system
     *
     * @param {string} skillId - Skill identifier
     * @param {object} trial - Trial data { correct, difficulty, reactionTime }
     */
    function updateSkillRating(skillId, trial) {
        if (!SKILLS[skillId]) {
            console.warn('[SkillGraph] Unknown skill:', skillId);
            return;
        }

        const skill = SKILLS[skillId];
        const k = 32 * (100 / (skill.confidence + 100)); // K-factor decreases with confidence

        // Expected performance based on difficulty
        const difficultyRating = trial.difficulty || 1500;
        const expected = 1 / (1 + Math.pow(10, (difficultyRating - skill.rating) / 400));

        // Actual performance (0 or 1)
        const actual = trial.correct ? 1 : 0;

        // Update rating
        const delta = k * (actual - expected);
        skill.rating = Math.max(800, Math.min(2400, skill.rating + delta));
        skill.confidence += 1;

        saveSkills();

        return {
            skillId,
            oldRating: skill.rating - delta,
            newRating: skill.rating,
            delta,
            expected,
            actual
        };
    }

    /**
     * Update all skills for a module based on trial outcome
     */
    function updateModuleSkills(moduleId, trial) {
        const skillIds = MODULE_SKILLS[moduleId];
        if (!skillIds) {
            console.warn('[SkillGraph] Unknown module:', moduleId);
            return [];
        }

        return skillIds.map(skillId => updateSkillRating(skillId, trial));
    }

    /**
     * Get skill level label from rating
     */
    function getSkillLevel(rating) {
        if (rating < 1200) return { label: 'Novice', color: '#888' };
        if (rating < 1400) return { label: 'Intermediate', color: '#4CAF50' };
        if (rating < 1600) return { label: 'Proficient', color: '#2196F3' };
        if (rating < 1800) return { label: 'Advanced', color: '#FF9800' };
        return { label: 'Expert', color: '#F44336' };
    }

    /**
     * Get all skills for a domain
     */
    function getSkillsByDomain(domain) {
        return Object.values(SKILLS).filter(skill => skill.domain === domain);
    }

    /**
     * Get weakest skills (lowest ratings)
     */
    function getWeakestSkills(count = 5) {
        return Object.values(SKILLS)
            .sort((a, b) => a.rating - b.rating)
            .slice(0, count);
    }

    /**
     * Get strongest skills (highest ratings)
     */
    function getStrongestSkills(count = 5) {
        return Object.values(SKILLS)
            .sort((a, b) => b.rating - a.rating)
            .slice(0, count);
    }

    /**
     * Get skills trained by a module
     */
    function getModuleSkills(moduleId) {
        const skillIds = MODULE_SKILLS[moduleId];
        if (!skillIds) return [];
        return skillIds.map(id => SKILLS[id]);
    }

    /**
     * Find modules that train a specific skill
     */
    function getModulesForSkill(skillId) {
        const modules = [];
        Object.entries(MODULE_SKILLS).forEach(([moduleId, skills]) => {
            if (skills.includes(skillId)) {
                modules.push(moduleId);
            }
        });
        return modules;
    }

    /**
     * Get overall cognitive profile summary
     */
    function getCognitiveProfile() {
        const domains = {};

        Object.values(SKILLS).forEach(skill => {
            if (!domains[skill.domain]) {
                domains[skill.domain] = {
                    name: skill.domain,
                    skills: [],
                    avgRating: 0
                };
            }
            domains[skill.domain].skills.push(skill);
        });

        // Calculate average ratings per domain
        Object.values(domains).forEach(domain => {
            domain.avgRating = domain.skills.reduce((sum, s) => sum + s.rating, 0) / domain.skills.length;
        });

        return {
            domains,
            overallRating: Object.values(SKILLS).reduce((sum, s) => sum + s.rating, 0) / Object.keys(SKILLS).length,
            weakest: getWeakestSkills(3),
            strongest: getStrongestSkills(3)
        };
    }

    /**
     * Reset all skill ratings to default
     */
    function resetSkills() {
        Object.values(SKILLS).forEach(skill => {
            skill.rating = 1500;
            skill.confidence = 100;
        });
        saveSkills();
        console.log('[SkillGraph] All skills reset to default');
    }

    // Initialize on load
    loadSkills();

    // ============================================
    // PUBLIC API
    // ============================================

    return {
        // Core functions
        updateSkillRating,
        updateModuleSkills,

        // Queries
        getSkill: (id) => SKILLS[id],
        getAllSkills: () => Object.values(SKILLS),
        getSkillLevel,
        getSkillsByDomain,
        getWeakestSkills,
        getStrongestSkills,
        getModuleSkills,
        getModulesForSkill,
        getCognitiveProfile,

        // Data management
        loadSkills,
        saveSkills,
        resetSkills,

        // Constants
        SKILLS,
        MODULE_SKILLS
    };

})();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SkillGraph;
}

console.log('[SkillGraph] Unified Skill Graph loaded - 18 cognitive skills tracked');
