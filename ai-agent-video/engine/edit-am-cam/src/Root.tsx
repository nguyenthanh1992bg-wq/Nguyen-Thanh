import React from "react";
import { Composition } from "remotion";
import { Main } from "./Main";
import { Plan } from "./types";
import { W, H } from "./theme";

const demo: Plan = {
  fps: 30,
  duration: 6,
  talk: "jobs/demo/talk.mp4",
  scenes: [{ from: 0, to: 6, layout: "face", zoom: 1, zoomTo: 1.06 }],
  overlays: [
    { type: "caption", from: 0.2, to: 5.8, pos: "top", lines: [{ t: "hơn", s: "sans" }, { t: "1 phút", s: "big", at: 0.5 }] },
  ],
};

export const RemotionRoot: React.FC = () => (
  <Composition
    id="Main"
    component={Main as unknown as React.FC<Record<string, unknown>>}
    width={W}
    height={H}
    fps={30}
    durationInFrames={180}
    defaultProps={demo as unknown as Record<string, unknown>}
    calculateMetadata={({ props }) => {
      const p = props as unknown as Plan;
      return { durationInFrames: Math.max(1, Math.round(p.duration * (p.fps ?? 30))), fps: p.fps ?? 30 };
    }}
  />
);
