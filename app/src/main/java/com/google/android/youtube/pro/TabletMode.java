package com.google.android.youtube.pro;

import android.content.Context;
import android.content.SharedPreferences;
import android.os.Build;
import android.view.Display;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.WebSettings;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * YTPRO-TABLET
 *
 * Large-screen behaviour, kept in one place so the patches inside the upstream
 * classes stay one-liners and a rebase onto upstream stays trivial.
 */
public final class TabletMode {

	public static final String PREFS = "YTPRO";
	public static final String PREF_DESKTOP_SITE = "desktopSite";

	public static final String DESKTOP_URL = "https://www.youtube.com/";
	public static final String MOBILE_URL = "https://m.youtube.com/";

	public static final String TABLET_ASSET = "ytpro-tablet.js";

	private TabletMode() { }

	/** sw600dp is the conventional phone/tablet boundary. The Pad 6 Max is ~900-1030dp. */
	public static boolean isLargeScreen(Context ctx) {
		return ctx.getResources().getConfiguration().smallestScreenWidthDp >= 600;
	}

	/** Desktop site only on a big screen, and only while the user has not opted out. */
	public static boolean useDesktopSite(Context ctx) {
		SharedPreferences prefs = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
		return isLargeScreen(ctx) && prefs.getBoolean(PREF_DESKTOP_SITE, true);
	}

	/**
	 * A desktop user agent carrying this WebView's real Chrome version.
	 *
	 * Dropping just the "Mobile" token is not enough: the platform token still
	 * reads "Linux; Android 15; 2307BRPDCC" and YouTube keeps redirecting
	 * www -> m. Chrome's own "Request desktop site" replaces the whole platform
	 * token with X11; Linux x86_64, so do the same. Linux rather than Windows,
	 * because innertube.js already claims Windows for its API calls and there is
	 * no reason to invite Windows-only behaviour into the page itself.
	 */
	public static String desktopUserAgent(Context ctx) {
		String ua = "";
		try {
			ua = WebSettings.getDefaultUserAgent(ctx);
		} catch (Throwable t) {
			// fall through to the pinned version below
		}
		String chromeVersion = "124.0.0.0";
		try {
			Matcher m = Pattern.compile("Chrome/([0-9.]+)").matcher(ua);
			if (m.find()) chromeVersion = m.group(1);
		} catch (Throwable t) {
			// keep the fallback
		}
		return "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) "
			+ "Chrome/" + chromeVersion + " Safari/537.36";
	}

	public static String toDesktopUrl(String url) {
		if (url == null || url.length() == 0) return DESKTOP_URL;
		return url.replace("://m.youtube.com", "://www.youtube.com");
	}

	/** Opt into the panel's highest refresh rate at the current resolution (120Hz here). */
	public static void applyHighRefreshRate(Window window) {
		if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M || window == null) return;
		try {
			Display display = window.getWindowManager().getDefaultDisplay();
			Display.Mode current = display.getMode();
			Display.Mode best = current;
			for (Display.Mode m : display.getSupportedModes()) {
				if (m.getPhysicalWidth() == current.getPhysicalWidth()
					&& m.getPhysicalHeight() == current.getPhysicalHeight()
					&& m.getRefreshRate() > best.getRefreshRate()) {
					best = m;
				}
			}
			if (best.getModeId() != current.getModeId()) {
				WindowManager.LayoutParams lp = window.getAttributes();
				lp.preferredDisplayModeId = best.getModeId();
				window.setAttributes(lp);
			}
		} catch (Throwable ignored) { }
	}

	private static String cachedAsset;
	private static String cachedAssetName;

	public static String readAsset(Context ctx, String name) {
		if (cachedAsset != null && name.equals(cachedAssetName)) return cachedAsset;
		InputStream in = null;
		try {
			in = ctx.getAssets().open(name);
			ByteArrayOutputStream out = new ByteArrayOutputStream(Math.max(1024, in.available()));
			byte[] buf = new byte[8192];
			int n;
			while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
			cachedAsset = out.toString("UTF-8");
			cachedAssetName = name;
			return cachedAsset;
		} catch (Exception e) {
			return "";
		} finally {
			try { if (in != null) in.close(); } catch (Exception ignored) { }
		}
	}
}
