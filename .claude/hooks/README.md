# Claude Code Hooks

This directory contains hooks that run at specific points during Claude Code operation.

## PostToolUse Hook

### What it does

The `PostToolUse.sh` hook automatically formats and lints your code after every file edit or write operation.

**Features:**
- 🎨 **Auto-formatting**: Runs Prettier on all JavaScript, JSX, CSS, and JSON files
- 🔍 **Auto-linting**: Runs ESLint with auto-fix on JavaScript and JSX files
- ✨ **Silent operation**: Only shows summary messages, no noisy output
- ⚡ **Fast**: Optimized to run quickly in the background

### How it works

1. **Triggers**: Runs after `Edit` or `Write` tool usage
2. **Formats**: Uses Prettier to format all files in `src/` directory
3. **Lints**: Uses ESLint to auto-fix common issues
4. **Reports**: Shows concise success/error messages

### Configuration

The hook is configured in `.claude/settings.local.json`:

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
          }
        ]
      }
    ]
  }
}
```

### Manual formatting

You can also run the formatters manually:

```bash
# Format all files
npm run format

# Check formatting without making changes
npm run format:check

# Run ESLint
npm run lint
```

### Prettier Configuration

Prettier settings are defined in `.prettierrc.json`:

- **Semi-colons**: Yes
- **Quotes**: Single quotes
- **Print width**: 80 characters
- **Tab width**: 2 spaces
- **Trailing commas**: ES5 style
- **Arrow function parens**: Avoid when possible

### Disabling the hook

To temporarily disable the hook, you can:

1. Comment out the PostToolUse section in `.claude/settings.local.json`
2. Or rename the hook file: `mv PostToolUse.sh PostToolUse.sh.disabled`

### Troubleshooting

**Hook not running?**
- Check that the hook file is executable: `chmod +x .claude/hooks/PostToolUse.sh`
- Verify the hook is configured in `.claude/settings.local.json`

**Formatting issues?**
- Check Prettier configuration in `.prettierrc.json`
- Run `npm run format:check` to see what would change

**Linting errors?**
- Run `npm run lint` to see detailed ESLint output
- Some errors may require manual fixes
