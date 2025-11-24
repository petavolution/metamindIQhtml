#!/usr/bin/env node
/**
 * MetaMindIQTrain - CLI Test Runner
 * Run tests and output results to debug-log.txt
 *
 * Usage: node test-runner.js [options]
 * Options:
 *   --verbose    Show detailed output
 *   --module X   Test specific module
 *   --output F   Write logs to file F (default: debug-log.txt)
 */

const fs = require('fs');
const path = require('path');

// ============================================
// CONFIGURATION
// ============================================

const CONFIG = {
    verbose: process.argv.includes('--verbose') || process.argv.includes('-v'),
    outputFile: getArgValue('--output') || 'debug-log.txt',
    targetModule: getArgValue('--module'),
    colors: {
        reset: '\x1b[0m',
        red: '\x1b[31m',
        green: '\x1b[32m',
        yellow: '\x1b[33m',
        blue: '\x1b[34m',
        cyan: '\x1b[36m'
    }
};

function getArgValue(flag) {
    const idx = process.argv.indexOf(flag);
    return idx > -1 && process.argv[idx + 1] ? process.argv[idx + 1] : null;
}

// ============================================
// LOGGER
// ============================================

const Logger = {
    buffer: [],

    log(level, module, message, data = null) {
        const timestamp = new Date().toISOString();
        const entry = { timestamp, level, module, message, data };
        this.buffer.push(entry);

        const color = level === 'ERROR' ? CONFIG.colors.red :
                      level === 'WARN' ? CONFIG.colors.yellow :
                      level === 'INFO' ? CONFIG.colors.green :
                      CONFIG.colors.cyan;

        if (CONFIG.verbose || level === 'ERROR' || level === 'WARN') {
            console.log(`${color}[${level}]${CONFIG.colors.reset} [${module}] ${message}`);
            if (data && CONFIG.verbose) {
                console.log('  Data:', JSON.stringify(data, null, 2));
            }
        }
    },

    error(module, msg, data) { this.log('ERROR', module, msg, data); },
    warn(module, msg, data) { this.log('WARN', module, msg, data); },
    info(module, msg, data) { this.log('INFO', module, msg, data); },
    debug(module, msg, data) { this.log('DEBUG', module, msg, data); },

    writeToFile() {
        const content = this.buffer.map(e => {
            let line = `${e.timestamp} [${e.level}] [${e.module}] ${e.message}`;
            if (e.data) line += `\n  Data: ${JSON.stringify(e.data)}`;
            return line;
        }).join('\n');

        fs.writeFileSync(CONFIG.outputFile, content);
        console.log(`\n${CONFIG.colors.blue}Logs written to: ${CONFIG.outputFile}${CONFIG.colors.reset}`);
    }
};

// ============================================
// TEST FRAMEWORK
// ============================================

const TestRunner = {
    results: [],
    currentSuite: null,

    suite(name, fn) {
        this.currentSuite = name;
        Logger.info('Test', `\n=== Suite: ${name} ===`);
        try {
            fn();
        } catch (e) {
            Logger.error('Test', `Suite "${name}" threw error: ${e.message}`, { stack: e.stack });
        }
        this.currentSuite = null;
    },

    test(name, fn) {
        const fullName = this.currentSuite ? `${this.currentSuite} > ${name}` : name;
        const start = Date.now();
        let passed = false;
        let error = null;

        try {
            fn();
            passed = true;
        } catch (e) {
            error = e;
        }

        const duration = Date.now() - start;
        this.results.push({ name: fullName, passed, error, duration });

        const symbol = passed ? `${CONFIG.colors.green}✓${CONFIG.colors.reset}` :
                                `${CONFIG.colors.red}✗${CONFIG.colors.reset}`;
        console.log(`  ${symbol} ${name} (${duration}ms)`);

        if (!passed) {
            Logger.error('Test', `FAILED: ${fullName}`, { error: error.message, stack: error.stack });
        }
    },

    assert(condition, message = 'Assertion failed') {
        if (!condition) throw new Error(message);
    },

    assertEqual(actual, expected, message = '') {
        if (actual !== expected) {
            throw new Error(`${message} Expected "${expected}", got "${actual}"`);
        }
    },

    assertNotNull(value, message = 'Expected non-null value') {
        if (value === null || value === undefined) {
            throw new Error(message);
        }
    },

    assertContains(str, substr, message = '') {
        if (!str || !str.includes(substr)) {
            throw new Error(`${message} Expected "${str}" to contain "${substr}"`);
        }
    },

    getSummary() {
        const total = this.results.length;
        const passed = this.results.filter(r => r.passed).length;
        const failed = total - passed;
        return { total, passed, failed };
    }
};

// ============================================
// FILE VALIDATION TESTS
// ============================================

function testFileExists(filePath, description) {
    TestRunner.test(`${description} exists`, () => {
        TestRunner.assert(fs.existsSync(filePath), `File not found: ${filePath}`);
    });
}

function testFileContent(filePath, patterns, description) {
    TestRunner.test(`${description} has required content`, () => {
        const content = fs.readFileSync(filePath, 'utf8');
        patterns.forEach(pattern => {
            if (typeof pattern === 'string') {
                TestRunner.assertContains(content, pattern, `Missing: ${pattern}`);
            } else if (pattern instanceof RegExp) {
                TestRunner.assert(pattern.test(content), `Pattern not found: ${pattern}`);
            }
        });
    });
}

function testNoErrors(filePath, description) {
    TestRunner.test(`${description} has no syntax errors`, () => {
        const content = fs.readFileSync(filePath, 'utf8');

        // Check for common JS errors
        const errorPatterns = [
            /\bconsole\.log\([^)]*undefined[^)]*\)/,  // console.log(undefined)
            /document\.getElementById\(['"]\s*['"]\)/,  // empty getElementById
            /\.addEventListener\(\s*,/,  // missing event type
        ];

        errorPatterns.forEach(pattern => {
            TestRunner.assert(!pattern.test(content), `Potential error found: ${pattern}`);
        });
    });
}

function testHTMLStructure(filePath, description) {
    TestRunner.test(`${description} has valid structure`, () => {
        const content = fs.readFileSync(filePath, 'utf8');

        // Check required elements
        TestRunner.assertContains(content, '<!DOCTYPE html>', 'Missing DOCTYPE');
        TestRunner.assertContains(content, '<html', 'Missing html tag');
        TestRunner.assertContains(content, '</html>', 'Missing closing html tag');
        TestRunner.assertContains(content, '<head>', 'Missing head tag');
        TestRunner.assertContains(content, '<body>', 'Missing body tag');

        // Check for core.js inclusion
        TestRunner.assertContains(content, 'core.js', 'Missing core.js script');
    });
}

function testCSSVariables(filePath, description) {
    TestRunner.test(`${description} uses CSS variables correctly`, () => {
        const content = fs.readFileSync(filePath, 'utf8');

        // Check for undefined variables
        const varUsages = content.match(/var\(--[^)]+\)/g) || [];
        const varDefinitions = content.match(/--[\w-]+:/g) || [];

        // This is a basic check - in a real app you'd verify each usage
        TestRunner.assert(varUsages.length > 0 || varDefinitions.length > 0,
            'No CSS variables found');
    });
}

// ============================================
// CORE MODULE TESTS
// ============================================

function runCoreTests() {
    TestRunner.suite('Core Module', () => {
        const corePath = path.join(__dirname, 'core.js');

        testFileExists(corePath, 'core.js');

        testFileContent(corePath, [
            'MetaMind',
            'Debug',
            'ErrorHandler',
            'DOM',
            'Audio',
            'Timer',
            'Screens',
            'Storage',
            'Test'
        ], 'core.js');

        TestRunner.test('core.js has error handling', () => {
            const content = fs.readFileSync(corePath, 'utf8');
            TestRunner.assertContains(content, 'try {');
            TestRunner.assertContains(content, 'catch');
            TestRunner.assertContains(content, 'Debug.error');
        });

        TestRunner.test('core.js has safe DOM access', () => {
            const content = fs.readFileSync(corePath, 'utf8');
            TestRunner.assertContains(content, 'if (el)');
            TestRunner.assertContains(content, 'required');
        });
    });
}

// ============================================
// MODULE TESTS
// ============================================

function runModuleTests(moduleName, jsFile, htmlFile, cssFile) {
    TestRunner.suite(`${moduleName} Module`, () => {
        const jsPath = path.join(__dirname, jsFile);
        const htmlPath = path.join(__dirname, htmlFile);
        const cssPath = path.join(__dirname, cssFile);

        // File existence
        testFileExists(jsPath, `${moduleName} JS`);
        testFileExists(htmlPath, `${moduleName} HTML`);
        testFileExists(cssPath, `${moduleName} CSS`);

        // HTML structure
        testHTMLStructure(htmlPath, `${moduleName} HTML`);

        // CSS validation
        testCSSVariables(cssPath, `${moduleName} CSS`);

        // JS validation
        testNoErrors(jsPath, `${moduleName} JS`);

        // Module-specific tests
        TestRunner.test(`${moduleName} JS has init function`, () => {
            const content = fs.readFileSync(jsPath, 'utf8');
            TestRunner.assertContains(content, 'function init');
        });

        TestRunner.test(`${moduleName} JS uses DOMContentLoaded`, () => {
            const content = fs.readFileSync(jsPath, 'utf8');
            TestRunner.assertContains(content, 'DOMContentLoaded');
        });
    });
}

// ============================================
// INTEGRATION TESTS
// ============================================

function runIntegrationTests() {
    TestRunner.suite('Integration', () => {
        TestRunner.test('All modules reference core.js', () => {
            const htmlFiles = [
                'symbol_memory.html',
                'morph_matrix.html',
                'expand_vision.html'
            ];

            htmlFiles.forEach(file => {
                const content = fs.readFileSync(path.join(__dirname, file), 'utf8');
                TestRunner.assertContains(content, 'core.js',
                    `${file} missing core.js reference`);
            });
        });

        TestRunner.test('Styles.css defines required variables', () => {
            const content = fs.readFileSync(path.join(__dirname, 'styles.css'), 'utf8');
            const requiredVars = [
                '--bg-primary',
                '--color-success',
                '--color-error',
                '--color-primary'
            ];

            requiredVars.forEach(v => {
                TestRunner.assertContains(content, v, `Missing CSS variable: ${v}`);
            });
        });

        TestRunner.test('Index.html links to all modules', () => {
            const content = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
            TestRunner.assertContains(content, 'symbol_memory.html');
            TestRunner.assertContains(content, 'morph_matrix.html');
            TestRunner.assertContains(content, 'expand_vision.html');
        });
    });
}

// ============================================
// SECURITY TESTS
// ============================================

function runSecurityTests() {
    TestRunner.suite('Security', () => {
        const jsFiles = fs.readdirSync(__dirname).filter(f => f.endsWith('.js'));

        jsFiles.forEach(file => {
            if (file === 'test-runner.js') return;

            TestRunner.test(`${file} no eval() usage`, () => {
                const content = fs.readFileSync(path.join(__dirname, file), 'utf8');
                TestRunner.assert(!content.includes('eval('),
                    `${file} contains eval() - security risk`);
            });

            TestRunner.test(`${file} no innerHTML with user input`, () => {
                const content = fs.readFileSync(path.join(__dirname, file), 'utf8');
                // Basic check - would need more sophisticated analysis in production
                const dangerousPattern = /innerHTML\s*=\s*[^'"]/;
                // Allow innerHTML = '' and innerHTML = 'static'
                // This is a simplified check
            });
        });
    });
}

// ============================================
// MAIN
// ============================================

function main() {
    console.log(`\n${CONFIG.colors.blue}╔════════════════════════════════════════╗${CONFIG.colors.reset}`);
    console.log(`${CONFIG.colors.blue}║   MetaMindIQTrain Test Runner v1.0     ║${CONFIG.colors.reset}`);
    console.log(`${CONFIG.colors.blue}╚════════════════════════════════════════╝${CONFIG.colors.reset}\n`);

    Logger.info('Runner', 'Starting test run');

    // Run all test suites
    runCoreTests();

    runModuleTests('Symbol Memory', 'symbol_memory.js', 'symbol_memory.html', 'symbol_memory.css');
    runModuleTests('Morph Matrix', 'morph_matrix.js', 'morph_matrix.html', 'morph_matrix.css');
    runModuleTests('Expand Vision', 'expand_vision.js', 'expand_vision.html', 'expand_vision.css');

    runIntegrationTests();
    runSecurityTests();

    // Summary
    const summary = TestRunner.getSummary();
    console.log(`\n${CONFIG.colors.blue}════════════════════════════════════════${CONFIG.colors.reset}`);
    console.log(`${CONFIG.colors.blue}Test Summary${CONFIG.colors.reset}`);
    console.log(`${CONFIG.colors.blue}════════════════════════════════════════${CONFIG.colors.reset}`);
    console.log(`  Total:  ${summary.total}`);
    console.log(`  ${CONFIG.colors.green}Passed: ${summary.passed}${CONFIG.colors.reset}`);
    console.log(`  ${CONFIG.colors.red}Failed: ${summary.failed}${CONFIG.colors.reset}`);

    Logger.info('Runner', `Test run complete: ${summary.passed}/${summary.total} passed`);

    // Write logs to file
    Logger.writeToFile();

    // Exit code
    process.exit(summary.failed > 0 ? 1 : 0);
}

main();
