/**
 * Aero TV — Main Application Controller
 * Handles Clock, Weather, Wallpaper switcher, Idle screensaver, Modals, and App launches
 */

class AeroTVApp {
    constructor() {
        this.currentWallpaper = localStorage.getItem('aero_tv_wallpaper') || 'oled';
        this.idleTimeoutMinutes = parseInt(localStorage.getItem('aero_tv_idle_timeout') || '3', 10);
        this.idleTimer = null;
        this.sleepTimerId = null;
        this.sleepMinutesRemaining = 0;
        this.weatherCity = localStorage.getItem('aero_tv_weather_city') || 'New York';

        // Parental Security PIN state
        this.pin = localStorage.getItem('aero_tv_pin') || '0000';
        this.lockOnBoot = localStorage.getItem('aero_tv_lock_on_boot') === 'true';
        this.lockedApps = JSON.parse(localStorage.getItem('aero_tv_locked_apps') || '["Web Browser"]');
        this.isUnlocked = !this.lockOnBoot;
        this.currentEnteredPin = '';
        this.pendingUnlockCallback = null;

        // Dynamic Applications State
        this.apps = this.loadApps();
        this.presetCatalog = this.getPresetCatalog();

        this.init();
    }

    init() {
        this.setupClock();
        this.setupWeather();
        this.applyWallpaper(this.currentWallpaper);
        this.renderAppsTrack();
        this.setupAppsManagerUI();
        this.setupSecurityUI();
        this.bindEvents();
        this.startIdleDetection();

        // If lock on boot is enabled, present lock screen immediately
        if (this.lockOnBoot) {
            setTimeout(() => {
                this.showLockScreen('TV Startup Security', null);
            }, 100);
        }
    }

    // ==========================================
    // CLOCK & DATE
    // ==========================================
    setupClock() {
        const updateClock = () => {
            const now = new Date();
            let hours = now.getHours();
            const minutes = String(now.getMinutes()).padStart(2, '0');
            const seconds = String(now.getSeconds()).padStart(2, '0');
            const ampm = hours >= 12 ? 'PM' : 'AM';
            
            const displayHours = hours % 12 || 12;

            const timeStr = `${displayHours}:${minutes}`;
            const clockEl = document.getElementById('clock-time');
            if (clockEl) {
                clockEl.innerHTML = `${timeStr}<span class="clock-seconds">:${seconds} ${ampm}</span>`;
            }

            // Ambient Clock
            const ambientClockEl = document.getElementById('ambient-clock');
            if (ambientClockEl) {
                ambientClockEl.textContent = `${displayHours}:${minutes} ${ampm}`;
            }

            // Date
            const options = { weekday: 'long', month: 'short', day: 'numeric' };
            const dateStr = now.toLocaleDateString('en-US', options);
            const dateEl = document.getElementById('clock-date');
            if (dateEl) {
                dateEl.textContent = dateStr;
            }

            const ambientDateEl = document.getElementById('ambient-date');
            if (ambientDateEl) {
                ambientDateEl.textContent = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
            }
        };

        updateClock();
        setInterval(updateClock, 1000);
    }

    // ==========================================
    // WEATHER SYSTEM
    // ==========================================
    setupWeather() {
        const tempEl = document.getElementById('weather-temp');
        const condEl = document.getElementById('weather-condition');
        const iconEl = document.getElementById('weather-icon');
        const ambientWeatherEl = document.getElementById('ambient-weather');

        // Clean, lightweight simulation or cached values
        const weatherPresets = {
            'New York': { temp: '72°F', cond: 'Clear & Mild', icon: '☀️' },
            'Los Angeles': { temp: '78°F', cond: 'Sunny Skies', icon: '☀️' },
            'London': { temp: '59°F', cond: 'Overcast Mist', icon: '⛅' },
            'Tokyo': { temp: '68°F', cond: 'Pleasant', icon: '🌤️' },
            'Chicago': { temp: '64°F', cond: 'Breezy', icon: '💨' }
        };

        const current = weatherPresets[this.weatherCity] || { temp: '70°F', cond: 'Pleasant', icon: '☀️' };

        if (tempEl) tempEl.textContent = current.temp;
        if (condEl) condEl.textContent = current.cond;
        if (iconEl) iconEl.textContent = current.icon;
        if (ambientWeatherEl) {
            ambientWeatherEl.textContent = `${current.temp} • ${current.cond} in ${this.weatherCity}`;
        }
    }

    // ==========================================
    // WALLPAPERS
    // ==========================================
    applyWallpaper(wallId) {
        this.currentWallpaper = wallId;
        localStorage.setItem('aero_tv_wallpaper', wallId);

        document.querySelectorAll('.wallpaper-layer').forEach(layer => {
            layer.classList.remove('active');
        });

        const targetLayer = document.getElementById(`wall-${wallId}`);
        if (targetLayer) {
            targetLayer.classList.add('active');
        }

        // Update settings modal buttons
        document.querySelectorAll('#wallpaper-selector .opt-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.wall === wallId);
        });
    }

    // ==========================================
    // PARENTAL SECURITY & PIN SYSTEM
    // ==========================================
    setupSecurityUI() {
        const startupOnBtn = document.getElementById('btn-lock-startup-on');
        const startupOffBtn = document.getElementById('btn-lock-startup-off');
        if (startupOnBtn && startupOffBtn) {
            startupOnBtn.classList.toggle('active', this.lockOnBoot);
            startupOffBtn.classList.toggle('active', !this.lockOnBoot);
        }

        const pinLabel = document.getElementById('lbl-current-pin');
        if (pinLabel) {
            pinLabel.textContent = '••••';
        }

        this.updateAppLockOptions();
    }

    showLockScreen(subtitle = 'Enter 4-digit code to access TV', onSuccess = null) {
        this.currentEnteredPin = '';
        this.pendingUnlockCallback = onSuccess;

        const subEl = document.getElementById('lock-subtitle');
        if (subEl) subEl.textContent = subtitle;

        const errEl = document.getElementById('pin-error-msg');
        if (errEl) errEl.textContent = '';

        this.updatePinDots();

        const lockOverlay = document.getElementById('tv-lock-screen');
        if (lockOverlay) {
            lockOverlay.classList.add('active');
            lockOverlay.setAttribute('aria-hidden', 'false');

            if (window.TVAudio) window.TVAudio.playAmbientSwell();

            // Direct focus to the center key (5) on keypad
            setTimeout(() => {
                const targetKey = lockOverlay.querySelector('[data-key="5"]') || lockOverlay.querySelector('.key-btn');
                if (targetKey && window.SpatialNav) {
                    window.SpatialNav.focusElement(targetKey, false);
                }
            }, 60);
        }
    }

    hideLockScreen() {
        const lockOverlay = document.getElementById('tv-lock-screen');
        if (lockOverlay) {
            lockOverlay.classList.remove('active');
            lockOverlay.setAttribute('aria-hidden', 'true');
        }

        this.isUnlocked = true;
        this.currentEnteredPin = '';

        // Refocus active tab or default card
        const defaultTarget = document.querySelector('.nav-tab.active') || document.querySelector('.card.focusable');
        if (defaultTarget && window.SpatialNav) {
            window.SpatialNav.focusElement(defaultTarget, false);
        }
    }

    enterPinDigit(digit) {
        if (this.currentEnteredPin.length >= 4) return;

        this.currentEnteredPin += String(digit);
        this.updatePinDots();

        if (window.TVAudio) window.TVAudio.playPinDigit();

        if (this.currentEnteredPin.length === 4) {
            setTimeout(() => this.verifyPin(), 120);
        }
    }

    backspacePinDigit() {
        if (this.currentEnteredPin.length > 0) {
            this.currentEnteredPin = this.currentEnteredPin.slice(0, -1);
            this.updatePinDots();
            if (window.TVAudio) window.TVAudio.playBackSound();
        }
    }

    clearPin() {
        this.currentEnteredPin = '';
        this.updatePinDots();
        const errEl = document.getElementById('pin-error-msg');
        if (errEl) errEl.textContent = '';
    }

    updatePinDots() {
        for (let i = 0; i < 4; i++) {
            const dot = document.getElementById(`pdot-${i}`);
            if (dot) {
                dot.classList.toggle('filled', i < this.currentEnteredPin.length);
            }
        }
    }

    verifyPin() {
        if (this.currentEnteredPin === this.pin) {
            // Correct PIN!
            if (window.TVAudio) window.TVAudio.playPinSuccess();

            const dotsRow = document.getElementById('pin-dots-container');
            const errEl = document.getElementById('pin-error-msg');
            if (errEl) {
                errEl.style.color = 'var(--accent-success)';
                errEl.textContent = 'Access Granted';
            }

            setTimeout(() => {
                this.hideLockScreen();
                if (errEl) {
                    errEl.style.color = '';
                    errEl.textContent = '';
                }

                if (this.pendingUnlockCallback) {
                    const cb = this.pendingUnlockCallback;
                    this.pendingUnlockCallback = null;
                    cb();
                } else {
                    this.showToast('TV Unlocked', 'Welcome to Aero TV');
                }
            }, 350);
        } else {
            // Incorrect PIN
            if (window.TVAudio) window.TVAudio.playPinError();

            const dotsRow = document.getElementById('pin-dots-container');
            const errEl = document.getElementById('pin-error-msg');

            if (errEl) errEl.textContent = 'Incorrect PIN code. Try again.';
            if (dotsRow) dotsRow.classList.add('shake');

            setTimeout(() => {
                this.clearPin();
                if (dotsRow) dotsRow.classList.remove('shake');
            }, 600);
        }
    }

    lockTVNow() {
        this.isUnlocked = false;
        this.showLockScreen('TV Locked by User', null);
        this.showToast('TV Locked', 'Security PIN required to access.');
    }

    // ==========================================
    // IDLE DETECTOR & SCREENSAVER
    // ==========================================
    startIdleDetection() {
        const resetTimer = () => {
            if (this.idleTimer) clearTimeout(this.idleTimer);
            if (this.idleTimeoutMinutes > 0) {
                this.idleTimer = setTimeout(() => {
                    this.enterAmbientMode();
                }, this.idleTimeoutMinutes * 60 * 1000);
            }
        };

        ['keydown', 'mousemove', 'click', 'scroll', 'touchstart'].forEach(evt => {
            window.addEventListener(evt, resetTimer, { passive: true });
        });

        resetTimer();
    }

    enterAmbientMode() {
        const overlay = document.getElementById('ambient-overlay');
        if (overlay && !overlay.classList.contains('active')) {
            overlay.classList.add('active');
            overlay.setAttribute('aria-hidden', 'false');
            if (window.TVAudio) window.TVAudio.playAmbientSwell();
        }
    }

    exitAmbientMode() {
        const overlay = document.getElementById('ambient-overlay');
        if (overlay && overlay.classList.contains('active')) {
            overlay.classList.remove('active');
            overlay.setAttribute('aria-hidden', 'true');
            if (window.TVAudio) window.TVAudio.playFocusTick();
            this.startIdleDetection();
        }
    }

    toggleAmbientMode() {
        const overlay = document.getElementById('ambient-overlay');
        if (overlay.classList.contains('active')) {
            this.exitAmbientMode();
        } else {
            this.enterAmbientMode();
        }
    }

    // ==========================================
    // MODALS & NAVIGATION
    // ==========================================
    openGuideModal() {
        this.closeAllModals();
        const modal = document.getElementById('guide-modal');
        if (modal) {
            modal.classList.add('active');
            modal.setAttribute('aria-hidden', 'false');
            if (window.TVAudio) window.TVAudio.playSelectChime();

            // Set focus inside modal
            setTimeout(() => {
                const first = modal.querySelector('.modal-tab.active') || modal.querySelector('.focusable');
                if (first && window.SpatialNav) {
                    window.SpatialNav.focusElement(first, false);
                }
            }, 50);
        }
    }

    openSettingsModal() {
        this.closeAllModals();
        const modal = document.getElementById('settings-modal');
        if (modal) {
            modal.classList.add('active');
            modal.setAttribute('aria-hidden', 'false');
            if (window.TVAudio) window.TVAudio.playSelectChime();

            setTimeout(() => {
                const first = modal.querySelector('.opt-btn.active') || modal.querySelector('.focusable');
                if (first && window.SpatialNav) {
                    window.SpatialNav.focusElement(first, false);
                }
            }, 50);
        }
    }

    closeAllModals() {
        document.querySelectorAll('.modal-overlay').forEach(modal => {
            modal.classList.remove('active');
            modal.setAttribute('aria-hidden', 'true');
        });

        // Refocus main content
        const activeTab = document.querySelector('.nav-tab.active') || document.querySelector('.card.focusable');
        if (activeTab && window.SpatialNav) {
            window.SpatialNav.focusElement(activeTab, false);
        }
    }

    switchTab(tabId) {
        document.querySelectorAll('.nav-tab').forEach(tab => {
            const isActive = tab.dataset.tab === tabId;
            tab.classList.toggle('active', isActive);
            tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
        });

        if (tabId === 'dashboard') {
            document.getElementById('main-content').scrollTo({ top: 0, behavior: 'smooth' });
        } else if (tabId === 'apps') {
            this.scrollToSection('section-apps');
        } else if (tabId === 'inputs') {
            this.scrollToSection('section-inputs');
        } else if (tabId === 'media') {
            this.scrollToSection('section-media');
        } else if (tabId === 'guide') {
            this.openGuideModal();
        }
    }

    scrollToSection(sectionId) {
        const sec = document.getElementById(sectionId);
        if (sec) {
            sec.scrollIntoView({ behavior: 'smooth', block: 'center' });
            // Focus first card in that section
            const firstCard = sec.querySelector('.focusable');
            if (firstCard && window.SpatialNav) {
                setTimeout(() => window.SpatialNav.focusElement(firstCard, true), 200);
            }
        }
    }

    showToast(title, desc) {
        const toast = document.getElementById('input-toast');
        const titleEl = document.getElementById('toast-title');
        const descEl = document.getElementById('toast-desc');

        if (titleEl) titleEl.textContent = title;
        if (descEl) descEl.textContent = desc;

        toast.classList.add('show');
        if (this.toastTimer) clearTimeout(this.toastTimer);
        this.toastTimer = setTimeout(() => {
            toast.classList.remove('show');
        }, 3200);
    }

    // ==========================================
    // SLEEP TIMER
    // ==========================================
    cycleSleepTimer() {
        const durations = [0, 30, 60, 90];
        const currentIndex = durations.indexOf(this.sleepMinutesRemaining);
        const nextIndex = (currentIndex + 1) % durations.length;
        this.sleepMinutesRemaining = durations[nextIndex];

        const statusEl = document.getElementById('sleep-timer-status');
        if (this.sleepTimerId) clearInterval(this.sleepTimerId);

        if (this.sleepMinutesRemaining === 0) {
            statusEl.textContent = 'Off (Click to set 30m / 60m / 90m)';
            this.showToast('Sleep Timer Disabled', 'TV will remain on.');
        } else {
            statusEl.textContent = `Active: ${this.sleepMinutesRemaining} mins left`;
            this.showToast('Sleep Timer Activated', `TV ambient standby in ${this.sleepMinutesRemaining} minutes.`);
            
            this.sleepTimerId = setInterval(() => {
                this.sleepMinutesRemaining--;
                if (this.sleepMinutesRemaining <= 0) {
                    clearInterval(this.sleepTimerId);
                    statusEl.textContent = 'Off (Click to set)';
                    this.enterAmbientMode();
                } else {
                    statusEl.textContent = `Active: ${this.sleepMinutesRemaining} mins left`;
                }
            }, 60000);
        }
    }

    // ==========================================
    // DOM EVENT BINDINGS
    // ==========================================
    bindEvents() {
        // Top Nav Tabs
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                this.switchTab(tab.dataset.tab);
                if (window.TVAudio) window.TVAudio.playSelectChime();
            });
        });

        // Quick Action Buttons
        const btnLock = document.getElementById('btn-lock-tv');
        if (btnLock) {
            btnLock.addEventListener('click', () => this.lockTVNow());
        }

        const btnAmbient = document.getElementById('btn-ambient');
        if (btnAmbient) {
            btnAmbient.addEventListener('click', () => this.toggleAmbientMode());
        }

        const btnSettings = document.getElementById('btn-settings');
        if (btnSettings) {
            btnSettings.addEventListener('click', () => this.openSettingsModal());
        }

        // Keypad buttons on lock screen
        document.querySelectorAll('.key-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const key = btn.dataset.key;
                if (key === 'clear') {
                    this.clearPin();
                    if (window.TVAudio) window.TVAudio.playBackSound();
                } else if (key === 'backspace') {
                    this.backspacePinDigit();
                } else if (key !== undefined) {
                    this.enterPinDigit(key);
                }
            });
        });

        // Remote physical number keys listener (0-9)
        document.addEventListener('keydown', (e) => {
            const lockOverlay = document.getElementById('tv-lock-screen');
            if (lockOverlay && lockOverlay.classList.contains('active')) {
                if (e.key >= '0' && e.key <= '9') {
                    e.preventDefault();
                    this.enterPinDigit(e.key);
                }
            }
        });

        // Ambient Dismiss click
        const ambientOverlay = document.getElementById('ambient-overlay');
        if (ambientOverlay) {
            ambientOverlay.addEventListener('click', () => this.exitAmbientMode());
        }

        // Modal Close Buttons
        document.getElementById('btn-close-guide')?.addEventListener('click', () => this.closeAllModals());
        document.getElementById('btn-guide-got-it')?.addEventListener('click', () => this.closeAllModals());
        document.getElementById('btn-close-settings')?.addEventListener('click', () => this.closeAllModals());
        document.getElementById('btn-settings-done')?.addEventListener('click', () => this.closeAllModals());
        document.getElementById('btn-close-manage-apps')?.addEventListener('click', () => this.closeAllModals());
        document.getElementById('btn-manage-apps-done')?.addEventListener('click', () => this.closeAllModals());
        document.getElementById('btn-close-pin-change')?.addEventListener('click', () => {
            document.getElementById('pin-change-modal')?.classList.remove('active');
        });

        // Open Manage Apps Modal
        document.getElementById('btn-open-manage-apps')?.addEventListener('click', () => {
            this.openManageAppsModal('organize');
        });
        document.getElementById('btn-settings-manage-apps')?.addEventListener('click', () => {
            this.openManageAppsModal('organize');
        });

        // Guide Modal Tabs
        document.querySelectorAll('.modal-tab[data-guide-tab]').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.modal-tab[data-guide-tab]').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                const targetPanelId = `guide-${tab.dataset.guideTab}`;
                document.querySelectorAll('.guide-panel').forEach(p => p.classList.remove('active'));
                const panel = document.getElementById(targetPanelId);
                if (panel) panel.classList.add('active');

                if (window.TVAudio) window.TVAudio.playSelectChime();
            });
        });

        // HDMI / Source Cards
        document.querySelectorAll('.input-card').forEach(card => {
            card.addEventListener('click', () => {
                const name = card.querySelector('.input-name')?.textContent || 'Input';
                const tag = card.querySelector('.input-tag')?.textContent || 'HDMI';
                if (card.id === 'btn-edit-inputs') {
                    this.showToast('Input Renaming', 'Select any port to change custom console or PC name.');
                } else {
                    this.showToast(`Switching Source: ${tag}`, `Active device: ${name}`);
                    if (window.TVAudio) window.TVAudio.playSelectChime();
                }
            });
        });

        // App Cards Track (Dynamic Delegation With Parental Protection Check)
        const appsTrack = document.getElementById('apps-track');
        if (appsTrack) {
            appsTrack.addEventListener('click', (e) => {
                if (e.target.closest('#btn-add-app')) {
                    this.openManageAppsModal('custom');
                    return;
                }

                const card = e.target.closest('.app-card');
                if (!card) return;

                const appName = card.dataset.appName;
                const appUrl = card.dataset.appUrl;

                // Check if this app is locked by parental controls
                if (this.lockedApps.includes(appName)) {
                    this.showLockScreen(`Parental Lock: ${appName}`, () => {
                        this.actuallyLaunchApp(appName, appUrl);
                    });
                    return;
                }

                this.actuallyLaunchApp(appName, appUrl);
            });
        }

        // Media Cards
        document.querySelectorAll('.media-card').forEach(card => {
            card.addEventListener('click', () => {
                const title = card.dataset.mediaTitle || 'Media Stream';
                this.showToast(`Resuming "${title}"`, 'Connecting to high-bitrate stream...');
                if (window.TVAudio) window.TVAudio.playSelectChime();
            });
        });

        // Tools Cards
        document.getElementById('tool-samsung-guide')?.addEventListener('click', () => {
            this.openGuideModal();
            const tab = document.querySelector('[data-guide-tab="method3"]');
            if (tab) tab.click();
        });

        document.getElementById('tool-autorun-guide')?.addEventListener('click', () => {
            this.openGuideModal();
            const tab = document.querySelector('[data-guide-tab="method4"]');
            if (tab) tab.click();
        });

        document.getElementById('tool-tizen-sideload')?.addEventListener('click', () => {
            this.openGuideModal();
            const tab = document.querySelector('[data-guide-tab="method2"]');
            if (tab) tab.click();
        });

        document.getElementById('tool-sleep-timer')?.addEventListener('click', () => {
            this.cycleSleepTimer();
        });

        // Settings: Parental Startup Lock Toggle
        document.getElementById('btn-lock-startup-on')?.addEventListener('click', () => {
            this.lockOnBoot = true;
            localStorage.setItem('aero_tv_lock_on_boot', 'true');
            document.getElementById('btn-lock-startup-on').classList.add('active');
            document.getElementById('btn-lock-startup-off').classList.remove('active');
            this.showToast('Startup PIN Active', 'TV will require PIN code when powered on.');
            if (window.TVAudio) window.TVAudio.playSelectChime();
        });

        document.getElementById('btn-lock-startup-off')?.addEventListener('click', () => {
            this.lockOnBoot = false;
            localStorage.setItem('aero_tv_lock_on_boot', 'false');
            document.getElementById('btn-lock-startup-off').classList.add('active');
            document.getElementById('btn-lock-startup-on').classList.remove('active');
            this.showToast('Startup PIN Disabled', 'TV will open directly to home screen.');
            if (window.TVAudio) window.TVAudio.playSelectChime();
        });

        // Settings: App-Level Lock Checkboxes
        document.querySelectorAll('.app-lock-chk').forEach(chk => {
            chk.addEventListener('change', () => {
                const checked = Array.from(document.querySelectorAll('.app-lock-chk:checked')).map(c => c.value);
                this.lockedApps = checked;
                localStorage.setItem('aero_tv_locked_apps', JSON.stringify(this.lockedApps));
                this.showToast('Parental Controls Updated', `${checked.length} apps now PIN protected.`);
            });
        });

        // Settings: Open PIN Change Dialog
        document.getElementById('btn-open-pin-change')?.addEventListener('click', () => {
            const modal = document.getElementById('pin-change-modal');
            const input = document.getElementById('input-new-pin');
            const status = document.getElementById('pin-change-status');
            if (input) input.value = '';
            if (status) {
                status.textContent = '';
                status.className = 'pin-status-alert';
            }
            if (modal) {
                modal.classList.add('active');
                if (input && window.SpatialNav) {
                    setTimeout(() => window.SpatialNav.focusElement(input, false), 50);
                }
            }
        });

        // Settings: Save New PIN
        document.getElementById('btn-save-pin')?.addEventListener('click', () => {
            const input = document.getElementById('input-new-pin');
            const status = document.getElementById('pin-change-status');
            const val = input ? input.value.trim() : '';

            if (/^\d{4}$/.test(val)) {
                this.pin = val;
                localStorage.setItem('aero_tv_pin', val);
                if (status) {
                    status.textContent = '✓ PIN successfully updated to ' + val;
                    status.className = 'pin-status-alert success';
                }
                if (window.TVAudio) window.TVAudio.playPinSuccess();

                setTimeout(() => {
                    document.getElementById('pin-change-modal')?.classList.remove('active');
                    this.showToast('PIN Changed', 'New master security PIN is now active.');
                }, 900);
            } else {
                if (status) {
                    status.textContent = 'Error: PIN must be exactly 4 numeric digits (0-9).';
                    status.className = 'pin-status-alert error';
                }
                if (window.TVAudio) window.TVAudio.playPinError();
            }
        });

        // Settings: Wallpaper Buttons
        document.querySelectorAll('#wallpaper-selector .opt-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.applyWallpaper(btn.dataset.wall);
                if (window.TVAudio) window.TVAudio.playSelectChime();
            });
        });

        // Settings: Audio Toggle
        document.getElementById('btn-sound-on')?.addEventListener('click', (e) => {
            window.TVAudio.setEnabled(true);
            document.getElementById('btn-sound-on').classList.add('active');
            document.getElementById('btn-sound-off').classList.remove('active');
            window.TVAudio.playSelectChime();
        });

        document.getElementById('btn-sound-off')?.addEventListener('click', (e) => {
            window.TVAudio.setEnabled(false);
            document.getElementById('btn-sound-off').classList.add('active');
            document.getElementById('btn-sound-on').classList.remove('active');
        });

        // Settings: Screensaver Timeout
        document.querySelectorAll('#timeout-selector .opt-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('#timeout-selector .opt-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.idleTimeoutMinutes = parseInt(btn.dataset.timeout, 10);
                localStorage.setItem('aero_tv_idle_timeout', this.idleTimeoutMinutes);
                this.startIdleDetection();
                if (window.TVAudio) window.TVAudio.playSelectChime();
            });
        });

        // Settings: City Update
        document.getElementById('btn-save-city')?.addEventListener('click', () => {
            const input = document.getElementById('setting-city-input');
            if (input && input.value.trim()) {
                this.weatherCity = input.value.trim();
                localStorage.setItem('aero_tv_weather_city', this.weatherCity);
                this.setupWeather();
                this.showToast('Weather Updated', `Location set to ${this.weatherCity}`);
            }
        });
    }

    actuallyLaunchApp(appName, appUrl) {
        this.showToast(`Launching ${appName}`, 'Opening ad-free interface...');
        if (window.TVAudio) window.TVAudio.playSelectChime();

        setTimeout(() => {
            if (window.TizenAdapter) {
                window.TizenAdapter.launchApp({ name: appName, url: appUrl });
            }
        }, 400);
    }

    // ==========================================
    // APPLICATIONS MANAGEMENT & DYNAMIC STORAGE
    // ==========================================
    getDefaultApps() {
        return [
            {
                id: 'youtube',
                name: 'YouTube',
                url: 'https://www.youtube.com/tv',
                type: 'streaming',
                badge: 'Ad-Free SmartTube',
                gradient: 'yt-gradient',
                iconType: 'svg',
                iconSvg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>',
                visible: true,
                isBuiltIn: true
            },
            {
                id: 'netflix',
                name: 'Netflix',
                url: 'https://www.netflix.com',
                type: 'streaming',
                badge: 'Movies & Series',
                gradient: 'nflx-gradient',
                iconType: 'letter',
                iconLetter: 'N',
                visible: true,
                isBuiltIn: true
            },
            {
                id: 'plex',
                name: 'Plex',
                url: 'https://app.plex.tv/desktop',
                type: 'local-media',
                badge: 'Personal Library',
                gradient: 'plex-gradient',
                iconType: 'svg',
                iconSvg: '<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 2 22 22 22 12 2"/></svg>',
                visible: true,
                isBuiltIn: true
            },
            {
                id: 'jellyfin',
                name: 'Jellyfin',
                url: 'http://localhost:8096',
                type: 'local-media',
                badge: 'Self-Hosted',
                gradient: 'jelly-gradient',
                iconType: 'svg',
                iconSvg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.2C6.59 2.2 2.2 6.59 2.2 12c0 3.79 2.16 7.08 5.32 8.68-.07-.36-.12-.73-.12-1.12 0-3.52 2.86-6.38 6.38-6.38 1.15 0 2.23.31 3.16.85.66-1.2 1.04-2.58 1.04-4.03 0-4.41-3.59-8-8-8z"/></svg>',
                visible: true,
                isBuiltIn: true
            },
            {
                id: 'prime',
                name: 'Prime Video',
                url: 'https://www.amazon.com/gp/video/storefront',
                type: 'streaming',
                badge: 'Originals',
                gradient: 'prime-gradient',
                iconType: 'svg',
                iconSvg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M22.5 16.5c-3.5 2-8 3-12 1.5-2.5-1-4.5-2.5-6-4.5.3-.2.6-.4.9-.5 1.5 2 3.5 3.3 6 4 3.5 1 7.5.5 10.5-1.5.2.3.4.4.6.5zm.5-2.5c-.2-.5-1-.8-2.2-.4-.8.3-1.6.8-2.3 1.3-.2-.3-.5-.5-.8-.7.8-.6 1.7-1.1 2.6-1.5 1.7-.6 3-.1 3.3.8.3 1-.3 2.1-1.3 3.1-.3-.2-.5-.4-.7-.6.7-.8 1-1.5.7-2z"/></svg>',
                visible: true,
                isBuiltIn: true
            },
            {
                id: 'disney',
                name: 'Disney+',
                url: 'https://www.disneyplus.com',
                type: 'streaming',
                badge: 'Marvel & Star Wars',
                gradient: 'disney-gradient',
                iconType: 'letter',
                iconLetter: 'D+',
                visible: true,
                isBuiltIn: true
            },
            {
                id: 'spotify',
                name: 'Spotify',
                url: 'https://open.spotify.com',
                type: 'music',
                badge: 'Hi-Fi Music',
                gradient: 'spotify-gradient',
                iconType: 'svg',
                iconSvg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>',
                visible: true,
                isBuiltIn: true
            },
            {
                id: 'browser',
                name: 'Web Browser',
                url: 'browser',
                type: 'tool',
                badge: 'Full Screen',
                gradient: 'browser-gradient',
                iconType: 'svg',
                iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>',
                visible: true,
                isBuiltIn: true
            }
        ];
    }

    getPresetCatalog() {
        return [
            {
                id: 'preset_twitch',
                name: 'Twitch',
                url: 'https://www.twitch.tv',
                type: 'streaming',
                badge: 'Live Streaming',
                gradient: 'twitch-gradient',
                iconType: 'letter',
                iconLetter: 'Tw',
                desc: 'Gaming, esports & live creator streams'
            },
            {
                id: 'preset_crunchy',
                name: 'Crunchyroll',
                url: 'https://www.crunchyroll.com',
                type: 'streaming',
                badge: 'Anime & Manga',
                gradient: 'crunchy-gradient',
                iconType: 'letter',
                iconLetter: 'CR',
                desc: 'Worlds largest anime streaming library'
            },
            {
                id: 'preset_appletv',
                name: 'Apple TV+',
                url: 'https://tv.apple.com',
                type: 'streaming',
                badge: 'Originals',
                gradient: 'appletv-gradient',
                iconType: 'letter',
                iconLetter: 'tv+',
                desc: 'Award-winning Apple Original movies & series'
            },
            {
                id: 'preset_max',
                name: 'Max',
                url: 'https://play.max.com',
                type: 'streaming',
                badge: 'HBO & Warner',
                gradient: 'max-gradient',
                iconType: 'letter',
                iconLetter: 'MAX',
                desc: 'HBO Originals, Warner Bros. & DC Universe'
            },
            {
                id: 'preset_hulu',
                name: 'Hulu',
                url: 'https://www.hulu.com',
                type: 'streaming',
                badge: 'TV & Originals',
                gradient: 'hulu-gradient',
                iconType: 'letter',
                iconLetter: 'hulu',
                desc: 'Next-day TV episodes and FX series'
            },
            {
                id: 'preset_retroarch',
                name: 'RetroArch',
                url: 'http://localhost:8080',
                type: 'gaming',
                badge: 'Cloud Emulator',
                gradient: 'retro-gradient',
                iconType: 'svg',
                iconSvg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M21 6H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-10 7H8v3H6v-3H3v-2h3V8h2v3h3v2zm4.5 2c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm4-3c-.83 0-1.5-.67-1.5-1.5S18.67 9 19.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/></svg>',
                desc: 'Classic console emulator web player'
            },
            {
                id: 'preset_ha',
                name: 'Home Assistant',
                url: 'http://homeassistant.local:8123',
                type: 'tool',
                badge: 'Smart Home Hub',
                gradient: 'ha-gradient',
                iconType: 'svg',
                iconSvg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>',
                desc: 'Local smart home dashboard and camera feeds'
            }
        ];
    }

    getIconSvgForType(iconType, name = 'App') {
        const icons = {
            play: '<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>',
            library: '<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 2 22 22 22 12 2"/></svg>',
            music: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>',
            gaming: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M21 6H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-10 7H8v3H6v-3H3v-2h3V8h2v3h3v2zm4.5 2c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm4-3c-.83 0-1.5-.67-1.5-1.5S18.67 9 19.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/></svg>',
            home: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>',
            browser: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>',
            initials: `<span class="brand-letter">${(name || 'App').substring(0, 2).toUpperCase()}</span>`
        };
        return icons[iconType] || icons.play;
    }

    loadApps() {
        try {
            const raw = localStorage.getItem('aero_tv_apps');
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    return parsed;
                }
            }
        } catch (e) {
            console.warn('[Aero TV] Failed parsing saved apps:', e);
        }
        return this.getDefaultApps();
    }

    saveApps(preserveFocusSelector = null) {
        localStorage.setItem('aero_tv_apps', JSON.stringify(this.apps));
        this.renderAppsTrack();
        this.renderAppMgmtList();
        this.renderPresetsGrid();
        this.updateAppLockOptions();

        if (preserveFocusSelector && window.SpatialNav) {
            setTimeout(() => {
                const el = document.querySelector(preserveFocusSelector);
                if (el) window.SpatialNav.focusElement(el, false);
            }, 40);
        }
    }

    renderAppsTrack() {
        const appsTrack = document.getElementById('apps-track');
        if (!appsTrack) return;

        appsTrack.innerHTML = '';
        const visibleApps = this.apps.filter(app => app.visible !== false);

        visibleApps.forEach(app => {
            const btn = document.createElement('button');
            btn.className = 'card app-card focusable';
            btn.setAttribute('data-app-id', app.id);
            btn.setAttribute('data-app-name', app.name);
            btn.setAttribute('data-app-url', app.url);
            btn.setAttribute('data-app-type', app.type || 'streaming');
            btn.setAttribute('tabindex', '-1');

            const iconContent = app.iconType === 'letter'
                ? `<span class="brand-letter">${app.iconLetter || app.name.substring(0, 2)}</span>`
                : (app.iconSvg || '<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>');

            btn.innerHTML = `
                <div class="app-icon-tile ${app.gradient || 'nebula-gradient'}">
                    ${iconContent}
                </div>
                <span class="app-title">${app.name}</span>
                <span class="app-badge-sub">${app.badge || ''}</span>
            `;
            appsTrack.appendChild(btn);
        });

        // Always append Add Custom card
        const addCard = document.createElement('button');
        addCard.className = 'card app-card add-app-card focusable';
        addCard.id = 'btn-add-app';
        addCard.setAttribute('tabindex', '-1');
        addCard.innerHTML = `
            <div class="app-icon-tile plus-gradient">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </div>
            <span class="app-title">Add Custom</span>
            <span class="app-badge-sub">URL or Service</span>
        `;
        appsTrack.appendChild(addCard);

        const countBadge = document.getElementById('apps-count-badge');
        if (countBadge) {
            countBadge.textContent = visibleApps.length;
        }
    }

    renderAppMgmtList() {
        const listContainer = document.getElementById('app-mgmt-list');
        if (!listContainer) return;

        listContainer.innerHTML = '';
        this.apps.forEach((app, idx) => {
            const isVisible = app.visible !== false;
            const row = document.createElement('div');
            row.className = `app-mgmt-row ${isVisible ? '' : 'is-hidden'}`;

            const iconContent = app.iconType === 'letter'
                ? `<span class="tile-letter">${app.iconLetter || app.name.substring(0, 2)}</span>`
                : (app.iconSvg || '<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>');

            const isCustom = app.isCustom || !app.isBuiltIn;
            const deleteBtn = isCustom
                ? `<button class="btn-mgmt-action btn-danger focusable btn-delete-app" data-app-id="${app.id}" tabindex="-1" title="Delete App">🗑️ Delete</button>`
                : '';

            row.innerHTML = `
                <div class="app-mgmt-tile ${app.gradient || 'nebula-gradient'}">
                    ${iconContent}
                </div>
                <div class="app-mgmt-info">
                    <div class="app-mgmt-header">
                        <span class="app-mgmt-name">${app.name}</span>
                        <span class="status-badge ${isVisible ? 'status-visible' : 'status-hidden'}">
                            ${isVisible ? 'Active on Home' : 'Hidden'}
                        </span>
                    </div>
                    <div class="app-mgmt-sub">${app.badge || ''} • <span class="url-text">${app.url}</span></div>
                </div>
                <div class="app-mgmt-actions">
                    <button class="btn-mgmt-action focusable btn-move-up" data-app-id="${app.id}" ${idx === 0 ? 'disabled' : ''} tabindex="-1" title="Move Left">◀</button>
                    <button class="btn-mgmt-action focusable btn-move-down" data-app-id="${app.id}" ${idx === this.apps.length - 1 ? 'disabled' : ''} tabindex="-1" title="Move Right">▶</button>
                    <button class="btn-mgmt-action focusable btn-toggle-vis" data-app-id="${app.id}" tabindex="-1">
                        ${isVisible ? '👁️ Hide' : '👁️ Show'}
                    </button>
                    ${deleteBtn}
                </div>
            `;
            listContainer.appendChild(row);
        });
    }

    renderPresetsGrid() {
        const grid = document.getElementById('presets-grid');
        if (!grid) return;

        grid.innerHTML = '';
        this.presetCatalog.forEach(preset => {
            const existing = this.apps.find(a => a.name.toLowerCase() === preset.name.toLowerCase() || a.url === preset.url);
            const isInstalled = !!existing;
            const isVisible = existing ? (existing.visible !== false) : false;

            const card = document.createElement('div');
            card.className = 'preset-card';

            const iconContent = preset.iconType === 'letter'
                ? `<span class="tile-letter">${preset.iconLetter}</span>`
                : preset.iconSvg;

            let buttonHtml = '';
            if (isInstalled && isVisible) {
                buttonHtml = `<button class="btn-preset-add is-added focusable" data-preset-id="${preset.id}" tabindex="-1">✓ Added to Home</button>`;
            } else if (isInstalled && !isVisible) {
                buttonHtml = `<button class="btn-preset-add focusable" data-preset-id="${preset.id}" tabindex="-1">👁️ Unhide to Home</button>`;
            } else {
                buttonHtml = `<button class="btn-preset-add focusable" data-preset-id="${preset.id}" tabindex="-1">➕ Add to Home</button>`;
            }

            card.innerHTML = `
                <div class="preset-card-top">
                    <div class="preset-tile ${preset.gradient}">
                        ${iconContent}
                    </div>
                    <div class="preset-details">
                        <h4 class="preset-name">${preset.name}</h4>
                        <span class="preset-badge">${preset.badge}</span>
                    </div>
                </div>
                <p class="preset-desc">${preset.desc}</p>
                ${buttonHtml}
            `;
            grid.appendChild(card);
        });
    }

    updateAppLockOptions() {
        const container = document.getElementById('app-lock-options');
        if (!container) return;

        container.innerHTML = '';
        this.apps.forEach(app => {
            const label = document.createElement('label');
            label.className = 'lock-checkbox-label';
            const isChecked = this.lockedApps.includes(app.name);
            label.innerHTML = `
                <input type="checkbox" class="app-lock-chk" value="${app.name}" ${isChecked ? 'checked' : ''}>
                <span>${app.name}</span>
            `;
            container.appendChild(label);
        });

        // Rebind change listeners
        container.querySelectorAll('.app-lock-chk').forEach(chk => {
            chk.addEventListener('change', () => {
                const checked = Array.from(container.querySelectorAll('.app-lock-chk:checked')).map(c => c.value);
                this.lockedApps = checked;
                localStorage.setItem('aero_tv_locked_apps', JSON.stringify(this.lockedApps));
                this.showToast('Parental Controls Updated', `${checked.length} apps now PIN protected.`);
                if (window.TVAudio) window.TVAudio.playSelectChime();
            });
        });
    }

    openManageAppsModal(activeTab = 'organize') {
        this.closeAllModals();
        const modal = document.getElementById('manage-apps-modal');
        if (!modal) return;

        // Switch tab
        modal.querySelectorAll('.modal-tab').forEach(t => {
            const isTarget = t.dataset.appModalTab === activeTab;
            t.classList.toggle('active', isTarget);
        });

        modal.querySelectorAll('.app-panel').forEach(p => {
            const isTarget = p.id === `app-panel-${activeTab}`;
            p.classList.toggle('active', isTarget);
        });

        this.renderAppMgmtList();
        this.renderPresetsGrid();
        this.updateCustomAppPreview();

        modal.classList.add('active');
        modal.setAttribute('aria-hidden', 'false');
        if (window.TVAudio) window.TVAudio.playSelectChime();

        setTimeout(() => {
            const target = modal.querySelector(`.modal-tab.active`) || modal.querySelector('.focusable');
            if (target && window.SpatialNav) {
                window.SpatialNav.focusElement(target, false);
            }
        }, 60);
    }

    setupAppsManagerUI() {
        // Tab switching
        document.querySelectorAll('#manage-apps-tabs .modal-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('#manage-apps-tabs .modal-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                const tabId = tab.dataset.appModalTab;
                document.querySelectorAll('.app-panel').forEach(p => p.classList.remove('active'));
                const panel = document.getElementById(`app-panel-${tabId}`);
                if (panel) panel.classList.add('active');

                if (tabId === 'organize') this.renderAppMgmtList();
                if (tabId === 'presets') this.renderPresetsGrid();
                if (tabId === 'custom') this.updateCustomAppPreview();

                if (window.TVAudio) window.TVAudio.playSelectChime();
            });
        });

        // Reset to default apps
        document.getElementById('btn-reset-apps')?.addEventListener('click', () => {
            this.resetDefaultApps();
        });

        // App list actions (event delegation)
        const listContainer = document.getElementById('app-mgmt-list');
        if (listContainer) {
            listContainer.addEventListener('click', (e) => {
                const moveUpBtn = e.target.closest('.btn-move-up');
                if (moveUpBtn) {
                    const appId = moveUpBtn.dataset.appId;
                    this.moveApp(appId, -1);
                    return;
                }

                const moveDownBtn = e.target.closest('.btn-move-down');
                if (moveDownBtn) {
                    const appId = moveDownBtn.dataset.appId;
                    this.moveApp(appId, 1);
                    return;
                }

                const toggleBtn = e.target.closest('.btn-toggle-vis');
                if (toggleBtn) {
                    const appId = toggleBtn.dataset.appId;
                    this.toggleAppVisibility(appId);
                    return;
                }

                const deleteBtn = e.target.closest('.btn-delete-app');
                if (deleteBtn) {
                    const appId = deleteBtn.dataset.appId;
                    this.deleteCustomApp(appId);
                    return;
                }
            });
        }

        // Presets grid actions (event delegation)
        const presetsGrid = document.getElementById('presets-grid');
        if (presetsGrid) {
            presetsGrid.addEventListener('click', (e) => {
                const addBtn = e.target.closest('.btn-preset-add');
                if (addBtn) {
                    const presetId = addBtn.dataset.presetId;
                    this.addPresetApp(presetId);
                }
            });
        }

        // Custom App Builder
        const nameInput = document.getElementById('custom-name-input');
        const urlInput = document.getElementById('custom-url-input');
        const badgeInput = document.getElementById('custom-badge-input');

        nameInput?.addEventListener('input', () => this.updateCustomAppPreview());
        urlInput?.addEventListener('input', () => this.updateCustomAppPreview());
        badgeInput?.addEventListener('input', () => this.updateCustomAppPreview());

        // Theme and icon chips
        document.querySelectorAll('#custom-theme-options .theme-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                document.querySelectorAll('#custom-theme-options .theme-chip').forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                this.updateCustomAppPreview();
                if (window.TVAudio) window.TVAudio.playSelectChime();
            });
        });

        document.querySelectorAll('#custom-icon-options .theme-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                document.querySelectorAll('#custom-icon-options .theme-chip').forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                this.updateCustomAppPreview();
                if (window.TVAudio) window.TVAudio.playSelectChime();
            });
        });

        // Save Custom App
        document.getElementById('btn-save-custom-app')?.addEventListener('click', () => {
            this.addCustomApp();
        });
    }

    updateCustomAppPreview() {
        const nameInput = document.getElementById('custom-name-input');
        const badgeInput = document.getElementById('custom-badge-input');
        const previewTitle = document.getElementById('preview-title');
        const previewBadge = document.getElementById('preview-badge');
        const previewTile = document.getElementById('preview-icon-tile');

        const activeTheme = document.querySelector('#custom-theme-options .theme-chip.active')?.dataset.theme || 'nebula';
        const activeIcon = document.querySelector('#custom-icon-options .theme-chip.active')?.dataset.icon || 'play';

        const name = nameInput ? nameInput.value.trim() || 'My Custom App' : 'My Custom App';
        const badge = badgeInput ? badgeInput.value.trim() || 'Custom Web App' : 'Custom Web App';

        if (previewTitle) previewTitle.textContent = name;
        if (previewBadge) previewBadge.textContent = badge;

        if (previewTile) {
            previewTile.className = `app-icon-tile ${activeTheme}-gradient`;
            previewTile.innerHTML = this.getIconSvgForType(activeIcon, name);
        }
    }

    toggleAppVisibility(appId) {
        const app = this.apps.find(a => a.id === appId);
        if (!app) return;

        app.visible = (app.visible === false) ? true : false;
        this.saveApps(`.btn-toggle-vis[data-app-id="${appId}"]`);

        this.showToast(
            app.visible ? 'App Shown on Home' : 'App Hidden from Home',
            `"${app.name}" is now ${app.visible ? 'visible' : 'hidden'} on the main carousel.`
        );
        if (window.TVAudio) window.TVAudio.playSelectChime();
    }

    moveApp(appId, direction) {
        const idx = this.apps.findIndex(a => a.id === appId);
        if (idx === -1) return;

        const targetIdx = idx + direction;
        if (targetIdx < 0 || targetIdx >= this.apps.length) return;

        const temp = this.apps[idx];
        this.apps[idx] = this.apps[targetIdx];
        this.apps[targetIdx] = temp;

        const selector = direction < 0
            ? `.btn-move-up[data-app-id="${appId}"]`
            : `.btn-move-down[data-app-id="${appId}"]`;
        this.saveApps(selector);

        if (window.TVAudio) window.TVAudio.playFocusTick();
    }

    deleteCustomApp(appId) {
        const app = this.apps.find(a => a.id === appId);
        if (!app) return;

        this.apps = this.apps.filter(a => a.id !== appId);
        this.lockedApps = this.lockedApps.filter(name => name !== app.name);
        localStorage.setItem('aero_tv_locked_apps', JSON.stringify(this.lockedApps));

        this.saveApps();
        this.showToast('App Deleted', `"${app.name}" was removed from your apps.`);
        if (window.TVAudio) window.TVAudio.playBackSound();
    }

    resetDefaultApps() {
        this.apps = this.getDefaultApps();
        this.saveApps('#btn-reset-apps');
        this.showToast('Defaults Restored', 'All original TV apps have been restored.');
        if (window.TVAudio) window.TVAudio.playSelectChime();
    }

    addPresetApp(presetId) {
        const preset = this.presetCatalog.find(p => p.id === presetId);
        if (!preset) return;

        const existing = this.apps.find(a => a.name.toLowerCase() === preset.name.toLowerCase() || a.url === preset.url);
        if (existing) {
            existing.visible = true;
            this.saveApps(`.btn-preset-add[data-preset-id="${presetId}"]`);
            this.showToast('App Activated', `"${preset.name}" is now visible on your home screen.`);
        } else {
            const newApp = {
                id: 'preset_' + Date.now(),
                name: preset.name,
                url: preset.url,
                type: preset.type,
                badge: preset.badge,
                gradient: preset.gradient,
                iconType: preset.iconType,
                iconLetter: preset.iconLetter,
                iconSvg: preset.iconSvg,
                visible: true,
                isBuiltIn: false
            };
            this.apps.push(newApp);
            this.saveApps(`.btn-preset-add[data-preset-id="${presetId}"]`);
            this.showToast('App Added to Home', `"${preset.name}" is now ready on your home screen!`);
        }
        if (window.TVAudio) window.TVAudio.playSelectChime();
    }

    addCustomApp() {
        const nameInput = document.getElementById('custom-name-input');
        const urlInput = document.getElementById('custom-url-input');
        const badgeInput = document.getElementById('custom-badge-input');

        const name = nameInput ? nameInput.value.trim() : '';
        const url = urlInput ? urlInput.value.trim() : '';
        const badge = badgeInput ? badgeInput.value.trim() : 'Custom App';

        if (!name) {
            this.showToast('Missing App Title', 'Please enter a name for your custom app.');
            if (window.TVAudio) window.TVAudio.playBackSound();
            nameInput?.focus();
            return;
        }

        const activeTheme = document.querySelector('#custom-theme-options .theme-chip.active')?.dataset.theme || 'nebula';
        const activeIcon = document.querySelector('#custom-icon-options .theme-chip.active')?.dataset.icon || 'play';

        const newApp = {
            id: 'custom_' + Date.now(),
            name: name,
            url: url || 'browser',
            type: activeIcon === 'gaming' ? 'gaming' : (activeIcon === 'music' ? 'music' : 'streaming'),
            badge: badge,
            gradient: `${activeTheme}-gradient`,
            iconType: activeIcon === 'initials' ? 'letter' : 'svg',
            iconLetter: name.substring(0, 2).toUpperCase(),
            iconSvg: this.getIconSvgForType(activeIcon, name),
            visible: true,
            isCustom: true,
            isBuiltIn: false
        };

        this.apps.push(newApp);
        this.saveApps();

        // Clear form
        if (nameInput) nameInput.value = '';
        if (urlInput) urlInput.value = '';
        if (badgeInput) badgeInput.value = 'Custom Web App';

        this.showToast('Custom App Added', `"${name}" added to Favorite Applications.`);
        if (window.TVAudio) window.TVAudio.playSelectChime();

        // Switch to organize tab so user can see it
        const organizeTab = document.querySelector('.modal-tab[data-app-modal-tab="organize"]');
        if (organizeTab) organizeTab.click();
    }
}

// Instantiate TV App
window.addEventListener('DOMContentLoaded', () => {
    window.TVApp = new AeroTVApp();
});
