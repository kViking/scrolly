//go:build !wails

package main

import (
	"bytes"
	"embed"
	"flag"
	"fmt"
	"io/fs"
	"log"
	"net"
	"net/http"
	"os"
	"os/exec"
	"path"
	"runtime"
	"strconv"
	"time"

	"github.com/gorilla/websocket"
)

//go:embed site/*
var siteFiles embed.FS

//go:embed lib/*
var libFiles embed.FS

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
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

func openBrowser(url string) {
	var cmd string
	var args []string

	switch runtime.GOOS {
	case "windows":
		cmd = "cmd"
		args = []string{"/c", "start"}
	case "darwin":
		cmd = "open"
	default:
		cmd = "xdg-open"
	}
	args = append(args, url)
	exec.Command(cmd, args...).Start()
}

func websocketHandler(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("WebSocket upgrade error:", err)
		return
	}
	defer conn.Close()

	fmt.Println("Browser connected")

	// Keep reading until disconnect
	for {
		if _, _, err := conn.ReadMessage(); err != nil {
			fmt.Println("Browser closed, shutting down...")
			time.Sleep(500 * time.Millisecond)
			os.Exit(0)
		}
	}
}

func shutdownHandler(w http.ResponseWriter, r *http.Request) {
	fmt.Println("Shutdown requested from browser...")
	w.WriteHeader(http.StatusOK)
	go func() {
		time.Sleep(200 * time.Millisecond)
		os.Exit(0)
	}()
}

func findAvailablePort(startPort int) int {
	for port := startPort; port < startPort+100; port++ {
		addr := ":" + strconv.Itoa(port)
		listener, err := net.Listen("tcp", addr)
		if err == nil {
			listener.Close()
			return port
		}
	}
	log.Fatal("No available ports found")
	return 0
}

// responseWriter wrapper to capture response
type responseWriterWrapper struct {
	http.ResponseWriter
	buf    *bytes.Buffer
	status int
}

func (w *responseWriterWrapper) Write(b []byte) (int, error) {
	return w.buf.Write(b)
}

func (w *responseWriterWrapper) WriteHeader(status int) {
	w.status = status
}

// injectScriptsMiddleware injects hotkey infrastructure scripts into HTML responses
func injectScriptsMiddleware(next http.Handler, serverMode bool) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Check if this is likely an HTML file
		ext := path.Ext(r.URL.Path)
		if r.URL.Path == "/" {
			ext = ".html" // Treat root as HTML
		}

		if ext != ".html" && ext != ".htm" && ext != "" {
			// Not HTML, pass through
			next.ServeHTTP(w, r)
			return
		}

		// Capture the response
		wrapper := &responseWriterWrapper{
			ResponseWriter: w,
			buf:            &bytes.Buffer{},
			status:         http.StatusOK,
		}

		next.ServeHTTP(wrapper, r)

		body := wrapper.buf.Bytes()

		// Check if it's actually HTML content
		if !bytes.Contains(body, []byte("<html")) && !bytes.Contains(body, []byte("</body>")) {
			// Not HTML, write as-is
			w.WriteHeader(wrapper.status)
			w.Write(body)
			return
		}

		// Build injection script
		injection := "\n"

		// Add WebSocket for shutdown (only in presentation mode)
		if !serverMode {
			injection += `<script>
const wsUrl = 'ws://' + window.location.hostname + ':' + window.location.port + '/ws';
const ws = new WebSocket(wsUrl);
ws.onopen = () => {
    console.log('Connected to server');
    setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send('ping');
        }
    }, 5000);
};
ws.onclose = () => console.log('Disconnected from server');
ws.onerror = (error) => console.error('WebSocket error:', error);
</script>
`
		}

		// Add hotkey scripts
		injection += `<script src="/js-yaml.min.js"></script>
<script src="/hotkeys.js"></script>
`

		// Inject before </body>
		bodyTag := []byte("</body>")
		if idx := bytes.Index(body, bodyTag); idx != -1 {
			body = append(body[:idx], append([]byte(injection), body[idx:]...)...)
		}

		// Write response
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		w.Header().Set("Content-Length", strconv.Itoa(len(body)))
		w.WriteHeader(wrapper.status)
		w.Write(body)
	})
}

func main() {
	serverMode := flag.Bool("server", false, "Run in server mode (no auto-open browser, no auto-shutdown)")
	flag.Parse()

	port := findAvailablePort(8080)

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

	// Create file server with injection middleware
	fileServer := http.FileServer(http.FS(overlayFS))
	handler := injectScriptsMiddleware(fileServer, *serverMode)
	http.Handle("/", handler)

	portStr := strconv.Itoa(port)
	url := "http://localhost:" + portStr

	if *serverMode {
		// Server mode: persistent server without auto-shutdown
		fmt.Printf("Server running at %s (port %d)\n", url, port)
		fmt.Println("Press Ctrl+C to quit")
	} else {
		// Presentation mode: auto-open browser and shutdown when closed
		http.HandleFunc("/ws", websocketHandler)
		http.HandleFunc("/shutdown", shutdownHandler)

		fmt.Printf("Opening presentation at %s (port %d)\n", url, port)
		fmt.Println("Close the browser when done, or press Ctrl+C to quit")
		go openBrowser(url)
	}

	// Start server
	log.Fatal(http.ListenAndServe(":"+portStr, nil))
}
