# Aero TV — Architecture & Design Document

> **Aero TV** is a high-performance, ad-free smart TV launcher and dashboard designed specifically for **Samsung Smart TVs (Tizen OS)**. It replaces intrusive advertising, bloated recommendations, and sluggish firmware menus with a minimalist, customizable 10-foot user experience.

---

## 1. Motivation & Problem Statement

### Modern Smart TV Issues
- **Unskippable Sponsored Ads**: Stock Samsung Smart Hub displays banner ads, promotional video rows, and suggested subscription channels.
- **Sluggish Navigation**: Native firmware launchers run heavy cloud telemetry, resulting in sluggish response times when pressing remote buttons.
- **Buried Hardware Inputs**: Physical inputs (HDMI 1, HDMI 2, Soundbars) are often hidden behind multiple submenus.
- **Unrestricted Child Access**: Stock launchers do not provide a simple, unified PIN lock to prevent small children from launching web browsers or paid streaming services.

### Aero TV Solution
1. **Ad-Free Clean Interface**: Eliminates 100% of sponsored content and cloud ad queries.
2. **Instant Hardware Switching**: Direct HDMI 1–4 source switching right on the home row.
3. **Dedicated Parental Controls**: 4-digit Master PIN system to lock the TV on startup or protect specific apps.
4. **10-Foot Spatial Navigation**: Responsive 2D D-pad navigation engineered for couch viewing.
5. **Dual Deployment Paths**: Runs natively via Tizen Developer Mode (`.wgt`) or through the TV's built-in web browser in full-screen mode.

---

## 2. System Architecture

```
+-------------------------------------------------------------------------+
|                              Aero TV UI                                 |
|                                                                         |
|  +--------------------+  +--------------------+  +-------------------+  |
|  |     Header Bar     |  |    Category Rail   |  |   Quick Actions   |  |
|  | (Clock/Weather/Ad) |  | (Home/Apps/Inputs) |  | (Lock/Sleep/Gear) |  |
|  +--------------------+  +--------------------+  +-------------------+  |
|                                                                         |
|  +-------------------------------------------------------------------+  |
|  |                         Main Content                              |  |
|  |  [ Connected Sources ] -> HDMI 1 (PS5), HDMI 2 (Apple TV), etc.   |  |
|  |  [ Favorite Apps     ] -> YouTube, Netflix, Plex, Jellyfin, etc.  |  |
|  |  [ Media Spotlight   ] -> Continue Watching / Local DLNA servers  |  |
|  |  [ System Tools      ] -> Ad-Block Guide, Sleep Timer, Sideload   |  |
|  +-------------------------------------------------------------------+  |
|                                                                         |
|  +---------------------+  +---------------------+  +--------------------+  +-----------------+  |
|  |  Security PIN Lock  |  | Ambient Screensaver |  | Manage Apps Modal  |  | Settings Modal  |  |
|  +---------------------+  +---------------------+  +--------------------+  +-----------------+  |
+-------------------------------------------------------------------------+
                                    |
        +---------------------------+---------------------------+
        |                                                       |
        v                                                       v
+-------------------------------+               +-------------------------------+
|     Spatial Nav Engine        |               |      Tizen OS Adapter         |
|  (js/spatial-nav.js)          |               |   (js/tizen-adapter.js)       |
|  - 2D Geometric candidate     |               |  - Samsung Remote keycodes    |
|    scoring                    |               |  - Number keys (0-9)          |
|  - Roving tabindex (0 / -1)   |               |  - Color buttons (Red/Grn)    |
|  - Modal & Lock screen trap   |               |  - Return (10009) / Exit      |
+-------------------------------+               +-------------------------------+
        |                                                       |
        +---------------------------+---------------------------+
                                    |
                                    v
+-------------------------------------------------------------------------+
|                        Web Audio Feedback System                        |
|                            (js/audio.js)                                |
|  - Synthesizes tactile navigation ticks (450Hz -> 280Hz)                |
|  - Harmonic selection chime (587Hz & 880Hz)                             |
|  - Security PIN digit feedback & error shake buzzes                     |
+-------------------------------------------------------------------------+
```

---

## 3. Technology Stack & Directory Structure

```
/Users/timgunn/src/new-tv-ui/
├── index.html              # Core semantic TV interface and modal overlays
├── config.xml              # Samsung Tizen TV widget manifest
├── package.json            # Dev server and build script configuration
├── design.md               # Design documentation and historical changelog
├── INSTALL_GUIDE.md        # Step-by-step Samsung TV deployment instructions
├── css/
│   └── style.css           # 10-foot design system, OLED glassmorphism, focus states
├── js/
│   ├── app.js              # Application state, PIN security, clock, weather
│   ├── spatial-nav.js      # 2D D-pad spatial navigation engine
│   ├── audio.js            # Real-time Web Audio API sound feedback
│   └── tizen-adapter.js    # Samsung TV remote hardware key listener
├── assets/
│   ├── icons/logo.png      # Aero TV 512x512 application brand icon
│   ├── wallpapers/         # 4K UHD OLED background wallpapers
│   └── media/              # High-resolution media posters (Sci-Fi, Cyberpunk)
├── scripts/
│   └── build-tizen.sh      # Automated .wgt packager for Samsung TV
└── dist/
    └── AeroTV.wgt          # Compiled Tizen package ready for SDB sideload
```

---

## 4. Subsystem Deep-Dive

### 4.1. Spatial Navigation Engine (`js/spatial-nav.js`)
TV remotes navigate spatially using a 4-way D-Pad rather than sequential Tab order.
- **Roving Tabindex**: The currently highlighted item holds `tabindex="0"`; all other elements hold `tabindex="-1"`.
- **Edge-Based Geometric Candidate Scoring**:
  1. Filters candidates in the pressed direction using `getBoundingClientRect()`.
  2. Prioritizes items whose perpendicular axis overlaps with the active item to prevent unexpected jumping across rows.
  3. Uses a weighted distance formula (`gap + 2.4 * perpendicularCenterOffset`) to select the visually closest candidate.
- **Modal & Lock Screen Trapping**: When a modal or the Security Lock Screen is displayed, navigation candidates are strictly scoped to the active container.

### 4.2. Web Audio Feedback System (`js/audio.js`)
To provide tactile confirmation without external sound files:
- **`playFocusTick()`**: 18ms soft wooden click (450Hz down to 280Hz) on card focus shift.
- **`playSelectChime()`**: Dual-frequency harmonic chime (587.33Hz D5 + 880.00Hz A5) on selection.
- **`playPinDigit()`**: High-contrast short ping (650Hz to 800Hz) when a PIN number is entered.
- **`playPinSuccess()`**: Four-tone ascending arpeggio on valid PIN entry.
- **`playPinError()`**: Low 160Hz sawtooth buzz on invalid PIN attempt.

### 4.3. Parental Security & PIN Lock (`js/app.js`)
Designed to prevent children from accessing unauthorized content:
- **Master PIN**: 4-digit passcode stored in `localStorage` (`aero_tv_pin`, default: `0000`).
- **Boot Protection**: Toggling "Require PIN on Startup" forces the lock screen before the TV dashboard becomes interactive.
- **App-Specific Locks**: Checkboxes allow granular protection for individual apps (e.g. Web Browser, Netflix, YouTube) while keeping safe apps open.
- **Input Channels**: Accepts input from physical remote numeric buttons (`0`-`9`), on-screen keypad navigation, or keyboard numbers.
- **Error Shake**: 450ms visual shake animation and red warning glow on invalid PIN attempts.

### 4.4. Tizen OS Integration (`js/tizen-adapter.js`)
Integrates directly with Samsung TV hardware APIs:
- **Registered Keys**: `MediaPlay`, `MediaPause`, `0`-`9`, `ColorF0Red`, `ColorF1Green`, `ColorF2Yellow`, `ColorF3Blue`, `Info`.
- **Keycode Mappings**:
  - `10009` (Return): Backspace in PIN mode, closes modals, or returns to Home.
  - `10182` (Exit): Cleanly minimizes/exits application.
  - `403` (Red): Instant jump to Connected Sources row.
  - `404` (Green): Instant jump to Favorite Apps row.
  - `405` (Yellow): Toggles Ambient Screensaver.
  - `406` (Blue): Opens TV Setup & Ad-Blocking Guide.

### 4.5. Dynamic Application Management & Custom App Engine (`js/app.js`)
Provides user control over the home apps row with zero coding required:
- **Dynamic `localStorage` Persistence**: Replaces static markup with dynamic client-side state stored under `aero_tv_apps`, persisting user configurations across restarts and TV standby.
- **Three-Tab Manager Interface (`#manage-apps-modal`)**:
  1. **Organize & Visibility**: Lists all installed apps with live status indicators (`Active on Home` vs. `Hidden`). Provides D-pad friendly ◀ Move Left and ▶ Move Right buttons to alter home screen carousel sequence, 👁️ Toggle Show/Hide, and 🗑️ Delete for custom apps.
  2. **Quick Presets Catalog**: One-click installer for prominent streaming and self-hosted platforms (Twitch, Crunchyroll, Apple TV+, Max, Hulu, RetroArch, Home Assistant) with contextual state detection (`+ Add to Home`, `👁️ Unhide to Home`, or `✓ Added to Home`).
  3. **Custom App Creator**: Form enabling users to register arbitrary web apps or local home network services (e.g. Home Assistant, Plex Web, Emby, Jellyfin) with custom URL, category, subtitle badge, choice of 7 OLED accent gradients (Cyber Cyan, Violet Neon, Sunset Blaze, Emerald Green, Amber Gold, Deep Crimson, Obsidian), and glyph icons (Play, Gaming, Home, Music, Library, Web, or Monogram Initials).
- **Home Carousel & Parental Lock Synchronization**:
  - Automatically updates home screen `#apps-track` with the active app count badge.
  - Dynamically refreshes the Parental Lock options list so any newly added or restored app can immediately have PIN protection applied.
- **Accessible Remote Entry Points**:
  - Direct launch from the **"+ Add Custom"** tile in the apps row.
  - Quick action **"⚙️ Manage Apps"** button in the section header.
  - Direct deep-link button from the main Settings modal.

---

## 5. Visual Design & Aesthetics

- **10-Foot Readability**: Scaled with root `rem` and viewport units (`17px` base at 1080p, `22px` at 1440p, `32px` at 4K).
- **OLED Obsidian Glassmorphism**: Translucent surfaces (`rgba(18, 23, 36, 0.75)`) with backdrop blur (`blur(24px)`) and subtle border highlights (`rgba(255, 255, 255, 0.12)`).
- **Focus Rings**: High-contrast cyan and indigo glow with `scale(1.05)` elevation and 3px luminous outlines.
- **Ambient Screensaver**: Tranquil OLED-friendly screensaver displaying oversized clock and live weather to prevent display burn-in during idle periods.

---

## 6. Changelog & Revision History

### [v1.2.0] — 2026-10-23
#### Added
- **Interactive App Manager & Custom App Creator**:
  - Three-tab modal interface (`#manage-apps-modal`) for managing home applications on the fly.
  - **Organize & Visibility Tab**: Reorder carousel sequence with directional buttons (◀ / ▶), toggle visibility on the Home row (Show / Hide), and delete custom apps.
  - **Quick Presets Catalog**: 1-click installer for Twitch, Crunchyroll, Apple TV+, Max, Hulu, RetroArch, and Home Assistant with dynamic installation detection.
  - **Custom App Creator**: Form supporting custom name, launch URL, subtitle badge, category, 7 vibrant gradient themes, and 7 icon styles (including SVG glyphs and auto-monograms).
  - Dynamic `localStorage` persistence (`aero_tv_apps`) replacing static HTML app cards with dynamic carousel rendering.
  - Live app count badge in the section header (`#apps-count-badge`).
  - Seamless synchronization with Parental Controls PIN options for newly added apps.
  - Quick access via "+ Add Custom" tile, section header "⚙️ Manage Apps" button, and Preferences menu.

---

### [v1.1.0] — 2026-10-23
#### Added
- **Parental Security PIN System**:
  - Master 4-digit security PIN lock screen (`#tv-lock-screen`) with default PIN `0000`.
  - "Require PIN on Startup" setting to lock entire TV on boot.
  - Granular app-level lock settings (e.g., locking Web Browser, Netflix, YouTube).
  - Physical Samsung TV remote numeric keys (`0`-`9`) registered and forwarded directly to the PIN input.
  - On-screen 3x4 numeric keypad with clear (`C`), backspace (`⌫`), and D-pad navigation.
  - Visual shake animation (`shakeDots`) and acoustic error buzzer on invalid PIN attempts.
  - Ascending harmonic arpeggio and animated dot highlights on successful unlock.
  - Master PIN change modal in Preferences.
  - Quick "Lock TV" action button in the top-right header.
- **Documentation**:
  - Added Parental Security section to `INSTALL_GUIDE.md` and `tv_ui_guide.md`.

---

### [v1.0.0] — 2026-10-23
#### Added
- **Core Dashboard & 10-Foot UI**:
  - Live clock and date ticker with seconds indicator.
  - Weather widget with configurable locations.
  - Connected Sources row (HDMI 1: PS5, HDMI 2: Apple TV, HDMI 3: Switch, HDMI 4: eARC Soundbar) with input rename capability.
  - Favorite Applications row (YouTube, Netflix, Plex, Jellyfin, Prime, Disney+, Spotify, Browser, Add Custom).
  - Spotlight & Continue Watching media shelf with 4K HDR badges and progress indicators.
  - Ad-blocking and system tools shelf with TV sleep timer (30m / 60m / 90m).
- **Spatial Navigation**:
  - Geometric 2D edge-based arrow navigation (`ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight`).
  - Roving tabindex and smooth viewport auto-scroll.
  - Hover sync for air-mouse and pointer devices.
- **Web Audio Synthesis**:
  - Real-time synthesized acoustic clicks and chimes with zero external audio assets.
- **Ambient Screensaver**:
  - Burn-in prevention screensaver with floating clock, date, weather, and tranquil background pan.
  - Configurable idle timeout (1 min, 3 mins, 5 mins, or disabled).
- **Samsung Tizen Integration**:
  - W3C/Tizen compliant `config.xml` manifest with TV profile.
  - Dedicated packaging script `scripts/build-tizen.sh` creating `dist/AeroTV.wgt`.
  - Tizen remote color button and return key support.
- **Ad-Blocking & Installation Guides**:
  - In-app interactive guide modal with 4 tabs (Browser mode, Sideloading, Ad blocking DNS list, Startup auto-boot).
  - Comprehensive standalone `INSTALL_GUIDE.md`.
