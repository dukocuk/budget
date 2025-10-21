# Claude Code Hooks

This directory contains hooks that run at specific points during Claude Code operation.

## PostToolUse Hooks

Two hooks run automatically after every file edit or write operation:

### 1. Code Quality Hook (`PostToolUse.sh`)

Automatically formats and lints your code to maintain consistent quality.

**Features:**
- 🎨 **Auto-formatting**: Runs Prettier on all JavaScript, JSX, CSS, and JSON files
- 🔍 **Auto-linting**: Runs ESLint with auto-fix on JavaScript and JSX files
- ✨ **Silent operation**: Only shows summary messages, no noisy output
- ⚡ **Fast**: Optimized to run quickly in the background

### 2. Test Enforcement Hook (`PostToolUse-Tests.sh`)

Automatically runs tests after code changes to ensure nothing breaks.

**Features:**
- 🧪 **Auto-testing**: Runs Vitest tests after modifications
- 🎯 **Smart detection**: Only runs tests for relevant file changes (components, hooks, utils)
- 📊 **Clear feedback**: Shows test pass/fail summary
- 🚀 **Non-blocking**: Always allows workflow to continue even if tests fail

### How they work

**Code Quality Hook:**
1. **Triggers**: After `Edit` or `Write` tool usage
2. **Formats**: Uses Prettier to format all files in `src/` directory
3. **Lints**: Uses ESLint to auto-fix common issues
4. **Reports**: Shows concise success/error messages

**Test Enforcement Hook:**
1. **Triggers**: After `Edit` or `Write` tool usage
2. **Detects**: Determines if tests should run based on modified file
3. **Runs**: Executes Vitest test suite with minimal output
4. **Reports**: Shows test pass/fail summary with count

### Configuration

Both hooks are configured in `.claude/settings.local.json`:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "tools": ["Edit", "Write"],
        "hooks": [
          {
            "type": "command",
            "command": "bash .claude/hooks/PostToolUse.sh"
          },
          {
            "type": "command",
            "command": "bash .claude/hooks/PostToolUse-Tests.sh"
          }
        ]
      }
    ]
  }
}
```

**Execution Order:**
1. Code Quality Hook runs first (formatting & linting)
2. Test Enforcement Hook runs second (tests run on formatted code)

### Manual commands

You can also run these tools manually:

**Formatting & Linting:**
```bash
# Format all files
npm run format

# Check formatting without making changes
npm run format:check

# Run ESLint
npm run lint
```

**Testing:**
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run tests in UI mode
npm run test:ui
```

### Prettier Configuration

Prettier settings are defined in `.prettierrc.json`:

- **Semi-colons**: Yes
- **Quotes**: Single quotes
- **Print width**: 80 characters
- **Tab width**: 2 spaces
- **Trailing commas**: ES5 style
- **Arrow function parens**: Avoid when possible

### Disabling hooks

To temporarily disable the hooks:

**Disable all PostToolUse hooks:**
1. Comment out the PostToolUse section in `.claude/settings.local.json`

**Disable specific hooks:**
1. Remove the specific hook entry from `.claude/settings.local.json`
2. Or rename the hook file:
   - `mv PostToolUse.sh PostToolUse.sh.disabled` (disable formatting/linting)
   - `mv PostToolUse-Tests.sh PostToolUse-Tests.sh.disabled` (disable tests)

**Recommended approach:**
- Keep both hooks enabled for best code quality
- If tests are slow, consider optimizing test files rather than disabling the hook

### Troubleshooting

**Hooks not running?**
- Check that hook files are executable:
  - `chmod +x .claude/hooks/PostToolUse.sh`
  - `chmod +x .claude/hooks/PostToolUse-Tests.sh`
- Verify hooks are configured in `.claude/settings.local.json`
- Check Claude Code logs for error messages

**Formatting issues?**
- Check Prettier configuration in `.prettierrc.json`
- Run `npm run format:check` to see what would change

**Linting errors?**
- Run `npm run lint` to see detailed ESLint output
- Some errors may require manual fixes

**Test failures?**
- Run `npm test` to see detailed test output
- Check test files for specific failing tests
- Tests run on formatted code, so formatting happens first
- Hook is non-blocking, so you can continue working and fix tests later

**Performance issues?**
- Tests only run for relevant file changes (components, hooks, utils)
- Consider using `npm run test:watch` during development
- Both hooks are optimized to run quickly in the background
