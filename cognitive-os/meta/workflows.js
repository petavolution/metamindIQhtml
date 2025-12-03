/**
 * Meta-Orchestration Workflows
 *
 * Practical workflow definitions that demonstrate iterative,
 * conditional, and hierarchical orchestration patterns.
 *
 * Usage:
 * ```javascript
 * Orchestra.run(Workflows.ITERATIVE_REFACTOR);
 * Orchestra.run(Workflows.META_EVOLUTION);
 * Orchestra.run(Workflows.CONDITIONAL_OPTIMIZATION);
 * ```
 */

const Workflows = {

    // ============================================
    // BASIC WORKFLOWS
    // ============================================

    /**
     * Simple linear audit and refactor
     */
    SIMPLE_AUDIT_REFACTOR: [
        'audit:codebase',
        'analyze:complexity',
        'analyze:duplication',
        'refactor:extract',
        'measure:quality'
    ],

    /**
     * Conditional refactoring based on audit results
     */
    CONDITIONAL_REFACTOR: [
        'audit:codebase',
        'decision:needs_refactor',
        'if:state.needsRefactor -> refactor:extract',
        'if:state.needsRefactor -> refactor:simplify',
        'measure:quality'
    ],

    // ============================================
    // ITERATIVE WORKFLOWS
    // ============================================

    /**
     * Iterative refactoring until quality threshold reached
     */
    ITERATIVE_REFACTOR: [
        'audit:codebase',
        'measure:quality',
        'iterate:until -> state.quality > 0.9',
        '  refactor:extract',
        '  refactor:simplify',
        '  measure:quality',
        'meta:reflect'
    ],

    /**
     * Iterative complexity reduction
     */
    REDUCE_COMPLEXITY: [
        'analyze:complexity',
        'iterate:until -> results.complexity.cognitive < 50',
        '  refactor:simplify',
        '  analyze:complexity',
        'measure:quality'
    ],

    // ============================================
    // HIERARCHICAL WORKFLOWS (with Delegation)
    // ============================================

    /**
     * Delegated refactoring with multiple agents
     */
    MULTI_AGENT_REFACTOR: [
        'audit:codebase',
        'delegate:planning_agent',
        'parallel:[delegate:refactor_agent, delegate:analysis_agent]',
        'decision:quality_threshold',
        'if:state.quality < 0.8 -> delegate:refactor_agent',
        'meta:reflect'
    ],

    /**
     * Hierarchical analysis and optimization
     */
    HIERARCHICAL_OPTIMIZATION: [
        'audit:codebase',
        'decision:architecture_change',
        'if:state.needsArchitectureChange -> [',
        '  delegate:planning_agent',
        '  delegate:refactor_agent',
        '  measure:quality',
        ']',
        'meta:evolve'
    ],

    // ============================================
    // META-EVOLUTION WORKFLOWS
    // ============================================

    /**
     * Self-evolving codebase optimization
     */
    META_EVOLUTION: [
        // Phase 1: Initial Assessment
        'audit:codebase',
        'analyze:complexity',
        'analyze:duplication',
        'analyze:dependencies',

        // Phase 2: Decision Making
        'decision:needs_refactor',
        'decision:architecture_change',

        // Phase 3: Conditional Evolution
        'if:state.needsRefactor -> [',
        '  delegate:refactor_agent',
        '  measure:quality',
        ']',

        'if:state.needsArchitectureChange -> [',
        '  delegate:planning_agent',
        '  meta:evolve',
        ']',

        // Phase 4: Iterative Improvement
        'iterate:until -> state.quality > 0.9',
        '  refactor:optimize',
        '  measure:quality',

        // Phase 5: Meta-Reflection
        'meta:reflect',
        'meta:optimize'
    ],

    /**
     * Complete self-optimization cycle
     */
    SELF_OPTIMIZE: [
        // Audit
        'audit:codebase',

        // Parallel analysis
        'parallel:[analyze:complexity, analyze:duplication, analyze:dependencies]',

        // Make decisions
        'decision:needs_refactor',
        'decision:architecture_change',
        'decision:quality_threshold',

        // Conditional execution based on decisions
        'if:state.needsRefactor -> iterate:until -> state.quality > 0.8',
        '  delegate:refactor_agent',
        '  measure:quality',

        'if:state.needsArchitectureChange -> [',
        '  delegate:planning_agent',
        '  delegate:refactor_agent',
        '  meta:evolve',
        ']',

        // Final meta-reflection
        'meta:reflect',
        'meta:optimize'
    ],

    // ============================================
    // COGNITIVE OS SPECIFIC WORKFLOWS
    // ============================================

    /**
     * Optimize Cognitive OS modules
     */
    OPTIMIZE_COGNITIVE_OS: [
        'audit:module:symbol_memory',
        'audit:module:morph_matrix',
        'audit:module:expand_vision',

        'analyze:duplication',
        'decision:needs_refactor',

        'if:state.needsRefactor -> [',
        '  delegate:refactor_agent:extract_common',
        '  refactor:modularize',
        '  measure:quality',
        ']',

        'iterate:until -> state.quality > 0.9',
        '  refactor:optimize',
        '  measure:quality',

        'meta:reflect'
    ],

    /**
     * Evolve module architecture
     */
    EVOLVE_MODULE_ARCHITECTURE: [
        // Analyze current architecture
        'audit:codebase',
        'analyze:dependencies',
        'analyze:complexity',

        // Decide on evolution strategy
        'decision:architecture_change',
        'delegate:planning_agent',

        // Execute evolution
        'if:results.plan.confidence > 0.7 -> [',
        '  delegate:refactor_agent:modularize',
        '  delegate:refactor_agent:extract_framework',
        '  measure:quality',
        ']',

        // Validate and iterate
        'iterate:until -> state.quality > 0.9',
        '  refactor:optimize',
        '  measure:quality',

        // Meta-evolve
        'meta:evolve',
        'meta:reflect'
    ],

    // ============================================
    // TESTING WORKFLOWS
    // ============================================

    /**
     * Test all orchestration patterns
     */
    TEST_ALL_PATTERNS: [
        // Test linear execution
        'audit:codebase',
        'measure:quality',

        // Test conditional
        'decision:needs_refactor',
        'if:state.needsRefactor -> refactor:extract',

        // Test iteration
        'iterate:until -> state.quality > 0.7',
        '  refactor:simplify',
        '  measure:quality',

        // Test delegation
        'delegate:refactor_agent',

        // Test parallel
        'parallel:[analyze:complexity, analyze:duplication]',

        // Test meta
        'meta:reflect'
    ],

    // ============================================
    // HELPER FUNCTIONS
    // ============================================

    /**
     * Create custom workflow
     */
    custom(commands) {
        return commands;
    },

    /**
     * Compose workflows
     */
    compose(...workflows) {
        return workflows.flat();
    },

    /**
     * Add conditional wrapper
     */
    ifThen(condition, commands) {
        return [`if:${condition} -> [`, ...commands, ']'];
    },

    /**
     * Add iteration wrapper
     */
    iterate(condition, commands) {
        return [`iterate:until -> ${condition}`, ...commands];
    },

    /**
     * Run workflow with custom commands
     */
    async runCustom(workflow, customCommands = {}) {
        // Register custom commands
        Object.entries(customCommands).forEach(([key, handler]) => {
            Orchestra.registerCommand(key, handler);
        });

        // Run workflow
        return Orchestra.run(workflow);
    }
};

// ============================================
// WORKFLOW TEMPLATES
// ============================================

/**
 * Templates for common orchestration patterns
 */
const WorkflowTemplates = {
    /**
     * Audit → Analyze → Decide → Act template
     */
    auditAnalyzeDecideAct(actCommands) {
        return [
            'audit:codebase',
            'analyze:complexity',
            'analyze:duplication',
            'decision:needs_refactor',
            `if:state.needsRefactor -> [`,
            ...actCommands,
            ']',
            'meta:reflect'
        ];
    },

    /**
     * Iterative improvement template
     */
    iterativeImprovement(commands, threshold = 0.9) {
        return [
            'measure:quality',
            `iterate:until -> state.quality > ${threshold}`,
            ...commands,
            '  measure:quality',
            'meta:reflect'
        ];
    },

    /**
     * Multi-agent collaboration template
     */
    multiAgentCollaboration(agents) {
        return [
            'audit:codebase',
            `parallel:[${agents.map(a => `delegate:${a}_agent`).join(', ')}]`,
            'measure:quality',
            'meta:reflect'
        ];
    },

    /**
     * Self-evolution template
     */
    selfEvolution(phases) {
        return [
            ...phases.flatMap(phase => [
                `// Phase: ${phase.name}`,
                ...phase.commands
            ]),
            'meta:evolve',
            'meta:reflect'
        ];
    }
};

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Workflows, WorkflowTemplates };
}

console.log('[Workflows] Meta-orchestration workflows loaded');
console.log('[Workflows] Available workflows:', Object.keys(Workflows).length);
