import React from "react";
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, Easing } from "remotion";
import { C, SANS } from "./theme";
import { Ui } from "./types";
import { useSec } from "./Text";

// B-roll màn hình động (thay cho quay màn hình khi chưa có): video mẫu dùng quay màn hình app có con trỏ chuột,
// gõ chữ, bấm nút, mở thư mục, timeline editor. Các mẫu dưới tái tạo đúng các hành động đó.

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const MONO = "Menlo, 'SF Mono', Consolas, monospace";

const Typed: React.FC<{ text: string; start: number; cps?: number; caret?: boolean }> = ({ text, start, cps = 38, caret }) => {
  const frame = useCurrentFrame();
  const n = Math.max(0, Math.floor(((frame - start) / 30) * cps));
  const done = n >= text.length;
  return (
    <span>
      {text.slice(0, n)}
      {caret && !done && frame >= start && <span style={{ opacity: Math.floor(frame / 8) % 2 ? 1 : 0.2 }}>▍</span>}
    </span>
  );
};

/* con trỏ chuột đi tới (x,y) tại mỗi bước rồi bấm (gợn tròn) */
const Cursor: React.FC<{ pts: { x: number; y: number; f: number }[] }> = ({ pts }) => {
  const frame = useCurrentFrame();
  if (!pts.length) return null;
  let x = pts[0].x + 120, y = pts[0].y + 160;
  let click = -99;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const prev = i === 0 ? { x: p.x + 120, y: p.y + 160 } : pts[i - 1];
    const k = interpolate(frame, [p.f - 14, p.f - 2], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
    if (frame >= p.f - 14) {
      x = prev.x + (p.x - prev.x) * k;
      y = prev.y + (p.y - prev.y) * k;
    }
    if (frame >= p.f) click = p.f;
  }
  const r = interpolate(frame - click, [0, 10], [0, 1], clamp);
  return (
    <>
      {click > -99 && r < 1 && (
        <div style={{ position: "absolute", left: x - 30 * r, top: y - 30 * r, width: 60 * r, height: 60 * r, borderRadius: 999,
          border: `3px solid ${C.orange}`, opacity: 1 - r }} />
      )}
      <svg style={{ position: "absolute", left: x - 4, top: y - 2, filter: "drop-shadow(0 3px 4px rgba(0,0,0,.35))" }} width={34} height={44} viewBox="0 0 24 30">
        <path d="M2 2 L2 24 L8 18 L12 28 L16 26 L12 17 L20 17 Z" fill="#fff" stroke="#111" strokeWidth={1.6} strokeLinejoin="round" />
      </svg>
    </>
  );
};

const Chrome: React.FC<{ title: string; dark?: boolean }> = ({ title, dark }) => (
  <div style={{ height: 46, display: "flex", alignItems: "center", gap: 10, padding: "0 18px", background: dark ? "#2a2522" : "#f4f1ee",
    borderBottom: `1px solid ${dark ? "#3a3330" : "#e6e1dc"}` }}>
    {["#ff5f57", "#febc2e", "#28c840"].map((c) => <div key={c} style={{ width: 14, height: 14, borderRadius: 7, background: c }} />)}
    <div style={{ flex: 1, textAlign: "center", fontFamily: SANS, fontSize: 19, fontWeight: 600, color: dark ? "#bfb4ab" : "#7a6f67", marginRight: 60 }}>{title}</div>
  </div>
);

export const UiMock: React.FC<{ ui: Ui; sceneFrom: number; images: string[] }> = ({ ui, sceneFrom, images }) => {
  const sec = useSec();
  const frame = useCurrentFrame();
  const steps = (ui.steps ?? []).map((s, i) => ({ ...s, f: sec((s.at ?? sceneFrom + 0.3 + i * 0.9) - sceneFrom) }));
  const shown = (f: number, len = 8) => interpolate(frame - f, [0, len], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });

  if (ui.kind === "terminal") {
    return (
      <AbsoluteFill style={{ background: "#1c1917" }}>
        <Chrome title={ui.title ?? "Terminal — claude"} dark />
        <div style={{ padding: "22px 30px", fontFamily: MONO, fontSize: 31, lineHeight: 1.5, color: "#e9e1d8" }}>
          <div style={{ border: `2px solid ${C.orange}`, borderRadius: 10, padding: "10px 16px", marginBottom: 18, color: C.peach }}>
            <span style={{ color: C.orange }}>✻</span> Welcome to <b>Claude Code</b>
          </div>
          {steps.map((s, i) => {
            if (frame < s.f) return null;
            const user = s.t.startsWith(">");
            const ok = s.t.startsWith("✓");
            return (
              <div key={i} style={{ color: user ? "#fff" : ok ? "#7bd88f" : "#d8cfc6", opacity: shown(s.f, 4), marginTop: user && i ? 10 : 2 }}>
                {!user && !ok && <span style={{ color: C.orange }}>⏺ </span>}
                <Typed text={s.t} start={s.f} cps={user ? 30 : 70} caret={user} />
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    );
  }

  if (ui.kind === "chat") {
    const user = steps[0];
    return (
      <AbsoluteFill style={{ background: "#faf8f5", fontFamily: SANS }}>
        <Chrome title={ui.title ?? "Claude"} />
        <div style={{ display: "flex", height: "100%" }}>
          <div style={{ width: 200, background: "#f1ece7", padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ fontWeight: 800, color: C.brown, fontSize: 22 }}><span style={{ color: C.orange }}>✻</span> Claude</div>
            {["New chat", "Projects", "Code", "Artifacts"].map((t, i) => (
              <div key={t} style={{ fontSize: 18, color: i === 2 ? C.orange : "#8a7d73", fontWeight: i === 2 ? 800 : 600 }}>{t}</div>
            ))}
          </div>
          <div style={{ flex: 1, padding: 28, display: "flex", flexDirection: "column", gap: 18 }}>
            {user && frame >= user.f && (
              <div style={{ alignSelf: "flex-end", maxWidth: "80%", background: "#efe3d8", borderRadius: 16, padding: "14px 18px", fontSize: 22, color: C.brown }}>
                <Typed text={user.t} start={user.f} cps={34} caret />
              </div>
            )}
            {steps.slice(1).map((s, i) =>
              frame >= s.f ? (
                <div key={i} style={{ display: "flex", gap: 12, opacity: shown(s.f), transform: `translateY(${(1 - shown(s.f)) * 12}px)` }}>
                  <span style={{ color: C.orange, fontSize: 24 }}>✻</span>
                  <span style={{ fontSize: 21, color: "#3d342e", lineHeight: 1.4 }}><Typed text={s.t} start={s.f} cps={80} /></span>
                </div>
              ) : null,
            )}
          </div>
        </div>
        <Cursor pts={user ? [{ x: 820, y: 560, f: user.f - 2 }] : []} />
      </AbsoluteFill>
    );
  }

  if (ui.kind === "editor") {
    const total = sec(ui.dur ?? 4);
    const ph = interpolate(frame, [0, total], [0.05, 0.85], clamp);
    const tracks = [
      { n: "Cảnh", c: "#7aa2d6" }, { n: "Phụ đề", c: "#e8b04b" }, { n: "Graphic", c: C.orange }, { n: "Âm thanh", c: "#7bc49a" },
    ];
    const active = steps.filter((s) => frame >= s.f).length - 1;
    return (
      <AbsoluteFill style={{ background: "#f7f3ef", fontFamily: SANS }}>
        <Chrome title={ui.title ?? "AI Editor"} />
        <div style={{ display: "flex", height: 300, padding: 16, gap: 16 }}>
          <div style={{ width: 300, background: "#ece6e0", borderRadius: 10, padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
            {steps.map((s, i) => (
              <div key={i} style={{ fontSize: 17, fontWeight: 700, padding: "6px 10px", borderRadius: 8, background: i === active ? C.orange : "transparent",
                color: i === active ? "#fff" : "#7a6f67" }}>{s.t}</div>
            ))}
          </div>
          <div style={{ flex: 1, background: "#cfe0ef", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
            {images[0] && (
              <div style={{ position: "relative", height: 270, width: 152, borderRadius: 8, overflow: "hidden" }}>
                <Img src={staticFile(images[0])} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                <div style={{ position: "absolute", bottom: 40, left: 0, right: 0, textAlign: "center" }}>
                  <span style={{ background: "#f6e05e", color: "#222", fontWeight: 800, fontSize: 13, padding: "2px 6px", borderRadius: 4 }}>{ui.caption ?? "phụ đề"}</span>
                </div>
              </div>
            )}
          </div>
        </div>
        <div style={{ position: "relative", margin: "0 16px", background: "#fff", borderRadius: 10, padding: "12px 0 12px 110px", height: 230 }}>
          {tracks.map((t, i) => (
            <div key={t.n} style={{ position: "relative", height: 46, marginBottom: 6 }}>
              <div style={{ position: "absolute", left: -100, top: 12, fontSize: 15, fontWeight: 700, color: "#8a7d73" }}>{t.n}</div>
              {[0, 1, 2, 3].map((k) => {
                const w = 70 + ((i * 3 + k * 7) % 5) * 22;
                const x = k * 175 + ((i * 29) % 40);
                const vis = shown(i * 3 + k * 3, 6);
                return <div key={k} style={{ position: "absolute", left: x, top: 6, width: w * vis, height: 34, borderRadius: 6, background: t.c,
                  opacity: active >= 0 && steps[active] && tracks[active % 4]?.n === t.n ? 1 : 0.75 }} />;
              })}
            </div>
          ))}
          <div style={{ position: "absolute", top: 4, bottom: 4, left: `${110 + ph * 720}px`, width: 3, background: "#e5484d" }} />
        </div>
      </AbsoluteFill>
    );
  }

  if (ui.kind === "folder") {
    const pts = steps.map((s, i) => ({ x: 290 + (i % 4) * 170, y: 170 + Math.floor(i / 4) * 190, f: s.f }));
    return (
      <AbsoluteFill style={{ background: "#fbfaf8", fontFamily: SANS }}>
        <Chrome title={ui.title ?? "AI Editor"} />
        <div style={{ display: "flex", height: "100%" }}>
          <div style={{ width: 190, background: "#efebe7", padding: 20, fontSize: 18, color: "#8a7d73", lineHeight: 2 }}>
            <div style={{ fontWeight: 800, color: C.brown }}>Mục ưa thích</div>Desktop<br />Tài liệu<br /><span style={{ color: C.orange, fontWeight: 800 }}>{ui.title ?? "AI Editor"}</span>
          </div>
          <div style={{ flex: 1, padding: 26, display: "flex", flexWrap: "wrap", gap: 22, alignContent: "flex-start" }}>
            {steps.map((s, i) => {
              const v = shown(s.f, 8);
              const img = images[i % Math.max(1, images.length)];
              return (
                <div key={i} style={{ width: 150, textAlign: "center", opacity: v, transform: `scale(${0.7 + 0.3 * v})` }}>
                  {s.t.includes(".") && img ? (
                    <Img src={staticFile(img)} style={{ width: 96, height: 140, objectFit: "cover", borderRadius: 8, boxShadow: "0 6px 14px rgba(0,0,0,.15)" }} />
                  ) : (
                    <svg width={120} height={96} viewBox="0 0 100 80"><path d="M4 14 a6 6 0 0 1 6-6 h26 l8 9 h46 a6 6 0 0 1 6 6 v47 a6 6 0 0 1-6 6 H10 a6 6 0 0 1-6-6Z" fill="#6aa6e8" /><path d="M4 26 h92 v44 a6 6 0 0 1-6 6 H10 a6 6 0 0 1-6-6Z" fill="#8cc0f5" /></svg>
                  )}
                  <div style={{ fontSize: 17, fontWeight: 700, color: "#3d342e", marginTop: 6 }}>{s.t}</div>
                </div>
              );
            })}
          </div>
        </div>
        <Cursor pts={pts} />
      </AbsoluteFill>
    );
  }

  // browser: gõ địa chỉ rồi hiện lưới video
  const url = steps[0];
  const gridAt = steps[1]?.f ?? (url ? url.f + 25 : 10);
  return (
    <AbsoluteFill style={{ background: "#fff", fontFamily: SANS }}>
      <Chrome title={ui.title ?? "Trình duyệt"} />
      <div style={{ margin: "14px 24px", height: 46, borderRadius: 23, background: "#f1efed", display: "flex", alignItems: "center", padding: "0 22px", fontSize: 20, color: "#5d534c" }}>
        {url && <Typed text={url.t} start={url.f} cps={30} caret />}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, padding: "6px 24px" }}>
        {images.slice(0, 8).map((im, i) => {
          const v = shown(gridAt + i * 2, 8);
          return (
            <div key={i} style={{ width: 210, opacity: v, transform: `translateY(${(1 - v) * 20}px)` }}>
              <Img src={staticFile(im)} style={{ width: 210, height: 118, objectFit: "cover", borderRadius: 10 }} />
              <div style={{ height: 10, width: "85%", background: "#e7e2de", borderRadius: 5, marginTop: 8 }} />
              <div style={{ height: 10, width: "55%", background: "#efebe8", borderRadius: 5, marginTop: 6 }} />
            </div>
          );
        })}
      </div>
      <Cursor pts={steps.slice(2).map((s, i) => ({ x: 130 + (i % 4) * 226, y: 210 + Math.floor(i / 4) * 170, f: s.f }))} />
    </AbsoluteFill>
  );
};

/* thẻ kính cam nổi trên khung màn hình ("5 / công cụ miễn phí") */
export const ScreenCard: React.FC<{ big: string; sub?: string; f: number }> = ({ big, sub, f }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame - f, [0, 10], [0, 1], { ...clamp, easing: Easing.out(Easing.back(1.6)) });
  if (frame < f) return null;
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", background: `rgba(60,40,30,${0.35 * p})` }}>
      <div style={{ padding: "18px 60px 22px", borderRadius: 18, textAlign: "center", background: "rgba(232,150,100,0.55)",
        border: "2px solid rgba(255,230,210,0.8)", boxShadow: "0 0 50px rgba(240,120,70,0.5)", backdropFilter: "blur(6px)",
        opacity: p, transform: `scale(${0.7 + 0.3 * p})` }}>
        <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 120, color: "#fff", lineHeight: 1 }}>{big}</div>
        {sub && <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 30, color: "#fff", marginTop: 6 }}>{sub}</div>}
      </div>
    </AbsoluteFill>
  );
};
