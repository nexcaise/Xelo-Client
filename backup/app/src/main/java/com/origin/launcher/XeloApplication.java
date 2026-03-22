package com.origin.launcher;

import android.app.Application;
import android.util.Log;
import com.origin.launcher.settings.manager.ThemeManager;

public class XeloApplication extends Application {
    private static final String TAG = "XeloApplication";

    @Override
    public void onCreate() {
        super.onCreate();

        Log.d(TAG, "Initializing Xelo Application");

        // Initialize ThemeManager globally
        ThemeManager.getInstance(this);

        Log.d(TAG, "ThemeManager initialized");
    }
}