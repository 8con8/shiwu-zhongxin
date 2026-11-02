#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
事务中心 · 本地 HTTP 服务
--------------------------------------------------
用法：
  Windows   双击「启动服务.bat」
  命令行     python serve.py
  指定端口   PORT=9000 python serve.py

作用：把当前目录当成网站根目录起一个 HTTP 服务，
      本机可以用 127.0.0.1 访问，同一个 WiFi 下的手机/电脑
      也能用 192.168.x.x 这种局域网地址访问。
"""
import os
import sys
import socket
import threading
import webbrowser
import http.server
import socketserver

PORT = int(os.environ.get("PORT", "8080"))
ROOT = os.path.dirname(os.path.abspath(__file__))


def lan_ips():
    """拿到本机的局域网 IP，方便手机/其它设备访问"""
    ips = []
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.settimeout(0.6)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        if ip and not ip.startswith("127."):
            ips.append(ip)
    except Exception:
        pass
    try:
        for info in socket.getaddrinfo(socket.gethostname(), None):
            ip = info[4][0]
            if ip.startswith(("192.168.", "10.", "172.")) and ip not in ips:
                ips.append(ip)
    except Exception:
        pass
    return ips


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=ROOT, **kw)

    def end_headers(self):
        # 关掉缓存，改完文件刷新就生效
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate")
        self.send_header("Pragma", "no-cache")
        super().end_headers()

    def log_message(self, fmt, *args):
        # 安静模式，只打印错误
        pass


class Server(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = True


def main():
    # 保证输出即时刷新（重定向到文件时 Python 默认会缓冲）
    try:
        sys.stdout.reconfigure(line_buffering=True)
    except Exception:
        pass

    print("=" * 50)
    print("  事务中心 · 本地服务已启动")
    print("=" * 50)
    print("  本机访问   http://127.0.0.1:%d" % PORT)
    for ip in lan_ips():
        print("  同 WiFi    http://%s:%d" % (ip, PORT))
    print("-" * 50)
    print("  关闭窗口 或 按 Ctrl+C 停止")
    print()

    # 自动开浏览器（Termux 之类没有浏览器会静默失败，不影响服务）
    threading.Timer(0.8, lambda: _open(PORT)).start()

    try:
        with Server(("0.0.0.0", PORT), Handler) as httpd:
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n已停止")
    except OSError as e:
        print("启动失败：%s" % e)
        print("端口 %d 可能被占用，换一个：" % PORT)
        print("  PORT=9000 python serve.py")
        sys.exit(1)


def _open(port):
    try:
        webbrowser.open("http://127.0.0.1:%d/" % port)
    except Exception:
        pass


if __name__ == "__main__":
    main()
