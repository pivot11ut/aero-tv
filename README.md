# Aero TV 📺✨

> A clean, high-performance, ad-free smart TV launcher and dashboard engineered specifically for **Samsung Smart TVs (Tizen OS)**.

![Aero TV Icon](icon.png)

---

## 🌟 Overview

Modern Samsung Smart TVs running Tizen OS inject unskippable banner ads, sponsored video recommendations, and forced promotional channels into the home screen. 

**Aero TV** completely replaces the stock Smart Hub with a lightweight, minimalist 10-foot dashboard that boots straight to your hardware inputs, streaming apps, and personal media libraries.

### Key Features

- 🚫 **100% Ad-Free**: Zero cloud telemetry, zero sponsored banners, zero forced recommendations.
- 🎮 **Instant Hardware Switching**: Direct HDMI 1–4 input cards right on the home row with input renaming.
- 📱 **Interactive App Manager**: Reorder, show/hide, or delete apps, install popular streaming presets in 1 click, or add arbitrary custom web apps and self-hosted dashboards with custom OLED color palettes.
- 🔒 **Parental Security PIN**: 4-digit Master PIN system to lock the entire TV on startup or selectively password-protect specific applications (e.g. Browser, Netflix).
- 🕹️ **10-Foot Spatial Navigation**: Responsive 2D geometric D-pad remote arrow navigation with roving tabindex and focus trapping.
- 🔊 **Synthesized Web Audio**: Tactile navigation clicks and harmonic chimes generated entirely via the Web Audio API without external audio files.
- 🌌 **Ambient OLED Screensaver**: Burn-in prevention screensaver featuring tranquil clock, weather, and gentle ambient background drift.
- 🚀 **Dual Deployment**: Run natively as an installed `.wgt` app via Tizen Developer Mode or instantly via the TV's full-screen web browser.

---

## 📂 Project Structure

```
.
├── index.html              # Core semantic TV interface and modal overlays
├── config.xml              # Samsung Tizen TV widget manifest
├── package.json            # Development server & build scripts
├── design.md               # Architecture specification and changelog
├── INSTALL_GUIDE.md        # Detailed Samsung TV setup instructions
├── css/
│   └── style.css           # 10-foot design system, OLED glassmorphism, focus states
├── js/
│   ├── app.js              # Application state, PIN security, App Manager, weather
│   ├── spatial-nav.js      # 2D D-pad spatial navigation engine
│   ├── audio.js            # Synthesized Web Audio sound feedback
│   └── tizen-adapter.js    # Samsung TV remote hardware key handler
├── assets/
│   ├── icons/logo.png      # Aero TV high-res brand icon
│   ├── wallpapers/         # 4K UHD OLED background wallpapers
│   └── media/              # High-resolution media posters
├── scripts/
│   └── build-tizen.sh      # Automated Tizen .wgt packager
└── dist/
    └── AeroTV.wgt          # Compiled Tizen widget package ready for sideloading
```

---

## 🚀 Quick Start (Local Development)

To run Aero TV locally on your computer or test it on your network:

```bash
# Clone the repository
git clone https://github.com/pivot11ut/aero-tv.git
cd aero-tv

# Start the local development server (port 3000)
npm start
# or
npx serve -p 3000 .
```

Open `http://localhost:3000` in your browser. Use the arrow keys on your keyboard to navigate the 10-foot interface just like a TV remote.

---

## 📺 Samsung TV Installation

Aero TV supports two setup methods on Samsung Smart TVs:

1. **Method 1: Fullscreen Web Browser (Easiest, ~2 mins)**:
   - Host Aero TV locally or on the cloud and open the URL in your TV's browser.
   - Press the remote color button or Fullscreen toggle to enter 100% immersive TV mode.

2. **Method 2: Native Sideload (`.wgt` via Developer Mode)**:
   - Enable Developer Mode on your Samsung TV (Apps ➔ `1-2-3-4-5`).
   - Connect via SDB: `sdb connect [TV_IP]`.
   - Build and install:
     ```bash
     npm run build
     sdb install dist/AeroTV.wgt
     ```

For full step-by-step instructions (including how to set "Autorun Last App" so your TV boots straight into Aero TV), see the [Installation Guide](INSTALL_GUIDE.md).

---

## 📖 Architecture & Design

For in-depth architectural details, keycode mappings, geometric candidate scoring algorithms, and version history, see the [Design Document](design.md).

---

## 📄 License

MIT © [Tim Gunn](https://github.com/pivot11ut)
