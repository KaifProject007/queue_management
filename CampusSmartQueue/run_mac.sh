#!/usr/bin/env bash
# Campus SmartQueue 2.0 - One-Click Setup & Launch for macOS Terminal

cd "$(dirname "$0")"

echo "================================================================="
echo "      CAMPUS SMARTQUEUE 2.0 - macOS Terminal Setup & Launch"
echo "================================================================="
echo ""

# 1. Check Python 3
if ! command -v python3 &> /dev/null; then
    echo "[ERROR] Python 3 is not installed!"
    echo "Please install Python from https://www.python.org/ or run: brew install python"
    exit 1
fi

echo "[Step 1/2] Installing all dependencies from requirements.txt without virtualenv..."
# Use pip3 with --break-system-packages fallback for macOS PEP 668
pip3 install -r requirements.txt || pip3 install -r requirements.txt --break-system-packages

echo ""
echo "[Step 2/2] Starting Campus SmartQueue 2.0 on http://127.0.0.1:8000 ..."
echo "Press Ctrl+C to stop the server."
echo ""

python3 run.py
