# OUTPUT MANAGEMENT - CRITICAL INSTRUCTIONS

**NEVER EVER EVER RUN COMMANDS WITH LONG OUTPUT WITHOUT CUTTING THE OUTPUT FIRST!**

## MANDATORY OUTPUT CONTROL

All agents MUST follow these rules to prevent wasting AI credits on massive command outputs:

### 1. ALWAYS USE SILENT FLAGS

**Tests - NEVER run tests verbosely:**
```bash
# ✅ CORRECT
npm test --silent
jest --silent --passWithNoTests
mocha --reporter min --quiet
vitest run --silent

# ❌ WRONG - WILL GENERATE MASSIVE OUTPUT
npm test
jest
mocha
vitest
```

**Builds - Always suppress verbose output:**
```bash
# ✅ CORRECT
npm run build --silent
tsc --silent
vite build --silent

# ❌ WRONG
npm run build
tsc
vite build
```

**Package Installation:**
```bash
# ✅ CORRECT
npm install --silent
npm ci --silent
yarn --silent

# ❌ WRONG
npm install
npm ci
yarn
```

### 2. COMMAND OUTPUT TRUNCATION

The `RunCommandTool` has been FIXED to:
- Automatically add `--silent` flags to common commands
- Truncate all output to maximum 2000 characters
- Limit output to maximum 50 lines
- Reduce maxBuffer from 2MB to 256KB

### 3. VALIDATION OUTPUT CONTROL

The `ValidationEngine` has been FIXED to:
- Apply auto-fixes BEFORE reporting issues to AI
- Filter out auto-fixable issues from AI reports
- Only report unfixed issues to save credits
- Enforce silent mode in all validators

### 4. MANDATORY PRACTICES

**DO:**
- Always use `--silent`, `--quiet`, or `--reporter min` flags
- Limit file processing (max 20 files for syntax checks, 10 for style)
- Limit issue reporting (max 10-20 issues per category)
- Truncate all command outputs
- Use reduced maxBuffer settings (256KB max)

**DON'T:**
- Run `npm test` without `--silent`
- Run `jest` without `--silent`
- Run `tsc` without `--silent` 
- Process unlimited files
- Report unlimited issues
- Allow outputs over 2000 characters

### 5. SPECIFIC COMMAND MODIFICATIONS

**TypeScript Compilation:**
```bash
# ✅ ALWAYS USE
npx tsc --noEmit --silent

# ❌ NEVER USE
npx tsc --noEmit
```

**ESLint:**
```bash
# ✅ ALWAYS USE
npx eslint . --format json --quiet --max-warnings 0

# ❌ NEVER USE
npx eslint .
```

**Jest Testing:**
```bash
# ✅ ALWAYS USE
npm test --silent -- --silent --passWithNoTests --verbose=false

# ❌ NEVER USE
npm test
```

### 6. AUTO-FIX BEFORE REPORTING

The validation system now:
1. Collects all issues
2. **Applies auto-fixes FIRST**
3. **Removes fixed issues from AI report**
4. Only reports unfixed issues
5. This saves massive AI credits!

### 7. ENVIRONMENT FILE SAFETY

The `EnvLoader` has been FIXED to:
- Never crash on malformed .env files
- Use robust error handling
- Skip invalid lines instead of crashing
- Use safe logging methods

### 8. IMPLEMENTATION DETAILS

**Maximum Limits:**
- Command output: 2000 characters max
- Command lines: 50 lines max
- Files processed: 20 max for syntax, 10 max for style
- Issues per category: 10-20 max
- Buffer size: 256KB max (was 2MB!)

**Auto-Fix Types Enhanced:**
- Trailing whitespace removal
- Missing semicolons
- Inconsistent indentation (tabs to spaces)
- Console.log commenting out

### 9. ERROR HANDLING

All tools now have:
- Graceful error handling
- Safe logging (no console.debug/warn crashes)
- Truncated error messages
- Timeout protection

### 10. COMPLIANCE VERIFICATION

Before any command execution:
1. Check if it needs `--silent` flag
2. Verify maxBuffer is ≤ 256KB
3. Ensure timeout is set
4. Confirm output truncation is active

## SUMMARY

**🚨 CRITICAL: Never run commands that generate massive output!**

- Always use `--silent` flags
- Always truncate output
- Always apply auto-fixes first
- Always limit processing scope
- Always use robust error handling

This prevents:
- Wasted AI credits on spam output
- Agent timeouts from processing massive text
- Crashes from malformed files
- Reporting issues that could be auto-fixed

**The agent tools have been FIXED to enforce these rules automatically.**
