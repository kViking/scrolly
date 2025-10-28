# scrollY

Turn any scrollama website into a portable, self-contained static binary. Package your scrollytelling presentations as single executables that work across all platforms with zero dependencies.

## What This Does

scrollY is a Go-based infrastructure that:

- **Embeds your scrollama site** into a static binary at compile time
- **Serves it locally** with an embedded HTTP server
- **Auto-injects** optional hotkey navigation infrastructure
- **Packages everything** (HTML, CSS, JS, images, libraries) into one file
- **Works offline** with no installation or setup required
- **Cross-compiles** to macOS (Intel/ARM), Windows, and Linux

Drop your scrollama site in the `site/` directory, run `make all`, and distribute portable binaries.

## Quick Start

### Using This Example

Download the appropriate pre-built binary for your system from the [releases page](../../releases):

- **macOS (Apple Silicon/M1/M2/M3)**: `scrolly-macos-arm`
- **macOS (Intel)**: `scrolly-macos-intel`
- **Windows**: `scrolly-windows.exe`
- **Linux**: `scrolly-linux`

Double-click to launch. Your browser will open automatically with the example scrollytelling presentation.

### Building Your Own

1. **Add your scrollama site** to the `site/` directory:
   ```bash
   cd site/
   # Replace example files with your scrollama presentation
   # Keep index.html at the root
   ```

2. **Build binaries**:
   ```bash
   make all                    # Build for all platforms
   # OR
   make macos-arm              # Build for specific platform
   ```

3. **Distribute**: Share the binaries. They're completely self-contained.

## How It Works

### Overlay Filesystem

scrollY uses a two-directory architecture with an overlay filesystem:

```
scrolly/
├── site/          # Your scrollama presentation (takes priority)
│   ├── index.html
│   ├── css/
│   ├── js/
│   ├── images/
│   └── hotkeys.yaml  (optional - custom hotkey config)
│
└── lib/           # Reusable infrastructure (fallback)
    ├── hotkeys.js
    ├── hotkeys.default.yaml
    └── js-yaml.min.js
```

When the server receives a request:
1. Check `site/` first
2. Fall back to `lib/` if not found
3. Return 404 if not in either

This lets you:
- Override defaults by adding files to `site/`
- Share infrastructure across projects in `lib/`
- Customize hotkeys with `site/hotkeys.yaml`

### Auto-Injection

The Go server automatically injects infrastructure into HTML responses:

```javascript
// Injected before </body>:
<script src="/js-yaml.min.js"></script>    // From lib/ (unless overridden)
<script src="/hotkeys.js"></script>        // From lib/ (unless overridden)
```

Plus a WebSocket connection for auto-shutdown detection (presentation mode only).

You don't need to manually include these scripts. They're available at the root path via the overlay filesystem.

### Embedded Assets

Both `site/` and `lib/` are embedded at compile time using Go's `embed` package:

```go
//go:embed site/*
var siteFiles embed.FS

//go:embed lib/*
var libFiles embed.FS
```

The compiled binary contains everything. No external files needed.

## Running Modes

### Presentation Mode (Default)

```bash
./scrolly
```

- Auto-opens browser
- Auto-shuts down when browser closes
- WebSocket heartbeat detection
- Perfect for end-user presentations

### Server Mode

```bash
./scrolly --server
```

- No auto-open browser
- No auto-shutdown
- Persistent server
- Useful during development

## Keyboard Navigation

The optional hotkey infrastructure provides:

- **Arrow keys / j/k**: Navigate between steps
- **1-9**: Jump to specific steps
- **0**: Jump to top
- **Home/End**: First/last step
- **i/o**: Jump to intro/outro sections (if present)
- **f**: Toggle fullscreen

Configure in `site/hotkeys.yaml` or use defaults from `lib/hotkeys.default.yaml`.

See [HOTKEYS.md](HOTKEYS.md) for complete documentation.

## Building

### Prerequisites

- Go 1.25+ installed
- No other dependencies

### Build Commands

```bash
# All platforms
make all

# Specific platforms
make macos-intel
make macos-arm
make windows
make linux

# Clean build artifacts
make clean
```

### Manual Build

```bash
# Current platform
go build -o scrolly main.go

# Cross-compile (example for macOS ARM)
CGO_ENABLED=0 GOOS=darwin GOARCH=arm64 go build -o scrolly-macos-arm main.go
```

Binary sizes: ~8-9 MB (varies with embedded assets)

## Project Structure

```
scrolly/
├── main.go                 # Go server with overlay FS and auto-injection
├── go.mod                  # Go module (only dependency: gorilla/websocket)
├── Makefile                # Build automation
├── README.md               # This file
├── TECHNICAL.md            # Developer documentation
├── HOTKEYS.md              # Hotkey system documentation
├── site/                   # Your scrollama presentation (BYO)
│   ├── README.md           # Guide for replacing with your own site
│   ├── index.html
│   ├── css/
│   ├── js/
│   ├── images/
│   └── hotkeys.yaml        # Optional custom config
└── lib/                    # Shared infrastructure
    ├── hotkeys.js          # Keyboard navigation system
    ├── hotkeys.default.yaml
    └── js-yaml.min.js
```

## Development Workflow

1. Edit files in `site/`
2. Test locally: `go run main.go`
3. Build for all platforms: `make all`
4. Distribute binaries

No live reload. Restart server to see changes.

## Example Content

The included example demonstrates:

- Scrollama setup with 9 sections
- D3.js data visualizations (bar charts, donuts, line graphs)
- SVG graphics and animations
- Image backgrounds with effects
- Color transitions between sections
- Hotkey navigation with intro/outro sections

Replace everything in `site/` with your own scrollama project. See [site/README.md](site/README.md) for details.

## Use Cases

- **Presentations**: Distribute talks as single executables
- **Data Stories**: Package data journalism pieces for offline use
- **Portfolios**: Share interactive scrollytelling work
- **Education**: Distribute interactive tutorials
- **Internal Tools**: Create self-contained demos for stakeholders

## Technical Details

For developers looking to customize or extend:

- See [TECHNICAL.md](TECHNICAL.md) for architecture details, middleware implementation, and WebSocket lifecycle
- See [HOTKEYS.md](HOTKEYS.md) for hotkey system configuration and API
- See [site/README.md](site/README.md) for guide to replacing the example site

## Dependencies

### Runtime
None. Binaries are fully static and self-contained.

### Build Time
- **Go 1.25+**
- **gorilla/websocket** (auto-installed via `go mod download`)

### Embedded Libraries
- **Scrollama 3.2.0** - Scroll-driven step detection
- **D3.js v7** - Data visualization (optional, in example only)
- **js-yaml** - YAML parser for hotkey config

## License

MIT
