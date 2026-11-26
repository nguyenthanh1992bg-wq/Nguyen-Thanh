import React, { CSSProperties } from "react";
import { AbsoluteFill, Img, OffthreadVideo, interpolate, staticFile, useCurrentFrame, Easing } from "remotion";
import { C, SANS, SERIF, W } from "./theme";
import { Scene, Big, Compare, Doc, Tree } from "./types";
import { LineView, useSec } from "./Text";
import { UiMock, ScreenCard } from "./Ui";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = Easing.out(Easing.cubic);

// Video người nói, đồng bộ với dòng thời gian tổng: trimBefore = mốc bắt đầu cảnh
export const Talk: React.FC<{ src: string; trim: number; style?: CSSProperties }> = ({ src, trim, style }) => (
  <OffthreadVideo
    src={staticFile(src)}
    trimBefore={trim}
    muted
    style={{ width: "100%", height: "100%", objectFit: "cover", ...style }}
  />
);

const isVideo = (p: string) => /\.(mp4|mov|webm|m4v)$/i.test(p);

/* ---------------- FACE: người nói toàn khung + zoom chậm/punch ---------------- */
export const FaceLayout: React.FC<{ scene: Scene; talk: string; dur: number }> = ({ scene, talk, dur }) => {
  const frame = useCurrentFrame();
  const sec = useSec();
  const z0 = scene.zoom ?? 1.0;
  const z1 = scene.zoomTo ?? z0 + 0.04;
  let z = interpolate(frame, [0, dur], [z0, z1], clamp);
  // nhảy zoom: từ giây at, tỉ lệ đổi gần như tức thì (3 khung) sang z, vẫn trôi chậm tiếp
  for (const pu of scene.punches ?? []) {
    const pf = sec(pu.at - scene.from);
    const k = interpolate(frame, [pf, pf + 3], [0, 1], clamp);
    if (k > 0) z = z + (pu.z + (z1 - z0) * (frame / Math.max(1, dur)) - z) * k;
  }
  const fy = (scene.focusY ?? 0.38) * 100;
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <AbsoluteFill style={{ transform: `scale(${z})`, transformOrigin: `50% ${fy}%` }}>
        <Talk src={talk} trim={sec(scene.from)} style={{ filter: "saturate(1.06) contrast(1.05) brightness(1.02)" }} />
      </AbsoluteFill>
      {/* lớp ấm + làm tối mép trên/dưới để chữ nổi */}
      <AbsoluteFill style={{ background: "rgba(255,170,120,0.05)", mixBlendMode: "soft-light" }} />
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.28) 0%, rgba(0,0,0,0) 22%, rgba(0,0,0,0) 52%, rgba(0,0,0,0.30) 100%)",
        }}
      />
    </AbsoluteFill>
  );
};

/* ---------------- nền kem đào (split + light) ---------------- */
export const CreamBg: React.FC = () => {
  const frame = useCurrentFrame();
  const d = Math.sin(frame / 60) * 30;
  return (
    <AbsoluteFill style={{ background: C.cream }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at ${18 + d / 20}% ${28 + d / 30}%, rgba(246,190,155,0.75) 0%, rgba(246,190,155,0) 38%),
            radial-gradient(circle at ${88 - d / 25}% ${68}%, rgba(244,170,130,0.55) 0%, rgba(244,170,130,0) 40%),
            radial-gradient(circle at 50% 110%, rgba(250,205,175,0.9) 0%, rgba(250,205,175,0) 45%)`,
        }}
      />
      <AbsoluteFill style={{ opacity: 0.06, backgroundImage: "radial-gradient(#7a4a30 1px, transparent 1.2px)", backgroundSize: "6px 6px" }} />
    </AbsoluteFill>
  );
};

/* cửa sổ ứng dụng giả khi chưa có video quay màn hình */
const MockWindow: React.FC<{ title: string }> = ({ title }) => (
  <AbsoluteFill style={{ background: "#fff", fontFamily: SANS }}>
    <div style={{ height: 44, display: "flex", alignItems: "center", gap: 10, padding: "0 18px", borderBottom: "1px solid #eee" }}>
      {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
        <div key={c} style={{ width: 14, height: 14, borderRadius: 7, background: c }} />
      ))}
      <div style={{ marginLeft: 16, fontSize: 20, color: "#777", fontWeight: 600 }}>{title}</div>
    </div>
    <div style={{ display: "flex", height: "100%" }}>
      <div style={{ width: 230, background: "#f6f3f1", padding: 22, display: "flex", flexDirection: "column", gap: 16 }}>
        {[70, 55, 62, 48, 58].map((w, i) => (
          <div key={i} style={{ height: 14, width: `${w}%`, borderRadius: 7, background: i === 0 ? C.orange : "#ddd5cf" }} />
        ))}
      </div>
      <div style={{ flex: 1, padding: 34, display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ fontSize: 30, fontWeight: 800, color: C.brown }}>{title}</div>
        {[92, 80, 86, 60].map((w, i) => (
          <div key={i} style={{ height: 16, width: `${w}%`, borderRadius: 8, background: "#ece7e3" }} />
        ))}
      </div>
    </div>
  </AbsoluteFill>
);

/* sơ đồ thư mục (Bước 2/5 - AI Editor - RAW / References / Done) */
const Folder: React.FC<{ size?: number }> = ({ size = 96 }) => (
  <svg width={size} height={size * 0.8} viewBox="0 0 100 80">
    <path d="M4 14 a6 6 0 0 1 6-6 h26 l8 9 h46 a6 6 0 0 1 6 6 v47 a6 6 0 0 1-6 6 H10 a6 6 0 0 1-6-6Z" fill="#4a2a18" />
    <path d="M4 26 h92 v44 a6 6 0 0 1-6 6 H10 a6 6 0 0 1-6-6Z" fill="#6b3d22" />
  </svg>
);
const TreeView: React.FC<{ tree: Tree; sceneFrom: number }> = ({ tree, sceneFrom }) => {
  const frame = useCurrentFrame();
  const sec = useSec();
  const pin = (at: number) => interpolate(frame - sec(at - sceneFrom), [0, 9], [0, 1], { ...clamp, easing: ease });
  const n = tree.children.length;
  const xs = tree.children.map((_, i) => (n === 1 ? 540 : 200 + (i * 680) / (n - 1)));
  const pr = pin(tree.rootAt);
  const label: CSSProperties = {
    fontFamily: SANS, fontWeight: 700, fontSize: 30, color: C.brown, background: "rgba(255,255,255,0.75)",
    padding: "4px 14px", borderRadius: 8, boxShadow: "0 6px 16px rgba(150,80,40,0.18)",
  };
  const note: CSSProperties = { fontFamily: SERIF, fontStyle: "italic", fontWeight: 700, fontSize: 34, color: C.orangeText };
  return (
    <AbsoluteFill>
      {tree.step && (
        <div style={{ position: "absolute", left: 70, top: 200, fontFamily: SANS, fontWeight: 600, fontSize: 32, color: C.brown, opacity: pr }}>
          {tree.step}
        </div>
      )}
      <div style={{ position: "absolute", left: 540, top: 190, transform: `translateX(-50%) scale(${0.8 + 0.2 * pr})`, opacity: pr, textAlign: "center" }}>
        <Folder size={110} />
        <div style={label}>{tree.root}</div>
      </div>
      {tree.rootNote && <div style={{ ...note, position: "absolute", left: 720, top: 215, opacity: pr }}>{tree.rootNote}</div>}
      {/* đường nối */}
      <svg style={{ position: "absolute", left: 0, top: 0 }} width={W} height={900}>
        {tree.children.map((c, i) => {
          const p = pin(c.at);
          return (
            <path key={i} d={`M540 370 V410 H${xs[i]} V450`} stroke={C.orange} strokeWidth={3} fill="none"
              strokeDasharray={600} strokeDashoffset={600 * (1 - p)} />
          );
        })}
      </svg>
      {tree.children.map((c, i) => {
        const p = pin(c.at);
        return (
          <div key={i} style={{ position: "absolute", left: xs[i], top: 450, transform: `translateX(-50%) translateY(${(1 - p) * 30}px)`, opacity: p, textAlign: "center" }}>
            <Folder size={96} />
            <div style={label}>{c.name}</div>
            {c.note && <div style={{ ...note, marginTop: 6 }}>{c.note}</div>}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

/* ---------------- SPLIT: nền kem + khung màn hình trên + khung mặt (PIP) dưới ---------------- */
export const SplitLayout: React.FC<{ scene: Scene; talk: string; faceY?: number; broll?: string[] }> = ({ scene, talk, faceY = 0.42, broll = [] }) => {
  const frame = useCurrentFrame();
  const sec = useSec();
  const pin = interpolate(frame, [0, 10], [0, 1], { ...clamp, easing: ease });
  const zoomIn = interpolate(frame, [0, 240], [1, 1.06], clamp);
  return (
    <AbsoluteFill>
      <CreamBg />
      {scene.tree ? (
        <TreeView tree={scene.tree} sceneFrom={scene.from} />
      ) : (
        <div
          style={{
            position: "absolute", left: 54, top: 150, width: 972, height: 640, borderRadius: 24, overflow: "hidden",
            background: "#fff", boxShadow: "0 24px 60px rgba(150,80,40,0.25), 0 0 0 1px rgba(0,0,0,0.04)",
            opacity: pin, transform: `translateY(${(1 - pin) * 40}px) scale(${0.94 + 0.06 * pin})`, filter: `blur(${(1 - pin) * 12}px)`,
          }}
        >
          <AbsoluteFill style={{ transform: `scale(${zoomIn})` }}>
            {scene.media ? (
              isVideo(scene.media) ? (
                <OffthreadVideo src={staticFile(scene.media)} trimBefore={sec(scene.mediaStart ?? 0)} muted
                  style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 0%" }} />
              ) : (
                <Img src={staticFile(scene.media)} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 0%" }} />
              )
            ) : scene.ui ? (
              <UiMock ui={scene.ui} sceneFrom={scene.from} images={scene.ui.images ?? broll} />
            ) : (
              <MockWindow title={scene.window ?? "Claude"} />
            )}
          </AbsoluteFill>
          {scene.card && <ScreenCard big={scene.card.big} sub={scene.card.sub} f={sec(scene.card.at - scene.from)} />}
        </div>
      )}
      {/* khung mặt bo góc phía dưới */}
      <div
        style={{
          position: "absolute", left: 119, top: 1395, width: 842, height: 490, borderRadius: 26, overflow: "hidden",
          boxShadow: "0 22px 50px rgba(120,60,30,0.30)", border: "3px solid rgba(255,255,255,0.7)",
        }}
      >
        <Talk src={talk} trim={sec(scene.from)} style={{ objectPosition: `50% ${faceY * 100}%`, transform: "scale(1.12)", transformOrigin: `50% ${faceY * 100}%` }} />
      </div>
    </AbsoluteFill>
  );
};

/* ---------------- DARK: nền mặt nhoè + phủ nâu cam + lưới + thẻ phát sáng ---------------- */
const DarkBg: React.FC<{ talk: string; trim: number }> = ({ talk, trim }) => {
  const frame = useCurrentFrame();
  const g = 0.85 + Math.sin(frame / 18) * 0.15;
  return (
    <AbsoluteFill style={{ background: "#2a140a" }}>
      <AbsoluteFill style={{ filter: "blur(46px) brightness(0.55) saturate(1.3)", transform: "scale(1.25)" }}>
        <Talk src={talk} trim={trim} />
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(150,70,30,0.55), rgba(70,30,12,0.72))" }} />
      <AbsoluteFill
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,200,160,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(255,200,160,0.07) 1px, transparent 1px)",
          backgroundSize: "54px 54px",
        }}
      />
      <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 48%, rgba(240,130,70,${0.35 * g}) 0%, rgba(240,130,70,0) 45%)` }} />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(0,0,0,0.45) 100%)" }} />
    </AbsoluteFill>
  );
};

const GlowCard: React.FC<{ children: React.ReactNode; w: number; h: number; p: number; dim?: boolean }> = ({ children, w, h, p, dim }) => (
  <div
    style={{
      width: w, height: h, borderRadius: 22, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      background: `linear-gradient(160deg, ${C.cardA}, ${C.cardB})`,
      border: "2px solid rgba(255,220,200,0.65)",
      boxShadow: dim ? "0 0 30px rgba(240,120,70,0.25)" : "0 0 70px rgba(240,120,70,0.55), inset 0 0 30px rgba(255,200,170,0.25)",
      opacity: p * (dim ? 0.72 : 1), transform: `scale(${0.7 + 0.3 * p})`, filter: `blur(${(1 - p) * 10}px)`,
    }}
  >
    {children}
  </div>
);

// giữ đúng số chữ số thập phân của giá trị đích (2,2 -> 1 chữ số), dấu phẩy kiểu Việt
const fmt = (v: number, target: number) => {
  const dec = Number.isInteger(target) ? 0 : (String(target).split(".")[1] ?? "").length;
  return v.toLocaleString("vi-VN", { minimumFractionDigits: dec, maximumFractionDigits: dec });
};

const BigCard: React.FC<{ big: Big }> = ({ big }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [4, 16], [0, 1], { ...clamp, easing: Easing.out(Easing.back(1.4)) });
  const tp = interpolate(frame, [0, 8], [0, 1], clamp);
  const isNum = typeof big.value === "number";
  const v = isNum ? interpolate(frame, [6, 30], [big.countFrom ?? 0, big.value as number], { ...clamp, easing: ease }) : 0;
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      {/* chấm halftone quanh thẻ */}
      <div style={{ position: "absolute", width: 820, height: 620, opacity: 0.55 * p,
        backgroundImage: "radial-gradient(rgba(255,190,150,0.9) 2.2px, transparent 2.6px)", backgroundSize: "20px 20px",
        WebkitMaskImage: "radial-gradient(circle, #000 20%, transparent 68%)", maskImage: "radial-gradient(circle, #000 20%, transparent 68%)" }} />
      {big.title && (
        <div style={{ position: "absolute", top: 640, fontFamily: SANS, fontWeight: 700, fontSize: 48, color: C.white, opacity: tp, textShadow: "0 2px 10px rgba(0,0,0,0.3)" }}>
          {big.title}
        </div>
      )}
      <GlowCard w={660} h={250} p={p}>
        <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 150, color: C.white, letterSpacing: -4, textShadow: "0 6px 20px rgba(80,20,0,0.35)" }}>
          {big.prefix ?? ""}{isNum ? fmt(v, big.value as number) : big.value}{big.suffix ?? ""}
        </div>
      </GlowCard>
      {big.sub && (
        <div style={{ position: "absolute", top: 1240, fontFamily: SANS, fontWeight: 600, fontSize: 38, color: "#F7D9C6", opacity: p }}>{big.sub}</div>
      )}
    </AbsoluteFill>
  );
};

const CompareCards: React.FC<{ c: Compare; sceneFrom: number }> = ({ c, sceneFrom }) => {
  const frame = useCurrentFrame();
  const sec = useSec();
  const pl = interpolate(frame - sec(c.left.at - sceneFrom), [0, 12], [0, 1], { ...clamp, easing: Easing.out(Easing.back(1.4)) });
  const pr = interpolate(frame - sec(c.right.at - sceneFrom), [0, 12], [0, 1], { ...clamp, easing: Easing.out(Easing.back(1.4)) });
  const shift = interpolate(pr, [0, 1], [0, -230]);
  const sub = (s: string | undefined, op: number) => s && <div style={{ opacity: op, marginTop: 14, fontFamily: SANS, fontWeight: 700, fontSize: 24, color: "#F7D9C6", letterSpacing: 2, textTransform: "uppercase", textAlign: "center", whiteSpace: "pre-line" }}>{s}</div>;
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "absolute", transform: `translateX(${shift}px)`, textAlign: "center" }}>
        <GlowCard w={380} h={230} p={pl} dim={pr > 0.5}>
          <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: c.left.v.length > 9 ? 50 : 64, color: C.white, whiteSpace: "nowrap" }}>{c.left.v}</div>
        </GlowCard>
        {sub(c.left.sub, pl)}
      </div>
      <div style={{ position: "absolute", fontFamily: SERIF, fontStyle: "italic", fontSize: 50, color: "#F7D9C6", opacity: pr }}>vs</div>
      <div style={{ position: "absolute", transform: `translateX(${230 * pr}px)`, textAlign: "center", opacity: pr }}>
        <GlowCard w={400} h={250} p={pr}>
          <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: c.right.v.length > 9 ? 56 : 76, color: C.white, whiteSpace: "nowrap" }}>{c.right.v}</div>
        </GlowCard>
        {sub(c.right.sub, pr)}
      </div>
    </AbsoluteFill>
  );
};

const QuoteView: React.FC<{ lines: Scene["quote"]; sceneFrom: number }> = ({ lines = [], sceneFrom }) => {
  const sec = useSec();
  const frame = useCurrentFrame();
  const qp = interpolate(frame, [0, 10], [0, 1], clamp);
  return (
    <AbsoluteFill style={{ padding: "0 110px", justifyContent: "center" }}>
      <div style={{ fontFamily: SERIF, fontSize: 200, color: "rgba(246,176,138,0.75)", lineHeight: 0.6, opacity: qp, marginBottom: 30 }}>“</div>
      {lines.map((l, i) => (
        <LineView key={i} line={{ ...l, s: l.s ?? "serif" }} startFrame={sec((l.at ?? sceneFrom + i * 0.5) - sceneFrom)} tone="light" />
      ))}
    </AbsoluteFill>
  );
};

const DocView: React.FC<{ doc: Doc; sceneFrom: number }> = ({ doc, sceneFrom }) => {
  const frame = useCurrentFrame();
  const sec = useSec();
  const p = interpolate(frame, [0, 12], [0, 1], { ...clamp, easing: ease });
  const tf = frame - sec((doc.typeAt ?? sceneFrom + 0.6) - sceneFrom);
  const typed = doc.bar.slice(0, Math.max(0, Math.floor(tf / 1.6)));
  const lines = doc.lines ?? 9;
  return (
    <AbsoluteFill style={{ alignItems: "center" }}>
      <div style={{ position: "absolute", top: 520, width: 880, height: 84, borderRadius: 16, background: "rgba(255,230,215,0.16)",
        border: "1.5px solid rgba(255,214,186,0.4)", display: "flex", alignItems: "center", gap: 18, padding: "0 18px", opacity: p }}>
        <div style={{ width: 52, height: 52, borderRadius: 26, background: C.orange, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontFamily: SANS, fontWeight: 800 }}>●</div>
        <div style={{ flex: 1, fontFamily: tf > 0 ? SERIF : SANS, fontStyle: tf > 0 ? "italic" : "normal", fontWeight: 700, fontSize: 34, color: tf > 0 ? "#fff" : "rgba(255,255,255,0.45)" }}>
          {tf > 0 ? typed : "Thêm bình luận..."}
        </div>
        <div style={{ width: 48, height: 48, borderRadius: 24, background: C.orange, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, fontFamily: "Helvetica, Arial", fontWeight: 900 }}>↑</div>
      </div>
      {doc.note && <div style={{ position: "absolute", top: 640, fontFamily: SANS, fontWeight: 700, fontSize: 38, color: C.white, opacity: p }}>{doc.note}</div>}
      <div style={{ position: "absolute", top: 730, width: 640, height: 640, borderRadius: 20, padding: 36,
        background: `linear-gradient(160deg, ${C.cardA}, ${C.cardB})`, border: "2px solid rgba(255,220,200,0.65)",
        boxShadow: "0 0 70px rgba(240,120,70,0.5)", opacity: p, transform: `translateY(${(1 - p) * 60}px)` }}>
        <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 40, color: "#fff", marginBottom: 26 }}>{doc.title}</div>
        {Array.from({ length: lines }).map((_, i) => {
          const lp = interpolate(frame, [10 + i * 3, 18 + i * 3], [0, 1], clamp);
          return <div key={i} style={{ height: 14, borderRadius: 7, marginBottom: 26, width: `${(55 + ((i * 37) % 40)) * lp}%`, background: i % 3 === 1 ? "#FFB592" : "rgba(255,230,215,0.65)" }} />;
        })}
      </div>
    </AbsoluteFill>
  );
};

export const DarkLayout: React.FC<{ scene: Scene; talk: string }> = ({ scene, talk }) => {
  const sec = useSec();
  return (
    <AbsoluteFill>
      <DarkBg talk={talk} trim={sec(scene.from)} />
      {scene.big && <BigCard big={scene.big} />}
      {scene.compare && <CompareCards c={scene.compare} sceneFrom={scene.from} />}
      {scene.quote && <QuoteView lines={scene.quote} sceneFrom={scene.from} />}
      {scene.doc && <DocView doc={scene.doc} sceneFrom={scene.from} />}
    </AbsoluteFill>
  );
};

/* ---------------- LIGHT: nền kem, vòng tròn mảnh, số lớn cam đếm lên ---------------- */
export const LightLayout: React.FC<{ scene: Scene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const b = scene.light ?? { value: 100, suffix: "%" };
  const p = interpolate(frame, [0, 10], [0, 1], { ...clamp, easing: ease });
  const isNum = typeof b.value === "number";
  const v = isNum ? interpolate(frame, [8, 34], [b.countFrom ?? 0, b.value as number], { ...clamp, easing: ease }) : 0;
  return (
    <AbsoluteFill>
      <CreamBg />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div style={{ position: "absolute", width: 560, height: 560, borderRadius: 280, border: "2px solid rgba(224,108,50,0.25)", transform: `scale(${0.8 + 0.2 * p})` }} />
        <div style={{ position: "absolute", width: 700, height: 700, opacity: 0.4 * p,
          backgroundImage: "radial-gradient(rgba(232,116,59,0.7) 2.4px, transparent 2.8px)", backgroundSize: "18px 18px",
          WebkitMaskImage: "radial-gradient(circle at 30% 40%, #000 10%, transparent 45%)", maskImage: "radial-gradient(circle at 30% 40%, #000 10%, transparent 45%)" }} />
        {b.title && <div style={{ position: "absolute", top: 830, fontFamily: SANS, fontWeight: 700, fontSize: 44, color: C.brown, opacity: p }}>{b.title}</div>}
        <div style={{ position: "absolute", top: 900, fontFamily: SANS, fontWeight: 800, fontSize: 190, letterSpacing: -6,
          background: `linear-gradient(180deg, #F08A4B, ${C.orangeDeep})`, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent",
          opacity: p, filter: `blur(${(1 - p) * 10}px)` }}>
          {b.prefix ?? ""}{isNum ? fmt(v, b.value as number) : b.value}{b.suffix ?? ""}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
