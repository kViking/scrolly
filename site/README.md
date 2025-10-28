# Site Directory

This directory contains your scrollama presentation.

## Structure

```
site/
├── index.html          # Your main HTML file
├── css/                # Your stylesheets
├── js/                 # Your JavaScript and libraries
│   ├── app.js          # Your application code
│   ├── d3.min.js       # D3.js (if using visualizations)
│   └── scrollama.min.js # Scrollama library
├── images/             # Your images and assets
├── config.yaml         # Optional: Window configuration (Wails only)
└── hotkeys.yaml        # Optional: Custom hotkey configuration
```

## Getting Started

This is a standard scrollama project. The Go server will serve everything in this directory at the root path (`/`).

### Minimal Setup

For a basic scrollama site without hotkeys:

```html
<!DOCTYPE html>
<html>
<body>
  <div class="step">Step 1</div>
  <div class="step">Step 2</div>
  <div class="step">Step 3</div>

  <script src="js/scrollama.min.js"></script>
  <script src="js/app.js"></script>
</body>
</html>
```

### Adding Hotkey Navigation

To add keyboard navigation, include the hotkey scripts from `/lib/`:

```html
<script src="js/scrollama.min.js"></script>
<script src="js/app.js"></script>

<!-- Add hotkey navigation -->
<script src="/lib/js-yaml.min.js"></script>
<script src="/lib/hotkeys.js"></script>
</html>
```

The hotkey system looks for these optional CSS classes in your HTML:
- `.scrolly-intro` - Intro section (jump with 'i' key by default)
- `.scrolly-outro` - Outro section (jump with 'o' key by default)
- `.step` - Required for all scrollama steps
- `data-hotkey="name"` - Custom jump targets

See [HOTKEYS.md](../HOTKEYS.md) for complete documentation.

## Custom Hotkeys

Create `hotkeys.yaml` in this directory to customize keyboard shortcuts:

```yaml
enabled: true

navigation:
  next: [ArrowDown, ArrowRight, j]
  previous: [ArrowUp, ArrowLeft, k]

steps:
  "1": 0
  "2": 1
  "3": 2
```

If no `hotkeys.yaml` exists here, the system uses `/lib/hotkeys.default.yaml`.

## Window Configuration (Wails Desktop App)

When building desktop apps with Wails (`make wails-all`), you can customize the window settings by creating a `config.yaml` file in this directory.

### Default Configuration

The default window settings come from `/lib/config.default.yaml`:

```yaml
title: "scrollY Presentation"
window:
  width: 1200
  height: 800
app:
  name: "scrollY"
  version: "1.0.0"
```

### Custom Configuration

Create `config.yaml` in this directory to override defaults:

```yaml
title: "My Data Story 2024"
window:
  width: 1600
  height: 900
```

The overlay filesystem means your `config.yaml` automatically takes priority over the default.

**Important Notes:**
- Config only applies to Wails desktop app builds (`make wails-*`)
- HTTP server builds (`make all`) ignore this config since the browser controls the window
- You can override just the fields you want; unspecified fields use defaults
- Changes require rebuilding the binary

### Example Configurations

**For presentations on large displays:**
```yaml
title: "Company Metrics Q4 2024"
window:
  width: 1920
  height: 1080
```

**For compact demos:**
```yaml
title: "Product Demo"
window:
  width: 1024
  height: 768
```

## Replacing This Example

To create your own presentation:

1. **Keep the directory name** - The Go server expects `site/`
2. **Replace the contents** - Delete example files, add your own
3. **Maintain structure** - Keep `index.html` at the root of `site/`
4. **Optionally use hotkeys** - Include the `/lib/` scripts if you want keyboard navigation

Your scrollama site works independently. The hotkey system is optional infrastructure that layers on top.

## Example Structure

Current example demonstrates:
- Scrollama setup with 9 steps
- D3.js visualizations
- Image backgrounds
- Custom animations
- Intro/outro sections with `.scrolly-intro` and `.scrolly-outro` classes
- Keyboard navigation with default hotkeys

You can replace all of this with your own scrollama project.

## Development Workflow

1. Edit files in `site/`
2. Run `./scrolly` from the project root (or `go run main.go`)
3. Browser opens automatically
4. Changes require server restart (no live reload)

For persistent server mode (useful during development):
```bash
./scrolly --server
```

This keeps the server running without auto-opening the browser.
