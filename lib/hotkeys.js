// Hotkeys Module for Scrollama Navigation
// Adds keyboard navigation to any scrollama presentation
// Requires: js-yaml.min.js

(function() {
    let config = null;

    async function loadHotkeysConfig() {
        // Try site-specific config first
        try {
            const response = await fetch('/hotkeys.yaml');
            if (response.ok) {
                const yamlText = await response.text();
                console.log('Loaded custom hotkeys from /hotkeys.yaml');
                return jsyaml.load(yamlText);
            }
        } catch (error) {
            console.log('No custom hotkeys.yaml found, trying default...');
        }

        // Fall back to default config (overlay makes lib/ files available at root)
        try {
            const response = await fetch('/hotkeys.default.yaml');
            if (response.ok) {
                const yamlText = await response.text();
                console.log('Loaded default hotkeys from /hotkeys.default.yaml');
                return jsyaml.load(yamlText);
            }
        } catch (error) {
            console.warn('Could not load hotkeys config, using hardcoded defaults');
        }

        return getDefaultConfig();
    }

    function getDefaultConfig() {
        return {
            enabled: true,
            navigation: {
                next: ['ArrowDown', 'ArrowRight'],
                previous: ['ArrowUp', 'ArrowLeft'],
                first: ['Home'],
                last: ['End'],
                top: ['0'],
                fullscreen: ['f']
            },
            sections: {},
            steps: {},
            custom: {},
            scroll: {
                behavior: 'smooth',
                block: 'center'
            }
        };
    }

    function scrollToElement(element) {
        if (!element) return;

        const scrollConfig = config.scroll || { behavior: 'smooth', block: 'center' };
        element.scrollIntoView({
            behavior: scrollConfig.behavior,
            block: scrollConfig.block
        });
    }

    function toggleFullscreen() {
        if (!document.fullscreenElement) {
            // Enter fullscreen
            document.documentElement.requestFullscreen().catch(err => {
                console.warn('Error attempting to enable fullscreen:', err);
            });
        } else {
            // Exit fullscreen
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    }

    function injectFullscreenStyles() {
        // Don't inject any styles - let fullscreen work naturally
        // The shrinking issue might be browser-specific behavior we can't override
        return;
    }

    function handleKeyPress(event) {
        if (!config || !config.enabled) return;

        const key = event.key;
        const steps = Array.from(document.querySelectorAll('.step'));
        const activeStep = document.querySelector('.step.is-active');
        const currentIndex = activeStep ? steps.indexOf(activeStep) : -1;

        let targetElement = null;

        // Navigation hotkeys
        const nav = config.navigation || {};

        if (nav.next && nav.next.includes(key)) {
            event.preventDefault();
            if (currentIndex < steps.length - 1) {
                targetElement = steps[currentIndex + 1];
            } else if (currentIndex === steps.length - 1) {
                // At last step, try to go to outro
                targetElement = document.querySelector('.scrolly-outro');
            }
        } else if (nav.previous && nav.previous.includes(key)) {
            event.preventDefault();
            if (currentIndex > 0) {
                targetElement = steps[currentIndex - 1];
            } else if (currentIndex === 0) {
                // At first step, go to intro
                targetElement = document.querySelector('.scrolly-intro');
            } else if (currentIndex === -1 && steps.length > 0) {
                // No active step, go to first step
                targetElement = steps[0];
            }
        } else if (nav.first && nav.first.includes(key)) {
            event.preventDefault();
            if (steps.length > 0) {
                targetElement = steps[0];
            }
        } else if (nav.last && nav.last.includes(key)) {
            event.preventDefault();
            if (steps.length > 0) {
                targetElement = steps[steps.length - 1];
            }
        } else if (nav.top && nav.top.includes(key)) {
            event.preventDefault();
            window.scrollTo({
                top: 0,
                behavior: config.scroll.behavior
            });
            return;
        } else if (nav.fullscreen && nav.fullscreen.includes(key)) {
            event.preventDefault();
            toggleFullscreen();
            return;
        }

        // Section hotkeys (e.g., 'i' -> .scrolly-intro)
        if (!targetElement && config.sections) {
            for (const [sectionKey, hotkey] of Object.entries(config.sections)) {
                if (hotkey === key) {
                    event.preventDefault();
                    targetElement = document.querySelector(`.scrolly-${sectionKey}`);
                    break;
                }
            }
        }

        // Step index hotkeys (e.g., '1' -> first step)
        if (!targetElement && config.steps && config.steps[key] !== undefined) {
            event.preventDefault();
            const stepIndex = config.steps[key];
            if (stepIndex >= 0 && stepIndex < steps.length) {
                targetElement = steps[stepIndex];
            }
        }

        // Custom data-hotkey attributes
        if (!targetElement && config.custom && config.custom[key]) {
            event.preventDefault();
            const hotkeyValue = config.custom[key];
            targetElement = document.querySelector(`[data-hotkey="${hotkeyValue}"]`);
        }

        if (targetElement) {
            scrollToElement(targetElement);
        }
    }

    async function init() {
        config = await loadHotkeysConfig();

        if (config.enabled) {
            injectFullscreenStyles();
            document.addEventListener('keydown', handleKeyPress);
            console.log('Hotkeys navigation enabled');
        } else {
            console.log('Hotkeys navigation disabled in config');
        }
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Expose API for dynamic reconfiguration
    window.ScrollyHotkeys = {
        reload: init,
        disable: () => {
            if (config) config.enabled = false;
        },
        enable: () => {
            if (config) config.enabled = true;
        }
    };
})();
