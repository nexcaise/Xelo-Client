package com.origin.launcher.Launcher.inbuilt.manager;

import android.content.Context;
import android.view.MotionEvent;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.widget.FrameLayout;
import android.widget.ImageButton;
import android.widget.ImageView;

import com.origin.launcher.Launcher.inbuilt.model.ModIds;
import com.origin.launcher.R;

import java.util.HashMap;
import java.util.Map;

public class InbuiltModsOverlayHelper {

    private static final int MIN_SIZE_DP = 32;
    private static final int MAX_SIZE_DP = 96;
    private static final int DEFAULT_SIZE_DP = 40;
    private static final int MIN_OPACITY = 20;
    private static final int MAX_OPACITY = 100;
    private static final int DEFAULT_OPACITY = 100;

    private final Context context;
    private final FrameLayout container;
    private final WindowManager windowManager;

    private final Map<String, ImageButton> modButtons = new HashMap<>();
    private final Map<String, Integer> modSizes = new HashMap<>();
    private final Map<String, Integer> modOpacity = new HashMap<>();

    public InbuiltModsOverlayHelper(Context context, FrameLayout container, WindowManager windowManager) {
        this.context = context;
        this.container = container;
        this.windowManager = windowManager;
    }

    public void setup() {
        InbuiltModSizeStore.getInstance().init(context);

        addModButton(R.drawable.as_unpress, ModIds.AUTO_SPRINT);
        addModButton(R.drawable.q_unpress, ModIds.QUICK_DROP);
        addModButton(R.drawable.f1_unpress, ModIds.TOGGLE_HUD);
        addModButton(R.drawable.f5_unpress, ModIds.CAMERA_PERSPECTIVE);
        addModButton(R.drawable.zoom_unpress, ModIds.ZOOM);

        InbuiltModSizeStore store = InbuiltModSizeStore.getInstance();
        for (Map.Entry<String, ImageButton> e : modButtons.entrySet()) {
            String id = e.getKey();
            ImageButton btn = e.getValue();
            float sx = store.getPositionX(id);
            float sy = store.getPositionY(id);
            if (sx >= 0f && sy >= 0f) {
                btn.setX(sx);
                btn.setY(sy);
            }
        }
    }

    private void addModButton(int iconResId, String id) {
        InbuiltModManager manager = InbuiltModManager.getInstance(context);
        if (!manager.isModAdded(id)) return;

        ImageButton btn = new ImageButton(context);
        btn.setImageResource(iconResId);
        btn.setBackgroundResource(R.drawable.bg_overlay_button);
        btn.setPadding(0, 0, 0, 0);
        btn.setPaddingRelative(0, 0, 0, 0);
        btn.setMinimumWidth(0);
        btn.setMinimumHeight(0);

        int savedSizeDp = manager.getOverlayButtonSize(id);
        if (savedSizeDp <= 0) savedSizeDp = DEFAULT_SIZE_DP;
        savedSizeDp = clampSize(savedSizeDp);

        int savedOpacity = manager.getOverlayButtonOpacity(id);
        if (savedOpacity <= 0) savedOpacity = DEFAULT_OPACITY;
        savedOpacity = clampOpacity(savedOpacity);

        int sizePx = dpToPx(savedSizeDp);
        FrameLayout.LayoutParams lp = new FrameLayout.LayoutParams(sizePx, sizePx);
        lp.leftMargin = 0;
        lp.topMargin = 0;
        btn.setScaleType(ImageView.ScaleType.FIT_CENTER);
        btn.setLayoutParams(lp);

        modSizes.put(id, savedSizeDp);
        modOpacity.put(id, savedOpacity);
        btn.setAlpha(savedOpacity / 100f);
        btn.setX(0f);
        btn.setY(0f);

        modButtons.put(id, btn);

        btn.setOnTouchListener(new View.OnTouchListener() {
            float dX, dY;
            boolean moved;

            @Override
            public boolean onTouch(View view, MotionEvent event) {
                if (InbuiltModSizeStore.getInstance().isLocked(id)) return false;
                switch (event.getActionMasked()) {
                    case MotionEvent.ACTION_DOWN:
                        view.bringToFront();
                        dX = event.getRawX() - view.getX();
                        dY = event.getRawY() - view.getY();
                        moved = false;
                        return true;
                    case MotionEvent.ACTION_MOVE:
                        float newX = event.getRawX() - dX;
                        float newY = event.getRawY() - dY;
                        float left = 0f;
                        float top = 0f;
                        float right = container.getWidth() - view.getWidth();
                        float bottom = container.getHeight() - view.getHeight();
                        if (newX < left) newX = left;
                        if (newX > right) newX = right;
                        if (newY < top) newY = top;
                        if (newY > bottom) newY = bottom;
                        view.setX(newX);
                        view.setY(newY);
                        moved = true;
                        return true;
                    case MotionEvent.ACTION_UP:
                        if (moved) {
                            InbuiltModSizeStore store = InbuiltModSizeStore.getInstance();
                            store.setPositionX(id, view.getX());
                            store.setPositionY(id, view.getY());
                        }
                        return true;
                }
                return false;
            }
        });

        container.addView(btn);
    }

    public void applySize(String id, int sizeDp) {
        int clamped = clampSize(sizeDp);
        modSizes.put(id, clamped);
        ImageButton btn = modButtons.get(id);
        if (btn != null) {
            int px = dpToPx(clamped);
            FrameLayout.LayoutParams lp = (FrameLayout.LayoutParams) btn.getLayoutParams();
            lp.width = px;
            lp.height = px;
            btn.setLayoutParams(lp);
            btn.requestLayout();
        }
    }

    public void applyOpacity(String id, int opacity) {
        int clamped = clampOpacity(opacity);
        modOpacity.put(id, clamped);
        ImageButton btn = modButtons.get(id);
        if (btn != null) btn.setAlpha(clamped / 100f);
    }

    public void destroy() {
        for (ImageButton btn : modButtons.values()) {
            if (btn.getParent() != null) {
                ((ViewGroup) btn.getParent()).removeView(btn);
            }
        }
        modButtons.clear();
    }

    private int clampSize(int s) {
        return Math.max(MIN_SIZE_DP, Math.min(s, MAX_SIZE_DP));
    }

    private int clampOpacity(int o) {
        return Math.max(MIN_OPACITY, Math.min(o, MAX_OPACITY));
    }

    private int dpToPx(int dp) {
        return Math.round(dp * context.getResources().getDisplayMetrics().density);
    }
}