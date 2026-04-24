/* ============================================================
   Lively Wallpaper - System Monitor + YouTube Status
   ============================================================
   Lively Wallpaper exposes helpful interop hooks. When running
   inside Lively these globals are available:

     - livelyPropertyListener(name, val)   : called when user changes a property
     - livelyCurrentTrack(data)            : receives currently playing media title
     - livelyAudioListener(audioArray)     : called with live audio levels
     - livelySystemInformation(info)       : called with CPU/RAM/GPU stats (JSON string)

   Lively can push system stats to the wallpaper when
   "System Information Hardware Monitor" is enabled in settings.
   The payload looks like:
     {
       "NameCpu": "...",
       "CpuUsage": 23.4,
       "NameGpu": "...",
       "GpuUsage": 18.0,
       "TotalRam": 32768,      // MB
       "UsedRam": 12345,        // MB
       "RamUsage": 37.6,
       ...
     }

   We also calculate FPS ourselves using requestAnimationFrame.
   When not running inside Lively (e.g. preview in browser), we
   fall back to simulated values so the UI still looks alive.
   ============================================================ */

(() => {
    'use strict';

    // ---------- State ----------
    const state = {
        ram: { used: 0, total: 16, percent: 0 },
        cpu: 0,
        gpu: 0,
        fps: 0,
        yt: {
            title: '',
            channel: '',
            isPlaying: false,
            currentTime: 0,
            duration: 0,
        },
        insideLively: false,
    };

    // ---------- DOM ----------
    const el = {
        ramBar:   document.getElementById('ram-bar'),
        ramValue: document.getElementById('ram-value'),
        cpuBar:   document.getElementById('cpu-bar'),
        cpuValue: document.getElementById('cpu-value'),
        gpuBar:   document.getElementById('gpu-bar'),
        gpuValue: document.getElementById('gpu-value'),
        fpsBar:   document.getElementById('fps-bar'),
        fpsValue: document.getElementById('fps-value'),

        ytStatus:     document.getElementById('yt-status'),
        ytTitle:      document.getElementById('yt-video-title'),
        ytChannel:    document.getElementById('yt-channel'),
        ytProgress:   document.getElementById('yt-progress-bar'),
        ytCurrent:    document.getElementById('yt-current-time'),
        ytDuration:   document.getElementById('yt-duration'),
    };

    // ---------- Helpers ----------
    function setBarColor(bar, pct) {
        bar.classList.remove('warn', 'danger');
        if (pct >= 85) bar.classList.add('danger');
        else if (pct >= 65) bar.classList.add('warn');
    }

    function updateBar(bar, pct) {
        const clamped = Math.max(0, Math.min(100, pct));
        bar.style.width = clamped + '%';
        setBarColor(bar, clamped);
    }

    function formatTime(sec) {
        sec = Math.floor(sec || 0);
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    }

    function mbToGb(mb) {
        return (mb / 1024).toFixed(1);
    }

    // ---------- Render ----------
    function renderSystem() {
        // RAM
        updateBar(el.ramBar, state.ram.percent);
        el.ramValue.textContent =
            `${mbToGb(state.ram.used)} / ${mbToGb(state.ram.total)} GB`;

        // CPU
        updateBar(el.cpuBar, state.cpu);
        el.cpuValue.textContent = state.cpu.toFixed(1) + '%';

        // GPU
        updateBar(el.gpuBar, state.gpu);
        el.gpuValue.textContent = state.gpu.toFixed(1) + '%';

        // FPS - scale against 144 as upper reference so 60fps reads ~42%
        const fpsPct = Math.min(100, (state.fps / 144) * 100);
        updateBar(el.fpsBar, fpsPct);
        el.fpsValue.textContent = state.fps + ' FPS';
    }

    function renderYouTube() {
        if (state.yt.isPlaying && state.yt.title) {
            el.ytStatus.textContent = 'LIVE';
            el.ytStatus.classList.add('live');
            el.ytTitle.textContent = state.yt.title;
            el.ytChannel.textContent = state.yt.channel || '—';
            el.ytCurrent.textContent = formatTime(state.yt.currentTime);
            el.ytDuration.textContent = formatTime(state.yt.duration);
            const pct = state.yt.duration > 0
                ? (state.yt.currentTime / state.yt.duration) * 100
                : 0;
            el.ytProgress.style.width = Math.min(100, pct) + '%';
        } else {
            el.ytStatus.textContent = 'OFFLINE';
            el.ytStatus.classList.remove('live');
            el.ytTitle.textContent = 'Not watching anything';
            el.ytChannel.textContent = '—';
            el.ytCurrent.textContent = '0:00';
            el.ytDuration.textContent = '0:00';
            el.ytProgress.style.width = '0%';
        }
    }

    // ---------- FPS Counter ----------
    let frames = 0;
    let lastFpsTime = performance.now();

    function fpsLoop() {
        frames++;
        const now = performance.now();
        if (now - lastFpsTime >= 1000) {
            state.fps = Math.round((frames * 1000) / (now - lastFpsTime));
            frames = 0;
            lastFpsTime = now;
        }
        requestAnimationFrame(fpsLoop);
    }
    requestAnimationFrame(fpsLoop);

    // ---------- Lively System Info Hook ----------
    // Lively calls window.livelySystemInformation(jsonString) on an interval
    // when the feature is enabled in Lively settings.
    window.livelySystemInformation = function (info) {
        try {
            state.insideLively = true;
            const data = (typeof info === 'string') ? JSON.parse(info) : info;

            if (typeof data.CpuUsage === 'number')   state.cpu = data.CpuUsage;
            if (typeof data.GpuUsage === 'number')   state.gpu = data.GpuUsage;
            if (typeof data.TotalRam === 'number')   state.ram.total = data.TotalRam;
            if (typeof data.UsedRam === 'number')    state.ram.used  = data.UsedRam;
            if (typeof data.RamUsage === 'number')   state.ram.percent = data.RamUsage;

            // Derive percent if not provided
            if (!data.RamUsage && state.ram.total > 0) {
                state.ram.percent = (state.ram.used / state.ram.total) * 100;
            }
        } catch (e) {
            console.error('livelySystemInformation parse error:', e);
        }
    };

    // ---------- Chrome Extension Bridge ----------
    // The "Wallpaper YouTube Bridge" extension injects real YouTube
    // state into this page via window.postMessage. We accept messages
    // of shape: { source: 'wallpaper-yt-bridge', payload: { ... } }
    let lastBridgeMsg = 0;
    window.addEventListener('message', (event) => {
        const data = event.data;
        if (!data || data.source !== 'wallpaper-yt-bridge') return;
        const p = data.payload || {};
        lastBridgeMsg = Date.now();
        state.yt.title       = p.title || '';
        state.yt.channel     = p.channel || 'YouTube';
        state.yt.isPlaying   = !!p.isPlaying;
        state.yt.currentTime = p.currentTime || 0;
        state.yt.duration    = p.duration    || 0;
        renderYouTube();
    });

    // If the extension stops talking for 10s, mark offline
    setInterval(() => {
        if (lastBridgeMsg && Date.now() - lastBridgeMsg > 10000) {
            state.yt.isPlaying = false;
            renderYouTube();
        }
    }, 2000);

    // ---------- Lively "Now Playing" Hook (optional legacy) ----------
    // Only used if you run the wallpaper inside Lively without the extension.
    window.livelyCurrentTrack = function (trackStr) {
        if (lastBridgeMsg) return; // extension has priority
        if (!trackStr || typeof trackStr !== 'string') {
            state.yt.isPlaying = false;
            return;
        }
        const sepIdx = trackStr.lastIndexOf(' - ');
        if (sepIdx > 0) {
            state.yt.title   = trackStr.substring(0, sepIdx).trim();
            state.yt.channel = trackStr.substring(sepIdx + 3).trim();
        } else {
            state.yt.title   = trackStr.trim();
            state.yt.channel = 'YouTube';
        }
        state.yt.isPlaying = true;
    };

    // ---------- Lively Properties ----------
    // Allows users to configure behavior via Lively's property panel (LivelyProperties.json).
    window.livelyPropertyListener = function (name, val) {
        // hook reserved for future custom properties
        console.log('Property changed:', name, val);
    };

    // ---------- Fallback Simulation ----------
    // When not running inside Lively (preview in a browser or
    // Lively system-info feature disabled), simulate values so
    // the UI still behaves nicely.
    let sim = { cpu: 20, gpu: 15, ramUsed: 6000 };

    function simulateSystemInfo() {
        if (state.insideLively) return; // real data is arriving

        // Smooth random walk
        sim.cpu = Math.max(3, Math.min(95, sim.cpu + (Math.random() - 0.5) * 8));
        sim.gpu = Math.max(2, Math.min(90, sim.gpu + (Math.random() - 0.5) * 6));
        sim.ramUsed = Math.max(3000, Math.min(14500, sim.ramUsed + (Math.random() - 0.5) * 250));

        state.cpu = sim.cpu;
        state.gpu = sim.gpu;
        state.ram.total = 16384;         // 16 GB demo
        state.ram.used  = sim.ramUsed;
        state.ram.percent = (sim.ramUsed / state.ram.total) * 100;
    }

    // ---------- Update Loops ----------
    // System stats: every 1.5 seconds
    setInterval(() => {
        simulateSystemInfo();
        renderSystem();
    }, 1500);

    // YouTube: keep progress bar ticking while playing, even between
    // extension messages (they arrive ~once per second, but we want
    // a smooth UI either way).
    setInterval(() => {
        if (state.yt.isPlaying && state.yt.duration > 0) {
            state.yt.currentTime = Math.min(
                state.yt.duration,
                state.yt.currentTime + 1
            );
        }
        renderYouTube();
    }, 1000);

    // First paint
    renderSystem();
    renderYouTube();

    // ---------- Background video loop + error handling ----------
    const bgVideo = document.getElementById('bg-video');
    const errBox  = document.getElementById('video-error');
    const errDtl  = document.getElementById('video-error-detail');

    function showVideoError(msg) {
        if (errBox) {
            errBox.style.display = 'flex';
            if (errDtl) errDtl.textContent = msg || '';
        }
    }

    if (bgVideo) {
        bgVideo.addEventListener('loadeddata', () => {
            console.log('[bg-video] loaded:', bgVideo.videoWidth + 'x' + bgVideo.videoHeight);
            if (errBox) errBox.style.display = 'none';
        });

        bgVideo.addEventListener('error', (e) => {
            const err = bgVideo.error;
            const codes = {1:'ABORTED',2:'NETWORK',3:'DECODE',4:'SRC_NOT_SUPPORTED'};
            const msg = err ? `${codes[err.code]||err.code}: ${err.message||''}` : 'unknown';
            console.error('[bg-video] error:', msg);
            showVideoError(msg);
        });

        bgVideo.addEventListener('ended', () => {
            bgVideo.currentTime = 0;
            bgVideo.play().catch(() => {});
        });

        // Force play (some environments need an explicit call)
        const tryPlay = () => bgVideo.play().catch(err => {
            console.warn('[bg-video] autoplay blocked, retrying...', err);
            setTimeout(tryPlay, 500);
        });
        tryPlay();
    }
})();
