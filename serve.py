#!/usr/bin/env python3
"""Helyi kiszolgáló a gyakorló oldalakhoz.

Az index.html iframe-eket használ, és a böngésző file:// alatt nem engedi
az iframe-ek közti kommunikációt, ezért teszteléshez http kell:

    ./serve.py             # http://localhost:8000/ , böngésző megnyitása
    ./serve.py 9000        # más port
    ./serve.py --no-open   # ne nyissa meg a böngészőt

Csak fejlesztéshez/teszteléshez! Az egyszerű beépített kiszolgáló nem
alkalmas éles használatra.
"""

import argparse
import http.server
import os
import socketserver
import sys
import threading
import webbrowser

DEFAULT_PORT = 8000


class Handler(http.server.SimpleHTTPRequestHandler):
    """Gyorsítótár nélkül szolgál ki, hogy a szerkesztés azonnal látszódjon."""

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        super().end_headers()

    def log_message(self, fmt, *args):
        sys.stderr.write("%s - %s\n" % (self.address_string(), fmt % args))


def main():
    parser = argparse.ArgumentParser(description="Gyakorló helyi kiszolgáló")
    parser.add_argument("port", nargs="?", type=int, default=DEFAULT_PORT,
                        help=f"port (alapértelmezés: {DEFAULT_PORT})")
    parser.add_argument("--no-open", action="store_true",
                        help="ne nyissa meg a böngészőt")
    args = parser.parse_args()

    # A szkript könyvtára a kiszolgálás gyökere, bárhonnan indítható.
    root = os.path.dirname(os.path.abspath(__file__))
    os.chdir(root)

    socketserver.TCPServer.allow_reuse_address = True
    try:
        # Csak a saját gépről érhető el.
        httpd = socketserver.TCPServer(("127.0.0.1", args.port), Handler)
    except OSError as err:
        print(f"Nem sikerult a {args.port} port megnyitasa: {err}", file=sys.stderr)
        return 1

    url = f"http://localhost:{args.port}/index.html"
    print(f"Gyokér:  {root}")
    print(f"Cím:     {url}")
    print("Leállítás: Ctrl+C")

    if not args.no_open:
        threading.Timer(0.5, lambda: webbrowser.open(url)).start()

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nLeállítva.")
    finally:
        httpd.server_close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
