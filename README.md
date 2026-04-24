# Lively Wallpaper - System Monitor + YouTube Status

An animated HTML wallpaper for [Lively Wallpaper](https://www.rocksdanister.com/lively/) that plays a looping video background and overlays:

- **Top-left:** realtime RAM / CPU / GPU / FPS
- **Bottom-left:** YouTube now-playing status (title + channel + progress)

## Files

```
D:\Wallpaper\
├── index.html              # main wallpaper page
├── style.css               # overlays + layout (glassmorphism, responsive)
├── script.js               # stats + YouTube logic + Lively hooks + fallback sim
├── background.mp4          # <-- put your loop video here (you must add this)
├── LivelyInfo.json         # Lively wallpaper metadata
└── LivelyProperties.json   # user-tweakable properties exposed in Lively's UI
```

## Setup

1. **Add a video** called `background.mp4` into this folder. Any MP4 works (h.264/h.265 recommended).
2. Open **Lively Wallpaper**, click the **`+`** in the library, and drag in the `D:\Wallpaper` folder (or any file inside it). Lively will import it as a custom HTML wallpaper.
3. Apply it to your desktop.

## Enabling realtime system stats

For real CPU/GPU/RAM values (instead of the fallback simulation) you need to enable the hardware-monitor feature in Lively:

1. Open Lively → **Settings** → **General**
2. Enable **"System Information"** (sometimes listed as *Hardware Monitor*)
3. The wallpaper will automatically start receiving real stats via `window.livelySystemInformation(...)` and replace the simulated values.

FPS is always measured directly via `requestAnimationFrame` and works without any Lively setting.

## Enabling real YouTube status (recommended)

Since the wallpaper is hosted as a website, use the companion **Chrome Extension** in the `chrome-extension/` folder — it watches every YouTube tab you have open and pushes the real title + channel + progress into the wallpaper page in realtime.

1. Go to `chrome://extensions` and enable **Developer mode**.
2. Click **"Load unpacked"** and select the `chrome-extension` folder.
3. Click the extension icon → paste your wallpaper origin(s) (e.g. `https://your-site.github.io`) → **Save**.
4. Open YouTube in any tab and hit play — the wallpaper overlay flips to **LIVE** within a second.

See `chrome-extension/README.md` for full details.

### Legacy: Lively "Now Playing" hook

The wallpaper also still accepts `window.livelyCurrentTrack(title)` if you run it inside Lively with "Now Playing" enabled — but the extension is more reliable and works on any host.

## Customization quick reference

- **Change glass tint:** edit `.overlay { background: rgba(...) }` in `style.css`.
- **Change bar gradient:** edit `.stat-bar` background in `style.css`.
- **Change update interval:** edit `setInterval(..., 1500)` and `setInterval(..., 5000)` in `script.js`.
- **Reposition overlays:** adjust `.overlay-top-left` / `.overlay-bottom-left` coordinates.

## Testing in a browser (without Lively)

Just open `index.html` directly in Chrome/Edge. Simulated values will fill the UI so you can preview the design. When you load it inside Lively, the hooks take over automatically.
