#!/usr/bin/env bash
# 事务中心 · 本地服务（Termux / Linux / macOS）
# 用法：bash serve.sh       或    PORT=9000 bash serve.sh
cd "$(dirname "$0")" || exit 1

if command -v python3 >/dev/null 2>&1; then
  exec python3 serve.py
elif command -v python >/dev/null 2>&1; then
  exec python serve.py
else
  echo "没找到 python3。"
  echo "Termux 里先执行：pkg install python"
  exit 1
fi
