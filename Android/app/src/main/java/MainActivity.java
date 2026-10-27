package com.aminethejurk.cornthiefmaze;

import android.app.Activity;
import android.graphics.Color;
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

import java.io.IOException;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

public class MainActivity extends Activity {
    private WebView webView;
    private View controlsContainer;
    private boolean controlsVisible = true;
    private final Map<String, Boolean> activeKeys = new HashMap<>();
    private final Set<String> pressedDirectionalKeys = new HashSet<>();
    private int slotIndex = 0;
    private final Handler mainHandler = new Handler(Looper.getMainLooper());

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

        String servedUrl = "http://localhost:9090/index.html";
        String fallbackUrl = "file:///android_asset/www/index.html";
        if (canReachUrl(servedUrl)) {
            webView.loadUrl(servedUrl);
        } else {
            webView.loadUrl(fallbackUrl);
        }

        rootLayout.addView(webView);

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
    }

    private View buildControlsOverlay() {
        FrameLayout container = new FrameLayout(this);
        RelativeLayout.LayoutParams params = new RelativeLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
        );
        container.setLayoutParams(params);

        Button toggleButton = new Button(this);
        toggleButton.setText("Hide Controls");
        toggleButton.setTextColor(Color.WHITE);
        toggleButton.setBackgroundColor(0xFF1E1E1E);
        toggleButton.setAlpha(0.9f);
        FrameLayout.LayoutParams toggleParams = new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
        );
        toggleParams.leftMargin = 24;
        toggleParams.topMargin = 28;
        toggleButton.setLayoutParams(toggleParams);
        toggleButton.setOnClickListener(v -> {
            controlsVisible = !controlsVisible;
            controlsContainer.setVisibility(controlsVisible ? View.VISIBLE : View.GONE);
            toggleButton.setText(controlsVisible ? "Hide Controls" : "Show Controls");
        });
        container.addView(toggleButton);

        JoystickView joystickView = new JoystickView(this, (x, y) -> {
            applyDirectionalInputs(x, y);
        });
        FrameLayout.LayoutParams joystickParams = new FrameLayout.LayoutParams(
                210,
                210
        );
        joystickParams.leftMargin = 28;
        joystickParams.bottomMargin = 26;
        joystickParams.gravity = Gravity.BOTTOM | Gravity.LEFT;
        joystickView.setLayoutParams(joystickParams);
        container.addView(joystickView);

        LinearLayout rightColumn = new LinearLayout(this);
        rightColumn.setOrientation(LinearLayout.VERTICAL);
        rightColumn.setGravity(Gravity.CENTER);
        FrameLayout.LayoutParams rightParams = new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
        );
        rightParams.gravity = Gravity.RIGHT | Gravity.BOTTOM;
        rightParams.rightMargin = 26;
        rightParams.bottomMargin = 26;
        rightColumn.setLayoutParams(rightParams);

        Button runButton = makeActionButton("Run", "Shift", "ShiftLeft", true, 80);
        Button ventButton = makeActionButton("Vent", "V", "KeyV", false, 80);
        Button slotButton = makeActionButton("Slot", "1", "Digit1", false, 80);
        slotButton.setOnClickListener(v -> {
            slotIndex = (slotIndex + 1) % 5;
            int slotNumber = slotIndex + 1;
            triggerKeyPress(String.valueOf(slotNumber), "Digit" + slotNumber, false);
            slotButton.setText("Slot (" + slotNumber + ")");
        });

        Button useButton = makeActionButton("Use", "E", "KeyE", false, 80);
        Button mapButton = makeActionButton("Map", "M", "KeyM", false, 80);
        Button diveButton = makeActionButton("Dive", "K", "KeyK", false, 80);
        Button pButton = makeActionButton("P", "P", "KeyP", false, 80);

        rightColumn.addView(runButton);
        rightColumn.addView(ventButton);
        rightColumn.addView(slotButton);
        rightColumn.addView(useButton);
        rightColumn.addView(mapButton);
        rightColumn.addView(diveButton);
        rightColumn.addView(pButton);
        container.addView(rightColumn);

        return container;
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
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
        );
        params.setMargins(0, 8, 0, 8);
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

    private void applyDirectionalInputs(float x, float y) {
        boolean w = y < -0.25f;
        boolean s = y > 0.25f;
        boolean a = x < -0.25f;
        boolean d = x > 0.25f;

        updateDirectionalKey("W", "KeyW", w);
        updateDirectionalKey("S", "KeyS", s);
        updateDirectionalKey("A", "KeyA", a);
        updateDirectionalKey("D", "KeyD", d);
    }

    private void updateDirectionalKey(String key, String code, boolean shouldBePressed) {
        String mapKey = key + "|" + code;
        if (shouldBePressed) {
            if (!pressedDirectionalKeys.contains(mapKey)) {
                pressedDirectionalKeys.add(mapKey);
                triggerKeyEvent(key, code, false, true);
            }
        } else {
            if (pressedDirectionalKeys.contains(mapKey)) {
                pressedDirectionalKeys.remove(mapKey);
                triggerKeyEvent(key, code, false, false);
            }
        }
    }

    private boolean canReachUrl(String urlString) {
        try {
            URL url = new URL(urlString);
            HttpURLConnection connection = (HttpURLConnection) url.openConnection();
            connection.setConnectTimeout(250);
            connection.setReadTimeout(250);
            connection.setRequestMethod("HEAD");
            connection.connect();
            int responseCode = connection.getResponseCode();
            return responseCode >= 200 && responseCode < 500;
        } catch (IOException e) {
            return false;
        }
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

    private interface JoystickListener {
        void onMove(float x, float y);
    }

    private static class JoystickView extends View {
        private final JoystickListener listener;
        private float knobX = 0f;
        private float knobY = 0f;
        private float centerX;
        private float centerY;
        private float radius = 72f;
        private boolean active = false;

        public JoystickView(Activity activity, JoystickListener listener) {
            super(activity);
            this.listener = listener;
            setBackgroundColor(Color.argb(0, 0, 0, 0));
        }

        @Override
        protected void onDraw(android.graphics.Canvas canvas) {
            super.onDraw(canvas);
            int w = getWidth();
            int h = getHeight();
            centerX = w / 2f;
            centerY = h / 2f;
            radius = Math.min(w, h) * 0.38f;

            android.graphics.Paint basePaint = new android.graphics.Paint();
            basePaint.setColor(0xAA333333);
            basePaint.setStyle(android.graphics.Paint.Style.FILL);
            canvas.drawCircle(centerX, centerY, radius, basePaint);

            android.graphics.Paint knobPaint = new android.graphics.Paint();
            knobPaint.setColor(0xFF66A3FF);
            knobPaint.setStyle(android.graphics.Paint.Style.FILL);

            float knobRadius = radius * 0.42f;
            float drawX = centerX + knobX * radius;
            float drawY = centerY + knobY * radius;
            canvas.drawCircle(drawX, drawY, knobRadius, knobPaint);
        }

        @Override
        public boolean onTouchEvent(MotionEvent event) {
            float dx = event.getX() - getWidth() / 2f;
            float dy = event.getY() - getHeight() / 2f;
            float distance = (float) Math.sqrt(dx * dx + dy * dy);

            if (event.getActionMasked() == MotionEvent.ACTION_DOWN) {
                active = true;
            } else if (event.getActionMasked() == MotionEvent.ACTION_UP || event.getActionMasked() == MotionEvent.ACTION_CANCEL) {
                active = false;
                knobX = 0f;
                knobY = 0f;
                if (listener != null) {
                    listener.onMove(0f, 0f);
                }
                invalidate();
                return true;
            }

            float maxDistance = radius;
            if (distance > maxDistance) {
                float scale = maxDistance / distance;
                dx *= scale;
                dy *= scale;
            }

            knobX = dx / maxDistance;
            knobY = dy / maxDistance;
            if (listener != null) {
                listener.onMove(knobX, knobY);
            }
            invalidate();
            return true;
        }
    }
}
