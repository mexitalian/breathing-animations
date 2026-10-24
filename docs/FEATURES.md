# Breath Shape: features and functionality

What the app does today, where each feature lives and how it ships. Last updated 24 October 2026.

## Overview

Breath Shape ("Breath Shape: Guided Breathing" on Google Play) is a guided breathing app: 15 techniques shown as calm, colour-coded animations, plus a camera check for heart rate and HRV. One codebase of plain HTML, CSS and JavaScript ships as:

| Product | How it's built | Where to get it |
| --- | --- | --- |
| Website | Static pages on GitHub Pages | [mexitalian.github.io/breathing-animations](https://mexitalian.github.io/breathing-animations/) |
| Android app | Capacitor 8; Google Play closed beta (see [PLAY_STORE.md](PLAY_STORE.md)) | Play beta link; test builds: [app-latest](https://github.com/mexitalian/breathing-animations/releases/tag/app-latest), installed as "Breath Dev" |
| iPhone app | Capacitor 8 project in `ios/` | Not built or distributed yet |
| Mac menu-bar app | Tauri 2; build paused, manual runs only | [mac-latest release](https://github.com/mexitalian/breathing-animations/releases/tag/mac-latest) |

Everything stays on the device: no accounts, no server, no analytics.

## Techniques

The home screen lists the techniques in four groups. Sticky chips filter them: All, Measure & train, Calm & sleep, Focus & balance, Energise. The list remembers its filter and scroll position when you come back from a session.

| Group | Technique | Pattern | Extras |
| --- | --- | --- | --- |
| Measure & train | Heart Rate & HRV | Fingertip over the camera, about a minute | Camera + flash, Android |
| Measure & train | Buteyko | Control pause, 3½ min light breathing, control pause | Times your pauses |
| Calm & sleep | Resonance Breathing | Equal in and out, 4.5–6.5 breaths/min | Adjustable pace |
| Calm & sleep | 4-7-8 Breathing | In 4, hold 7, out 8 | |
| Calm & sleep | Extended Exhale | In 4, out 8 | Adjustable pace |
| Calm & sleep | Physiological Sigh | In 2, sip 1, out 5 | |
| Calm & sleep | Bhramari · Humming Bee | In 4, hum 8 | Hum sound |
| Calm & sleep | Pursed-Lip Breathing | Nose in 2, lips out 4 | |
| Focus & balance | Box Breathing | In 4, hold 4, out 4, hold 4 | Square shape, clockwise |
| Focus & balance | Triangle Breathing | In 4, hold 4, out 4 | Triangle shape |
| Focus & balance | Alternate Nostril · Nadi Shodhana | In left, out right, in right, out left | Split-screen layout |
| Energise | Bhastrika · Bellows Breath | 3 rounds of 20 fast breaths, 30 s rest | Safety screen |
| Energise | Kapalabhati · Skull-Shining Breath | 3 rounds of 30 sharp exhales, 30 s rest | Safety screen |
| Energise | Wim Hof Method | 30 power breaths, hold, 15 s recovery, 3 rounds | Safety screen, best hold |
| Energise | Tummo · Inner Fire | 20 deep breaths, full-breath hold, 5 rounds | Safety screen |
| Energise | Connected Breathing | Fast, no pauses, 10–30 min, slows at the end | Safety screen, adjustable pace |

Each technique is one config file in `configs/` (phases, timings, shape, colour hue, safety notes); `js/engine.js` turns it into a session.

## Session experience

A session is one full-screen shape that grows on the in-breath and shrinks on the out-breath, with the instruction written inside it.

- **Shapes:** a circle for most techniques, a square for Box (the marker travels clockwise) and a triangle for Triangle. Shapes fill the screen width.
- **Marker:** a small square or triangle that travels the shape's inner edge. It is the fill colour and cuts a hole in the fill where they overlap.
- **Layers:** ring, track, outline, glow, heat, core, particles and ripple. Each technique turns on only what suits it.
- **Particles:** drift between named radii each phase, on every technique. On Box and Triangle they follow the shape's edges. WebGL by default (falls back to standard where WebGL isn't available), or Standard or Off in Settings.
- **Cycle counter:** cycles done. In open-ended techniques each finished cycle adds a mark top left, plus a number.
- **Pace control:** for Resonance, Extended Exhale and Connected Breathing, breaths per minute can change during the session.
- **Safety screen:** before the five Energise techniques, with "don't show this again" per technique.
- **Top bar:** back, colour (hue drag), sound, settings gear.
- **Feedback:** vibration on each phase change (taps or continuous ramps) and a hum on hum phases (Bhramari).
- **Locked phone (Android app):** vibration and hum keep playing with the screen off. A notification shows the technique and phase, with a Stop button.
- **Summary:** the result (rounds, best hold, control pauses), then Go again, All techniques or Check heart rate.
- **Reduced motion:** follows the phone's setting; motion-only effects are turned off.

## Heart rate & HRV

A fingertip over the back camera and flash gives heart rate after 30 seconds and HRV after 60, falling back to heart rate alone when the signal is too noisy for HRV.

1. The flash lights the fingertip; each heartbeat dims the red slightly (photoplethysmography).
2. Each frame is averaged to one brightness value; the first 4 seconds are skipped while exposure settles.
3. The slow drift is removed and the wave smoothed; beats are found as peaks, timed between frames.
4. Heart rate = the median beat interval, if at least 70% of intervals agree within 25%.
5. HRV = RMSSD of beat-to-beat intervals after dropping outliers. It needs 30 clean pairs, 80% of the reading clean, and a result of at most 200 ms.

- **Accuracy (simulated):** heart rate within 2 bpm from 48 to 130 bpm; HRV mean error 0.9 ms, worst 3 ms. Real-device accuracy not measured yet.
- **Limits:** Android app only (needs the torch). If there's no reading after 90 seconds, it stops. Not a medical device.
- **Privacy:** the camera image never leaves the phone; only the result goes to history.

Code: `js/heart-rate.js` (pure signal processing, tested in `tests/heart-rate.test.js`) and `js/heart-rate-page.js`.

## Settings

The gear on the home screen and in every session opens one panel. Changes apply at once and are kept on the device (`js/settings.js`).

| Setting | Options | Default | Shown on |
| --- | --- | --- | --- |
| Theme | System, Light, Dark | System | Everywhere |
| Particles | WebGL, Standard, Off | WebGL | Everywhere |
| Sound | On/Off + volume slider | On, 60% | Where audio works |
| Keep screen on | On, Off | On | Everywhere |
| Vibration | On, Off | On | Devices that can vibrate |
| Vibration type | Alarm, Notification, Touch, Media, Accessibility | Alarm | Android app |
| Vibration style | Taps, Continuous | Taps | Android app |
| Your data | Export history, Clear history | | Everywhere |

- **Sound:** the speaker in a session is a quick mute for the same setting.
- **Vibration type:** picking one plays a test buzz. Android silences some types depending on the phone's settings.
- **Vibration style, Continuous:** inhale ramps from soft to strong, exhale from strong to soft, and holds are silent. Phases under 1.5 s keep taps.
- **Text size:** follows the phone.
- **Diagnostics page:** vibration tests and log, vibration type picker, continuous ramp comparison (even or eased), and a performance overlay (frame rate, script time, battery drain).

## History & your data

Every session of 30 seconds or more, and every heart check, is saved on the device, up to the newest 1,000 entries.

- **History page:** grouped by day, with a shape thumbnail, a result line and a 7-day total of sessions and minutes. Heart checks are listed but don't count as practice. Entries can be removed one by one.
- **Saved per session:** technique, start and end, duration, finished or stopped, rounds, best holds or control pauses, pace, variant.
- **Saved per heart check:** time, duration, heart rate, HRV.
- **Export:** CSV with date, time, activity, minutes, completed, heart rate, HRV, result. The app opens the share sheet; the website downloads the file.
- **Clear:** in Settings (tap twice) or on the History page.
- **Privacy:** data lives in the app's local storage; uninstalling or clearing site data deletes it.

## Platforms

| Feature | Website | Android app | iPhone app | Mac menu-bar app |
| --- | --- | --- | --- | --- |
| Techniques, history, settings | Yes | Yes | Yes | Yes |
| Vibration | Browser vibration after a tap; not in iPhone Safari | Native, with type and style | Haptic taps | No |
| Cues with the screen locked | No | Yes, vibration and hum | No (iOS doesn't allow it) | n/a |
| Keep screen on | Wake Lock API | Native | Native | Not needed |
| Heart rate & HRV | No | Yes | No | No |
| Export history | Share sheet or download | Share sheet | Share sheet | Download |
| Status | Live | Sideloaded APK | Not built yet | Unsigned dmg, build paused |

### Android locked-screen sessions

`BreathSessionService` is a foreground service of type `mediaPlayback`. While a session runs:
- **Sending the plan:** the page forecasts the phases ahead (`timeline.forecast`, up to 2 hours) and `js/cues.js` turns them into a compact plan. `js/controls/session-cues.js` sends it at the start, on every phase change and when settings change.
- **Playing it:** the service times vibration and hum itself under a partial wake lock, with a 3-hour safety limit.
- **Hum:** played natively by `HumPlayer`.
- **Stopping:** Stop on the notification ends the session; the page shows "Session stopped" on return. Swiping the app away also ends it.

## Design system

One hue number per technique drives its whole colour scheme, in light and dark, through three layers of CSS tokens:

1. **Primitives:** spacing, type sizes, radii, durations.
2. **Theme tones:** light and dark ramps (`--tone-*`), switched by `data-theme` or the phone's setting.
3. **Semantic colours:** `--color-accent`, `--color-ink`, `--color-line` and others, worked out from `--hue`.

- **Components:** the breathing field and its layers, cycle counter, icon toggle, chips, full-bleed list rows, the screen pattern (start, safety, summary, settings), history thumbnails.
- **Style guide:** `styleguide.html` shows every token and component.

## Build & release

Every change reaches main through a PR. On merge to main:

- **Website:** republished every time (GitHub Pages, about 30 s).
- **Android:** builds and replaces the `app-latest` release, unless the change only touched `.claude/`, Markdown docs, `tests/`, `LICENSE`, `src-tauri/` or `macos.yml`.
- **Google Play:** run Actions → Play release by hand to build the signed `.aab`, then upload it in the Play Console ([PLAY_STORE.md](PLAY_STORE.md)).
- **Mac:** paused. Run it by hand from Actions → macOS app → Run workflow; a manual run on main publishes `mac-latest`.

Other rules:
- **PR builds:** PRs run the same Android build and upload the APK as an artifact, so it can be tried before merging.
- **One build per branch:** a newer push cancels a build still running.
- **Tests:** `npm test` runs the unit tests (timeline and forecast, cue plan, heart rate, history, settings, layout).
- **Merge words:** "merge it and deploy" for PRs into main; "merge it" for PRs into another branch.

## Open tickets

| Ticket | What | Label |
| --- | --- | --- |
| [#46](https://github.com/mexitalian/breathing-animations/issues/46) | Store listings, privacy policy, signing, beta testing | |
| [#47](https://github.com/mexitalian/breathing-animations/issues/47) | Submit to the App Store and Google Play | |
| [#43](https://github.com/mexitalian/breathing-animations/issues/43) | Daily practice reminders | On hold |
| [#48](https://github.com/mexitalian/breathing-animations/issues/48) | Native app plan (tracking) | |
| [#86](https://github.com/mexitalian/breathing-animations/issues/86) | First-use onboarding: settings, permissions, where things are | stub |
| [#87](https://github.com/mexitalian/breathing-animations/issues/87) | Build your own technique | stub, genAI suggestion |
| [#88](https://github.com/mexitalian/breathing-animations/issues/88) | Progress over time in History | stub, genAI suggestion |
| [#89](https://github.com/mexitalian/breathing-animations/issues/89) | Health Connect for sessions and heart checks | stub, genAI suggestion |
| [#90](https://github.com/mexitalian/breathing-animations/issues/90) | Quick Settings tile and shortcuts | stub, genAI suggestion |
