// Đặc tả plan.json: mọi mốc thời gian tính bằng GIÂY trên dòng thời gian của talk.mp4 (đã cắt khoảng lặng)

export type LineStyle = "sans" | "serif" | "big" | "small";
export type Line = {
  t: string; // nội dung dòng
  s?: LineStyle; // kiểu chữ, mặc định sans
  at?: number; // giây bắt đầu hiện dòng (mặc định: from + thứ tự * 0.35)
  accent?: string[]; // từ được tô màu nhấn
  pill?: boolean; // đặt dòng trong nhãn kính nâu (kiểu "trực tiếp với file", "edit")
};

export type Pos = "top" | "mid" | "low" | "center" | "right";

export type Caption = { type: "caption"; from: number; to: number; lines: Line[]; pos?: Pos; tone?: "light" | "dark" };
export type Tags = { type: "tags"; from: number; to: number; items: { t: string; at: number }[] };
export type Flow = { type: "flow"; from: number; to: number; items: { t: string; at: number }[] };
export type Progress = { type: "progress"; from: number; to: number; label: string; value: number };
export type Checklist = { type: "checklist"; from: number; to: number; title: string; items: { t: string; at: number }[] };
export type Follow = { type: "follow"; from: number; to: number; name: string; handle: string; letter?: string; clickAt?: number };
export type Stamp = { type: "stamp"; from: number; to: number; text: string; pos?: Pos };
export type Floaters = { type: "floaters"; from: number; to: number; images: string[]; mode?: "sides" | "fan" | "strip" | "wall"; title?: string };
export type Pill = { type: "pill"; from: number; to: number; text: string; pos?: Pos };

export type Overlay = Caption | Tags | Flow | Progress | Checklist | Follow | Stamp | Floaters | Pill;

export type TreeNode = { name: string; note?: string; at: number };
export type Tree = { step?: string; root: string; rootNote?: string; rootAt: number; children: TreeNode[] };

export type Big = { title?: string; value: string | number; prefix?: string; suffix?: string; countFrom?: number; sub?: string };
export type Compare = { left: { v: string; sub?: string; at: number }; right: { v: string; sub?: string; at: number } };
export type Doc = { bar: string; typeAt?: number; note?: string; title: string; lines?: number };

// B-roll màn hình động: terminal (Claude Code gõ lệnh) | chat | editor (timeline) | folder | browser
export type Ui = {
  kind: "terminal" | "chat" | "editor" | "folder" | "browser";
  title?: string;
  steps?: { t: string; at?: number }[]; // mỗi bước hiện/gõ đúng lúc nói; ">" = lệnh người dùng (terminal)
  images?: string[]; // ảnh cho editor/folder/browser (mặc định lấy kho B-roll)
  caption?: string; // chữ phụ đề trong khung xem trước của editor
  dur?: number;
};

export type Scene = {
  from: number;
  to: number;
  layout: "face" | "split" | "dark" | "light";
  // face
  zoom?: number; // tỉ lệ phóng đầu cảnh (1 = gốc)
  zoomTo?: number; // tỉ lệ phóng cuối cảnh (zoom chậm)
  focusY?: number; // tâm phóng theo chiều dọc (0..1), mặc định 0.38 (mặt)
  // split
  media?: string; // đường dẫn trong public/ (video quay màn hình hoặc ảnh)
  mediaStart?: number; // giây bắt đầu trong file media
  window?: string; // nếu không có media: dựng cửa sổ ứng dụng giả với tiêu đề này
  tree?: Tree; // sơ đồ thư mục thay cho khung màn hình
  ui?: Ui; // B-roll màn hình động khi không có quay màn hình
  card?: { big: string; sub?: string; at: number }; // thẻ kính cam nổi trên khung màn hình
  punches?: { at: number; z: number }[]; // face: nhảy zoom tức thì tại giây at lên tỉ lệ z
  // dark
  big?: Big;
  compare?: Compare;
  quote?: Line[];
  doc?: Doc;
  // light
  light?: Big;
};

export type Plan = {
  fps: number;
  duration: number;
  talk: string; // public/ path tới talk.mp4
  faceY?: number; // vị trí mặt theo chiều dọc trong khung gốc (0..1), mặc định 0.42 — dùng cắt khung PIP
  captionY?: number; // toạ độ y (px trên 1920) của chữ vị trí "low", mặc định 1250
  scenes: Scene[];
  overlays: Overlay[];
  sfx?: { at: number; name: string; vol?: number }[]; // dùng ở bước trộn âm (python), Remotion bỏ qua
  music?: { file?: string; gen?: boolean; drops?: number[]; breaks?: number[][]; bpm?: number; lufs?: number };
  speed?: number;
  _assets?: { thumbs?: string[]; screens?: string[]; broll?: string[] };
};
