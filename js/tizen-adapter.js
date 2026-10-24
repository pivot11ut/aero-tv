/**
 * Aero TV — Samsung Tizen OS Hardware Adapter
 * Integrates directly with Samsung TV remote keys, Tizen APIs, and app launcher
 */

class TizenAdapter {
    constructor() {
        this.isTizen = typeof window.tizen !== 'undefined';
        this.initKeys();
    }

    initKeys() {
        if (this.isTizen) {
            console.log('[Aero TV] Running natively on Samsung Tizen OS');
            try {
                // Register standard TV keys with Tizen input device manager
                const tvInput = window.tizen.tvinputdevice;
                const keysToRegister = [
                    'MediaPlay', 'MediaPause', 'MediaPlayPause', 'MediaStop',
                    'MediaFastForward', 'MediaRewind',
                    'ColorF0Red', 'ColorF1Green', 'ColorF2Yellow', 'ColorF3Blue',
                    'Info',
                    '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'
                ];

                keysToRegister.forEach(keyName => {
                    try {
                        tvInput.registerKey(keyName);
                    } catch (e) {
                        // Key might already be registered by OS
                    }
                });
            } catch (err) {
                console.warn('[Aero TV] Failed to register some Tizen keys:', err);
            }
        }

        // Attach listener for TV hardware key codes
        document.addEventListener('keydown', (e) => this.handleHardwareKey(e));
    }

    handleHardwareKey(e) {
        const keyCode = e.keyCode;

        // If lock screen is active and user pressed TV remote number key (0-9)
        const lockScreen = document.querySelector('#tv-lock-screen.active');
        if (lockScreen && keyCode >= 48 && keyCode <= 57 && window.TVApp) {
            e.preventDefault();
            const digit = keyCode - 48;
            window.TVApp.enterPinDigit(digit);
            return;
        }

        // Tizen Return / Back Button (10009)
        if (keyCode === 10009) {
            e.preventDefault();
            if (lockScreen && window.TVApp) {
                window.TVApp.backspacePinDigit();
                return;
            }
            this.handleBackButton();
            return;
        }

        // Tizen Exit Key (10182)
        if (keyCode === 10182) {
            e.preventDefault();
            if (this.isTizen) {
                try {
                    window.tizen.application.getCurrentApplication().exit();
                } catch (e) {}
            }
            return;
        }

        // Red Color Button (403 or ColorF0Red) -> Inputs
        if (keyCode === 403 || e.key === 'ColorF0Red') {
            e.preventDefault();
            this.triggerSection('inputs');
            return;
        }

        // Green Color Button (404 or ColorF1Green) -> Apps
        if (keyCode === 404 || e.key === 'ColorF1Green') {
            e.preventDefault();
            this.triggerSection('apps');
            return;
        }

        // Yellow Color Button (405 or ColorF2Yellow) -> Screensaver
        if (keyCode === 405 || e.key === 'ColorF2Yellow') {
            e.preventDefault();
            if (window.TVApp) {
                window.TVApp.toggleAmbientMode();
            }
            return;
        }

        // Blue Color Button (406 or ColorF3Blue) -> Setup Guide
        if (keyCode === 406 || e.key === 'ColorF3Blue') {
            e.preventDefault();
            if (window.TVApp) {
                window.TVApp.openGuideModal();
            }
            return;
        }

        // Media Play/Pause
        if (keyCode === 415 || keyCode === 19 || keyCode === 10252) {
            // Play / Pause toggle
            console.log('[Aero TV] Media Play/Pause event');
        }
    }

    handleBackButton() {
        if (window.TVApp) {
            const modalOpen = document.querySelector('.modal-overlay.active');
            const ambientOpen = document.getElementById('ambient-overlay').classList.contains('active');

            if (ambientOpen) {
                window.TVApp.exitAmbientMode();
                return;
            }

            if (modalOpen) {
                window.TVApp.closeAllModals();
                return;
            }

            // If on main screen, jump to Home tab
            window.TVApp.switchTab('dashboard');
        }
    }

    triggerSection(sectionId) {
        if (window.TVApp) {
            window.TVApp.scrollToSection(sectionId);
        }
    }

    /**
     * Launch app natively on Tizen TV if available, or fallback to Web
     */
    launchApp(appConfig) {
        if (this.isTizen && window.tizen.application) {
            // Samsung Tizen App IDs map
            const tizenAppMap = {
                'Netflix': '3201512006785',
                'YouTube': '9Ur5tN0qyg.YouTube',
                'Prime Video': '3201512006785',
                'Spotify': '3201606009684',
                'Plex': '3201512006963',
                'Browser': 'org.tizen.browser'
            };

            const tizenId = tizenAppMap[appConfig.name];
            if (tizenId) {
                try {
                    window.tizen.application.launch(tizenId, () => {
                        console.log(`Launched ${appConfig.name} natively`);
                    }, (err) => {
                        console.warn(`Failed native launch for ${appConfig.name}, falling back to web:`, err);
                        this.openWebUrl(appConfig.url);
                    });
                    return;
                } catch (e) {
                    console.warn('Tizen launch error:', e);
                }
            }
        }

        // Web browser launch
        this.openWebUrl(appConfig.url);
    }

    openWebUrl(url) {
        if (!url || url === 'browser') {
            window.open('https://google.com', '_blank');
            return;
        }
        window.open(url, '_blank');
    }
}

// Global Tizen Adapter
window.TizenAdapter = new TizenAdapter();
