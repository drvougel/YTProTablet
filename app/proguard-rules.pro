# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# If your project uses WebView with JS, uncomment the following
# and specify the fully qualified class name to the JavaScript interface
# class:
#-keepclassmembers class fqcn.of.javascript.interface.for.webview {
#   public *;
#}

# Uncomment this to preserve the line number information for
# debugging stack traces.
#-keepattributes SourceFile,LineNumberTable

# If you keep the line number information, uncomment this to
# hide the original source file name.
#-renamesourcefileattribute SourceFile

# ── YTPRO-TABLET ───────────────────────────────────────────────────────────
# minifyEnabled is on and this file was otherwise entirely comments. The whole
# surface area of this app is @JavascriptInterface methods plus components
# instantiated by name from the manifest, and both survived only via the
# implicit rules in AGP's proguard-android.txt. Be explicit.

-keepclassmembers class com.google.android.youtube.pro.webview.WebAppInterface {
    @android.webkit.JavascriptInterface <methods>;
}
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

-keep class com.google.android.youtube.pro.receivers.** { *; }
-keep class com.google.android.youtube.pro.ForegroundService { *; }
-keep class com.google.android.youtube.pro.MainActivity { *; }
-keep class com.google.android.youtube.pro.DownloadFromIntentFilter { *; }
-keep class com.google.android.youtube.pro.webview.YTProWebView {
    public <init>(android.content.Context, android.util.AttributeSet);
}
