# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a minimal Node.js project configured as an ES module (`"type": "module"` in package.json).

## Architecture

- **Language**: JavaScript/Node.js with ES modules
- **Structure**: Basic project with `src/` directory for source code
- **Module System**: ES modules (import/export syntax required)

## Common Commands

Currently no build, test, or lint commands are configured. The default test script exits with an error.

To add dependencies:
```bash
npm install <package-name>
```

To run Node.js files:
```bash
node src/filename.js
```

## Development Notes

- Use ES module syntax (`import`/`export`) for all JavaScript files
- Files should have `.js` extension or be configured appropriately for the module system
- No testing framework is currently set up
- No linting or formatting tools are configured