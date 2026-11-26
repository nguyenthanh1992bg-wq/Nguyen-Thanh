import React, { CSSProperties } from "react";
import { interpolate, useCurrentFrame, useVideoConfig, Easing } from "remotion";
import { C, SANS, SERIF, SHADOW_TEXT } from "./theme";
import { Line, LineStyle } from "./types";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// Chữ hiện từng từ: mờ nhoè -> nét, trồi nhẹ lên (đặc trưng của video mẫu)
export const WordReveal: React.FC<{
  text: string;
  startFrame: number;
  style: CSSProperties;
  accent?: string[];
  accentColor?: string;
  stagger?: number;
}> = ({ text, startFrame, style, accent = [], accentColor, stagger = 2.2 }) => {
  const frame = useCurrentFrame();
  const words = text.split(" ");
  const acc = accent.map((a) => a.toLowerCase());
  // accent có thể là cụm nhiều từ: đánh dấu từng từ thuộc cụm
  const accWords = new Set(acc.flatMap((a) => a.split(" ")));
  return (
    <span style={{ ...style, display: "inline-block" }}>
      {words.map((w, i) => {
        const f = frame - startFrame - i * stagger;
        const p = interpolate(f, [0, 7], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
        const isAcc = accWords.has(w.toLowerCase().replace(/[.,!?…:]/g, ""));
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              opacity: p,
              filter: `blur(${(1 - p) * 9}px)`,
              transform: `translateY(${(1 - p) * 16}px) scale(${0.94 + 0.06 * p})`,
              color: isAcc && accentColor ? accentColor : undefined,
              marginRight: i < words.length - 1 ? "0.24em" : 0,
              whiteSpace: "pre",
            }}
          >
            {w}
          </span>
        );
      })}
    </span>
  );
};

export function lineStyle(s: LineStyle | undefined, tone: "light" | "dark"): CSSProperties {
  const onFace = tone === "light";
  switch (s) {
    case "serif":
      return {
        fontFamily: SERIF,
        fontStyle: "italic",
        fontWeight: 800,
        fontSize: 92,
        lineHeight: 1.05,
        letterSpacing: -1,
        color: onFace ? C.white : C.orangeText,
        textShadow: onFace ? SHADOW_TEXT : "0 4px 18px rgba(224,108,50,0.18)",
      };
    case "big":
      return {
        fontFamily: SANS,
        fontWeight: 800,
        fontSize: 112,
        lineHeight: 1.0,
        letterSpacing: -3,
        color: onFace ? C.white : C.orangeText,
        textShadow: onFace ? SHADOW_TEXT : undefined,
      };
    case "small":
      return {
        fontFamily: SANS,
        fontWeight: 600,
        fontSize: 34,
        lineHeight: 1.2,
        color: onFace ? "rgba(255,255,255,0.92)" : C.brownSoft,
        textShadow: onFace ? SHADOW_TEXT : undefined,
      };
    default:
      return {
        fontFamily: SANS,
        fontWeight: 700,
        fontSize: 46,
        lineHeight: 1.18,
        letterSpacing: -0.6,
        color: onFace ? C.white : C.brown,
        textShadow: onFace ? SHADOW_TEXT : undefined,
      };
  }
}

export const LineView: React.FC<{ line: Line; startFrame: number; tone: "light" | "dark"; align?: "center" | "right" | "left" }> = ({
  line,
  startFrame,
  tone,
  align = "center",
}) => {
  const st = lineStyle(line.s, tone);
  const accentColor = tone === "light" ? C.peachAccent : C.orangeText;
  const frame = useCurrentFrame();
  const inner = <WordReveal text={line.t} startFrame={startFrame} style={st} accent={line.accent} accentColor={accentColor} />;
  if (line.pill) {
    const p = interpolate(frame - startFrame, [0, 8], [0, 1], { ...clamp, easing: Easing.out(Easing.back(1.6)) });
    return (
      <div style={{ textAlign: align }}>
        <span
          style={{
            display: "inline-block",
            padding: "4px 22px 10px",
            borderRadius: 14,
            background: "rgba(52,28,16,0.62)",
            border: `2px solid ${C.glassBorder}`,
            boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
            transform: `scale(${0.85 + 0.15 * p})`,
            opacity: p,
          }}
        >
          <WordReveal
            text={line.t}
            startFrame={startFrame}
            style={{ ...st, color: tone === "light" ? "#FBE3D2" : C.cream, textShadow: "none" }}
          />
        </span>
      </div>
    );
  }
  return <div style={{ textAlign: align }}>{inner}</div>;
};

export function useExit(durationFrames: number, len = 6) {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [durationFrames - len, durationFrames], [1, 0], clamp);
  return { opacity: p, filter: `blur(${(1 - p) * 8}px)` } as CSSProperties;
}

export function useSec() {
  const { fps } = useVideoConfig();
  return (s: number) => Math.round(s * fps);
}
