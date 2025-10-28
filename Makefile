.PHONY: help clean clean-wails clean-web wails-all wails-darwin wails-windows wails-linux web-all web-darwin web-windows web-linux

# Default target shows help
help:
	@echo "scrollY Build System"
	@echo ""
	@echo "Usage:"
	@echo "  make clean              Clean all build artifacts"
	@echo "  make clean-wails        Clean Wails build artifacts only"
	@echo "  make clean-web          Clean HTTP server build artifacts only"
	@echo ""
	@echo "Wails Desktop App Builds:"
	@echo "  make wails-all          Build all Wails platforms"
	@echo "  make wails-darwin       Build Wails for macOS (Universal)"
	@echo "  make wails-windows      Build Wails for Windows"
	@echo "  make wails-linux        Build Wails for Linux"
	@echo ""
	@echo "HTTP Server Builds:"
	@echo "  make web-all            Build all HTTP server platforms"
	@echo "  make web-darwin         Build HTTP server for macOS (Intel + ARM)"
	@echo "  make web-windows        Build HTTP server for Windows"
	@echo "  make web-linux          Build HTTP server for Linux"

# Clean targets
clean: clean-wails clean-web

clean-wails:
	rm -rf build/

clean-web:
	rm -f scrolly-darwin-amd64 scrolly-darwin-arm64 scrolly-windows.exe scrolly-linux

# Wails desktop app builds
wails-all: clean-wails wails-darwin wails-windows wails-linux

wails-darwin:
	rm -f build/bin/scrolly-wails-darwin
	wails build -platform darwin/universal -o scrolly-wails-darwin -tags wails -ldflags "-s -w"

wails-windows:
	rm -f build/bin/scrolly-wails-windows.exe
	wails build -platform windows/amd64 -o scrolly-wails-windows.exe -tags wails -ldflags "-s -w"

wails-linux:
	rm -f build/bin/scrolly-wails-linux
	wails build -platform linux/amd64 -o scrolly-wails-linux -tags wails -ldflags "-s -w"

# HTTP server builds
web-all: clean-web web-darwin web-windows web-linux

web-darwin:
	rm -f scrolly-darwin-amd64 scrolly-darwin-arm64
	CGO_ENABLED=0 GOOS=darwin GOARCH=amd64 go build -ldflags="-s -w" -o scrolly-darwin-amd64 main.go
	CGO_ENABLED=0 GOOS=darwin GOARCH=arm64 go build -ldflags="-s -w" -o scrolly-darwin-arm64 main.go

web-windows:
	rm -f scrolly-windows.exe
	CGO_ENABLED=0 GOOS=windows GOARCH=amd64 go build -ldflags="-s -w" -o scrolly-windows.exe main.go

web-linux:
	rm -f scrolly-linux
	CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-s -w" -o scrolly-linux main.go
