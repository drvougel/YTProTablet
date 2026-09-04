package com.google.android.youtube.pro;

import android.os.Bundle;

public class DownloadFromIntentFilter extends MainActivity {

    // YTPRO-TABLET: was calling super.onCreate() (which already inflates and
    // calls load(false)) and then inflating and loading a second time - two full
    // page loads, MediaCommandReceiver registered twice, the first one leaked,
    // and two BinaryStreamManager thread pools of which only one was cleaned up.
    @Override
    protected boolean downloadMode() {
        return true;
    }
}
