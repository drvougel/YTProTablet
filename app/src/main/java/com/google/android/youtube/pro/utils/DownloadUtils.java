package com.google.android.youtube.pro.utils;

import android.Manifest;
import android.app.Activity;
import android.app.DownloadManager;
import android.content.Context;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.widget.Toast;

import com.google.android.youtube.pro.R;

public class DownloadUtils {

    public static void downloadFile(Activity activity, String filename, String url, String mtype) {
        if (Build.VERSION.SDK_INT > 22 && Build.VERSION.SDK_INT < Build.VERSION_CODES.R && 
            activity.checkSelfPermission(Manifest.permission.WRITE_EXTERNAL_STORAGE) == PackageManager.PERMISSION_DENIED) {
            
            activity.runOnUiThread(() -> Toast.makeText(activity, R.string.grant_storage, Toast.LENGTH_SHORT).show());
            activity.requestPermissions(new String[]{Manifest.permission.WRITE_EXTERNAL_STORAGE,Manifest.permission.READ_EXTERNAL_STORAGE}, 1);
            return;
        }
        
        try {
            // YTPRO-TABLET: this is a filesystem name, not a URL component. URL
            // encoding it wrote files to disk as "My%20Video%20%282024%29.mp4".
            // Strip only what the filesystem actually rejects.
            String encodedFileName = filename.replaceAll("[\\\\/:*?\"<>|\\r\\n]", "_").trim();
            if (encodedFileName.length() == 0) encodedFileName = "video";
            DownloadManager downloadManager = (DownloadManager) activity.getSystemService(Context.DOWNLOAD_SERVICE);
            DownloadManager.Request request = new DownloadManager.Request(Uri.parse(url));
            
            request.setTitle(filename)
                   .setDescription(filename)
                   .setMimeType(mtype)
                   .setAllowedOverMetered(true)
                   .setAllowedOverRoaming(true)
                   .setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, "YTPRO/" + encodedFileName) // YTPRO-TABLET
                   .setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE | DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
                   
            downloadManager.enqueue(request);
            Toast.makeText(activity, activity.getString(R.string.dl_started), Toast.LENGTH_SHORT).show();
        } catch (Exception ignored) {
            Toast.makeText(activity, ignored.toString(), Toast.LENGTH_SHORT).show();
        }
    }
}
