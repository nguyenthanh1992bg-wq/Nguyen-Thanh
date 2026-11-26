import React, { CSSProperties } from "react";
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, Easing } from "remotion";
import { C, SANS, SERIF } from "./theme";
import { Overlay, Pos } from "./types";
import { LineView, useExit, useSec } from "./Text";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const back = Easing.out(Easing.back(1.5));

const posStyle = (pos: Pos, lowY = 1250): CSSProperties => {
  switch (pos) {
    case "top":
      return { top: 150, left: 60, right: 60 };
    case "mid":
      return { top: 880, left: 60, right: 60 };
    case "center":
      return { top: 760, left: 60, right: 60 };
    case "right":
      return { top: 560, right: 70, left: 420 };
    default:
      return { top: lowY, left: 60, right: 60 };
  }
};

const glassPill = (active = false): CSSProperties => ({
  display: "inline-block",
  padding: "8px 20px 10px",
  borderRadius: 12,
  background: active ? `linear-gradient(160deg, ${C.cardA}, ${C.cardB})` : C.glass,
  border: `1.5px solid ${active ? "rgba(255,225,205,0.8)" : C.glassBorder}`,
  boxShadow: active ? "0 0 26px rgba(240,120,70,0.5)" : "0 8px 22px rgba(0,0,0,0.25)",
  fontFamily: SANS,
  fontWeight: 700,
  fontSize: 34,
  color: active ? "#fff" : "#F7D9C6",
});

export const OverlayView: React.FC<{ o: Overlay; tone: "light" | "dark"; dur: number; defPos: Pos; captionY?: number }> = ({ o, tone, dur, defPos, captionY }) => {
  const frame = useCurrentFrame();
  const sec = useSec();
  const exit = useExit(dur);
  const rel = (at: number) => sec(at - o.from);
  const pin = (at: number, len = 9, e = back) => interpolate(frame - rel(at), [0, len], [0, 1], { ...clamp, easing: e });

  switch (o.type) {
    case "caption": {
      const pos = o.pos ?? defPos;
      const t = o.tone ?? tone;
      const align = pos === "right" ? "right" : "center";
      return (
        <AbsoluteFill style={exit}>
          <div style={{ position: "absolute", ...posStyle(pos, captionY) }}>
            {o.lines.map((l, i) => (
              <LineView key={i} line={l} startFrame={rel(l.at ?? o.from + i * 0.35)} tone={t} align={align} />
            ))}
          </div>
        </AbsoluteFill>
      );
    }
    case "pill": {
      const p = pin(o.from, 10);
      return (
        <AbsoluteFill style={exit}>
          <div style={{ position: "absolute", ...posStyle(o.pos ?? "mid"), textAlign: "center" }}>
            <span style={{ display: "inline-block", padding: "10px 34px 14px", borderRadius: 14, background: "rgba(255,248,242,0.92)",
              boxShadow: "0 12px 30px rgba(200,110,60,0.25)", fontFamily: SERIF, fontStyle: "italic", fontWeight: 800, fontSize: 58,
              color: C.orangeText, opacity: p, transform: `scale(${0.8 + 0.2 * p}) rotate(${(1 - p) * -4}deg)`, filter: `blur(${(1 - p) * 8}px)` }}>
              {o.text}
            </span>
          </div>
        </AbsoluteFill>
      );
    }
    case "tags":
      return (
        <AbsoluteFill style={exit}>
          <div style={{ position: "absolute", left: 54, top: 140, display: "flex", flexDirection: "column", gap: 14, alignItems: "flex-start" }}>
            {o.items.map((it, i) => {
              const p = pin(it.at);
              const next = o.items[i + 1];
              const active = frame >= rel(it.at) && (!next || frame < rel(next.at));
              return (
                <div key={i} style={{ ...glassPill(active), opacity: p, transform: `translateX(${(1 - p) * -40}px)` }}>
                  {it.t}
                </div>
              );
            })}
          </div>
        </AbsoluteFill>
      );
    case "flow":
      return (
        <AbsoluteFill style={exit}>
          {o.items.map((it, i) => {
            const p = pin(it.at);
            return (
              <div key={i} style={{ position: "absolute", left: 60 + i * 130, top: 800 + i * 78, display: "flex", alignItems: "center", gap: 16, opacity: p,
                transform: `translateX(${(1 - p) * -30}px)` }}>
                {i > 0 && <span style={{ fontSize: 56, color: C.orange, fontWeight: 800, fontFamily: SANS }}>→</span>}
                <span style={{ ...glassPill(i === o.items.length - 1 && false), fontSize: i === 1 ? 46 : 36 }}>{it.t}</span>
              </div>
            );
          })}
        </AbsoluteFill>
      );
    case "progress": {
      const p = pin(o.from, 10);
      const fill = interpolate(frame, [8, 34], [0, o.value], { ...clamp, easing: Easing.out(Easing.cubic) });
      return (
        <AbsoluteFill style={exit}>
          <div style={{ position: "absolute", left: 54, right: 54, top: 120, padding: "22px 28px", borderRadius: 18, background: C.glass,
            border: `1.5px solid ${C.glassBorder}`, opacity: p, transform: `translateY(${(1 - p) * -30}px)` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontFamily: SANS, fontWeight: 600, fontSize: 30, color: "#F7D9C6" }}>{o.label}</span>
              <span style={{ fontFamily: SANS, fontWeight: 800, fontSize: 52, color: "#fff" }}>{Math.round(fill)}%</span>
            </div>
            <div style={{ marginTop: 14, height: 14, borderRadius: 7, background: "rgba(255,255,255,0.15)" }}>
              <div style={{ width: `${fill}%`, height: "100%", borderRadius: 7, background: `linear-gradient(90deg, ${C.peach}, ${C.orange})`, boxShadow: "0 0 14px rgba(240,120,70,0.7)" }} />
            </div>
          </div>
        </AbsoluteFill>
      );
    }
    case "checklist": {
      const p = pin(o.from, 10);
      return (
        <AbsoluteFill style={exit}>
          <div style={{ position: "absolute", left: 54, top: 560, width: 760, padding: "26px 32px", borderRadius: 20, background: "rgba(70,40,26,0.55)",
            border: `1.5px solid ${C.glassBorder}`, boxShadow: "0 16px 40px rgba(0,0,0,0.3)", opacity: p, transform: `scale(${0.9 + 0.1 * p})`, transformOrigin: "0 50%" }}>
            <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 42, color: "#fff", marginBottom: 14 }}>{o.title}</div>
            {o.items.map((it, i) => {
              const c = pin(it.at, 8);
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 8 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 18, border: `3px solid ${C.peach}`, background: c > 0.5 ? C.orange : "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 24, fontWeight: 900, transform: `scale(${0.8 + 0.2 * c})` }}>
                    {c > 0.5 ? "✓" : ""}
                  </div>
                  <span style={{ fontFamily: SANS, fontWeight: 700, fontSize: 36, color: "#F7E6DA" }}>{it.t}</span>
                </div>
              );
            })}
          </div>
        </AbsoluteFill>
      );
    }
    case "follow": {
      const p = pin(o.from, 10);
      const clicked = o.clickAt !== undefined && frame >= rel(o.clickAt);
      const cp = o.clickAt !== undefined ? interpolate(frame - rel(o.clickAt), [-6, 0, 4], [0, 1, 0], clamp) : 0;
      return (
        <AbsoluteFill style={exit}>
          <div style={{ position: "absolute", left: 54, right: 54, top: 120, height: 120, borderRadius: 20, background: "rgba(60,40,30,0.55)",
            border: `1.5px solid ${C.glassBorder}`, display: "flex", alignItems: "center", padding: "0 26px", gap: 20, opacity: p, transform: `translateY(${(1 - p) * -30}px)` }}>
            <div style={{ width: 72, height: 72, borderRadius: 14, background: "#1d1d1d", color: "#fff", fontFamily: SANS, fontWeight: 800, fontSize: 38, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {o.letter ?? o.name[0]}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 34, color: "#fff" }}>{o.name}</div>
              <div style={{ fontFamily: SANS, fontWeight: 500, fontSize: 24, color: "rgba(255,255,255,0.7)" }}>{o.handle}</div>
            </div>
            <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 30, color: clicked ? "#F7D9C6" : "#fff", transform: `scale(${1 - cp * 0.12})` }}>
              {clicked ? "Đã follow" : "Follow"}
            </div>
            <div style={{ fontSize: 34, color: "#fff", transform: `translate(${-10 + cp * 4}px, ${20 + cp * 4}px) rotate(-20deg)` }}>➤</div>
          </div>
        </AbsoluteFill>
      );
    }
    case "stamp": {
      const p = pin(o.from, 10, Easing.out(Easing.back(2)));
      return (
        <AbsoluteFill style={exit}>
          <div style={{ position: "absolute", ...posStyle(o.pos ?? "top"), top: o.pos ? undefined : 230, textAlign: "center" }}>
            <span style={{ display: "inline-block", padding: "6px 30px 12px", border: "2.5px solid rgba(255,235,220,0.75)", borderRadius: 10,
              background: "rgba(60,30,16,0.45)", fontFamily: SERIF, fontStyle: "italic", fontWeight: 800, fontSize: 96, color: "#fff",
              transform: `rotate(-6deg) scale(${2 - p})`, opacity: p, filter: `blur(${(1 - p) * 10}px)`, boxShadow: "0 10px 30px rgba(0,0,0,0.3)" }}>
              {o.text}
            </span>
          </div>
        </AbsoluteFill>
      );
    }
    case "floaters": {
      const mode = o.mode ?? "sides";
      const imgs = o.images;
      if (mode === "strip") {
        const x = -frame * 3;
        const row = [...imgs, ...imgs, ...imgs];
        return (
          <AbsoluteFill style={exit}>
            <div style={{ position: "absolute", top: 90, left: x % (imgs.length * 170), display: "flex", gap: 14, opacity: pin(o.from, 8) }}>
              {row.map((s, i) => (
                <Img key={i} src={staticFile(s)} style={{ width: 156, height: 230, objectFit: "cover", borderRadius: 12, border: "2px solid rgba(255,255,255,0.6)" }} />
              ))}
            </div>
          </AbsoluteFill>
        );
      }
      if (mode === "wall") {
        // tường ảnh 3x3 trên nền kem, thu nhỏ dần (cảnh "xem trong tài liệu" của mẫu)
        const z = interpolate(frame, [0, 40], [1.35, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
        const bgp = pin(o.from, 8, Easing.out(Easing.cubic));
        return (
          <AbsoluteFill style={{ ...exit, background: `rgba(251,241,232,${bgp})` }}>
            <AbsoluteFill style={{ transform: `scale(${z})`, alignItems: "center", justifyContent: "center" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 250px)", gap: 26 }}>
                {Array.from({ length: 9 }).map((_, i) => {
                  const p = pin(o.from + 0.05 * i, 8);
                  return <Img key={i} src={staticFile(imgs[i % imgs.length])} style={{ width: 250, height: 444, objectFit: "cover", borderRadius: 16,
                    boxShadow: "0 14px 30px rgba(150,80,40,0.25)", opacity: p, transform: `translateY(${(1 - p) * 40}px)` }} />;
                })}
              </div>
            </AbsoluteFill>
            {o.title && <div style={{ position: "absolute", top: 110, width: "100%", textAlign: "center", fontFamily: SERIF, fontStyle: "italic", fontWeight: 800, fontSize: 70, color: C.orangeText, opacity: bgp }}>{o.title}</div>}
          </AbsoluteFill>
        );
      }
      if (mode === "fan") {
        const n = imgs.length;
        return (
          <AbsoluteFill style={exit}>
            {imgs.map((s, i) => {
              const p = pin(o.from + i * 0.06, 10);
              const a = (i - (n - 1) / 2) * 9;
              return (
                <Img key={i} src={staticFile(s)} style={{ position: "absolute", left: 540 - 95 + (i - (n - 1) / 2) * 120, top: 560 + Math.abs(i - (n - 1) / 2) * 24,
                  width: 190, height: 380, objectFit: "cover", borderRadius: 22, border: "5px solid #111", boxShadow: "0 18px 40px rgba(0,0,0,0.45)",
                  transform: `rotate(${a * p}deg) translateY(${(1 - p) * 120}px)`, opacity: p }} />
              );
            })}
          </AbsoluteFill>
        );
      }
      // sides: 2 thẻ nghiêng hai bên đầu (hook mở đầu)
      return (
        <AbsoluteFill style={exit}>
          {imgs.slice(0, 2).map((s, i) => {
            const p = pin(o.from + i * 0.12, 12);
            const left = i === 0;
            const bob = Math.sin((frame + i * 20) / 14) * 8;
            return (
              <Img key={i} src={staticFile(s)} style={{ position: "absolute", left: left ? 50 : 760, top: 330 + bob, width: 270, height: 440, objectFit: "cover",
                borderRadius: 18, border: "4px solid rgba(255,255,255,0.85)", boxShadow: "0 18px 40px rgba(0,0,0,0.45)",
                transform: `rotate(${(left ? -8 : 8) * p}deg) translateX(${(1 - p) * (left ? -200 : 200)}px)`, opacity: p }} />
            );
          })}
        </AbsoluteFill>
      );
    }
    default:
      return null;
  }
};
