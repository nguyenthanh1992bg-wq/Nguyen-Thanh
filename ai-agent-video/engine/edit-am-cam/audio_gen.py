#!/usr/bin/env python3
"""Tổng hợp nhạc nền + SFX "Ấm Cam" — chép CẤU TRÚC giải mã từ video mẫu, không chép bản ghi.

Nhạc mẫu (tách bằng demucs 26/11/2026): deep house / lo-fi house 129 BPM, giọng E thứ (chroma D#-E-G),
  đoạn 1 INTRO  : pad + pluck + hi-hat, KHÔNG kick, không sub (sáng, centroid ~2,2 kHz)
  đoạn 2 DROP   : kick 4/4 + sub offbeat + clap + pluck (giây ~30 của mẫu)
  đoạn 3 BREAK  : gần im, chỉ pad lọc trầm (trùng cảnh số chốt "100%")
  đoạn 4 DROP   : vào lại tới hết, có riser + impact trước mỗi lần vào
SFX mẫu: tiếng "ding" dịu ~680 Hz có hoạ âm 2-3-4, ngân ~0,5 s; whoosh nhiễu ở chuyển cảnh.

  python3 audio_gen.py music <out.wav> <duration> --drops 5.2,14.1 --breaks 11.6-13.5 [--bpm 129]
  python3 audio_gen.py sfx <thu_muc>
"""
import sys
import numpy as np
from scipy import signal
from scipy.io import wavfile

SR = 44100
rng = np.random.default_rng(7)


def midi(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def env_ad(n, a, d):
    t = np.arange(n) / SR
    e = np.exp(-t / d)
    na = max(1, int(a * SR))
    e[:na] *= np.linspace(0, 1, na)
    return e


def lp(x, fc, order=2):
    sos = signal.butter(order, min(fc, SR / 2 - 100) / (SR / 2), "low", output="sos")
    return signal.sosfilt(sos, x)


def hp(x, fc, order=2):
    sos = signal.butter(order, fc / (SR / 2), "high", output="sos")
    return signal.sosfilt(sos, x)


def bp(x, lo, hi):
    sos = signal.butter(2, [lo / (SR / 2), hi / (SR / 2)], "band", output="sos")
    return signal.sosfilt(sos, x)


def add(buf, x, t):
    i = int(round(t * SR))
    if i >= len(buf) or i + len(x) <= 0:
        return
    if i < 0:
        x, i = x[-i:], 0
    j = min(len(buf), i + len(x))
    buf[i:j] += x[: j - i]


# ---------------- nhạc cụ ----------------
def kick():
    n = int(0.42 * SR)
    t = np.arange(n) / SR
    f = 48 + 110 * np.exp(-t / 0.035)
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) * np.exp(-t / 0.2)
    x[: int(0.004 * SR)] += hp(rng.standard_normal(int(0.004 * SR)), 2000) * 0.3
    return np.tanh(1.6 * x) * 0.7


def clap():
    n = int(0.25 * SR)
    x = bp(rng.standard_normal(n), 900, 4500)
    e = np.zeros(n)
    for k, off in enumerate([0, 0.011, 0.022]):
        i = int(off * SR)
        e[i:] += np.exp(-np.arange(n - i) / SR / (0.09 if k == 2 else 0.008))
    return lp(x * e, 3000) * 0.28


def hat(open_=False):
    n = int((0.22 if open_ else 0.05) * SR)
    x = hp(rng.standard_normal(n), 7000)
    return x * env_ad(n, 0.001, 0.07 if open_ else 0.014) * (0.11 if open_ else 0.16)


def shaker():
    n = int(0.06 * SR)
    return hp(rng.standard_normal(n), 5000) * env_ad(n, 0.01, 0.02) * 0.03


def pluck(m, dur=0.22, vel=1.0):
    n = int(dur * 1.8 * SR)
    t = np.arange(n) / SR
    f = midi(m)
    mod = 1.4 * np.exp(-t / 0.05) * np.sin(2 * np.pi * 2 * f * t)
    x = np.sin(2 * np.pi * f * t + mod) * env_ad(n, 0.002, dur * 0.55)
    return x * 0.16 * vel


def sub_note(m, dur):
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = np.sin(2 * np.pi * midi(m) * t)
    x = np.tanh(1.8 * x) * 0.5
    e = np.minimum(1, t / 0.006) * np.minimum(1, (dur - t) / 0.02)
    return x * e * 0.38


def pad_chord(notes, dur, bright):
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = np.zeros(n)
    for m in notes:
        for det in (-0.07, 0, 0.07):
            f = midi(m + det)
            ph = rng.uniform(0, 1)
            x += 2 * ((f * t + ph) % 1) - 1
    x /= len(notes) * 3
    x = lp(x, bright, 2)
    a = np.minimum(1, t / 0.25) * np.minimum(1, (dur - t) / 0.3 + 0.0)
    return x * np.clip(a, 0, 1) * 0.5


def noise_riser(dur):
    n = int(dur * SR)
    x = rng.standard_normal(n)
    out = np.zeros(n)
    blk = 1024
    for i in range(0, n, blk):
        p = i / n
        fc = 300 + 7000 * p ** 2
        out[i:i + blk] = bp(x[i:i + blk], fc * 0.6, min(fc * 1.6, 18000))
    return out * np.linspace(0, 1, n) ** 2 * 0.25


def impact():
    n = int(1.3 * SR)
    t = np.arange(n) / SR
    f = 42 + 60 * np.exp(-t / 0.06)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.45) * 0.7


# ---------------- hoà âm: E thứ, vòng 4 ô nhịp ----------------
CHORDS = [  # (pad voicing, gốc bass, nốt pluck)
    ([52, 55, 59, 62, 66], 40, [64, 67, 71, 74, 78, 74, 71, 67]),  # Em9
    ([48, 55, 59, 64], 36, [64, 67, 71, 76, 79, 76, 71, 67]),  # Cmaj7
    ([55, 59, 62, 57], 43, [62, 67, 71, 74, 79, 74, 71, 69]),  # Gadd9
    ([54, 57, 62, 59], 38, [62, 66, 69, 74, 78, 74, 69, 66]),  # D/F#
]
PLUCK_RHYTHM = [1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1]  # 16 nốt móc kép / ô nhịp


def music(duration, drops, breaks, bpm=129.0):
    beat = 60.0 / bpm
    bar = beat * 4
    anchor = drops[0] if drops else 0.0
    t0 = anchor - np.ceil(anchor / bar + 1) * bar  # lưới nhịp sao cho 1 ô nhịp bắt đầu đúng tại drop đầu
    pad_ = 2.0
    buf = np.zeros(int((duration + pad_) * SR))
    sc = np.ones_like(buf)  # sidechain

    def state(t):
        for a, b in breaks:
            if a <= t < b:
                return "break"
        if not drops or t < drops[0]:
            return "intro"
        return "drop"

    nbars = int(np.ceil((duration - t0) / bar)) + 1
    K = kick()
    for bi in range(nbars):
        tb = t0 + bi * bar
        if tb > duration + 1:
            break
        ch, root, arp = CHORDS[bi % 4]
        st = state(tb + 0.01)
        bright = {"intro": 4200, "drop": 1500, "break": 450}[st]
        add(buf, pad_chord(ch, bar + 0.25, bright) * (0.85 if st != "break" else 0.45), tb)
        if st != "drop":  # trầm mềm giữ nền cho intro/break (mẫu: low ~0,06–0,15)
            add(buf, sub_note(root + 12, bar) * (0.35 if st == "intro" else 0.5), tb)
        for b in range(4):
            tt = tb + b * beat
            s2 = state(tt + 0.01)
            if s2 == "drop":
                add(buf, K, tt)
                i = int(round(tt * SR - t0 * 0 + 0))
                idx = int(round(tt * SR))
                if 0 <= idx < len(sc):
                    m = min(len(sc) - idx, int(0.3 * SR))
                    sc[idx:idx + m] = np.minimum(sc[idx:idx + m], 1 - 0.65 * np.exp(-np.arange(m) / SR / 0.09))
                if b in (1, 3):
                    add(buf, clap(), tt)
                add(buf, sub_note(root, beat * 0.42), tt + beat / 2)
                add(buf, hat(open_=True), tt + beat / 2)
                for q in (0.25, 0.75):
                    add(buf, shaker(), tt + beat * q)
            elif s2 == "intro":
                add(buf, hat() * 1.6, tt + beat / 2)
                add(buf, shaker() * 2, tt + beat * 0.75)
        if st != "break":
            for k in range(16):
                if PLUCK_RHYTHM[k]:
                    tt = tb + k * beat / 4
                    if state(tt + 0.01) == "break":
                        continue
                    vel = 0.75 + 0.25 * (k % 4 == 0)
                    add(buf, pluck(arp[k % 8], 0.22, vel) * (0.8 if state(tt) == "intro" else 1.0), tt)
    # riser 1 ô nhịp + impact trước mỗi lần vào drop (kể cả sau break)
    entries = list(drops) + [b for _, b in breaks if b < duration - 0.5]
    for e in entries:
        L = min(bar / 2, max(0.4, e))
        add(buf, noise_riser(L) * 0.6, e - L)
        add(buf, impact(), e)
    # sidechain chỉ ép nhạc nền (đã cộng chung): áp toàn bộ, kick tự nó là nguồn nên vẫn nổi
    buf *= sc
    buf = buf[: int(duration * SR)]
    # master: lọc dưới 30 Hz, nén mềm
    buf = hp(buf, 30)
    buf = np.tanh(buf * 1.2) / 1.2
    fade = int(1.2 * SR)
    buf[-fade:] *= np.linspace(1, 0, fade)
    return buf / (np.abs(buf).max() + 1e-9) * 0.89


# ---------------- SFX ----------------
def chime(f0, dur=0.6, bright=1.0):
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = np.zeros(n)
    for h, a, d in [(1, 0.55, 0.35), (2, 0.9, 0.3), (3, 0.6, 0.22), (4, 0.35 * bright, 0.15)]:
        x += a * np.sin(2 * np.pi * f0 * h * t) * np.exp(-t / d)
    x *= np.minimum(1, t / 0.004)
    return x / np.abs(x).max() * 0.85


def whoosh(dur=0.45, up=True):
    n = int(dur * SR)
    x = rng.standard_normal(n)
    out = np.zeros(n)
    for i in range(0, n, 512):
        p = i / n if up else 1 - i / n
        fc = 500 + 5000 * p
        out[i:i + 512] = bp(x[i:i + 512], fc * 0.5, fc * 1.5)
    e = np.sin(np.pi * np.linspace(0, 1, n)) ** 2
    return out * e / (np.abs(out * e).max() + 1e-9) * 0.8


def tick():
    n = int(0.05 * SR)
    t = np.arange(n) / SR
    return np.sin(2 * np.pi * 2400 * t) * np.exp(-t / 0.008) * 0.8


def gen_sfx(outdir):
    import os
    os.makedirs(outdir, exist_ok=True)
    save = lambda name, x: wavfile.write(f"{outdir}/{name}.wav", SR, (np.clip(x, -1, 1) * 32767).astype(np.int16))
    for name, m in [("am_ding_e", 76), ("am_ding_g", 79), ("am_ding_b", 83), ("am_ding_d", 86), ("am_ding_lo", 71)]:
        # ding gốc 680 Hz ≈ E5(659): dùng nốt trong giọng E thứ, đặt f0 thấp 1 quãng tám để hoạ âm 2-3-4 rơi vào 1,3–2,7 kHz
        save(name, chime(midi(m - 12)))
    save("am_ding_soft", chime(midi(64), 0.5, 0.4) * 0.7)
    save("am_whoosh", whoosh(0.45, True))
    save("am_whoosh_out", whoosh(0.4, False))
    save("am_impact", impact())
    save("am_tick", tick())
    save("am_riser", noise_riser(0.9))
    print("SFX ->", outdir)


if __name__ == "__main__":
    c = sys.argv[1]
    if c == "sfx":
        gen_sfx(sys.argv[2])
    elif c == "music":
        out, dur = sys.argv[2], float(sys.argv[3])
        a = sys.argv[4:]
        drops = [float(x) for x in a[a.index("--drops") + 1].split(",") if x] if "--drops" in a else []
        breaks = []
        if "--breaks" in a:
            for seg in a[a.index("--breaks") + 1].split(","):
                if seg:
                    x, y = seg.split("-")
                    breaks.append((float(x), float(y)))
        bpm = float(a[a.index("--bpm") + 1]) if "--bpm" in a else 129.0
        y = music(dur, drops, breaks, bpm)
        st = np.stack([y, np.roll(y, 220) * 0.96], 1)  # nới stereo nhẹ
        wavfile.write(out, SR, (st * 32767).astype(np.int16))
        print("music ->", out)
