# Hotkey Navigation System

This is a standalone keyboard navigation module for scrollama-based scrollytelling presentations.

## What It Does

Adds configurable keyboard shortcuts to navigate through your scrollama presentation:
- Navigate between steps (arrows, j/k)
- Jump to specific steps (number keys)
- Jump to sections (custom keys)
- Jump to top/first/last (Home/End/0)
- Toggle fullscreen (f)

## How It Works

The hotkey system looks for standard scrollama classes and attributes in your HTML:

### Required Elements

**Steps** - Must use class `step`:
```html
<div class="step">...</div>
```

The hotkey system uses the `.step.is-active` class (set by scrollama) to track the current position.

### Optional Elements

**Intro Section** - Use class `scrolly-intro`:
```html
<section class="scrolly-intro">
  <h1>Introduction</h1>
</section>
```

**Outro Section** - Use class `scrolly-outro`:
```html
<section class="scrolly-outro">
  <h2>Thank You</h2>
</section>
```

**Custom Hotkeys** - Use `data-hotkey` attribute:
```html
<div class="step" data-hotkey="summary">
  <h2>Summary</h2>
</div>
```

## Installation

### 1. Add Required Scripts

Include js-yaml (for config parsing) and hotkeys.js in your HTML:

```html
<script src="js/js-yaml.min.js"></script>
<script src="js/hotkeys.js"></script>
```

Place these AFTER your scrollama setup script.

### 2. Add hotkeys.yaml Configuration

Create `hotkeys.yaml` in your `static/` directory (see Configuration below).

### 3. Add CSS Classes

Add the expected classes to your HTML:
- `.scrolly-intro` for intro section (optional)
- `.scrolly-outro` for outro section (optional)
- `.step` for all scrollable steps (required)
- `data-hotkey="name"` for custom jump targets (optional)

## Configuration

Edit `hotkeys.yaml` to customize keyboard shortcuts:

```yaml
# Enable or disable the entire system
enabled: true

# Navigation hotkeys
navigation:
  next: [ArrowDown, ArrowRight, j]      # Move to next step
  previous: [ArrowUp, ArrowLeft, k]     # Move to previous step
  first: [Home, g]                      # Jump to first step
  last: [End, G]                        # Jump to last step
  top: ["0"]                            # Scroll to top
  fullscreen: [f]                       # Toggle fullscreen

# Section hotkeys - jump to .scrolly-{class}
sections:
  intro: i          # Press 'i' to jump to .scrolly-intro
  outro: o          # Press 'o' to jump to .scrolly-outro

# Step hotkeys - jump to step by index
steps:
  "1": 0   # Press '1' to jump to first step
  "2": 1   # Press '2' to jump to second step
  "3": 2
  # ... etc

# Custom hotkeys - jump to [data-hotkey="value"]
custom:
  q: "summary"     # Press 'q' to jump to data-hotkey="summary"
  w: "details"     # Press 'w' to jump to data-hotkey="details"

# Scroll behavior
scroll:
  behavior: smooth    # 'smooth' or 'auto'
  block: center       # 'start', 'center', or 'end'
```

## Usage Examples

### Minimal Setup

```html
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  <div class="step">
    <h2>Step 1</h2>
  </div>

  <div class="step">
    <h2>Step 2</h2>
  </div>

  <script src="js/scrollama.min.js"></script>
  <script src="js/app.js"></script>
  <script src="js/js-yaml.min.js"></script>
  <script src="js/hotkeys.js"></script>
</body>
</html>
```

### With Intro/Outro

```html
<section class="scrolly-intro">
  <h1>My Presentation</h1>
  <p>Press 'i' to return here</p>
</section>

<div class="step">Step 1</div>
<div class="step">Step 2</div>

<section class="scrolly-outro">
  <h2>The End</h2>
  <p>Press 'o' to jump here</p>
</section>
```

### With Custom Hotkeys

```html
<div class="step" data-hotkey="overview">
  <h2>Overview</h2>
  <p>Press 'q' to jump here</p>
</div>

<div class="step" data-hotkey="details">
  <h2>Details</h2>
  <p>Press 'w' to jump here</p>
</div>
```

Then in `hotkeys.yaml`:
```yaml
custom:
  q: "overview"
  w: "details"
```

## API

The hotkey module exposes a global `ScrollyHotkeys` object:

```javascript
// Reload configuration
ScrollyHotkeys.reload();

// Disable hotkeys
ScrollyHotkeys.disable();

// Enable hotkeys
ScrollyHotkeys.enable();
```

## Integration with Existing Scrollama Sites

To add hotkeys to an existing scrollama presentation:

1. Download `js-yaml.min.js` and `hotkeys.js`
2. Add script tags to your HTML (after scrollama)
3. Create `hotkeys.yaml` with your preferred key mappings
4. (Optional) Add `.scrolly-intro`, `.scrolly-outro`, or `data-hotkey` attributes

No modifications to your existing scrollama code are required. The hotkey system works alongside scrollama's built-in scroll detection.

## Default Key Mappings

If `hotkeys.yaml` is not found, these defaults are used:

- **Next step**: ArrowDown, ArrowRight
- **Previous step**: ArrowUp, ArrowLeft
- **First step**: Home
- **Last step**: End
- **Scroll to top**: 0
- **Toggle fullscreen**: f

## Vim-Style Navigation

To enable vim-style j/k navigation, add to `hotkeys.yaml`:

```yaml
navigation:
  next: [ArrowDown, ArrowRight, j]
  previous: [ArrowUp, ArrowLeft, k]
  first: [Home, g]
  last: [End, G]
```

## Troubleshooting

### Hotkeys not working
- Check browser console for errors
- Verify `hotkeys.yaml` exists and has valid YAML syntax
- Ensure `.step` elements exist in your HTML
- Confirm js-yaml.min.js is loaded before hotkeys.js

### Keys conflicting with browser shortcuts
- Choose different keys in `hotkeys.yaml`
- Note that some keys (F11, Ctrl+T, etc.) cannot be overridden

### Scrolling to wrong position
- Adjust `scroll.block` in config: `start`, `center`, or `end`
- Adjust scrollama's `offset` setting (separate from hotkeys)

## Files

- `static/js/hotkeys.js` - Hotkey navigation module
- `static/hotkeys.yaml` - Configuration file
- `static/js/js-yaml.min.js` - YAML parser (required dependency)

## License

This hotkey system can be used with any scrollama presentation. No attribution required.
