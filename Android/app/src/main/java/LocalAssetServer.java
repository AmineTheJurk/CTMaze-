package com.aminethejurk.cornthiefmaze;

import android.content.res.AssetManager;
import android.util.Log;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetAddress;
import java.net.ServerSocket;
import java.net.Socket;
import java.util.HashMap;
import java.util.Map;

public class LocalAssetServer {
    private static final String TAG = "LocalAssetServer";
    private final AssetManager assetManager;
    private final String baseDir;
    private ServerSocket serverSocket;
    private Thread serverThread;
    private int port = 0;
    private volatile boolean isRunning = false;

    private static final Map<String, String> MIME_TYPES = new HashMap<>();
    static {
        MIME_TYPES.put("html", "text/html; charset=UTF-8");
        MIME_TYPES.put("htm", "text/html; charset=UTF-8");
        MIME_TYPES.put("js", "application/javascript; charset=UTF-8");
        MIME_TYPES.put("css", "text/css; charset=UTF-8");
        MIME_TYPES.put("json", "application/json; charset=UTF-8");
        MIME_TYPES.put("png", "image/png");
        MIME_TYPES.put("jpg", "image/jpeg");
        MIME_TYPES.put("jpeg", "image/jpeg");
        MIME_TYPES.put("gif", "image/gif");
        MIME_TYPES.put("svg", "image/svg+xml");
        MIME_TYPES.put("mp3", "audio/mpeg");
        MIME_TYPES.put("wav", "audio/wav");
        MIME_TYPES.put("ogg", "audio/ogg");
        MIME_TYPES.put("woff2", "font/woff2");
        MIME_TYPES.put("woff", "font/woff");
        MIME_TYPES.put("ttf", "font/ttf");
    }

    public LocalAssetServer(AssetManager assetManager, String baseDir) {
        this.assetManager = assetManager;
        this.baseDir = baseDir.endsWith("/") ? baseDir : baseDir + "/";
    }

    public synchronized int start() {
        if (isRunning) return port;

        try {
            serverSocket = new ServerSocket(0, 50, InetAddress.getByName("127.0.0.1"));
            port = serverSocket.getLocalPort();
            isRunning = true;

            serverThread = new Thread(() -> {
                while (isRunning && !serverSocket.isClosed()) {
                    try {
                        Socket socket = serverSocket.accept();
                        new Thread(() -> handleConnection(socket)).start();
                    } catch (IOException e) {
                        if (isRunning) {
                            Log.e(TAG, "Server socket accept error", e);
                        }
                    }
                }
            }, "CornThief-LocalServer");
            serverThread.setDaemon(true);
            serverThread.start();

            Log.i(TAG, "Local asset server started on http://127.0.0.1:" + port);
            return port;
        } catch (IOException e) {
            Log.e(TAG, "Failed to start local asset server", e);
            return -1;
        }
    }

    public synchronized void stop() {
        isRunning = false;
        try {
            if (serverSocket != null && !serverSocket.isClosed()) {
                serverSocket.close();
            }
        } catch (IOException e) {
            Log.e(TAG, "Error closing server socket", e);
        }
    }

    public int getPort() {
        return port;
    }

    private void handleConnection(Socket socket) {
        try (InputStream in = socket.getInputStream();
             OutputStream out = socket.getOutputStream()) {

            byte[] buffer = new byte[2048];
            int read = in.read(buffer);
            if (read <= 0) return;

            String request = new String(buffer, 0, read);
            String[] lines = request.split("\r\n");
            if (lines.length == 0) return;

            String[] requestParts = lines[0].split(" ");
            if (requestParts.length < 2) return;

            String path = requestParts[1];
            if (path.contains("?")) {
                path = path.substring(0, path.indexOf("?"));
            }
            if (path.equals("/") || path.isEmpty()) {
                path = "/index.html";
            }
            if (path.startsWith("/")) {
                path = path.substring(1);
            }

            String assetPath = baseDir + path;
            byte[] fileBytes = loadAssetBytes(assetPath);

            if (fileBytes != null) {
                String ext = getFileExtension(path);
                String mime = MIME_TYPES.getOrDefault(ext, "application/octet-stream");

                String headers = "HTTP/1.1 200 OK\r\n" +
                        "Content-Type: " + mime + "\r\n" +
                        "Content-Length: " + fileBytes.length + "\r\n" +
                        "Access-Control-Allow-Origin: *\r\n" +
                        "Cache-Control: no-cache\r\n" +
                        "Connection: close\r\n\r\n";

                out.write(headers.getBytes("UTF-8"));
                out.write(fileBytes);
            } else {
                String notFound = "HTTP/1.1 404 Not Found\r\n" +
                        "Content-Length: 9\r\n" +
                        "Connection: close\r\n\r\n" +
                        "Not Found";
                out.write(notFound.getBytes("UTF-8"));
            }
            out.flush();
        } catch (Exception e) {
            Log.d(TAG, "Connection handling error: " + e.getMessage());
        } finally {
            try {
                socket.close();
            } catch (IOException ignored) {
            }
        }
    }

    private byte[] loadAssetBytes(String assetPath) {
        try (InputStream is = assetManager.open(assetPath);
             ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            byte[] buf = new byte[8192];
            int len;
            while ((len = is.read(buf)) != -1) {
                baos.write(buf, 0, len);
            }
            return baos.toByteArray();
        } catch (IOException e) {
            return null;
        }
    }

    private String getFileExtension(String fileName) {
        int idx = fileName.lastIndexOf('.');
        return (idx > 0 && idx < fileName.length() - 1) ? fileName.substring(idx + 1).toLowerCase() : "";
    }
}
