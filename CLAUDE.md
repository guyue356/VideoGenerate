# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Project2Video is an AI-powered CLI tool that automatically analyzes GitHub projects and generates promotional videos. It uses a 5-phase pipeline (Understand → Strategize → Story → Compose → Render) to transform codebases into 30-45 second videos.

## Repository Structure

This is a monorepo with the main application in `project2video/`. The root contains only configuration files (`.env`, `.gitignore`, `LICENSE`, `README.md`).

## Common Commands

All commands should be run from the `project2video/` directory:

```bash
# Install dependencies
npm install

# Run the CLI tool
node bin/cli.js <project-path>
# or via npm
npm start -- <project-path>

# Run tests (currently no test files exist)
npm test

# Generate a video for a project
node bin/cli.js ./path/to/project -t minimal --fast

# Show verbose intermediate results
node bin/cli.js ./path/to/project --verbose

# Save intermediate JSON files to output directory
node bin/cli.js ./path/to/project --save-intermediates
```

## Architecture

The system follows a 5-phase pipeline architecture:

1. **Understand Phase** (`src/understand/`): Scans repository structure, detects tech stack, extracts code snippets, and uses LLM to discover core capabilities
2. **Strategize Phase** (`src/strategize/`): LLM-powered product strategist creates video marketing strategy
3. **Story Phase** (`src/story/`): LLM generates storyboard with scenes, shots, and narration
4. **Compose Phase** (`src/compose/`): Converts story to Video DSL timeline, generates HTML composition with GSAP animations
5. **Render Phase** (`src/render/`): Generates audio (BGM + TTS) and renders HTML to MP4 via HyperFrames

## Key Technical Details

- **Module System**: ES Modules (`"type": "module"` in package.json)
- **LLM Integration**: Uses OpenAI SDK with support for both OpenAI and DeepSeek providers via `src/llm/client.js`
- **Video Rendering**: HyperFrames CLI for HTML-to-MP4 conversion, with FFmpeg as backend
- **Template System**: Each template in `templates/` has `manifest.json`, `template.html`, `style.css`, `animations.js`
- **Asset Scoring**: `src/understand/asset-scanner.js` evaluates image/video quality using Sharp

## Environment Variables

Required in root `.env` file:
- `LLM_PROVIDER`: `openai` or `deepseek`
- `DEEPSEEK_API_KEY` or `OPENAI_API_KEY`: API key for chosen provider
- Optional: `LLM_BASE_URL`, `LLM_MODEL` for custom endpoints

## Pipeline Entry Point

`src/pipeline.js` orchestrates all phases. The `runPipeline()` function accepts options including `projectPath`, `template`, `fast` mode, `skipTTS`, `duration`, `verbose`, and `saveIntermediates`.

### Debugging Intermediate Results

Use `--verbose` to print detailed JSON of each phase's output to console.
Use `--save-intermediates` to save each phase's output as JSON files in `output/<project>/intermediates/`:
- `01-repo-profile.json`: Repository analysis results
- `02-feature-discovery.json`: AI-discovered capabilities
- `03-asset-manifest.json`: Asset quality assessment
- `04-strategy.json`: Video marketing strategy
- `05-story.json`: Complete storyboard with scenes and shots
- `06-timeline.json`: Video DSL timeline
- `07-composition.json`: HTML generation metadata
- `08-render-config.json`: Render configuration

## Template Development

Templates define visual styles for generated videos. Each template requires:
- `manifest.json`: Configuration, supported project types, DSL handler mappings
- `animations.js`: Exported `handlers` object with render functions for each DSL element type
- `style.css`: Template-specific styles
- `template.html`: Base HTML structure

## LLM Output Format

All LLM calls use `response_format: { type: 'json_object' }` and expect structured JSON responses. Prompts are designed to return specific schemas for capabilities, strategy, and storyboard data.
