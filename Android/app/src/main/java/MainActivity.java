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

import com.chaquo.python.Python;
import com.chaquo.python.android.AndroidPlatform;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;

public class MainActivity extends Activity {
    private WebView webView;
    private View controlsContainer;
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

        copyAssetsToFilesDir("www");
        copyAssetsToFilesDir("python");
        startPythonServer();
        webView.loadUrl("http://localhost:9090/index.html");
    }

    private void copyAssetsToFilesDir(String relativePath) {
        File targetDir = new File(getFilesDir(), relativePath);
        if (targetDir.exists()) {
            return;
        }

        try {
            String[] entries = getAssets().list(relativePath);
            if (entries == null || entries.length == 0) {
                return;
            }

            targetDir.mkdirs();
            for (String entry : entries) {
                String src = relativePath + "/" + entry;
                String[] nested = getAssets().list(src);
                if (nested != null && nested.length > 0) {
                    copyAssetsToFilesDir(src);
                } else {
                    InputStream in = getAssets().open(src);
                    File outFile = new File(getFilesDir(), src);
                    File parent = outFile.getParentFile();
                    if (parent != null) {
                        parent.mkdirs();
                    }

                    OutputStream out = new FileOutputStream(outFile);
                    byte[] buffer = new byte[4096];
                    int read;
                    while ((read = in.read(buffer)) != -1) {
                        out.write(buffer, 0, read);
                    }
                    in.close();
                    out.close();
                }
            }
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    private void startPythonServer() {
        File gameDir = new File(getFilesDir(), "www");
        File scriptPath = new File(getFilesDir(), "python/serve_local.py");

        if (!Python.isStarted()) {
            Python.start(new AndroidPlatform(this));
        }

        Python python = Python.getInstance();
        python.getModule("os").callAttr(
                "system",
                "python " + scriptPath.getAbsolutePath() + " " + gameDir.getAbsolutePath() + " 9090 >/dev/null 2>&1 &"
        );
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
            controlsContainer.setVisibility(controlsContainer.getVisibility() == View.VISIBLE ? View.GONE : View.VISIBLE);
            toggleButton.setText(controlsContainer.getVisibility() == View.VISIBLE ? "Hide Controls" : "Show Controls");
        });
        container.addView(toggleButton);

        LinearLayout rightPanel = new LinearLayout(this);
        rightPanel.setOrientation(LinearLayout.VERTICAL);
        FrameLayout.LayoutParams rightParams = new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
        );
        rightParams.gravity = Gravity.RIGHT | Gravity.BOTTOM;
        rightParams.rightMargin = 26;
        rightParams.bottomMargin = 26;
        rightPanel.setLayoutParams(rightParams);

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

        rightPanel.addView(row1);
        rightPanel.addView(row2);
        container.addView(rightPanel);

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
}
