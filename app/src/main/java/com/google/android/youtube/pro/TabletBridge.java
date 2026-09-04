package com.google.android.youtube.pro;

import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.BatteryManager;
import android.webkit.JavascriptInterface;

/**
 * YTPRO-TABLET
 *
 * Separate from WebAppInterface on purpose: that class is upstream's, and keeping
 * our additions in their own object means a rebase never touches it.
 *
 * Exposed to the page as "AndroidTablet".
 */
public class TabletBridge {

	private final Context ctx;

	public TabletBridge(Context ctx) {
		this.ctx = ctx.getApplicationContext();
	}

	/** {"level":57,"charging":true} - the app hides the system status bar, so the
	 *  page draws its own battery readout. */
	@JavascriptInterface
	public String battery() {
		try {
			Intent i = ctx.registerReceiver(null, new IntentFilter(Intent.ACTION_BATTERY_CHANGED));
			if (i == null) return "{}";
			int level = i.getIntExtra(BatteryManager.EXTRA_LEVEL, -1);
			int scale = i.getIntExtra(BatteryManager.EXTRA_SCALE, -1);
			int status = i.getIntExtra(BatteryManager.EXTRA_STATUS, -1);
			boolean charging = status == BatteryManager.BATTERY_STATUS_CHARGING
				|| status == BatteryManager.BATTERY_STATUS_FULL;
			int pct = (level >= 0 && scale > 0) ? Math.round(level * 100f / scale) : -1;
			return "{\"level\":" + pct + ",\"charging\":" + charging + "}";
		} catch (Exception e) {
			return "{}";
		}
	}
}
