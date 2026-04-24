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

## Enabling YouTube / now-playing detection

Lively can forward the system's current media session (Chrome, Edge, Firefox, Spotify, etc.) via `window.livelyCurrentTrack(title)`.

1. Open Lively → **Settings** → **General**
2. Enable **"Now Playing"**
3. When you play a YouTube video in your browser, the overlay will flip to **LIVE** and show the title/channel.

If Lively's Now Playing feature isn't available in your version, the script falls back to a demo carousel so you can still see the UI working.

## Customization quick reference

- **Change glass tint:** edit `.overlay { background: rgba(...) }` in `style.css`.
- **Change bar gradient:** edit `.stat-bar` background in `style.css`.
- **Change update interval:** edit `setInterval(..., 1500)` and `setInterval(..., 5000)` in `script.js`.
- **Reposition overlays:** adjust `.overlay-top-left` / `.overlay-bottom-left` coordinates.

## Testing in a browser (without Lively)

Just open `index.html` directly in Chrome/Edge. Simulated values will fill the UI so you can preview the design. When you load it inside Lively, the hooks take over automatically.
