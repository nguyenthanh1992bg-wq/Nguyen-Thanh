import { loadFont as loadSans } from "@remotion/google-fonts/BeVietnamPro";
import { loadFont as loadSerif } from "@remotion/google-fonts/PlayfairDisplay";

// Hai họ chữ của style: sans đậm (Be Vietnam Pro) + serif nghiêng (Playfair Display Italic)
export const SANS = loadSans("normal", {
  weights: ["500", "600", "700", "800"],
  subsets: ["vietnamese", "latin"],
}).fontFamily;
export const SERIF = loadSerif("italic", {
  weights: ["600", "700", "800"],
  subsets: ["vietnamese", "latin"],
}).fontFamily;

export const W = 1080;
export const H = 1920;

// Bảng màu "ấm cam" đo từ video mẫu
export const C = {
  orange: "#E8743B",
  orangeText: "#E06C32",
  orangeDeep: "#C4532A",
  peach: "#F6B08A",
  peachAccent: "#FFB592",
  cream: "#FBF1E8",
  creamDeep: "#F6DCC8",
  brown: "#3A2418",
  brownSoft: "#6B4A38",
  white: "#FFFFFF",
  cardA: "#E07448",
  cardB: "#B4472A",
  glass: "rgba(62,34,20,0.58)",
  glassBorder: "rgba(255,214,186,0.45)",
};

export const SHADOW_TEXT = "0 3px 14px rgba(0,0,0,0.38), 0 1px 3px rgba(0,0,0,0.3)";
