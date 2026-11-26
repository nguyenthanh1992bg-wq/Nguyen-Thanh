#!/bin/bash
# Cài agent trên Linux/macOS: bash setup.sh
set -e
cd "$(dirname "$0")"
for c in python3 node npm ffmpeg ffprobe; do command -v $c >/dev/null || { echo "THIẾU $c (Ubuntu: sudo apt install -y python3-venv ffmpeg nodejs npm)"; exit 1; }; done
python3 -m venv .venv
.venv/bin/pip install -q -r requirements.txt
(cd engine/edit-am-cam && npm ci --no-audit --no-fund)
mkdir -p secrets data engine/edit-am-cam/{work,done,public/jobs,assets/broll_lib}
[ -f .env ] || cp .env.example .env
echo "XONG. Điền .env, rồi:  .venv/bin/python -m agent.auth_drive  ->  .venv/bin/python -m agent.main check  ->  ./run.sh"
