#!/usr/bin/env python3
import os
import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


def main() -> None:
    root = sys.argv[1] if len(sys.argv) > 1 else os.getcwd()
    port = int(sys.argv[2]) if len(sys.argv) > 2 else 9090
    bind = sys.argv[3] if len(sys.argv) > 3 else "127.0.0.1"

    os.chdir(root)

    class QuietHandler(SimpleHTTPRequestHandler):
        def log_message(self, format, *args):
            return

    handler = partial(QuietHandler, directory=root)
    httpd = ThreadingHTTPServer((bind, port), handler)
    print(f"Serving {root} on http://{bind}:{port}", flush=True)
    httpd.serve_forever()


if __name__ == "__main__":
    main()
