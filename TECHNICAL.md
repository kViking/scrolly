# Technical Documentation

Developer documentation for the scrollytelling presentation system.

## Architecture Overview

This project provides infrastructure to package scrollama websites as portable binaries using two approaches:

### Two Build Approaches

**1. HTTP Server Binaries** (`main.go`)
- Embedded HTTP server serving on localhost
- Auto-opens system browser
- WebSocket for auto-shutdown detection
- Fully static binaries with zero runtime dependencies
- Best for: Maximum compatibility, users familiar with browser interfaces

**2. Wails Desktop App** (`main-wails.go`)
- Native desktop window with embedded webview
- No HTTP server, no browser launch
- Configurable window size and title
- Platform webviews: WebKit (macOS/Linux), WebView2 (Windows)
- Best for: Native app feel, controlled presentation environment

Both approaches use the same **overlay filesystem** and **asset embedding** architecture.

## Overlay Filesystem

The core innovation is a two-directory overlay filesystem:

```
scrolly/
├── site/          # Your scrollama presentation (PRIMARY)
│   ├── index.html
│   ├── css/
│   ├── js/
│   ├── images/
│   ├── config.yaml       # Optional: Override window config (Wails)
│   └── hotkeys.yaml      # Optional: Override hotkey config
│
└── lib/           # Shared infrastructure (FALLBACK)
    ├── config.default.yaml
    ├── hotkeys.default.yaml
    ├── hotkeys.js
    └── js-yaml.min.js
```

### How It Works

The `OverlayFS` type (used in both entry points) implements `fs.FS`:

```go
type OverlayFS struct {
    primary  fs.FS  // site/
    fallback fs.FS  // lib/
}

func (o *OverlayFS) Open(name string) (fs.File, error) {
    // Try site/ first
    if f, err := o.primary.Open(name); err == nil {
        return f, nil
    }
    // Fall back to lib/
    return o.fallback.Open(name)
}
```

**Resolution order:**
1. Check `site/` first
2. If not found, check `lib/`
3. If not found, return 404

This allows:
- **Sharing infrastructure** across projects in `lib/`
- **Customizing per-project** by adding files to `site/`
- **Zero configuration** for simple cases (use defaults)
- **Full control** when needed (override everything)

## Configuration System

### Window Configuration (Wails Only)

Wails builds can customize window settings via YAML config.

**Default config** (`lib/config.default.yaml`):
```yaml
title: "scrollY Presentation"
window:
  width: 1200
  height: 800
app:
  name: "scrollY"
  version: "1.0.0"
```

**Override config** (`site/config.yaml`):
```yaml
title: "My Data Story 2024"
window:
  width: 1600
  height: 900
```

The overlay filesystem means `site/config.yaml` automatically takes priority.

**Note**: Config only applies to Wails builds. HTTP server builds ignore it since the browser window is controlled by the user.

## Building

### HTTP Server Binaries

```bash
# All platforms
make all

# Specific platforms
make macos-intel    # macOS Intel
make macos-arm      # macOS Apple Silicon
make windows        # Windows x64
make linux          # Linux x64

# Clean
make clean
```

**Manual build:**
```bash
CGO_ENABLED=0 GOOS=darwin GOARCH=arm64 go build -o scrolly-macos-arm main.go
```

**Note**: `CGO_ENABLED=0` ensures fully static binaries.

### Wails Desktop App Binaries

**Prerequisites:**
- Wails CLI: `go install github.com/wailsapp/wails/v2/cmd/wails@latest`
- Platform-specific requirements (run `wails doctor` to check):
  - **macOS**: Xcode command line tools
  - **Windows**: WebView2 runtime
  - **Linux**: gcc, libgtk3, libwebkit

**Build commands:**
```bash
# All platforms
make wails-all

# Specific platforms
make wails-linux      # Linux x64
make wails-darwin     # macOS Universal
make wails-windows    # Windows x64
```

Wails handles cross-compilation automatically via `wails build -platform`.

## Project Structure

```
scrolly/
├── main.go                      # HTTP server entry point
├── main-wails.go                # Wails desktop app entry point
├── wails.json                   # Wails project config
├── go.mod                       # Go module definition
├── go.sum                       # Dependency lock
├── Makefile                     # Build automation
├── README.md                    # User documentation
├── TECHNICAL.md                 # This file
├── HOTKEYS.md                   # Hotkey system docs
├── site/                        # Your scrollama presentation
│   ├── README.md                # Guide for site/ directory
│   ├── index.html
│   ├── css/
│   │   └── style.css
│   ├── js/
│   │   ├── app.js
│   │   ├── scrollama.min.js
│   │   └── d3.min.js
│   ├── images/
│   ├── config.yaml              # Optional: Window config override
│   └── hotkeys.yaml             # Optional: Hotkey config override
└── lib/                         # Shared infrastructure
    ├── config.default.yaml      # Default window config
    ├── hotkeys.default.yaml     # Default hotkey config
    ├── hotkeys.js               # Keyboard navigation system
    └── js-yaml.min.js           # YAML parser
```

## How It Works: HTTP Server Build

### Asset Embedding

Both directories are embedded at compile time:

```go
//go:embed site/*
var siteFiles embed.FS

//go:embed lib/*
var libFiles embed.FS
```

Then wrapped in the overlay filesystem and served via `http.FileServer`.

### Auto-Injection Middleware

The HTTP server automatically injects infrastructure scripts into HTML responses:

```go
func injectScriptsMiddleware(next http.Handler, serverMode bool) http.Handler {
    // Intercepts HTML responses
    // Injects before </body>:
    //   - WebSocket connection (if !serverMode)
    //   - <script src="/js-yaml.min.js"></script>
    //   - <script src="/hotkeys.js"></script>
}
```

This means your `site/index.html` doesn't need to manually include these scripts. They're injected at serve time and resolved via the overlay filesystem.

### Server Lifecycle

**Presentation Mode** (default):
1. Find available port (starting at 8080)
2. Register handlers: `/ws` (WebSocket), `/shutdown`, `/` (file server)
3. Open system browser
4. WebSocket heartbeat every 5 seconds
5. Exit when WebSocket disconnects

**Server Mode** (`--server` flag):
1. Find available port
2. Register handlers (no WebSocket)
3. No auto-browser open
4. Runs until Ctrl+C

## How It Works: Wails Build

### Asset Serving

Wails uses the same embedded overlay filesystem, but serves through its internal asset server:

```go
wails.Run(&options.App{
    AssetServer: &assetserver.Options{
        Assets: overlayFS,  // Same overlay filesystem!
    },
})
```

Wails handles the webview lifecycle internally. No HTTP server needed.

### Configuration Loading

On startup, `main-wails.go` reads config from the overlay filesystem:

```go
config := loadConfig(overlayFS)
// Tries site/config.yaml first, falls back to lib/config.default.yaml

wails.Run(&options.App{
    Title:  config.Title,
    Width:  config.Window.Width,
    Height: config.Window.Height,
    // ...
})
```

### Application Lifecycle

1. `OnStartup`: Save context reference
2. Wails loads `index.html` from overlay filesystem
3. `OnDomReady`: Frontend fully loaded
4. `OnShutdown`: Cleanup before exit

## Dependencies

### Go Dependencies

- **gorilla/websocket** (`v1.5.3`) - WebSocket for HTTP server auto-shutdown
- **wailsapp/wails/v2** (`v2.9.2`) - Desktop app framework
- **gopkg.in/yaml.v3** (`v3.0.1`) - Config file parsing

Install:
```bash
go mod download
```

### JavaScript Libraries

Embedded in `site/` or `lib/`:
- **Scrollama 3.2.0** - Scroll-driven step detection
- **D3.js v7** - Data visualization (optional, in example)
- **js-yaml** - YAML parsing for hotkey config

## Binary Sizes

### HTTP Server Binaries
- Linux: ~8-9 MB
- macOS Intel: ~8-9 MB
- macOS ARM: ~8-9 MB
- Windows: ~8-9 MB

### Wails Desktop App Binaries
- Linux: ~12-15 MB (includes WebKit dependencies)
- macOS Universal: ~20-25 MB (includes both architectures)
- Windows: ~15-20 MB (includes WebView2 loader)

Wails binaries are larger due to native webview integration and platform UI frameworks.

## Development Workflow

### Working on Your Site

1. Edit files in `site/`
2. Test with HTTP server: `go run main.go`
3. Test with Wails: `wails dev` or build and run
4. Iterate

### Building for Distribution

1. Make changes to `site/`
2. Test locally
3. Build all variants:
   ```bash
   make all          # HTTP server binaries
   make wails-all    # Desktop app binaries
   ```
4. Test each platform if possible
5. Distribute

### Customizing Infrastructure

To modify shared infrastructure (hotkeys, config defaults):
1. Edit files in `lib/`
2. Test with both HTTP server and Wails builds
3. Rebuild

### Testing for Wails Compatibility

Since Wails uses different webview engines per platform, you can predict cross-platform behavior by testing in corresponding browsers:

**Windows Wails = Chromium rendering**
- Test in: Chrome, Edge, or any Chromium-based browser
- Windows Wails uses WebView2 (Chromium engine)
- If it works in Chrome, it will work in Windows Wails builds

**macOS/Linux Wails = WebKit rendering**
- Test in: Safari (macOS), GNOME Web/Epiphany (Linux), or WebKit-based browsers
- macOS/Linux Wails use native WebKit webviews
- If it works in Safari/WebKit, it will work in macOS/Linux Wails builds

**Testing workflow:**
1. Run `go run main.go` to test via HTTP server
2. Open in Chrome/Chromium to verify Windows Wails compatibility
3. Open in Safari/WebKit browser to verify macOS/Linux Wails compatibility
4. Basic JS libraries (Scrollama, D3) work reliably across both engines
5. Build Wails binaries for final testing if needed

This allows development on any platform while being confident about cross-platform Wails behavior.

## Customizing Content

### Adding Sections

Add step divs to `site/index.html`:
```html
<div class="step" data-step="10">
    <h2>New Section</h2>
    <p>Content...</p>
</div>
```

### Adding Images

1. Place in `site/images/`
2. Reference: `<img src="images/myimage.jpg">`
3. Image embeds automatically at build time

### Custom Hotkeys

Create `site/hotkeys.yaml`:
```yaml
enabled: true
navigation:
  next: [ArrowDown, j]
  previous: [ArrowUp, k]
steps:
  "1": 0
  "2": 1
```

### Window Configuration (Wails)

Create `site/config.yaml`:
```yaml
title: "My Presentation"
window:
  width: 1920
  height: 1080
```

## Debugging

### HTTP Server Builds

**Browser DevTools** (F12):
- Console: See WebSocket status, hotkey events
- Network: Verify asset loading
- Sources: Debug JavaScript

**Server logs**:
```bash
go run main.go
# Shows port, browser open, shutdown events
```

### Wails Builds

**Development mode**:
```bash
wails dev
# Live reload, DevTools available
```

**Production debugging**:
- Check console output for config loading errors
- Wails embeds DevTools in dev builds
- Use `log.Println()` in Go code

### Scrollama Debugging

Enable debug mode in `site/js/app.js`:
```javascript
scroller.setup({
    step: '.step',
    offset: 0.5,
    debug: true  // Shows progress indicators
})
```

## Platform-Specific Notes

### macOS

**HTTP Server**: Opens in default browser (usually Safari or Chrome).

**Wails**: Uses native WebKit view. Rendering identical to Safari. Code-signing may be required for distribution (`codesign -s`).

### Windows

**HTTP Server**: Opens in default browser (usually Edge or Chrome).

**Wails**: Requires WebView2 runtime (included in Windows 10/11, downloadable for older systems). Uses Chromium rendering engine.

### Linux

**HTTP Server**: Opens with `xdg-open` (Firefox, Chrome, etc.).

**Wails**: Uses WebKit via GTK. Requires `libgtk3` and `libwebkit2gtk-4.0` at runtime.

## Known Limitations

### Wails Fullscreen Behavior

The fullscreen toggle (f key) in Wails desktop builds may cause content to appear ~20% smaller than the window size on some platforms, particularly Linux with WebKit. This is a WebKit webview quirk that cannot be reliably fixed with CSS overrides.

**Workaround options:**
- Use a larger default window size in `site/config.yaml`
- Document to users that fullscreen may not scale perfectly
- Consider using HTTP server builds for presentations where fullscreen is critical

HTTP server builds do not have this issue as they use the native browser's fullscreen implementation.

## Creating Releases

1. Update version in code/configs if desired
2. Build all binaries:
   ```bash
   make all
   make wails-all
   ```
3. Test on target platforms (or rely on webview testing)
4. Tag version: `git tag v1.0.0`
5. Push: `git push --tags`
6. Create GitHub release and upload binaries
7. Document which is HTTP server vs Wails desktop app

## Advanced: Multiple Projects

The overlay filesystem design supports managing multiple scrollama projects:

```
projects/
├── lib/              # Shared infrastructure (symlink or copy)
├── project-a/
│   ├── site/
│   └── Makefile      # Builds with ../lib
└── project-b/
    ├── site/
    └── Makefile      # Builds with ../lib
```

Each project gets its own `site/` but shares the same `lib/` infrastructure.

## License

MIT
