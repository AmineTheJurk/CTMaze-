"""
Corn Thief Maze - BeeWare (Briefcase + Toga) version.

Same idea as game.py (pywebview), but for Android: a local HTTP server
serves the bundled game folder, and a native WebView shows it full screen.
"""
import functools
import http.server
import os
import threading

import toga
from toga.style import Pack
from toga.style.pack import COLUMN

PORT = 9090
GAME_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "www")


def start_server():
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=GAME_DIR)
    server = http.server.ThreadingHTTPServer(("127.0.0.1", PORT), handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server


class CornThiefMaze(toga.App):
    def startup(self):
        self.server = start_server()
        self.webview = toga.WebView(
            url=f"http://127.0.0.1:{PORT}/index.html",
            style=Pack(flex=1),
        )
        self.main_window = toga.MainWindow(title=self.formal_name)
        self.main_window.content = toga.Box(children=[self.webview], style=Pack(direction=COLUMN, flex=1))
        self.main_window.show()

    def on_exit(self):
        self.server.shutdown()
        return True


def main():
    return CornThiefMaze("Corn Thief Maze", "com.cornthief")
