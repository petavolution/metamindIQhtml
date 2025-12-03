/**
 * Meta-Orchestration CLI
 *
 * Command-line interface for running orchestration workflows.
 *
 * Usage:
 * ```bash
 * node cli.js audit
 * node cli.js refactor
 * node cli.js genplan
 * node cli.js continue
 * node cli.js meta-refactor
 * ```
 *
 * Or programmatically:
 * ```javascript
 * CLI.run('audit');
 * CLI.run('refactor');
 * CLI.runSequence(['audit', 'refactor', 'genplan']);
 * ```
 */

const CLI = (function() {
    'use strict';

    // Load dependencies (assuming they're in same directory)
    let Orchestra, Workflows;

    if (typeof require !== 'undefined') {
        Orchestra = require('./orchestration_engine');
        Workflows = require('./workflows').Workflows;
    } else if (typeof window !== 'undefined') {
        Orchestra = window.Orchestra;
        Workflows = window.Workflows;
    }

    // ============================================
    // CLI COMMAND DEFINITIONS
    // ============================================

    const CLI_COMMANDS = {
        /**
         * Audit codebase
         */
        audit: {
            description: 'Audit codebase for quality, complexity, and duplication',
            workflow: [
                'audit:codebase',
                'analyze:complexity',
                'analyze:duplication',
                'analyze:dependencies',
                'measure:quality'
            ]
        },

        /**
         * Load context (for AI agents)
         */
        'load-context': {
            description: 'Load and analyze codebase context',
            workflow: [
                'audit:codebase',
                'analyze:complexity',
                'analyze:dependencies',
                'delegate:analysis_agent'
            ]
        },

        /**
         * Refactor code
         */
        refactor: {
            description: 'Perform intelligent refactoring',
            workflow: [
                'decision:needs_refactor',
                'if:state.needsRefactor -> delegate:refactor_agent',
                'measure:quality'
            ]
        },

        /**
         * Generate plan
         */
        genplan: {
            description: 'Generate refactoring/optimization plan',
            workflow: [
                'audit:codebase',
                'analyze:complexity',
                'delegate:planning_agent'
            ]
        },

        /**
         * Continue previous workflow
         */
        continue: {
            description: 'Continue from previous execution context',
            workflow: [] // Special: loads previous context
        },

        /**
         * Meta-refactor (refactor the refactoring process)
         */
        'meta-refactor': {
            description: 'Meta-refactor: optimize the optimization process',
            workflow: Workflows.META_EVOLUTION
        },

        /**
         * Full optimization cycle
         */
        optimize: {
            description: 'Run complete optimization cycle',
            workflow: Workflows.SELF_OPTIMIZE
        },

        /**
         * Iterative improvement
         */
        iterate: {
            description: 'Iteratively improve until quality threshold',
            workflow: Workflows.ITERATIVE_REFACTOR
        },

        /**
         * Reflect on orchestration
         */
        reflect: {
            description: 'Meta-reflect on orchestration process',
            workflow: ['meta:reflect']
        }
    };

    // ============================================
    // EXECUTION CONTEXT PERSISTENCE
    // ============================================

    let lastContext = null;
    const contextHistory = [];

    function saveContext(context) {
        lastContext = context;
        contextHistory.push({
            timestamp: Date.now(),
            context: context.getContext()
        });

        // Persist to storage if available
        if (typeof localStorage !== 'undefined') {
            try {
                localStorage.setItem('orchestra_last_context', JSON.stringify(lastContext.getContext()));
                localStorage.setItem('orchestra_history', JSON.stringify(contextHistory.slice(-10)));
            } catch (e) {
                console.warn('[CLI] Failed to persist context:', e);
            }
        }
    }

    function loadLastContext() {
        if (lastContext) return lastContext;

        // Try to load from storage
        if (typeof localStorage !== 'undefined') {
            try {
                const stored = localStorage.getItem('orchestra_last_context');
                if (stored) {
                    const data = JSON.parse(stored);
                    const ctx = new Orchestra.ExecutionContext(data.state);
                    ctx.results = data.results;
                    ctx.history = data.history;
                    ctx.metrics = data.metrics;
                    lastContext = ctx;
                    return ctx;
                }
            } catch (e) {
                console.warn('[CLI] Failed to load context:', e);
            }
        }

        return null;
    }

    // ============================================
    // CLI COMMAND EXECUTION
    // ============================================

    /**
     * Run a single CLI command
     */
    async function run(commandName, options = {}) {
        console.log(`[CLI] Running command: ${commandName}`);

        const command = CLI_COMMANDS[commandName];
        if (!command) {
            console.error(`[CLI] Unknown command: ${commandName}`);
            console.log(`[CLI] Available commands: ${Object.keys(CLI_COMMANDS).join(', ')}`);
            return null;
        }

        // Special handling for 'continue'
        if (commandName === 'continue') {
            return runContinue(options);
        }

        // Create initial state
        const initialState = options.state || {};
        if (options.continueFrom && lastContext) {
            Object.assign(initialState, lastContext.state);
        }

        // Run workflow
        const context = await Orchestra.run(command.workflow, initialState);

        // Save context for continuation
        saveContext(context);

        // Print results
        printResults(context);

        return context;
    }

    /**
     * Continue from previous execution
     */
    async function runContinue(options = {}) {
        const prevContext = loadLastContext();

        if (!prevContext) {
            console.warn('[CLI] No previous context found. Run another command first.');
            return null;
        }

        console.log('[CLI] Continuing from previous execution...');
        console.log('[CLI] Previous state:', prevContext.state);

        // Determine next steps based on previous results
        const nextWorkflow = determineNextSteps(prevContext);

        if (nextWorkflow.length === 0) {
            console.log('[CLI] No further actions needed. Quality threshold reached.');
            return prevContext;
        }

        // Execute next steps
        const context = await Orchestra.run(nextWorkflow, prevContext.state);

        // Merge with previous context
        prevContext.mergeChild(context);

        saveContext(prevContext);
        printResults(prevContext);

        return prevContext;
    }

    /**
     * Determine next steps based on context
     */
    function determineNextSteps(context) {
        const quality = context.state.quality || 0;
        const needsRefactor = context.state.needsRefactor;

        console.log(`[CLI] Current quality: ${(quality * 100).toFixed(1)}%`);

        if (quality >= 0.9) {
            return [];
        }

        if (needsRefactor) {
            return [
                'delegate:refactor_agent',
                'measure:quality'
            ];
        }

        return [
            'refactor:optimize',
            'measure:quality'
        ];
    }

    /**
     * Run a sequence of commands
     */
    async function runSequence(commands, options = {}) {
        console.log(`[CLI] Running sequence: ${commands.join(' → ')}`);

        let context = null;

        for (const command of commands) {
            const opts = { ...options };
            if (context) {
                opts.state = context.state;
            }

            context = await run(command, opts);

            if (!context) {
                console.error(`[CLI] Sequence aborted at: ${command}`);
                break;
            }
        }

        return context;
    }

    /**
     * Run custom workflow
     */
    async function runWorkflow(workflow, options = {}) {
        console.log('[CLI] Running custom workflow');

        const context = await Orchestra.run(workflow, options.state || {});

        saveContext(context);
        printResults(context);

        return context;
    }

    // ============================================
    // OUTPUT FORMATTING
    // ============================================

    function printResults(context) {
        console.log('\n' + '='.repeat(60));
        console.log('EXECUTION SUMMARY');
        console.log('='.repeat(60));

        // State
        console.log('\n📊 Final State:');
        Object.entries(context.state).forEach(([key, value]) => {
            if (typeof value === 'number') {
                console.log(`  ${key}: ${(value * 100).toFixed(1)}%`);
            } else {
                console.log(`  ${key}: ${value}`);
            }
        });

        // Metrics
        console.log('\n📈 Metrics:');
        Object.entries(context.metrics).forEach(([key, value]) => {
            console.log(`  ${key}: ${value}`);
        });

        // Key Results
        console.log('\n🎯 Key Results:');
        Object.entries(context.results).forEach(([key, value]) => {
            console.log(`  ${key}:`, value);
        });

        // Visualization
        console.log('\n📋 Execution Flow:');
        Orchestra.visualize(context);

        console.log('\n' + '='.repeat(60));
    }

    /**
     * Print help
     */
    function printHelp() {
        console.log('\n🎼 Meta-Orchestration CLI');
        console.log('='.repeat(60));
        console.log('\nAvailable commands:\n');

        Object.entries(CLI_COMMANDS).forEach(([name, cmd]) => {
            console.log(`  ${name.padEnd(15)} - ${cmd.description}`);
        });

        console.log('\nUsage:');
        console.log('  node cli.js <command>');
        console.log('  node cli.js audit');
        console.log('  node cli.js refactor');
        console.log('  node cli.js genplan');
        console.log('  node cli.js continue');
        console.log('  node cli.js meta-refactor');

        console.log('\nSequences:');
        console.log('  node cli.js audit refactor genplan continue');

        console.log('\n' + '='.repeat(60) + '\n');
    }

    // ============================================
    // NODE.JS CLI INTERFACE
    // ============================================

    /**
     * Main CLI entry point for Node.js
     */
    async function main(args = process.argv.slice(2)) {
        if (args.length === 0 || args[0] === 'help' || args[0] === '--help') {
            printHelp();
            return;
        }

        // Single command
        if (args.length === 1) {
            await run(args[0]);
            return;
        }

        // Sequence of commands
        await runSequence(args);
    }

    // Run if executed directly
    if (typeof require !== 'undefined' && require.main === module) {
        main().catch(error => {
            console.error('[CLI] Fatal error:', error);
            process.exit(1);
        });
    }

    // ============================================
    // PUBLIC API
    // ============================================

    return {
        run,
        runSequence,
        runWorkflow,
        runContinue,
        printHelp,
        main,

        // Access to commands
        commands: CLI_COMMANDS,

        // Context management
        getLastContext: () => lastContext,
        getContextHistory: () => contextHistory,
        loadLastContext,
        saveContext
    };

})();

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CLI;
}

console.log('[CLI] Meta-orchestration CLI loaded');
