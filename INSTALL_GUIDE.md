# Aero TV — Installation & Setup Guide for Samsung Smart TVs

Welcome to **Aero TV**, a lightweight, high-performance, ad-free smart TV launcher designed specifically to replace the cluttered and ad-ridden default Samsung Smart Hub (Tizen OS).

---

## Why Modern Samsung TVs Have Ads & How Aero TV Solves It

Modern Samsung TVs (running Tizen OS 3.0 through 8.0+) inject unskippable banner ads, sponsored video recommendations, and forced "Samsung TV Plus" channels into the default home screen. 

Because Samsung signs the low-level TV firmware, you don't need to risk bricking your TV with firmware jailbreaks. Instead, **Samsung provides official Developer Mode sideloading and an "Autorun Last App" setting**. By combining this with network-level ad blocking, you can completely bypass Samsung's stock home screen and boot straight into Aero TV whenever you turn on your TV!

---

## Choose Your Preferred Setup Method

| Method | Technical Difficulty | Time | Developer Mode Required? |
| :--- | :--- | :--- | :--- |
| **Method 1: Fullscreen Web Browser** | ⭐ Beginner | 2 minutes | ❌ No |
| **Method 2: Sideload Native Tizen App (.wgt)** | ⭐⭐⭐ Intermediate | 10 minutes |  Yes |

---

## Method 1: Instant Setup via Samsung TV Browser (Easiest)

You can run Aero TV as a full-screen smart dashboard directly through the TV's built-in web browser.

### 1. Host Aero TV on Your Local Network (or the Cloud)
From your computer terminal in this project folder (`/Users/timgunn/src/new-tv-ui`):

```bash
# Using Node.js (already configured in package.json)
npm run serve

# OR using Python 3
python3 -m http.server 3000
```

> **Tip (Free Cloud Hosting):** You can also push this folder to **GitHub Pages**, **Vercel**, or **Cloudflare Pages** to get a permanent HTTPS URL like `https://my-tv.vercel.app` accessible 24/7 without keeping your computer on.

### 2. Find Your Computer's Local IP Address
On your Mac/PC, check your local IP address:
```bash
# On Mac:
ipconfig getifaddr en0
# (Example output: 192.168.1.45)
```

### 3. Open on Your Samsung TV
1. On your Samsung TV remote, open the **"Internet"** app (built-in browser).
2. Enter your URL (e.g., `http://192.168.1.45:3000`).
3. Press the **Star (⭐)** icon in the top right of the browser to bookmark it or set it as the browser's default homepage.
4. Click the **Fullscreen** button in the browser toolbar.
5. You can now use your Samsung TV remote D-Pad arrows and Enter to navigate seamlessly!

---

## Method 2: Sideload Native Tizen App (`.wgt`)

If you want Aero TV installed as a standalone native app icon in your TV's app drawer:

### Step 1: Enable Developer Mode on Samsung TV
1. Turn on your Samsung TV and press the **Home** button on your remote.
2. Navigate to **Apps**.
3. With the Apps screen open, enter this code on the remote keypad in sequence:  
   **`1` ➔ `2` ➔ `3` ➔ `4` ➔ `5`**
4. A **Developer Mode Configuration** popup will appear.
5. Toggle Developer Mode to **ON**.
6. Enter your computer's local IP address in the **Host PC IP** field.
7. Click **OK**, then restart your TV: hold the physical **Power button** on the remote for 5 seconds until the Samsung TV reboot logo appears.

### Step 2: Build the Tizen Package
In this project directory, run:
```bash
./scripts/build-tizen.sh
```
This generates `dist/AeroTV.wgt` (pre-configured with TV profile, remote key handlers, and 1080p/4K orientation).

### Step 3: Install via Samsung Debug Bridge (SDB)
1. Install the Tizen CLI or SDB tools (available via Samsung Tizen Studio or Homebrew):
   ```bash
   brew install --cask tizen-studio
   # OR download SDB standalone tool
   ```
2. Connect to your TV over Wi-Fi:
   ```bash
   sdb connect [YOUR_TV_IP_ADDRESS]
   # Example: sdb connect 192.168.1.80
   ```
3. Sideload the package onto the TV:
   ```bash
   sdb install dist/AeroTV.wgt
   ```
4. Aero TV will now appear under **Installed Apps** on your Samsung TV.

---

## Step 3: Configure "Autorun Last App" (Bypass Samsung Smart Hub on Boot)

This is the magic setting that stops Samsung's ad-filled Smart Hub from popping up when you turn on your TV:

1. Open TV **Settings** (Gear icon on remote).
2. Select **General** (or **General & Privacy** on newer models).
3. Select **Smart Features**.
4. Change the following two settings:
   - **Autorun Smart Hub** ➔ Turn **OFF**
   - **Autorun Last App** ➔ Turn **ON**
5. Also navigate to **Autorun Samsung TV Plus** ➔ Turn **OFF**.

> **Result:** Now, whenever you turn on your Samsung TV, it will automatically launch directly into Aero TV full-screen without displaying Samsung's home menu or advertisements.

---

## Step 4: Block Samsung TV System Ads at the Network / DNS Level

Even if you don't use the default launcher, Samsung TVs quietly ping ad telemetry servers in the background. To kill these network-wide:

If you run **Pi-hole**, **AdGuard Home**, or use a custom router DNS (like **NextDNS** or **Control D**), add these exact domains to your blocklist:

```text
samsungads.com
config.samsungcloudcdn.com
gpm.samsungqbe.com
log-config.samsungcloudcdn.com
smetrics.samsung.com
noticecdn.samsungcloudcdn.com
oempprod.samsungcloudcdn.com
lcprd1.samsungcloudcdn.com
```

### Turn Off Privacy Telemetry on TV:
1. Open TV **Settings ➔ Support ➔ Terms & Privacy**.
2. Uncheck / opt-out of:
   - **Interest-Based Advertisements**
   - **Viewing Information Services (ACR fingerprinting)**
   - **Voice Recognition Data Sharing**

---

## Managing, Adding & Customizing Apps

You can customize your home screen app lineup directly from your TV using your remote:

### 1. Opening the App Manager
- Click the **"⚙️ Manage Apps"** button on the Favorite Applications section header.
- Or navigate to the end of the apps carousel and click the **"+ Add Custom"** card.
- Or open **Settings (Gear icon) ➔ Manage Installed Apps**.

### 2. Organize & Hide Apps
In the **"My Apps"** tab:
- **Hide Apps:** Click **"👁️ Hide"** on any pre-installed service (e.g. Disney+, Prime Video) to remove it from the home carousel without uninstalling it.
- **Reorder Carousel:** Use the **◀** and **▶** buttons to reposition apps left or right so your most-used services appear first.
- **Delete Custom Apps:** Click **"🗑️ Delete"** to completely remove any custom links you previously created.

### 3. Quick 1-Click Presets Catalog
In the **"Quick Presets"** tab:
- Browse popular streaming services and home media tools (Twitch, Crunchyroll, Apple TV+, Max, Hulu, RetroArch, Home Assistant).
- Click **"➕ Add to Home"** to add an app directly to your home screen.

### 4. Adding Custom Web Apps & Local Dashboards
In the **"Add Custom App"** tab:
- Enter any URL (e.g. your local Home Assistant `http://homeassistant.local:8123`, Jellyfin, or web app).
- Customize the tile with an app title, subtitle badge, custom OLED color gradient, and icon.
- Click **"+ Add to Home Screen"**. Changes are saved directly to local storage and sync with the Parental Lock controls automatically.

---

## Parental Controls & Security PIN System

Aero TV includes an integrated security lock system to prevent children from accessing unauthorized apps or using the TV without permission:

### Default Settings
- **Default Master PIN:** `0000`
- **Initial Setup:** The lock screen can be toggled to activate on boot or only for sensitive apps.

### 1. Require PIN on TV Startup
In **Settings (Gear icon) ➔ Parental Security & Access Lock**:
- Select **"🔒 Require PIN on Startup"**.
- Now, whenever the TV turns on or wakes from standby, the screen is completely locked behind the security PIN.
- Children cannot view channels, open apps, or switch HDMI inputs until the correct 4-digit code is entered.

### 2. Lock Specific Apps
You can allow general TV usage while protecting specific apps (like the Full Web Browser, Netflix, YouTube, or Prime Video):
- In **Settings ➔ Protect Specific Apps with PIN**, check the apps you want locked.
- Whenever anyone tries to open that app from the home screen, a PIN prompt will pop up asking for authorization.

### 3. Entering the PIN on TV Remote
- **TV Remote Keypad:** Simply press the physical number buttons `0` through `9` on your Samsung remote.
- **D-Pad Navigation:** Use the arrow keys (`◀ ▲ ▼ ▶`) to highlight numbers on the on-screen keypad and press **Enter**.
- **Backspace / Correction:** Press the remote's **Return / Back** button or select `⌫` to erase a digit.
- **Instant Lock:** Press the Lock icon in the top header or set the TV idle timer.

### 4. Changing Your Master PIN
1. Open **Settings ➔ Parental Security & Access Lock**.
2. Click **"Change PIN"**.
3. Enter your custom 4-digit code and click **Save PIN**.

---

## Remote Control Key Shortcuts

Aero TV includes dedicated keycode listeners for Samsung TV remotes:

| Button | Function |
| :--- | :--- |
| **D-Pad (▲ ▼ ◀ ▶)** | Directional spatial card focus with smooth audio ticks |
| **Center / Enter** | Launch selected app, switch HDMI input, or trigger action |
| **Number Keys (0-9)** | Direct PIN entry on Lock Screen / Parental Controls |
| **Return / Back (10009)** | Erase PIN digit / Close active modal / return to Home tab |
| **Exit (10182)** | Exit to TV broadcast or previous source |
| **Red Button** | Instant jump to Connected Sources (HDMI Ports) |
| **Green Button** | Instant jump to Favorite Apps |
| **Yellow Button** | Toggle Ambient Screensaver (OLED Black Mode) |
| **Blue Button** | Open In-App Installation & Ad-Block Guide |

---

## Built-In Features in Aero TV

- **Zero Advertisements**: Clean, distraction-free 10-foot UI.
- **Interactive App Manager**: Reorder, show/hide, install 1-click presets (Twitch, Crunchyroll, Max, etc.), or add custom local dashboards on the fly.
- **Parental Controls & Security PIN**: Lock the entire TV on startup and protect selected apps (Default PIN: `0000`).
- **Direct HDMI Source Switcher**: Instant switching for PS5, Apple TV, Switch, and Soundbar (eARC).
- **Personal Media Hub**: Direct shortcuts to Plex, Jellyfin, Emby, and DLNA servers.
- **Ambient Screensaver**: OLED-friendly burn-in prevention clock & weather with tranquil floating animations.
- **Web Audio Remote Feedback**: Satisfying, non-intrusive tactile audio clicks generated in real-time.
- **Customizable Themes**: Toggle between *OLED Aurora*, *Nordic Lake*, and *Obsidian Mesh* wallpapers.

