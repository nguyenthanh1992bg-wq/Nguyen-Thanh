export interface Avatar { id: string; emoji: string; name: string; cost: number }

export const AVATARS: Avatar[] = [
  { id: 'cat', emoji: '🐱', name: 'Mèo Mimi', cost: 0 },
  { id: 'dog', emoji: '🐶', name: 'Cún Bông', cost: 0 },
  { id: 'panda', emoji: '🐼', name: 'Gấu trúc Tròn', cost: 60 },
  { id: 'fox', emoji: '🦊', name: 'Cáo Lửa', cost: 90 },
  { id: 'robot', emoji: '🤖', name: 'Robot Bi', cost: 120 },
  { id: 'rocket', emoji: '🚀', name: 'Tên lửa Sao', cost: 150 },
  { id: 'unicorn', emoji: '🦄', name: 'Kỳ lân Mây', cost: 220 },
  { id: 'dragon', emoji: '🐲', name: 'Rồng Con', cost: 300 },
];

export const LEVELS: { min: number; name: string }[] = [
  { min: 0, name: 'Hạt giống' },
  { min: 100, name: 'Mầm non' },
  { min: 300, name: 'Cây nhỏ' },
  { min: 600, name: 'Cây xanh' },
  { min: 1000, name: 'Khu vườn' },
  { min: 1600, name: 'Rừng nhỏ' },
  { min: 2500, name: 'Rừng lớn' },
];

/** Từ vựng có hình minh họa (emoji) dùng cho các trò chơi. Nội dung tự biên soạn. */
export interface PictureWord { en: string; vi: string; emoji: string }

export const PICTURE_WORDS: PictureWord[] = [
  { en: 'apple', vi: 'quả táo', emoji: '🍎' }, { en: 'banana', vi: 'quả chuối', emoji: '🍌' },
  { en: 'orange', vi: 'quả cam', emoji: '🍊' }, { en: 'grapes', vi: 'quả nho', emoji: '🍇' },
  { en: 'egg', vi: 'quả trứng', emoji: '🥚' }, { en: 'milk', vi: 'sữa', emoji: '🥛' },
  { en: 'cake', vi: 'bánh ngọt', emoji: '🍰' }, { en: 'bread', vi: 'bánh mì', emoji: '🍞' },
  { en: 'cat', vi: 'con mèo', emoji: '🐱' }, { en: 'dog', vi: 'con chó', emoji: '🐶' },
  { en: 'bird', vi: 'con chim', emoji: '🐦' }, { en: 'fish', vi: 'con cá', emoji: '🐟' },
  { en: 'rabbit', vi: 'con thỏ', emoji: '🐰' }, { en: 'elephant', vi: 'con voi', emoji: '🐘' },
  { en: 'tree', vi: 'cái cây', emoji: '🌳' }, { en: 'flower', vi: 'bông hoa', emoji: '🌸' },
  { en: 'sun', vi: 'mặt trời', emoji: '☀️' }, { en: 'moon', vi: 'mặt trăng', emoji: '🌙' },
  { en: 'star', vi: 'ngôi sao', emoji: '⭐' }, { en: 'rain', vi: 'mưa', emoji: '🌧️' },
  { en: 'house', vi: 'ngôi nhà', emoji: '🏠' }, { en: 'car', vi: 'ô tô', emoji: '🚗' },
  { en: 'bus', vi: 'xe buýt', emoji: '🚌' }, { en: 'bike', vi: 'xe đạp', emoji: '🚲' },
  { en: 'book', vi: 'quyển sách', emoji: '📖' }, { en: 'pencil', vi: 'bút chì', emoji: '✏️' },
  { en: 'bag', vi: 'cái cặp', emoji: '🎒' }, { en: 'clock', vi: 'đồng hồ', emoji: '🕒' },
  { en: 'phone', vi: 'điện thoại', emoji: '📱' }, { en: 'umbrella', vi: 'cái ô', emoji: '☂️' },
  { en: 'ball', vi: 'quả bóng', emoji: '⚽' }, { en: 'key', vi: 'chìa khóa', emoji: '🔑' },
  { en: 'hat', vi: 'cái mũ', emoji: '🎩' }, { en: 'shoe', vi: 'chiếc giày', emoji: '👟' },
  { en: 'eye', vi: 'con mắt', emoji: '👁️' }, { en: 'hand', vi: 'bàn tay', emoji: '✋' },
];

/** Hình minh họa (emoji) cho từ vựng của các bài học. */
export const VOCAB_EMOJI: Record<string, string> = {
  alphabet: '🔤', letter: '✉️', vowel: '🅰️', consonant: '🅱️', spell: '🔡',
  student: '🧑‍🎓', teacher: '🧑‍🏫', friend: '🤝', classroom: '🏫', happy: '😀', tall: '🦒',
  box: '📦', bus: '🚌', city: '🏙️', child: '🧒', toy: '🧸', watch: '⌚',
  egg: '🥚', orange: '🍊', umbrella: '☂️', nurse: '🧑‍⚕️', moon: '🌙', artist: '🧑‍🎨',
  tail: '🐕', notebook: '📓', phone: '📱', sister: '👧', house: '🏠', football: '⚽',
  clock: '🕒', wall: '🧱', desk: '📚', library: '🏛️', park: '🏞️', garden: '🌷',
  breakfast: '🍳', 'every day': '📅', usually: '🔁', brush: '🪥', cook: '👩‍🍳', Saturday: '🗓️',
};
