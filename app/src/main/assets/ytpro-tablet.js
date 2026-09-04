/*
 * YTPRO-TABLET - large-screen adaptation layer.
 *
 * Injected by YTProWebViewClient.onPageFinished BEFORE the three upstream
 * ytpro@latest scripts, so upstream sees a DOM it already understands.
 *
 * Everything here is additive. scripts/script.js, scripts/bgplay.js and
 * scripts/innertube.js are never modified, so a rebase onto upstream is clean.
 */
(function () {
'use strict';

if (window.__ytproTablet) return;
window.__ytproTablet = true;

var MOBILE_HOST = 'm.youtube.com';
var DESKTOP = location.hostname !== MOBILE_HOST;
var LARGE = Math.min(window.innerWidth, window.innerHeight) >= 600;

function ls(k, d) { try { var v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } }
function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
function seed(k, v) { try { if (localStorage.getItem(k) === null) localStorage.setItem(k, v); } catch (e) {} }

/* ------------------------------------------------------------------ *
 * 0. Settings
 *
 * script.js:57 only seeds its defaults when one of four specific keys is
 * missing, so any key we add would never get a default on an existing
 * install. Everything below seeds itself.
 * ------------------------------------------------------------------ */
seed('tabletUi', 'true');
seed('tabletGestures', 'true');

var TABLET_UI = LARGE && ls('tabletUi', 'true') === 'true';
var TABLET_GESTURES = LARGE && ls('tabletGestures', 'true') === 'true';

/* One-time codec normalisation for this device class.
 *
 * script.js:162 blocks AV1 on === 'true' - inverted against every other
 * codec - while script.js:70 defaults everything to 'true'. So AV1 ships
 * blocked even though the settings UI draws it as enabled.
 *
 * That default is CORRECT here: the Snapdragon 8+ Gen 1 has no AV1 hardware
 * decoder (it arrived with the 8 Gen 2). We leave AV1 blocked and only make
 * sure the path that DOES work above 1080p stays open: YouTube ships no
 * H.264 above 1080p, so VP9 is the only hardware-accelerated route to
 * 1440p/2160p on this SoC. Runs once, then the user is free to change it.
 */
if (ls('tabletCodecInit', null) === null) {
	lsSet('tabletCodecInit', '1');
	lsSet('VP9', 'true');
	lsSet('block_60fps', 'false');
}

/* ------------------------------------------------------------------ *
 * 1. Viewport
 *
 * script.js:79 and :1005 pin the viewport to
 *   width=device-width, ... maximum-scale=1.0, user-scalable=no
 * whenever fzoom is off (the default). width=device-width is exactly right
 * on a 1440dp-wide screen - it is the scale lock that hurts, because it
 * removes any way to zoom out of a cramped desktop layout.
 *
 * So we keep upstream's width and strip only the lock, re-applying whenever
 * upstream rewrites the tag (it does so on every settings toggle).
 * ------------------------------------------------------------------ */
var WANTED_VIEWPORT = 'width=device-width, initial-scale=1.0, viewport-fit=cover';

function fixViewport() {
	var m = document.querySelector('meta[name="viewport"]');
	if (!m) return;
	var c = m.getAttribute('content') || '';
	if (c === '') return;                       // fzoom=true: upstream blanked it on purpose
	if (c.indexOf('user-scalable=no') === -1 && c.indexOf('maximum-scale') === -1) return;
	m.setAttribute('content', WANTED_VIEWPORT);
}

/* ------------------------------------------------------------------ *
 * 2. Client hints
 *
 * The UA string is replaced on the Java side (TabletMode.desktopUserAgent)
 * and Sec-CH-UA-Mobile is rewritten in the main-frame interceptor. This is
 * the third layer: script that asks navigator.userAgentData directly.
 * ------------------------------------------------------------------ */
if (DESKTOP && navigator.userAgentData && navigator.userAgentData.mobile === true) {
	try {
		Object.defineProperty(navigator.userAgentData, 'mobile', {
			get: function () { return false; }, configurable: true
		});
	} catch (e) {}
}

/* ------------------------------------------------------------------ *
 * 3. InnerTube hostname
 *
 * innertube.js:87 rewrites every InnerTube request onto m.youtube.com.
 * That is same-origin while the page IS m.youtube.com; on www.youtube.com
 * it turns every /youtubei/ call cross-origin and the downloader is the
 * first thing to break. We see the URL after upstream's rewrite, so we can
 * simply put it back on the page's own origin.
 * ------------------------------------------------------------------ */
if (DESKTOP && typeof window.fetch === 'function') {
	var nativeFetch = window.fetch;
	window.fetch = function (input, init) {
		try {
			var url = (typeof input === 'string') ? input
				: (input && input.url) ? input.url : null;
			if (url && url.indexOf('//' + MOBILE_HOST + '/') !== -1 && url.indexOf('/youtubei/') !== -1) {
				var fixed = url.replace('//' + MOBILE_HOST + '/', '//' + location.hostname + '/');
				input = (typeof input === 'string') ? fixed : new Request(fixed, input);
			}
		} catch (e) {}
		return nativeFetch.call(this, input, init);
	};
}

/* ------------------------------------------------------------------ *
 * 4. Desktop DOM adapter
 *
 * script.js contains zero ytd-* selectors. Rather than fork it, we make the
 * desktop DOM answer to the mobile names it looks for.
 *
 * Two mechanisms, deliberately split:
 *   - classes  -> additive tagging, so upstream keeps a real live
 *                 HTMLCollection (it relies on .children[1] and insertAfter)
 *   - ids/tags -> a lookup shim, because ids must stay unique
 * ------------------------------------------------------------------ */
var CLASS_MAP = [
	/* insertAfter anchor only. #top-row holds #owner (avatar, channel name and
	 * the Abonnieren button) followed by #actions (like/dislike, Teilen, ...).
	 * Anchoring on #owner drops the YTPRO row into the gap between the two, so
	 * the buttons sit on the same line as Abonnieren.
	 * (#top-level-buttons-computed is itself a flex item inside #actions, so
	 * anchoring there made our row wrap into the middle of YouTube's buttons.) */
	['slim-video-action-bar-actions', 'ytd-watch-metadata #above-the-fold > #top-row > #owner'],
	['slim-video-metadata-header', 'ytd-watch-metadata #above-the-fold h1'],
	['reel-player-overlay-actions', 'ytd-reel-player-overlay-renderer #actions'],
	['big-shorts-singleton', 'ytd-rich-shelf-renderer[is-shorts]'],
	['ytShortsVideoTitleViewModelShortsVideoTitle', 'yt-shorts-video-title-view-model'],
	['ytPlayerProgressBarHost', '.ytp-progress-bar']
];

var ID_MAP = {
	'player-container-id': '#movie_player',
	'player-control-container': '.ytp-chrome-bottom',
	'player': '#movie_player'
};

var TAG_MAP = {
	'ytm-home-logo': 'ytd-topbar-logo-renderer',
	'ytm-promoted-sparkles-web-renderer': 'ytd-promoted-sparkles-web-renderer',
	'ytm-companion-ad-renderer': 'ytd-companion-ad-renderer',
	'ytm-paid-content-overlay-renderer': 'ytd-paid-content-overlay-renderer',
	'ytm-reel-shelf-renderer': 'ytd-reel-shelf-renderer',
	'ytm-shorts-lockup-view-model': 'ytd-rich-item-renderer[is-shorts], ytm-shorts-lockup-view-model-v2'
};

/* Several of these selectors legitimately match more than one node, with hidden
 * duplicates in the tree. Upstream always takes [0], so the visible one has to
 * come first - measured on a live watch page, ytd-topbar-logo-renderer[0] is the
 * INVISIBLE one, which would have made the settings gear invisible too. */
function visibleFirst(nodes) {
	var list = [].slice.call(nodes);
	var vis = [], hidden = [];
	for (var i = 0; i < list.length; i++) {
		var r = list[i].getBoundingClientRect();
		(r.width > 0 && r.height > 0 ? vis : hidden).push(list[i]);
	}
	return vis.concat(hidden);
}

function tagDesktopNodes() {
	for (var i = 0; i < CLASS_MAP.length; i++) {
		var cls = CLASS_MAP[i][0], sel = CLASS_MAP[i][1];
		var nodes;
		try { nodes = visibleFirst(document.querySelectorAll(sel)); } catch (e) { continue; }
		if (!nodes.length) continue;
		/* Tag only the best match. Tagging hidden duplicates too would make
		 * upstream's getElementsByClassName(...)[0] a coin flip on DOM order. */
		if (!nodes[0].classList.contains(cls)) nodes[0].classList.add(cls);
		for (var j = 1; j < nodes.length; j++) {
			if (nodes[j].classList.contains(cls)) nodes[j].classList.remove(cls);
		}
	}

	/* skipSponsor() awaits waitForElement('yt-progress-bar'), a querySelector
	 * on a tag that only exists on the mobile player. Parking an empty custom
	 * element inside the desktop progress bar lets that promise resolve, and
	 * the class tag above then gives it somewhere to draw the segments. */
	var bar = document.querySelector('.ytp-progress-bar');
	if (bar && !document.querySelector('yt-progress-bar')) {
		var probe = document.createElement('yt-progress-bar');
		probe.style.display = 'none';
		bar.appendChild(probe);
	}
}

if (DESKTOP) {
	var nativeGetById = Document.prototype.getElementById;
	Document.prototype.getElementById = function (id) {
		var found = nativeGetById.call(this, id);
		if (found) return found;
		var alt = ID_MAP[id];
		return alt ? this.querySelector(alt) : null;
	};

	var nativeGetByTag = Document.prototype.getElementsByTagName;
	Document.prototype.getElementsByTagName = function (tag) {
		var found = nativeGetByTag.call(this, tag);
		if (found && found.length) return found;
		var alt = TAG_MAP[String(tag).toLowerCase()];
		if (!alt) return found;
		/* An Array is enough: upstream only ever uses [0] and `for (x in ...)`. */
		return visibleFirst(this.querySelectorAll(alt));
	};
}

/* ------------------------------------------------------------------ *
 * 4b. Panel routing
 *
 * Every YTPRO panel is opened by assigning location.hash (script.js:243
 * settings, :846 hearts, :1882 and :1933 download) and closed with
 * history.back(). On the desktop site that assignment performs a full document
 * navigation - verified on the device: a marker set on window does not survive
 * it - so each panel was destroyed by a reload the moment it opened. The mobile
 * site does not do this, which is why upstream never had to care.
 *
 * location.hash is a non-configurable own property of location, so it cannot be
 * virtualised. Instead we catch the click during the capture phase, before
 * upstream's own listener on the element runs, and reach the same URL through
 * history.pushState - no navigation - then call upstream's window.onhashchange
 * ourselves. history.back() still closes the panel, and the popstate handler
 * below lets upstream tear it down.
 * ------------------------------------------------------------------ */
var BUTTON_LABELS = {
	gemini: 'Gemini',
	heart: 'Heart',
	download: 'Download',
	pip: 'PIP Mode'
};

function tagFeatureButtons() {
	var kids = document.querySelectorAll('#ytproMainDivE > div > div, #ytproMainSDivE > div');
	for (var i = 0; i < kids.length; i++) {
		var el = kids[i];
		if (el.getAttribute('data-ytpro')) continue;
		var txt = (el.textContent || '');
		var name = null;
		if (txt.indexOf('Download') !== -1) name = 'download';
		else if (txt.indexOf('PIP') !== -1) name = 'pip';
		else if (txt.indexOf('Heart') !== -1) name = 'heart';
		else if (txt.indexOf('Gemini') !== -1) name = 'gemini';
		else if (el.parentNode && el.parentNode.id === 'ytproMainSDivE') {
			/* The Shorts overlay buttons carry no text; download is added first. */
			name = (el === el.parentNode.firstElementChild) ? 'download' : 'heart';
		}
		if (!name) continue;
		el.setAttribute('data-ytpro', name);
		/* The labels are hidden by the CSS below, so keep them reachable. */
		el.setAttribute('title', BUTTON_LABELS[name] || name);
		el.setAttribute('aria-label', BUTTON_LABELS[name] || name);
		el.setAttribute('role', 'button');
	}
}

/* ------------------------------------------------------------------ *
 * Scroll docking
 *
 * Once the player is half scrolled out of view, pin it to the bottom right so
 * the comments stay readable while the video keeps playing.
 *
 * Deliberately NOT YouTube's own miniplayer: its "i" shortcut docks the player
 * but also navigates back to the previous page, which takes the comment list
 * with it (verified on the device). Scaling the existing #movie_player where it
 * stands keeps playback, the DOM and the comment list intact, and because only
 * that element leaves the flow its container keeps its height, so the page does
 * not jump.
 * ------------------------------------------------------------------ */
var DOCK_WIDTH = 400;
var DOCK_GAP = 16;
var docked = false;
var dockW = 0, dockH = 0, dockScale = 1;

function placeDock() {
	if (!dockW) return;
	var st = document.documentElement.style;
	st.setProperty('--ytpro-dock-x',
		Math.round(window.innerWidth - dockW * dockScale - DOCK_GAP) + 'px');
	st.setProperty('--ytpro-dock-y',
		Math.round(window.innerHeight - dockH * dockScale - DOCK_GAP) + 'px');
}

/* Where the player came from, so it can be put back exactly there. */
var dockParent = null, dockNext = null;

/* z-index does not settle this. Measured on the device: with #secondary sticky,
 * the recommendations paint over the docked player no matter what z-index it
 * carries, and the only two things that changed it were making #secondary static
 * - which would undo its independent scrolling - or moving the player out to
 * <body>. Moving a div does not interrupt the <video> inside it (verified:
 * playback continued and the geometry was unchanged), so that is the way. */
function reparentForDock(mp, on) {
	try {
		if (on) {
			dockParent = mp.parentElement;
			dockNext = mp.nextSibling;
			document.body.appendChild(mp);
		} else if (dockParent) {
			if (dockNext && dockNext.parentNode === dockParent) {
				dockParent.insertBefore(mp, dockNext);
			} else if (dockParent.isConnected) {
				dockParent.appendChild(mp);
			}
			dockParent = null;
			dockNext = null;
		}
	} catch (e) {}
}

function setDock(on) {
	if (on === docked) return;
	if (on) {
		var mp = document.getElementById('movie_player');
		if (!mp) return;
		/* Measured while the player is still in normal flow, so this is its real
		 * size. Once it goes position:fixed it would stretch to the viewport and
		 * the scale would be computed off the wrong base. */
		var r = mp.getBoundingClientRect();
		dockW = Math.round(r.width) || 880;
		dockH = Math.round(r.height) || 495;
		dockScale = Math.min(1, DOCK_WIDTH / dockW);
		var st = document.documentElement.style;
		st.setProperty('--ytpro-dock-w', dockW + 'px');
		st.setProperty('--ytpro-dock-h', dockH + 'px');
		st.setProperty('--ytpro-dock-scale', dockScale.toFixed(4));
		placeDock();
		reparentForDock(mp, true);
	} else {
		var back = document.getElementById('movie_player');
		if (back) reparentForDock(back, false);
	}
	docked = on;
	document.documentElement.classList.toggle('ytpro-dock', on);
}

function updateDock() {
	if (!DESKTOP) return;
	if (location.pathname.indexOf('/watch') !== 0) { setDock(false); return; }

	var flexy = document.querySelector('ytd-watch-flexy');
	var host = document.querySelector('ytd-watch-flexy #player');
	if (!flexy || !host || !document.getElementById('movie_player')) { setDock(false); return; }

	/* Theater mode, fullscreen and YouTube's own miniplayer each own the player
	 * already - ytdMiniplayerComponentVisible is how it marks itself active. */
	if (flexy.hasAttribute('theater') || document.fullscreenElement
		|| document.querySelector('ytd-miniplayer.ytdMiniplayerComponentVisible')) {
		setDock(false);
		return;
	}

	var r = host.getBoundingClientRect();
	if (r.height <= 0) return;
	/* Hysteresis, so a scroll that stops right on the threshold does not flap. */
	if (!docked && r.top <= -r.height * 0.5) setDock(true);
	else if (docked && r.top >= -r.height * 0.15) setDock(false);
}

window.addEventListener('scroll', updateDock, { passive: true });
window.addEventListener('resize', function () {
	if (docked) placeDock();   // keep the corner gap after a rotation or resize
	updateDock();
}, { passive: true });

var INFO_KEY = 'tabletShowInfo';
var INFO_SVG = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">'
	+ '<path d="M11 7h2v2h-2zm0 4h2v6h-2zm1-9C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 '
	+ '10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/></svg>';

function applyInfoState() {
	var on = ls(INFO_KEY, 'false') === 'true';
	document.documentElement.classList.toggle('ytpro-show-info', on);
	var b = document.querySelector('[data-ytpro="info"]');
	if (b) b.setAttribute('aria-pressed', on ? 'true' : 'false');
}

/* The description block is hidden by default so the comments sit directly under
 * the video; this button brings it back. Built here rather than in script.js so
 * upstream stays untouched. */
function ensureInfoButton() {
	var row = document.querySelector('#ytproMainDivE > div');
	if (!row) return;
	if (row.querySelector('[data-ytpro="info"]')) return;

	var sibling = row.querySelector('div');
	var btn = document.createElement('div');
	btn.setAttribute('data-ytpro', 'info');
	btn.setAttribute('role', 'button');
	btn.setAttribute('title', 'Video-Infos');
	btn.setAttribute('aria-label', 'Video-Infos');
	btn.innerHTML = INFO_SVG;
	if (sibling) {
		var cs = getComputedStyle(sibling);
		btn.style.background = cs.backgroundColor;
		btn.style.color = cs.color;
	}
	btn.style.display = 'flex';
	btn.style.alignItems = 'center';
	btn.style.justifyContent = 'center';
	btn.style.cursor = 'pointer';
	btn.addEventListener('click', function (e) {
		e.preventDefault();
		e.stopPropagation();
		lsSet(INFO_KEY, ls(INFO_KEY, 'false') === 'true' ? 'false' : 'true');
		applyInfoState();
	});
	row.appendChild(btn);
	applyInfoState();
}

/* With the Android status bar gone the page has to show the time and battery
 * itself. Battery comes from TabletBridge (registered as AndroidTablet). */
var lastStatusPaint = 0;

function ensureStatusChip() {
	var gear = document.getElementById('setDiv');
	if (!gear || !gear.parentNode) return;

	var chip = document.getElementById('ytproTabletStatus');
	if (!chip) {
		chip = document.createElement('div');
		chip.id = 'ytproTabletStatus';
		chip.innerHTML = '<span id="ytproClock"></span><span id="ytproBatt"></span>';
		gear.parentNode.insertBefore(chip, gear.nextSibling);
	}

	var now = Date.now();
	if (now - lastStatusPaint < 15000 && chip.dataset.painted) return;
	lastStatusPaint = now;
	chip.dataset.painted = '1';

	var d = new Date();
	var clock = document.getElementById('ytproClock');
	if (clock) {
		clock.textContent = ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
	}

	var batt = document.getElementById('ytproBatt');
	if (!batt) return;
	try {
		var raw = window.AndroidTablet && window.AndroidTablet.battery
			? window.AndroidTablet.battery() : null;
		var info = raw ? JSON.parse(raw) : null;
		if (info && typeof info.level === 'number' && info.level >= 0) {
			batt.textContent = (info.charging ? '\u26A1 ' : '') + info.level + '%';
			return;
		}
	} catch (e) {}
	if (navigator.getBattery) {
		navigator.getBattery().then(function (b) {
			batt.textContent = (b.charging ? '\u26A1 ' : '') + Math.round(b.level * 100) + '%';
		}).catch(function () {});
	}
}

function routeHash(hash) {
	try {
		history.pushState(null, '', hash);
		if (typeof window.onhashchange === 'function') {
			window.onhashchange(new Event('hashchange'));
		}
	} catch (e) {}
}

if (DESKTOP) {
	document.addEventListener('click', function (e) {
		var t = e.target;
		if (!t || typeof t.closest !== 'function') return;

		var hash = null;
		if (t.closest('#setDiv')) hash = '#settings';
		else if (t.closest('[data-action="hearts"]')) hash = '#hearts';
		if (!hash) return;

		e.preventDefault();
		e.stopPropagation();
		routeHash(hash);
	}, true);

	window.addEventListener('popstate', function () {
		if (typeof window.onhashchange === 'function') {
			window.onhashchange(new Event('hashchange'));
		}
	});
}

/* ------------------------------------------------------------------ *
 * 5. Gesture takeover
 *
 * Upstream builds #volS / #brtS at script.js:1622-1704 with two problems on
 * a 2880px-wide panel:
 *
 *   - the zone is rect.width * 0.14 snapshotted into px (script.js:1608),
 *     so ~403px of dead strip on each side, never recomputed on rotation
 *     because of the guards at :1635 and :1672
 *   - sensitivity is a flat sens=0.005 applied PER touchmove event, with the
 *     magnitude of the swipe thrown away (script.js:1644, :1681). That ties
 *     the feel to the digitizer rate: at 120Hz it runs about twice as fast
 *     as on a 60Hz phone.
 *
 * cloneNode(true) keeps the icons and the fill bar but drops every listener,
 * and reusing the same id stops upstream from rebuilding it.
 * ------------------------------------------------------------------ */
var ZONE_MAX_DP = 96;
var brightness = null;

function zoneWidth(host) {
	var w = host ? host.getBoundingClientRect().width : window.innerWidth;
	return Math.max(48, Math.min(w * 0.14, ZONE_MAX_DP));
}

function styleZone(el, host, side) {
	el.style.width = zoneWidth(host) + 'px';
	el.style.height = '60%';
	el.style.top = '20%';
	if (side === 'left') { el.style.left = '0px'; el.style.right = 'auto'; }
	else { el.style.right = '0px'; el.style.left = 'auto'; }
}

function bindZone(el, fillId, isVolume) {
	var startY = null, startVal = 0;

	el.addEventListener('touchstart', function (e) {
		if (!e.touches.length) return;
		startY = e.touches[0].clientY;
		if (isVolume) {
			try { startVal = window.Android.getVolume(); } catch (err) { startVal = 0.5; }
		} else {
			/* Brightness is a window attribute once we set it, but getBrightness()
			 * keeps reading the system setting - so re-reading here would snap
			 * back. Keep our own value instead. */
			if (brightness === null) {
				try { brightness = window.Android.getBrightness() / 100; } catch (err) { brightness = 0.5; }
			}
			startVal = brightness;
		}
		el.style.opacity = '1';
	}, { passive: true });

	el.addEventListener('touchmove', function (e) {
		if (startY === null || !e.touches.length) return;
		e.preventDefault();

		/* Distance-based: one full sweep of the track is the full range,
		 * independent of how many touchmove events the panel delivers. */
		var travel = el.getBoundingClientRect().height * 0.7;
		if (travel <= 0) return;
		var v = startVal + (startY - e.touches[0].clientY) / travel;
		if (v > 1) v = 1;
		if (v < 0) v = 0;

		if (isVolume) {
			try { window.Android.setVolume(v); } catch (err) {}
		} else {
			brightness = v;
			try { window.Android.setBrightness(v); } catch (err) {}
		}
		var fill = document.getElementById(fillId);
		if (fill) fill.style.height = (v * 100) + '%';
	}, { passive: false });

	function end() { startY = null; el.style.opacity = '0'; }
	el.addEventListener('touchend', end, { passive: true });
	el.addEventListener('touchcancel', end, { passive: true });
}

var takenOver = { volS: false, brtS: false };
var ZONES = [['volS', 'volIS', true, 'right'], ['brtS', 'brtIS', false, 'left']];

function takeOverGestures() {
	if (!TABLET_GESTURES) return;
	for (var i = 0; i < ZONES.length; i++) {
		var id = ZONES[i][0];
		if (takenOver[id]) continue;
		var el = document.getElementById(id);
		if (!el || !el.parentNode) continue;

		var fresh = el.cloneNode(true);          // keeps icon + fill bar, drops listeners
		el.parentNode.replaceChild(fresh, el);
		styleZone(fresh, fresh.parentNode, ZONES[i][3]);
		bindZone(fresh, ZONES[i][1], ZONES[i][2]);
		takenOver[id] = true;
	}
}

function reflowZones() {
	for (var i = 0; i < ZONES.length; i++) {
		var el = document.getElementById(ZONES[i][0]);
		if (el && el.parentNode) styleZone(el, el.parentNode, ZONES[i][3]);
	}
}

window.addEventListener('resize', reflowZones, { passive: true });
window.addEventListener('orientationchange', function () { setTimeout(reflowZones, 120); }, { passive: true });

/* ------------------------------------------------------------------ *
 * 6. CSS overrides
 *
 * Upstream styles everything inline, so these need !important. Gated on a
 * tablet-width viewport so a phone build of the same APK is untouched.
 *
 * 720px, not 840: the Pad 6 Max reports density 360 (scale 2.25), so 1800x2880
 * physical is 800x1280 dp. Portrait is only 800 CSS px wide and an 840px gate
 * would silently switch these off in portrait.
 * ------------------------------------------------------------------ */
var CSS = [
'@media (min-width: 720px) {',

/* Feature row (script.js:1725-1900): icon only, compact, and sitting inside
   YouTube's own #top-row next to Abonnieren rather than on a line of its own.
   Upstream sets width:100% inline, which would break that row, hence the
   inline-flex override. The labels stay in the DOM as title/aria-label. */
'  #ytproMainDivE { height: auto !important; overflow: visible !important;',
'    width: auto !important; display: inline-flex !important; flex: 0 0 auto !important;',
'    align-self: center !important; vertical-align: middle !important;',
'    margin: 0 0 0 12px !important; }',
'  #ytproMainDivE > div { height: auto !important; padding: 0 !important;',
'    gap: 8px !important; justify-content: flex-start !important; flex-wrap: nowrap !important;',
'    width: auto !important; overflow: visible !important; }',
'  #ytproMainDivE > div > div { height: 36px !important; width: 36px !important;',
'    min-width: 0 !important; padding: 0 !important; margin-right: 0 !important;',
'    border-radius: 50% !important; flex: 0 0 auto !important; }',
'  #ytproMainDivE > div > div span { display: none !important; }',
/* Downloads are switched off, so hide both entry points. innertube.js, which
   powered them, is no longer injected at all (YTProWebViewClient). */
'  #ytproMainDivE > div > div[data-ytpro="download"],',
'  #ytproMainSDivE > div[data-ytpro="download"] { display: none !important; }',
'  #ytproMainDivE > div > div svg { height: 20px !important; width: 20px !important;',
'    margin: 0 !important; }',

/* YouTube's own action buttons next to Abonnieren: icons only.
   This build names the label element ytSpecButtonShapeNextButtonTextContent
   (camelCase; older builds used yt-spec-button-shape-next__button-text-content,
   so both are covered). Scoped to #actions, which leaves the Abonnieren button
   itself - it lives in #owner - untouched. The like/dislike counts stay: they
   are data, not labels, and the dislike count is a YTPRO feature. */
'  ytd-watch-metadata #actions .ytSpecButtonShapeNextButtonTextContent,',
'  ytd-watch-metadata #actions .yt-spec-button-shape-next__button-text-content {',
'    display: none !important; }',
'  ytd-watch-metadata #actions like-button-view-model .ytSpecButtonShapeNextButtonTextContent,',
'  ytd-watch-metadata #actions dislike-button-view-model .ytSpecButtonShapeNextButtonTextContent,',
'  ytd-watch-metadata #actions like-button-view-model .yt-spec-button-shape-next__button-text-content,',
'  ytd-watch-metadata #actions dislike-button-view-model .yt-spec-button-shape-next__button-text-content {',
'    display: inline-block !important; }',
'  ytd-watch-metadata #actions button.ytSpecButtonShapeNextHost {',
'    min-width: 0 !important; }',

/* Docked player.
   ytd-watch-flexy #player carries transform: matrix(1,0,0,1,0,0) - an identity
   transform, but any transform other than none makes that element the containing
   block for fixed descendants. Without clearing it the docked player anchors to
   #player instead of the viewport and scrolls away with the page.
   Position is then expressed as translate() from the top left with
   transform-origin 0 0, rather than right/bottom, so the scaled box lands exactly
   where the numbers say. Width and height are pinned to the pre-dock size,
   otherwise the fixed element stretches to the viewport and the scale is
   computed off the wrong base. */

'  html.ytpro-dock #movie_player {',
'    position: fixed !important; left: 0 !important; top: 0 !important;',
'    right: auto !important; bottom: auto !important;',
'    width: var(--ytpro-dock-w, 880px) !important;',
'    height: var(--ytpro-dock-h, 495px) !important;',
'    transform-origin: 0 0 !important;',
'    transform: translate(var(--ytpro-dock-x, 0px), var(--ytpro-dock-y, 0px))',
'               scale(var(--ytpro-dock-scale, .45)) !important;',
'    z-index: 9000 !important; border-radius: 12px !important;',
'    overflow: hidden !important;',
'    box-shadow: 0 6px 28px rgba(0, 0, 0, .55) !important; }',

/* Recommendations column scrolls on its own.
   Desktop YouTube scrolls the whole document, so reading further down the
   related list drags the player out of view. Pin the column under the masthead
   (56px) and give it its own scroll box; overscroll-behavior:contain stops the
   scroll from chaining to the page once the list hits either end. Skipped in
   theater mode, where the column sits below the player anyway. */
'  ytd-watch-flexy:not([theater]) #secondary {',
'    position: sticky !important; top: 64px !important;',
'    max-height: calc(100vh - 76px) !important;',
'    overflow-y: auto !important; overscroll-behavior: contain !important; }',
'  ytd-watch-flexy:not([theater]) #secondary::-webkit-scrollbar { width: 6px !important; }',
'  ytd-watch-flexy:not([theater]) #secondary::-webkit-scrollbar-thumb {',
'    background: rgba(255,255,255,.25) !important; border-radius: 3px !important; }',
'  ytd-watch-flexy:not([theater]) #secondary::-webkit-scrollbar-track {',
'    background: transparent !important; }',

/* Home-feed and watch-page ads. Upstream's ad removal targets the mobile
   renderers (ytm-*), which do not exist here. :has() lets us drop the whole
   grid cell rather than leaving an empty slot behind. */
'  ytd-ad-slot-renderer, ytd-display-ad-renderer, ytd-in-feed-ad-layout-renderer,',
'  ytd-promoted-video-renderer, ytd-promoted-sparkles-web-renderer,',
'  ytd-companion-ad-renderer, ytd-action-companion-ad-renderer,',
'  ytd-banner-promo-renderer, ytd-statement-banner-renderer,',
'  ytd-primetime-promo-renderer, ytd-player-legacy-desktop-watch-ads-renderer,',
'  #masthead-ad, #player-ads, ytmusic-mealbar-promo-renderer,',
'  ytd-video-masthead-ad-v3-renderer, ytd-video-masthead-ad-primary-video-renderer,',
'  ytd-inline-survey-renderer, ytd-brand-video-shelf-renderer,',
'  ytd-brand-video-singleton-renderer {',
'    display: none !important; }',
/* YouTube keeps one shared inline preview player and positions it over whichever
   tile is previewing. With the ad slots hidden it was still being parked over the
   first real tile and playing the ad there. No loss on a touch device, where the
   hover preview never had a purpose. */
'  ytd-video-preview, #video-preview, ytd-moving-thumbnail-renderer {',
'    display: none !important; }',
'  ytd-rich-item-renderer:has(ytd-ad-slot-renderer),',
'  ytd-rich-item-renderer:has(ytd-display-ad-renderer),',
'  ytd-rich-item-renderer:has(ytd-in-feed-ad-layout-renderer),',
'  ytd-rich-section-renderer:has(ytd-statement-banner-renderer),',
'  ytd-rich-section-renderer:has(ytd-brand-video-shelf-renderer) {',
'    display: none !important; }',
/* Deliberately NOT hiding a whole ytd-item-section-renderer that contains an ad
   slot: the watch page keeps its entire related list in one such section, so
   that rule removed every recommendation next to the player. The bare
   ytd-ad-slot-renderer rule above already drops the ad on its own. */

/* Comments first: the description block is collapsed by default and the info
   button in the YTPRO row brings it back. */
'  ytd-watch-metadata #bottom-row { display: none !important; }',
'  html.ytpro-show-info ytd-watch-metadata #bottom-row { display: block !important; }',
'  #ytproMainDivE > div > div[data-ytpro="info"][aria-pressed="true"] {',
'    outline: 2px solid rgba(255,255,255,.35) !important; outline-offset: -2px !important; }',

/* Clock and battery, standing in for the hidden Android status bar. */
'  #ytproTabletStatus { display: inline-flex !important; align-items: center !important;',
'    gap: 8px !important; margin-left: 14px !important; padding: 6px 14px !important;',
'    background: #fff !important; color: #0f0f0f !important; border-radius: 999px !important;',
'    white-space: nowrap !important; vertical-align: middle !important;',
'    font-size: 13px !important; font-weight: 600 !important; letter-spacing: .2px !important;',
'    line-height: 1 !important; pointer-events: none !important; }',
'  #ytproTabletStatus span { line-height: 1 !important; color: inherit !important; }',

/* Gemini answer panel (script.js:1466) */
'  #GeminiResponse { max-height: min(60vh, 900px) !important; max-width: 80ch !important;',
'    width: auto !important; font-size: 15px !important; line-height: 1.6 !important;',
'    padding: 16px !important; }',

/* settings sheet (script.js:595-700) */
'  #ssprodivI, #heartytprodiv, #downytprodiv, #ytProDownloaderDiv {',
'    box-sizing: border-box !important; }',
'  #ssprodivI { width: min(560px, 92vw) !important; max-width: 560px !important;',
'    height: auto !important; max-height: 72vh !important; bottom: auto !important;',
'    top: 50% !important; left: 50% !important;',
'    transform: translate(-50%, -50%) !important; padding: 16px !important; }',
'  #ssprodivI div { height: auto !important; min-height: 48px !important; }',
'  #ssprodivI div span { height: 28px !important; width: 48px !important; right: 12px !important; }',
'  #ssprodivI div span b { height: 24px !important; width: 24px !important; top: 2px !important; }',
/* The credit bar is position:fixed at a phone-sized offset upstream, which
   parked it on top of the last settings row inside the centred dialog. Let it
   flow at the end of the content instead. */
'  #ssprodivI .credit { position: static !important; left: auto !important;',
'    right: auto !important; bottom: auto !important; width: auto !important;',
'    height: auto !important; padding: 14px 0 4px !important; margin-top: 8px !important;',
'    backdrop-filter: none !important; background: transparent !important; }',
'  #ssprodivI .geminiModels, #ssprodivI .disableCodecs, #ssprodivI .geminiPrompt {',
'    width: min(520px, 90vw) !important; left: 50% !important; right: auto !important;',
'    transform: translateX(-50%) !important; bottom: 10vh !important; }',

/* liked videos (script.js:2014-2057) */
'  #heartytprodiv { width: min(1100px, 92vw) !important; height: auto !important;',
'    min-height: 180px !important;',
'    max-height: 76vh !important; bottom: auto !important; top: 50% !important;',
'    left: 50% !important; transform: translate(-50%, -50%) !important; }',
'  #heartytprodiv #listurl { display: grid !important;',
'    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)) !important; gap: 8px !important; }',
'  #heartytprodiv li { margin: 0 !important; }',
'  #heartytprodiv .thum { height: 84px !important; }',
'  #heartytprodiv .thum img { height: 84px !important; width: 150px !important; }',

/* downloader (innertube.js:876-912, 1051, 1124) */
'  #downytprodiv { width: min(900px, 92vw) !important; height: auto !important;',
'    max-height: 76vh !important; bottom: auto !important; top: 50% !important;',
'    left: 50% !important; transform: translate(-50%, -50%) !important; }',
'  #ytProDownloaderDiv { width: min(560px, 92vw) !important; height: auto !important;',
'    max-height: 60vh !important; left: 50% !important; transform: translateX(-50%) !important; }',
'  #ytproDownloadIndicator { height: 64px !important; width: 64px !important; }',

/* shorts overlay (script.js:1915-1944) */
'  #ytproMainSDivE { width: 56px !important; }',
'  #ytproMainSDivE > div { height: 56px !important; width: 56px !important; }',
'  #ytproMainSDivE svg { height: 32px !important; width: 32px !important; }',

/* sponsor overlay + skip toast (script.js:292-303, 410-419) */
'  #sDiv, #sDiv > div { height: 5px !important; }',
'  #player-control-container > div[style*="backdrop-filter"],',
'  .ytp-chrome-bottom > div[style*="backdrop-filter"] {',
'    width: min(520px, 60%) !important; left: 50% !important;',
'    transform: translateX(-50%) !important; }',

/* gesture zones */
'  #volS > div, #brtS > div { width: 6px !important; left: calc(50% - 3px) !important; }',
'  #volS > svg, #brtS > svg { height: 24px !important; width: 24px !important; }',

/* minimised player (script.js:1297-1322): top is screen.height - height*2.5,
   which goes negative in landscape and parks it above the top edge. Inline
   styles lose to !important, so pin it to the corner instead. */
'  #movie_player[style*="scale(0.65)"], #player-container-id[style*="scale(0.65)"] {',
'    top: auto !important; bottom: 16px !important; right: 16px !important;',
'    left: auto !important; transform-origin: bottom right !important; }',

'}'
].join('\n');

function injectCss() {
	if (!TABLET_UI) return;
	if (document.getElementById('ytpro-tablet-css')) return;
	var head = document.head || document.documentElement;
	if (!head) return;
	var style = document.createElement('style');
	style.id = 'ytpro-tablet-css';
	style.textContent = CSS;
	head.appendChild(style);
}

/* ------------------------------------------------------------------ *
 * 7. Drive it
 * ------------------------------------------------------------------ */
function tick() {
	injectCss();
	fixViewport();
	if (DESKTOP) tagDesktopNodes();
	tagFeatureButtons();
	if (DESKTOP) {
		ensureInfoButton();
		ensureStatusChip();
		updateDock();
	}
	takeOverGestures();
}

var scheduled = false;
var observer = new MutationObserver(function () {
	if (scheduled) return;
	scheduled = true;
	/* Coalesce: YouTube mutates constantly, and script.js already runs its own
	 * setInterval(pkc, 0) busy loop on top of that. */
	requestAnimationFrame(function () { scheduled = false; tick(); });
});

function start() {
	if (!document.body) { setTimeout(start, 50); return; }
	observer.observe(document.body, { childList: true, subtree: true });
	tick();
}

tick();
start();
setInterval(function () { lastStatusPaint = 0; if (DESKTOP) ensureStatusChip(); }, 20000);

/* Upstream rebuilds its overlays after a page-internal navigation, so let the
 * takeover run again for a fresh player. */
window.addEventListener('hashchange', function () {
	takenOver.volS = false;
	takenOver.brtS = false;
}, { passive: true });

})();
