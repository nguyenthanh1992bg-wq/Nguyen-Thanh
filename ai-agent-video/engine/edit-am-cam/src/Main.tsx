import React from "react";
import { AbsoluteFill, Sequence, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { Plan, Scene, Pos } from "./types";
import { FaceLayout, SplitLayout, DarkLayout, LightLayout } from "./Layouts";
import { OverlayView } from "./Overlays";

const TRANS = 8; // số khung chuyển cảnh (mờ + phóng)

// Chuyển cảnh: cảnh mới hiện ra từ nhoè + phóng nhẹ, đè lên cảnh cũ đang kéo dài thêm TRANS khung
const SceneWrap: React.FC<{ children: React.ReactNode; first: boolean }> = ({ children, first }) => {
  const frame = useCurrentFrame();
  const len = first ? 12 : TRANS;
  const p = interpolate(frame, [0, len], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const blur = (1 - p) * (first ? 30 : 22);
  return (
    <AbsoluteFill style={{ opacity: first ? 1 : p, filter: blur > 0.1 ? `blur(${blur}px)` : undefined, transform: `scale(${1.06 - 0.06 * p})` }}>
      {children}
    </AbsoluteFill>
  );
};

const SceneView: React.FC<{ s: Scene; talk: string; dur: number; faceY?: number; broll?: string[] }> = ({ s, talk, dur, faceY, broll }) => {
  if (s.layout === "split") return <SplitLayout scene={s} talk={talk} faceY={faceY} broll={broll} />;
  if (s.layout === "dark") return <DarkLayout scene={s} talk={talk} />;
  if (s.layout === "light") return <LightLayout scene={s} />;
  return <FaceLayout scene={s} talk={talk} dur={dur} />;
};

export const Main: React.FC<Plan> = (plan) => {
  const { fps, durationInFrames } = useVideoConfig();
  const f = (s: number) => Math.round(s * fps);
  const sceneAt = (t: number) => plan.scenes.find((s) => t >= s.from && t < s.to) ?? plan.scenes[plan.scenes.length - 1];
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {plan.scenes.map((s, i) => {
        const from = f(s.from);
        const dur = Math.min(f(s.to) - from + TRANS, durationInFrames - from);
        if (dur <= 0) return null;
        return (
          <Sequence key={`s${i}`} from={from} durationInFrames={dur} name={`${s.layout} ${s.from}s`}>
            <SceneWrap first={i === 0}>
              <SceneView s={s} talk={plan.talk} dur={dur} faceY={plan.faceY} broll={plan._assets?.broll?.length ? plan._assets.broll : plan._assets?.thumbs} />
            </SceneWrap>
          </Sequence>
        );
      })}
      {plan.overlays.map((o, i) => {
        const from = f(o.from);
        const dur = Math.max(1, f(o.to) - from);
        const sc = sceneAt(o.from + 0.01);
        const tone = sc.layout === "split" || sc.layout === "light" ? "dark" : "light";
        const defPos: Pos = sc.layout === "split" ? "mid" : sc.layout === "face" ? "low" : "center";
        return (
          <Sequence key={`o${i}`} from={from} durationInFrames={dur} name={`${o.type} ${o.from}s`}>
            <OverlayView o={o} tone={tone} dur={dur} defPos={defPos} captionY={plan.captionY} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
