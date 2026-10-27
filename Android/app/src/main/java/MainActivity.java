package com.aminethejurk.cornthiefmaze;

import android.app.Activity;
import android.graphics.Color;
import android.graphics.PointF;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.RelativeLayout;

public class MainActivity extends Activity {
    private WebView webView;
    private View controlsContainer;
    private View toggleButtonContainer;
    private LocalAssetServer localAssetServer;
    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    private final PointF joystickCenter = new PointF();
    private final PointF joystickThumb = new PointF();
    private boolean joystickActive = false;
    private boolean upPressed = false;
    private boolean downPressed = false;
    private boolean leftPressed = false;
    private boolean rightPressed = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        RelativeLayout rootLayout = new RelativeLayout(this);
        rootLayout.setBackgroundColor(Color.BLACK);

        webView = new WebView(this);
        RelativeLayout.LayoutParams webParams = new RelativeLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
        );
        webView.setLayoutParams(webParams);
        webView.setBackgroundColor(Color.BLACK);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setDomStorageEnabled(true);
        settings.setBuiltInZoomControls(false);
        settings.setSupportZoom(false);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setAllowUniversalAccessFromFileURLs(true);
        settings.setAllowFileAccessFromFileURLs(true);

        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.LOLLIPOP) {
            settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        }

        webView.setWebChromeClient(new WebChromeClient());
        webView.setWebViewClient(new WebViewClient());

        rootLayout.addView(webView);

        toggleButtonContainer = buildToggleButton();
        rootLayout.addView(toggleButtonContainer);

        controlsContainer = buildControlsOverlay();
        rootLayout.addView(controlsContainer);

        webView.setOnTouchListener((view, event) -> {
            switch (event.getActionMasked()) {
                case MotionEvent.ACTION_DOWN:
                    sendMouseEvent(event.getX(), event.getY(), true, false);
                    return false;
                case MotionEvent.ACTION_MOVE:
                    sendMouseEvent(event.getX(), event.getY(), false, true);
                    return false;
                case MotionEvent.ACTION_UP:
                case MotionEvent.ACTION_CANCEL:
                    sendMouseEvent(event.getX(), event.getY(), false, false);
                    return false;
                default:
                    return false;
            }
        });

        setContentView(rootLayout);

        startLocalGameServer();
    }

    private void startLocalGameServer() {
        localAssetServer = new LocalAssetServer(getAssets(), "www");
        int port = localAssetServer.start();
        webView.loadUrl("http://127.0.0.1:" + port + "/index.html");
    }

    private View buildToggleButton() {
        FrameLayout container = new FrameLayout(this);
        RelativeLayout.LayoutParams params = new RelativeLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
        );
        params.leftMargin = 24;
        params.topMargin = 24;
        container.setLayoutParams(params);

        Button toggleButton = new Button(this);
        toggleButton.setText("Hide Buttons");
        toggleButton.setTextColor(Color.WHITE);
        toggleButton.setBackgroundColor(0xFF1E1E1E);
        toggleButton.setAlpha(0.95f);
        FrameLayout.LayoutParams toggleParams = new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
        );
        toggleButton.setLayoutParams(toggleParams);
        toggleButton.setOnClickListener(v -> {
            boolean visible = controlsContainer.getVisibility() == View.VISIBLE;
            controlsContainer.setVisibility(visible ? View.GONE : View.VISIBLE);
            toggleButton.setText(visible ? "Re-Appear Buttons" : "Hide Buttons");
        });
        container.addView(toggleButton);
        return container;
    }

    private View buildControlsOverlay() {
        FrameLayout container = new FrameLayout(this);
        RelativeLayout.LayoutParams params = new RelativeLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
        );
        container.setLayoutParams(params);

        LinearLayout actionPanel = new LinearLayout(this);
        actionPanel.setOrientation(LinearLayout.VERTICAL);
        FrameLayout.LayoutParams actionParams = new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
        );
        actionParams.gravity = Gravity.RIGHT | Gravity.BOTTOM;
        actionParams.rightMargin = 26;
        actionParams.bottomMargin = 26;
        actionPanel.setLayoutParams(actionParams);

        LinearLayout row1 = new LinearLayout(this);
        row1.setOrientation(LinearLayout.HORIZONTAL);
        row1.addView(makeActionButton("Run", "Shift", "ShiftLeft", true, 110));
        row1.addView(makeActionButton("Vent", "V", "KeyV", false, 110));
        row1.addView(makeActionButton("Slot", "1", "Digit1", false, 110));
        row1.addView(makeActionButton("Use", "E", "KeyE", false, 110));

        LinearLayout row2 = new LinearLayout(this);
        row2.setOrientation(LinearLayout.HORIZONTAL);
        row2.addView(makeActionButton("Map", "M", "KeyM", false, 110));
        row2.addView(makeActionButton("Dive", "K", "KeyK", false, 110));
        row2.addView(makeActionButton("P", "P", "KeyP", false, 110));

        actionPanel.addView(row1);
        actionPanel.addView(row2);
        container.addView(actionPanel);

        FrameLayout joystickContainer = buildJoystick();
        FrameLayout.LayoutParams joystickParams = new FrameLayout.LayoutParams(
                180,
                180
        );
        joystickParams.gravity = Gravity.LEFT | Gravity.BOTTOM;
        joystickParams.leftMargin = 30;
        joystickParams.bottomMargin = 24;
        joystickContainer.setLayoutParams(joystickParams);
        container.addView(joystickContainer);

        return container;
    }

    private FrameLayout buildJoystick() {
        FrameLayout base = new FrameLayout(this);
        base.setBackgroundColor(Color.argb(120, 40, 40, 40));
        base.setClipToOutline(true);

        FrameLayout.LayoutParams baseParams = new FrameLayout.LayoutParams(
                180,
                180
        );
        base.setLayoutParams(baseParams);
        base.setOnTouchListener((view, event) -> {
            switch (event.getActionMasked()) {
                case MotionEvent.ACTION_DOWN:
                case MotionEvent.ACTION_MOVE: {
                    float centerX = view.getWidth() / 2f;
                    float centerY = view.getHeight() / 2f;
                    float dx = event.getX() - centerX;
                    float dy = event.getY() - centerY;
                    float distance = (float) Math.sqrt(dx * dx + dy * dy);
                    float maxDistance = view.getWidth() * 0.32f;

                    if (distance > maxDistance) {
                        float scale = maxDistance / distance;
                        dx *= scale;
                        dy *= scale;
                    }

                    joystickCenter.set(centerX, centerY);
                    joystickThumb.set(centerX + dx, centerY + dy);
                    updateJoystickState(dx, dy, true);
                    return true;
                }
                case MotionEvent.ACTION_UP:
                case MotionEvent.ACTION_CANCEL:
                    joystickThumb.set(view.getWidth() / 2f, view.getHeight() / 2f);
                    updateJoystickState(0f, 0f, false);
                    return true;
                default:
                    return false;
            }
        });

        View ring = new View(this);
        ring.setBackgroundColor(Color.argb(170, 70, 70, 70));
        FrameLayout.LayoutParams ringParams = new FrameLayout.LayoutParams(
                140,
                140,
                Gravity.CENTER
        );
        ring.setLayoutParams(ringParams);
        ring.setBackgroundResource(android.R.drawable.presence_invisible);
        ring.setAlpha(0.85f);
        base.addView(ring);

        View thumb = new View(this);
        thumb.setBackgroundColor(Color.argb(220, 255, 255, 255));
        FrameLayout.LayoutParams thumbParams = new FrameLayout.LayoutParams(
                52,
                52,
                Gravity.CENTER
        );
        thumb.setLayoutParams(thumbParams);
        base.addView(thumb);

        base.setTag(thumb);
        return base;
    }

    private void updateJoystickState(float dx, float dy, boolean active) {
        boolean newUp = dy < -16;
        boolean newDown = dy > 16;
        boolean newLeft = dx < -16;
        boolean newRight = dx > 16;

        if (!active) {
            newUp = false;
            newDown = false;
            newLeft = false;
            newRight = false;
        }

        setDirectionalKey("ArrowUp", newUp, upPressed);
        setDirectionalKey("ArrowDown", newDown, downPressed);
        setDirectionalKey("ArrowLeft", newLeft, leftPressed);
        setDirectionalKey("ArrowRight", newRight, rightPressed);

        upPressed = newUp;
        downPressed = newDown;
        leftPressed = newLeft;
        rightPressed = newRight;
    }

    private void setDirectionalKey(String key, boolean pressed, boolean wasPressed) {
        if (pressed == wasPressed) return;
        triggerKeyEvent(key, key, false, pressed);
    }

    private Button makeActionButton(String text, final String keyName, final String codeName,
                                   final boolean shiftKey, int width) {
        Button button = new Button(this);
        button.setText(text);
        button.setTextColor(Color.WHITE);
        button.setBackgroundColor(0xFF2B2B2B);
        button.setMinWidth(width);
        button.setMinHeight(64);
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(
                0,
                ViewGroup.LayoutParams.WRAP_CONTENT,
                1f
        );
        params.setMargins(8, 8, 8, 8);
        button.setLayoutParams(params);
        button.setOnClickListener(v -> triggerKeyPress(keyName, codeName, shiftKey));
        return button;
    }

    private void triggerKeyPress(String key, String code, boolean shift) {
        triggerKeyEvent(key, code, shift, true);
        mainHandler.postDelayed(() -> triggerKeyEvent(key, code, shift, false), 90);
    }

    private void triggerKeyEvent(String key, String code, boolean shift, boolean down) {
        String eventType = down ? "keydown" : "keyup";
        String js = "(function(){try{var e = new KeyboardEvent('" + eventType + "', {key: '" + key
                + "', code: '" + code + "', bubbles: true, cancelable: true, shiftKey: " + shift + "});"
                + "document.dispatchEvent(e);}catch(err){}})();";
        webView.loadUrl("javascript:" + js);
    }

    private void sendMouseEvent(float x, float y, boolean down, boolean move) {
        String eventType = "mousemove";
        if (down) {
            eventType = "mousedown";
        } else if (!move) {
            eventType = "mouseup";
        }

        String js = "(function(){try{var evt = new MouseEvent('" + eventType + "', {"
                + "bubbles: true, cancelable: true, clientX: " + Math.round(x) + ", clientY: " + Math.round(y) + ", button: 0});"
                + "document.dispatchEvent(evt);" + "}catch(err){}})();";
        webView.loadUrl("javascript:" + js);
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        if (localAssetServer != null) {
            localAssetServer.stop();
        }
    }
}
