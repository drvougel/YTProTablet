<p align="center">
<img src='https://raw.githubusercontent.com/prateek-chaubey/YTPro/main/.github/img/ytpro.gif' height=150  >
</p>
<h1 align=center>YT PRO </h1>

<div align="center">


[![Gradle](https://github.com/prateek-chaubey/YTPro/actions/workflows/gradle.yml/badge.svg)](https://github.com/prateek-chaubey/YTPro/actions/workflows/gradle.yml)
<a href="https://www.jsdelivr.com/package/npm/ytpro?tab=stats" ><img alt="jsDelivr monthly hits badge" src="https://data.jsdelivr.com/v1/package/npm/ytpro/badge"></a>
<img src=https://img.shields.io/github/downloads/prateek-chaubey/YTPro/total >

</div>

---

## About this fork

Tuned for the **Xiaomi Pad 6 Max 14"** (2880×1800, density 360, so 1280×800 dp in
landscape; Android 15, Snapdragon 8+ Gen 1).

Upstream hardcodes `m.youtube.com` and has no responsive handling whatsoever — no
media queries, no resize listeners, fixed-pixel inline styles throughout. On a
14" panel that gives you the phone layout stretched across the screen. This fork
loads the desktop site instead and bridges the gap with an additive injection
layer, so the upstream scripts keep working unmodified.

### What is different

- **Desktop layout** with sidebar and recommendations column instead of the
  mobile view
- **True fullscreen** with no Android status or navigation bar; the clock and
  battery level sit in a white pill inside YouTube's own masthead
- **Icon-only action row**: the YTPRO buttons sit unlabelled in YouTube's own
  action row next to Subscribe, and YouTube's own labels are hidden too — the
  like and dislike counts stay, since they are data rather than labels
- **Recommendations scroll independently**, so the playing video stays put
- **Comments first**, with the video description behind a toggle
- **Miniplayer on back**: playback continues in the bottom-right corner
- **Ads hidden**, including the shared inline preview player that YouTube uses to
  lay video ads over real tiles
- **Gesture zones** capped at 96 dp and made distance-based, instead of one step
  per touchmove event, which tied sensitivity to the 120 Hz digitizer
- **Downloader removed**; `innertube.js` is no longer injected

### Bugs fixed along the way

The manifest declared a receiver in a package where the class does not exist, so
every transport button on the media notification was dead. `DownloadFromIntentFilter`
ran `onCreate` twice, producing two page loads, a duplicated and leaked receiver
and two thread pools. `MediaMuxerUtils` allocated a fixed 1 MiB sample buffer,
smaller than a single high-bitrate 4K keyframe. `hasStoragePermission()` returned
`true` exactly when permission was **denied**. Leaving fullscreen locked the
activity to portrait permanently. Both runtime receivers were exported on
unprotected implicit actions, and the `MediaSession` was never released.

### How it is put together

The footprint is deliberately small, so rebasing onto upstream stays cheap:

| File | Role |
|---|---|
| `TabletMode.java` | large-screen detection, desktop UA, 120 Hz, asset loading |
| `TabletBridge.java` | battery level for the readout in the masthead |
| `assets/ytpro-tablet.js` | DOM adapter, CSS overrides, gesture and panel fixes |

Those three files are new and therefore carry no merge surface. Everything else
is one-line patches marked `YTPRO-TABLET`. The files under `scripts/` are
untouched.

The DOM adapter is the one genuinely fragile part: `script.js` contains not a
single `ytd-*` selector, so the 3 ids, 6 classes and 7 `ytm-*` tags it expects are
mapped onto the desktop DOM. YouTube changes that DOM more often than the mobile
one. The way back is the `desktopSite` preference — set it to `false` and the app
behaves like upstream again.

### Building

Needs JDK 17+ and an Android SDK with platform 36:

```bash
./gradlew assembleRelease
```

```bash
java -jar signer/apksigner.jar sign --key signer/apkeasytool.pk8 --cert signer/apkeasytool.pem --v4-signing-enabled false --out app/build/outputs/apk/release/youtube_pro_signed.apk app/build/outputs/apk/release/app-release-unsigned.apk
```

The signature matches upstream's, so `adb install -r` updates an existing
install in place without losing hearts, settings or your sign-in.

---

## Features
 * <img src='https://raw.githubusercontent.com/prateek-chaubey/YTPro/main/.github/img/gemini-logo-13486188-10900314-unscreen-ezgif.com-crop.gif' height=15 width=15 > Google Gemini
   * Summarise Vidoes
   * Customisable prompts and models
 * Video Downloader
 * Shorts Downloader
 * In-built Video and Audio Muxer
 * Thumbnails Downloader
 * Captions Downloader
 * Ads Blocker
 * Minimize Video
 * Picture in Picture Mode
 * Gesture control for Volume and Brightness 
 * Shows Number of Dislikes
 * Background Audio Player
 * Custom Heart feature to save videos without logging into your account
 * Enable / disable media codecs
 * Skip Sponsers
 * Force Zoom
 * Hide Shorts
 * Upto 10x video speed 
 * Minimal APK size
 * Adaptive UI icons
 * Minimal
 * Almost 0 Internal Dependencies
 * Auto Updation of App


## Gemini Prompt
The available variables for gemini prompt are
* `{url}` : The URL of the video
* `{title}` : Title of the video
* `{videoId}` : Video Id of the video

## ToDo
 * Enhance Audio
 * Skip Silence 
 

### Credits
 * [Sponsor Block](https://github.com/ajayyy/SponsorBlock)
 * [return-youtube-dislike](https://github.com/Anarios/return-youtube-dislike)
 * [YouTube.js](https://github.com/LuanRT/YouTube.js/)

### ❤️Supporters❤️
[![Stargazers repo roster for @prateek-chaubey/YTPro](http://reporoster.com/stars/dark/prateek-chaubey/YTPro)](https://github.com/prateek-chaubey/YTPro/stargazers)
     
[![Forkers repo roster for @prateek-chaubey/YTPro](http://reporoster.com/forks/dark/prateek-chaubey/YTPro)](https://github.com/prateek-chaubey/YTPro/network/members)


## Disclaimer 
This is an educational project aimed at showcasing javascript injection into a webview to enhance productivity.
