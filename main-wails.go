//go:build wails

package main

import (
	"bytes"
	"context"
	"embed"
	"io"
	"io/fs"
	"log"
	"net/http"
	"path"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"gopkg.in/yaml.v3"
)

//go:embed site/*
var siteFiles embed.FS

//go:embed lib/*
var libFiles embed.FS

// Config holds application configuration
type Config struct {
	Title  string `yaml:"title"`
	Window struct {
		Width  int `yaml:"width"`
		Height int `yaml:"height"`
	} `yaml:"window"`
	App struct {
		Name    string `yaml:"name"`
		Version string `yaml:"version"`
	} `yaml:"app"`
}

// OverlayFS provides a filesystem that checks primary first, then falls back to secondary
type OverlayFS struct {
	primary  fs.FS
	fallback fs.FS
}

func (o *OverlayFS) Open(name string) (fs.File, error) {
	// Try primary filesystem first
	if f, err := o.primary.Open(name); err == nil {
		return f, nil
	}
	// Fall back to secondary filesystem
	return o.fallback.Open(name)
}

func (o *OverlayFS) ReadDir(name string) ([]fs.DirEntry, error) {
	// Try primary first
	if entries, err := fs.ReadDir(o.primary, name); err == nil {
		return entries, nil
	}
	return fs.ReadDir(o.fallback, name)
}

func (o *OverlayFS) Stat(name string) (fs.FileInfo, error) {
	// Try primary first
	if info, err := fs.Stat(o.primary, name); err == nil {
		return info, nil
	}
	return fs.Stat(o.fallback, name)
}

// loadConfig reads config from overlay FS (site/config.yaml or lib/config.default.yaml)
func loadConfig(overlayFS fs.FS) *Config {
	// Set defaults
	config := &Config{
		Title: "Scrolly Presentation",
	}
	config.Window.Width = 1200
	config.Window.Height = 800
	config.App.Name = "Scrolly"
	config.App.Version = "1.0.0"

	// Try to load config.yaml first (from site/)
	configFile, err := overlayFS.Open("config.yaml")
	if err != nil {
		// Try config.default.yaml (from lib/)
		configFile, err = overlayFS.Open("config.default.yaml")
		if err != nil {
			log.Println("No config file found, using defaults")
			return config
		}
	}
	defer configFile.Close()

	// Read and parse YAML
	data, err := io.ReadAll(configFile)
	if err != nil {
		log.Printf("Error reading config: %v, using defaults", err)
		return config
	}

	if err := yaml.Unmarshal(data, config); err != nil {
		log.Printf("Error parsing config: %v, using defaults", err)
		return config
	}

	return config
}

// App struct
type App struct {
	ctx context.Context
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called when the app starts
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

// shutdown is called at application termination
func (a *App) shutdown(ctx context.Context) {
	// Cleanup if needed
}

// injectScriptsHandler wraps the asset filesystem and injects hotkey scripts into HTML
func injectScriptsHandler(overlayFS fs.FS) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Check if this is likely an HTML file
		ext := path.Ext(r.URL.Path)
		if r.URL.Path == "/" || r.URL.Path == "/index.html" {
			ext = ".html"
		}

		// If not HTML, serve normally
		if ext != ".html" && ext != ".htm" && ext != "" {
			http.FileServer(http.FS(overlayFS)).ServeHTTP(w, r)
			return
		}

		// Read the file from overlay FS
		filePath := r.URL.Path
		if filePath == "/" {
			filePath = "/index.html"
		}
		filePath = filePath[1:] // Remove leading slash

		file, err := overlayFS.Open(filePath)
		if err != nil {
			http.Error(w, "File not found", http.StatusNotFound)
			return
		}
		defer file.Close()

		body, err := io.ReadAll(file)
		if err != nil {
			http.Error(w, "Error reading file", http.StatusInternalServerError)
			return
		}

		// Check if it's actually HTML content
		if !bytes.Contains(body, []byte("<html")) && !bytes.Contains(body, []byte("</body>")) {
			w.Header().Set("Content-Type", http.DetectContentType(body))
			w.Write(body)
			return
		}

		// Inject hotkey scripts and external link handler before </body>
		injection := `<script src="js-yaml.min.js"></script>
<script src="hotkeys.js"></script>
<script>
// Open external links in system browser (Wails)
document.addEventListener('click', (e) => {
    const target = e.target.closest('a');
    if (target && target.href && (target.target === '_blank' || target.href.startsWith('http'))) {
        e.preventDefault();
        if (window.runtime && window.runtime.BrowserOpenURL) {
            window.runtime.BrowserOpenURL(target.href);
        }
    }
});
</script>
`
		bodyTag := []byte("</body>")
		if idx := bytes.Index(body, bodyTag); idx != -1 {
			body = append(body[:idx], append([]byte(injection), body[idx:]...)...)
		}

		// Write response
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		w.Write(body)
	})
}

func main() {
	// Create overlay filesystem: site/ overrides lib/
	siteFS, err := fs.Sub(siteFiles, "site")
	if err != nil {
		log.Fatal(err)
	}

	libFS, err := fs.Sub(libFiles, "lib")
	if err != nil {
		log.Fatal(err)
	}

	overlayFS := &OverlayFS{
		primary:  siteFS,
		fallback: libFS,
	}

	// Load configuration
	config := loadConfig(overlayFS)

	// Create application instance
	app := NewApp()

	// Create application with options
	err = wails.Run(&options.App{
		Title:  config.Title,
		Width:  config.Window.Width,
		Height: config.Window.Height,
		AssetServer: &assetserver.Options{
			Handler: injectScriptsHandler(overlayFS),
		},
		OnStartup:  app.startup,
		OnShutdown: app.shutdown,
	})

	if err != nil {
		log.Fatal(err)
	}
}
