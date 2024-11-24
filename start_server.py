#!/usr/bin/env python3

import http.server
from http.server import HTTPServer

## Using this script as alternative to  -- python3 -m http.server 5500
## Running the server with this code disables the cache, for more convinient reloading after updates, else the JS will be cached by the browser.


class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_my_headers()
        http.server.SimpleHTTPRequestHandler.end_headers(self)

    def send_my_headers(self):
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")


def run(server_class=HTTPServer, handler_class=MyHTTPRequestHandler):
    server_address = ("", 5500)
    print(
        f"Launching HTTP Server for current directory at {server_address[0]}:{server_address[1]}"
    )
    httpd = server_class(server_address, handler_class)
    httpd.serve_forever()


if __name__ == "__main__":
    run()
