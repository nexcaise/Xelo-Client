package com.origin.launcher.Launcher.inbuilt.manager;

import android.app.Service;
import android.content.Intent;
import android.graphics.PixelFormat;
import android.os.IBinder;
import android.view.WindowManager;
import android.widget.FrameLayout;

public class InbuiltModsOverlayService extends Service {

    private WindowManager windowManager;
    private FrameLayout container;

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        windowManager = (WindowManager) getSystemService(WINDOW_SERVICE);

        container = new FrameLayout(this);

        WindowManager.LayoutParams params = new WindowManager.LayoutParams(
            WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
            WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL |
            WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
            PixelFormat.TRANSLUCENT
        );

        windowManager.addView(container, params);

        InbuiltModsOverlayHelper helper = new InbuiltModsOverlayHelper(this, container, windowManager);
        helper.setup();

        return START_NOT_STICKY;
    }

    @Override
    public void onDestroy() {
        if (container != null) windowManager.removeView(container);
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) { return null; }
}