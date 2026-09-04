package com.google.android.youtube.pro;

import android.app.Activity;
import android.app.PictureInPictureParams;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.content.res.Configuration;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.util.Rational;
import android.view.KeyEvent;
import android.view.View;
import android.view.WindowManager;
import android.webkit.CookieManager;
import android.widget.Toast;
import android.window.OnBackInvokedCallback;
import android.window.OnBackInvokedDispatcher;
import android.widget.Button;

// Import the separated components
import com.google.android.youtube.pro.webview.YTProWebView;
import com.google.android.youtube.pro.webview.YTProWebViewClient;
import com.google.android.youtube.pro.webview.YTProWebChromeClient;
import com.google.android.youtube.pro.webview.WebAppInterface;
import com.google.android.youtube.pro.webview.BinaryStreamManager;

import com.google.android.youtube.pro.receivers.MediaCommandReceiver;

public class MainActivity extends Activity {

    public boolean portrait = false;
    public boolean isPlaying = false;
    public boolean mediaSession = false;
    public boolean isPip = false;
    public boolean dL = false;
    public boolean desktopSite = false;
    // YTPRO-TABLET: shouldInterceptRequest runs on a WebView worker thread, where
    // touching WebView.getSettings() throws. Cache the string here instead.
    public volatile String uaOverride = null;

    private YTProWebView web;
    private MediaCommandReceiver broadcastReceiver;
    private OnBackInvokedCallback backCallback;
    public BinaryStreamManager streamManager;
    
    

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.main);
        
        SharedPreferences prefs = getSharedPreferences("YTPRO", MODE_PRIVATE);
        if (!prefs.contains("bgplay")) {
            prefs.edit().putBoolean("bgplay", true).apply();
        }

        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        applyImmersive();
        load(downloadMode());
    }

    /**
     * YTPRO-TABLET: no system status bar and no navigation bar - the page draws
     * all the way to the edges and puts its own clock and battery in the
     * masthead. Sticky immersive, so a swipe from an edge shows the bars
     * transiently and they hide themselves again.
     */
    public void applyImmersive() {
        android.view.Window w = getWindow();
        if (Build.VERSION.SDK_INT >= 30) {
            w.setDecorFitsSystemWindows(false);
            android.view.WindowInsetsController c = w.getInsetsController();
            if (c != null) {
                c.hide(android.view.WindowInsets.Type.statusBars()
                        | android.view.WindowInsets.Type.navigationBars());
                c.setSystemBarsBehavior(
                        android.view.WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
            }
        } else {
            w.getDecorView().setSystemUiVisibility(
                    View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                            | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                            | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                            | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                            | View.SYSTEM_UI_FLAG_FULLSCREEN
                            | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY);
        }
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        // YTPRO-TABLET: the system restores the bars whenever focus comes back.
        if (hasFocus) applyImmersive();
    }

    // YTPRO-TABLET: subclasses say what they are instead of running onCreate twice.
    protected boolean downloadMode() {
        return false;
    }

    public void load(boolean dl) {
              
        
        this.dL = dl;
        web = findViewById(R.id.web);
        
        web.getSettings().setJavaScriptEnabled(true);
        web.getSettings().setSupportZoom(true);
        web.getSettings().setBuiltInZoomControls(true);
        web.getSettings().setDisplayZoomControls(false);
        web.getSettings().setDomStorageEnabled(true);
        web.getSettings().setDatabaseEnabled(true);
        web.getSettings().setMediaPlaybackRequiresUserGesture(false); 

        // YTPRO-TABLET: a forced hardware layer allocates a full-screen offscreen
        // texture (~20.7 MB at 2880x1800) and refills it every frame. WebView is
        // already hardware accelerated, so on a large panel this is a net loss.
        web.setLayerType(View.LAYER_TYPE_NONE, null);

        // YTPRO-TABLET: honour the meta viewport instead of guessing a width, and
        // pre-raster offscreen content so scrolling a tall page stays smooth.
        web.getSettings().setUseWideViewPort(true);
        web.getSettings().setLoadWithOverviewMode(false);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            web.getSettings().setOffscreenPreRaster(true);
        }

        // YTPRO-TABLET: without this YouTube sees the phone UA and redirects
        // www.youtube.com straight back to m.youtube.com.
        // YTPRO-TABLET: chrome://inspect against a debug build only. Leaving this
        // on unconditionally would let any local app drive the logged-in WebView.
        if ((getApplicationInfo().flags & android.content.pm.ApplicationInfo.FLAG_DEBUGGABLE) != 0) {
            android.webkit.WebView.setWebContentsDebuggingEnabled(true);
        }

        desktopSite = TabletMode.useDesktopSite(this);
        if (desktopSite) {
            uaOverride = TabletMode.desktopUserAgent(this);
            web.getSettings().setUserAgentString(uaOverride);
        }
        TabletMode.applyHighRefreshRate(getWindow());

        CookieManager cookieManager = CookieManager.getInstance();
        cookieManager.setAcceptCookie(true);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            cookieManager.setAcceptThirdPartyCookies(web, true);
        }

        Intent intent = getIntent();
        String action = intent.getAction();
        Uri data = intent.getData();
        String url = desktopSite ? TabletMode.DESKTOP_URL : TabletMode.MOBILE_URL;
        if (Intent.ACTION_VIEW.equals(action) && data != null) {
            url = data.toString();
        } else if (Intent.ACTION_SEND.equals(action)) {
            String sharedText = intent.getStringExtra(Intent.EXTRA_TEXT);
            if (sharedText != null && (sharedText.contains("youtube.com") || sharedText.contains("youtu.be"))) {
                url = sharedText;
            }
        }

        // YTPRO-TABLET
        if (desktopSite) url = TabletMode.toDesktopUrl(url);
        android.util.Log.i("YTPRO_TABLET", "sw="
                + getResources().getConfiguration().smallestScreenWidthDp
                + "dp desktopSite=" + desktopSite + " url=" + url + " ua=" + uaOverride);
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
          web.getSettings().setMixedContentMode(android.webkit.WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        }


        web.addJavascriptInterface(new WebAppInterface(this, web), "Android");
        web.addJavascriptInterface(new TabletBridge(this), "AndroidTablet"); // YTPRO-TABLET
        web.setWebChromeClient(new YTProWebChromeClient(this, web));
        web.setWebViewClient(new YTProWebViewClient(this, web));
        
        web.loadUrl(url);

        setupReceiver();
        setupBackNavigation();
        streamManager = new BinaryStreamManager(web,this);
        
        
    }
         

   

    private void setupReceiver() {
        broadcastReceiver = new MediaCommandReceiver(web);
        if (Build.VERSION.SDK_INT >= 34 && getApplicationInfo().targetSdkVersion >= 34) {
            // YTPRO-TABLET: every sender is in-process (ForegroundService), so an
            // exported receiver on an unprotected implicit action just let any
            // installed app drive playback.
            registerReceiver(broadcastReceiver, new IntentFilter("TRACKS_TRACKS"), RECEIVER_NOT_EXPORTED);
        } else {
            registerReceiver(broadcastReceiver, new IntentFilter("TRACKS_TRACKS"));
        }
    }

    private void setupBackNavigation() {
        if (Build.VERSION.SDK_INT >= 33) {
            OnBackInvokedDispatcher dispatcher = getOnBackInvokedDispatcher();
            backCallback = new OnBackInvokedCallback() {
                @Override
                public void onBackInvoked() {
                    handleBackPress();
                }
            };
            dispatcher.registerOnBackInvokedCallback(OnBackInvokedDispatcher.PRIORITY_DEFAULT, backCallback);
        }
    }

    private void handleBackPress() {
        // YTPRO-TABLET: "i" is YouTube's own miniplayer shortcut. Dispatching a real
        // KeyEvent reaches the page as a trusted key press, so YouTube docks the
        // player into its native bottom-right miniplayer, keeps it playing, and
        // returns to the feed behind it. Clicking the home link instead tore the
        // player down, and plain finish() closed the app mid-playback.
        String url = web.getUrl();
        if (url != null && (url.contains("/watch") || url.contains("/shorts"))) {
            web.requestFocus();
            long now = android.os.SystemClock.uptimeMillis();
            web.dispatchKeyEvent(new KeyEvent(now, now, KeyEvent.ACTION_DOWN, KeyEvent.KEYCODE_I, 0));
            web.dispatchKeyEvent(new KeyEvent(now, now, KeyEvent.ACTION_UP, KeyEvent.KEYCODE_I, 0));
            return;
        }
        if (web.canGoBack()) {
            web.goBack();
        } else {
            finish();
        }
    }

    @Override
    public void onBackPressed() {
        handleBackPress();
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == 101) {
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                web.loadUrl("https://m.youtube.com");
            } else {
                Toast.makeText(getApplicationContext(), getString(R.string.grant_mic), Toast.LENGTH_SHORT).show();
            }
        } else if (requestCode == 1) {
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_DENIED) {
                Toast.makeText(getApplicationContext(), getString(R.string.grant_storage), Toast.LENGTH_SHORT).show();
            }
        }
    }

    @Override
    public void onPictureInPictureModeChanged(boolean isInPictureInPictureMode, Configuration newConfig) {
        web.evaluateJavascript(isInPictureInPictureMode ? "PIPlayer();" : "removePIP();", null);
        isPip = isInPictureInPictureMode;
    }

    @Override
    protected void onUserLeaveHint() {
        super.onUserLeaveHint();
        if (Build.VERSION.SDK_INT >= 26 && web.getUrl() != null && web.getUrl().contains("watch")) {
            if (isPlaying) {
                try {
                    isPip = true;
                    // YTPRO-TABLET
                    enterPictureInPictureMode(
                            new PictureInPictureParams.Builder()
                                    .setAspectRatio(pipAspect())
                                    .build());
                } catch (IllegalStateException e) {
                    e.printStackTrace();
                }
            }
        }
    }

    @Override
    protected void onPause() {
        super.onPause();
        CookieManager.getInstance().flush();
    }

    // YTPRO-TABLET
    private static final float MIN_PIP_RATIO = 0.4200f;   // 1:2.39 is 0.41841
    private static final float MAX_PIP_RATIO = 2.3800f;   // 2.39:1

    /**
     * YTPRO-TABLET: PiP rejects anything outside 1:2.39 .. 2.39:1, and the binary
     * portrait/landscape guess was wrong for every non-16:9 video anyway.
     */
    public static Rational pipAspect(int videoWidth, int videoHeight) {
        float w = videoWidth > 0 ? videoWidth : 16f;
        float h = videoHeight > 0 ? videoHeight : 9f;
        float ratio = w / h;
        // Android rejects anything outside 1:2.39 .. 2.39:1. Clamping exactly onto
        // the boundary is not enough: rounding to a 1/1000 Rational can land just
        // outside it again, so keep a margin.
        if (ratio < MIN_PIP_RATIO) ratio = MIN_PIP_RATIO;
        if (ratio > MAX_PIP_RATIO) ratio = MAX_PIP_RATIO;
        return new Rational(Math.round(ratio * 1000f), 1000);
    }

    private Rational pipAspect() {
        return portrait ? pipAspect(9, 16) : pipAspect(16, 9);
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        stopService(new Intent(getApplicationContext(), ForegroundService.class));
        if (broadcastReceiver != null) unregisterReceiver(broadcastReceiver);
        if (Build.VERSION.SDK_INT >= 33 && backCallback != null) {
            getOnBackInvokedDispatcher().unregisterOnBackInvokedCallback(backCallback);
        }
        if (streamManager != null) {
            streamManager.cleanup();
        }
    }
}
