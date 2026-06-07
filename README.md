# Dynamic Island for Browsers

A browser mod (and Chrome Extension) that brings an Apple-style Dynamic Island to your desktop browser, syncing with whatever media tab is playing in the background.

There are two versions:

- **Vivaldi Mod** — lives natively in Vivaldi's title bar, works across every tab including settings and new tab pages. Looks and feels like it belongs there.
- **Chrome Extension** — works on Chrome, Edge, Brave, or any Chromium browser. Sits as a fixed overlay at the top of every webpage. Less native-looking, but anyone can install it in 30 seconds without touching their browser's internals.

![Vivaldi Dynamic Island Preview](screenshot.png)

---

## How this was actually built

I am a 2nd-year CS/IoT/Cybersecurity engineering student. I do not enjoy frontend development. I did not write the HTML, CSS, or JS syntax for this project — that was handled by agentic AI (Google's Antigravity 2.0 and Claude).

What I did do: defined the product, made every architectural decision, and acted as QA throughout. I caught bugs the AI missed repeatedly — a silent `ReferenceError` that was killing color theming entirely, a JavaScript closure bug that bound every lyrics click listener to the last line instead of the correct one, a `Promise.catch()` call that crashed silently on certain Chromium versions. The AI generated code; I decided what the code was supposed to do and whether it actually did it.

This is what AI-assisted development actually looks like in practice. It is not magic. It is a lot of iterative debugging and knowing when the output is wrong.

---

## Features

- Collapses to a small pill showing the track name and an EQ visualizer. Expands on hover to show album art, artist, progress bar, and playback controls.
- Extracts the dominant color from album art using canvas pixel sampling and themes the entire island to match — background, glow, accent, progress bar.
- Fetches time-synced lyrics from lrclib.net and displays them in a glassmorphic floating panel below the island. Click any line to seek to that timestamp.
- Shrinks to a barely-visible dot after 9 seconds of inactivity so it stays out of your way.
- Double-click the island to jump directly to the media tab.
- PiP button appears automatically when the active tab supports Picture-in-Picture (hidden on YouTube Music where it does not make sense).

---

## Technical challenges worth mentioning

**The YouTube Music dual-video problem**

YouTube Music loads both an audio-only stream and a full music video simultaneously in the background. Standard `<video>` element scraping returns the wrong duration — sometimes by several minutes — because it reads from the hidden video file, not the audio track the user is actually hearing. The fix was to scrape the human-readable timestamp text directly from YouTube Music's UI (the `0:32 / 3:59` element), parse it, and use the difference between the UI time and the video element's `currentTime` as a mathematical offset when seeking. It is not elegant but it works reliably.

**Chromium background tab throttling**

When the media tab is not in focus, Chromium aggressively throttles its JavaScript execution to conserve CPU. This caused skip and pause commands to lag by 1–2 seconds even though the command itself fired instantly. The fix for the Vivaldi mod was to whitelist the media site in Chromium's performance settings (`chrome://settings/performance`) so it never gets throttled regardless of focus state. The Chrome Extension version handles this through rapid sequential polls after any user action.

**Background/content script architecture in the Chrome Extension**

Content scripts do not have access to `chrome.tabs` or `chrome.scripting`. The extension had to be split into a background service worker that handles all tab querying and media state polling, and a content script that handles only the UI. They communicate via `chrome.runtime.sendMessage` and `chrome.runtime.onMessage`. Getting the message passing correct in both directions, handling cases where the listener does not exist yet, and avoiding the `Promise.catch()` pattern that breaks on older Chromium builds took more effort than expected.

**Windows registry and installation path conflicts**

The Vivaldi mod installer had to navigate Vivaldi's Crashpad process holding named pipe handles as Administrator ghost processes, which caused standard file operations to fail silently. The PowerShell installer force-kills all Chromium-related background processes, backs up `browser.html` before patching it, and uses `explorer.exe` as a proxy to relaunch the browser under the standard user account rather than the elevated Administrator context.

---

## Installing the Vivaldi Mod

1. Close Vivaldi completely.
2. Clone or download this repository.
3. Right-click `UPDATE (Run as Admin).bat` and select Run as Administrator.
4. The script will find your Vivaldi installation, back up `browser.html`, inject `dynamic-island.js`, and relaunch the browser.

You will need to re-run this after Vivaldi major version updates since they overwrite the core HTML files.

---

## Installing the Chrome Extension

1. Clone or download this repository.
2. Open `chrome://extensions` (or `edge://extensions`).
3. Enable Developer Mode using the toggle in the top right.
4. Click Load unpacked and select the `chrome-extension` folder inside this repository.

No build step, no dependencies, no account required.

---

## Known limitations

- The EQ visualizer in the collapsed pill animates randomly rather than reacting to actual audio. There is no browser API that exposes raw audio waveform data from an arbitrary tab to an external script. A fake animation was the only option.
- Lyrics availability depends entirely on lrclib.net's database. Songs in regional languages work surprisingly well; obscure tracks often do not.
- The Chrome Extension cannot appear on `chrome://` internal pages or the new tab page due to browser security restrictions. It works on every normal webpage.
- Color extraction occasionally picks a muted or inaccurate color depending on the album art composition. The algorithm clusters pixels by hue and picks the most saturated cluster, which works well on most artwork but not all.

---

## Contributions

If you are a frontend developer and the CSS makes you uncomfortable, pull requests are welcome. The codebase is functional but not particularly clean — it accumulated a lot of iterative patches during development and would benefit from someone who actually enjoys this kind of work.
