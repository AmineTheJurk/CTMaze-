#!/usr/bin/env python3
import http.server
import socketserver
import threading
from pathlib import Path

import webview

PORT = 9090
ROOT = Path(__file__).resolve().parent
CANDIDATES = [
    ROOT,
    ROOT / "Android" / "app" / "src" / "main" / "assets" / "www",
    ROOT / "app" / "src" / "main" / "assets" / "www",
]
WEB_ROOT = next((p for p in CANDIDATES if (p / "index.html").exists()), ROOT)


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(WEB_ROOT), **kwargs)

    def log_message(self, format, *args):
        pass


def start_server():
    httpd = socketserver.ThreadingTCPServer(("127.0.0.1", PORT), QuietHandler)
    thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    thread.start()
    return httpd


if __name__ == "__main__":
    server = start_server()
    webview.create_window("CTMaze", f"http://127.0.0.1:{PORT}/")
    try:
        webview.start()
    finally:
        server.shutdown()
        server.server_close()
