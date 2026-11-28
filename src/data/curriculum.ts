import type { SkillTag, UnitDef, UnitId } from '../types';

export const UNITS: UnitDef[] = [
  { id: 'U01', name: 'Bảng chữ cái & âm cơ bản', skill: 'alphabet', prerequisites: [], summary: '26 chữ cái, nguyên âm – phụ âm, tên chữ cái.' },
  { id: 'U02', name: 'Từ vựng thông dụng', skill: 'vocabulary', prerequisites: [], summary: 'Gia đình, đồ vật, màu sắc, số đếm, hoạt động hằng ngày.' },
  { id: 'U03', name: 'Đại từ nhân xưng & to be', skill: 'grammar', prerequisites: ['U02'], summary: 'I/you/he/she/it/we/they với am – is – are.' },
  { id: 'U04', name: 'Danh từ số ít – số nhiều', skill: 'grammar', prerequisites: ['U02'], summary: 'Thêm -s, -es, -ies và một vài từ bất quy tắc.' },
  { id: 'U05', name: 'Mạo từ a / an / the', skill: 'grammar', prerequisites: ['U01', 'U04'], summary: 'Chọn a hay an theo âm đầu; khi nào dùng the.' },
  { id: 'U06', name: 'Tính từ sở hữu', skill: 'grammar', prerequisites: ['U03'], summary: 'my, your, his, her, its, our, their.' },
  { id: 'U07', name: 'Đại từ chỉ định', skill: 'grammar', prerequisites: ['U03', 'U04'], summary: 'this, that, these, those.' },
  { id: 'U08', name: 'Have / has', skill: 'structure', prerequisites: ['U03', 'U06'], summary: 'Diễn tả sở hữu: I have…, She has…' },
  { id: 'U09', name: 'There is / There are', skill: 'structure', prerequisites: ['U03', 'U04', 'U05'], summary: 'Nói về sự tồn tại của người, vật.' },
  { id: 'U10', name: 'Hiện tại đơn', skill: 'grammar', prerequisites: ['U08'], summary: 'Thói quen, sự thật; thêm -s/-es với he/she/it.' },
  { id: 'U11', name: 'Do / does & cách đặt câu hỏi', skill: 'structure', prerequisites: ['U10'], summary: 'Câu hỏi và phủ định ở hiện tại đơn.' },
  { id: 'U12', name: 'Hiện tại tiếp diễn', skill: 'grammar', prerequisites: ['U03', 'U10'], summary: 'am/is/are + V-ing cho việc đang diễn ra.' },
  { id: 'U13', name: 'Danh từ đếm được – không đếm được', skill: 'grammar', prerequisites: ['U04'], summary: 'some, any, a few, a little, much, many.' },
  { id: 'U14', name: 'Giới từ chỉ vị trí và thời gian', skill: 'grammar', prerequisites: ['U02'], summary: 'in, on, at, under, next to; in/on/at với thời gian.' },
  { id: 'U15', name: 'Từ để hỏi', skill: 'structure', prerequisites: ['U03'], summary: 'what, where, when, who, why, how.' },
  { id: 'U16', name: 'Tính từ, trạng từ & trật tự từ', skill: 'structure', prerequisites: ['U02'], summary: 'Vị trí tính từ, trạng từ chỉ cách thức, trật tự từ cơ bản.' },
  { id: 'U17', name: 'Câu khẳng định – phủ định – nghi vấn', skill: 'structure', prerequisites: ['U03'], summary: 'Biến đổi câu và trả lời ngắn Yes/No.' },
  { id: 'U18', name: 'Đọc hiểu cơ bản', skill: 'reading', prerequisites: ['U02', 'U03'], summary: 'Đọc đoạn ngắn, tìm thông tin chi tiết.' },
  { id: 'U19', name: 'Nghe hiểu cơ bản', skill: 'listening', prerequisites: ['U02'], summary: 'Nghe câu ngắn, bắt thông tin chính.' },
  { id: 'U20', name: 'Viết câu cơ bản', skill: 'writing', prerequisites: ['U03'], summary: 'Sắp xếp từ thành câu đúng trật tự.' },
];

const UNIT_INDEX = new Map(UNITS.map((u, i) => [u.id, i]));
export const unitIndex = (id: UnitId): number => UNIT_INDEX.get(id) ?? 99;
export const getUnit = (id: UnitId): UnitDef => {
  const u = UNITS.find((x) => x.id === id);
  if (!u) throw new Error(`Unknown unit ${id}`);
  return u;
};

export const SKILL_LABEL: Record<SkillTag, string> = {
  alphabet: 'Bảng chữ cái',
  vocabulary: 'Từ vựng',
  structure: 'Cấu trúc câu',
  grammar: 'Ngữ pháp',
  reading: 'Đọc hiểu',
  listening: 'Nghe hiểu',
  writing: 'Viết câu',
};

export type PhaseId = 'A' | 'B' | 'C' | 'D';

export interface Phase {
  id: PhaseId;
  name: string;
  weeks: [number, number];
  description: string;
  exit: string;
}

export const PHASES: Phase[] = [
  { id: 'A', name: 'Kiểm tra đầu vào & hồ sơ năng lực', weeks: [1, 1], description: 'Làm quen ứng dụng, làm bài đánh giá đầu vào (có thể chia làm nhiều buổi) và xem hồ sơ năng lực.', exit: 'Hoàn thành bài đánh giá đầu vào (≥ 30/40 câu) và xem báo cáo. Nếu dữ liệu chưa đủ, làm thêm bài đánh giá bổ sung.' },
  { id: 'B', name: 'Phục hồi kiến thức tiểu học còn thiếu', weeks: [2, 4], description: 'Chữ cái, từ vựng nền, to be, số nhiều, mạo từ, sở hữu, chỉ định. Học sinh đã vững phần nào có thể rút gọn phần đó.', exit: 'Các bài của giai đoạn B đạt ≥ 2/3 câu kiểm tra cuối bài và bài kiểm tra tuần ≥ 70%.' },
  { id: 'C', name: 'Củng cố nền tảng & làm quen yêu cầu lớp 6', weeks: [5, 7], description: 'Have/has, there is/are, đếm được – không đếm được, giới từ, từ để hỏi, các dạng câu.', exit: 'Các bài giai đoạn C đạt yêu cầu và ≥ 70% ở bài kiểm tra tuần; lỗi lặp lại đã được khắc phục.' },
  { id: 'D', name: 'Kiến thức lớp 6, vận dụng & đánh giá tiến bộ', weeks: [8, 12], description: 'Hiện tại đơn, do/does, hiện tại tiếp diễn, trật tự từ, đọc – nghe – viết; đánh giá lại cuối giai đoạn.', exit: 'Bài tổng kết tuần 12 ≥ 70% và các đơn vị kiến thức đạt mức "Vững" trở lên. Chưa đạt thì lặp lại các tuần tương ứng (không tự động tăng độ khó).' },
];

export interface WeekPlan {
  week: number;
  phase: PhaseId;
  title: string;
  goals: string[];
  units: UnitId[];
  /** Đơn vị dùng để lấy câu cho bài kiểm tra tuần (mặc định = units). */
  testUnits?: UnitId[];
  vocabTheme: { en: string; vi: string }[];
  structures: string[];
  practice: string[];
  weeklyTest: string;
  advance: string;
  retry: string;
}

const RETRY_STD = 'Chưa đạt: xem lại bài chưa đạt, làm phần "Giải thích lại đơn giản", ôn lỗi sai 2 ngày rồi làm lại bài kiểm tra tuần (câu hỏi được ưu tiên chọn câu chưa gặp).';
const ADVANCE_STD = 'Đạt ≥ 70% bài kiểm tra tuần và các bài trong tuần đạt ≥ 2/3 câu cuối bài.';

export const WEEKS: WeekPlan[] = [
  {
    week: 1, phase: 'A', title: 'Đánh giá đầu vào & hồ sơ năng lực',
    goals: ['Làm bài đánh giá 40 câu (có thể dừng và làm tiếp)', 'Xem hồ sơ năng lực và lộ trình cá nhân hóa'],
    units: [],
    vocabTheme: [{ en: 'hello', vi: 'xin chào' }, { en: 'name', vi: 'tên' }, { en: 'age', vi: 'tuổi' }, { en: 'school', vi: 'trường học' }],
    structures: ['Chưa dạy kiến thức mới – chỉ đo để hiểu em đang ở đâu'],
    practice: ['Bài đánh giá theo 20 nhóm kiến thức', 'Bài đánh giá bổ sung (nếu dữ liệu chưa đủ)'],
    weeklyTest: 'Chính là bài đánh giá đầu vào.',
    advance: 'Đã có hồ sơ năng lực với đủ dữ liệu (≥ 30/40 câu).',
    retry: 'Nếu chưa đủ dữ liệu: làm tiếp các câu còn lại hoặc bài đánh giá bổ sung.',
  },
  {
    week: 2, phase: 'B', title: 'Chữ cái & từ vựng nền',
    goals: ['Nhớ tên 26 chữ cái, phân biệt nguyên âm – phụ âm', 'Nhận biết từ vựng thông dụng về gia đình, đồ vật, màu sắc, số đếm'],
    units: ['U01', 'U02'],
    vocabTheme: [{ en: 'mother', vi: 'mẹ' }, { en: 'father', vi: 'bố' }, { en: 'brother', vi: 'anh/em trai' }, { en: 'sister', vi: 'chị/em gái' }, { en: 'red', vi: 'màu đỏ' }, { en: 'blue', vi: 'màu xanh dương' }, { en: 'book', vi: 'quyển sách' }, { en: 'pen', vi: 'cái bút' }],
    structures: ['Chữ cái – nguyên âm (A, E, I, O, U) – phụ âm', 'Gọi tên đồ vật: This is a…'],
    practice: ['Sắp xếp chữ cái theo thứ tự', 'Nối từ – nghĩa', 'Ôn từ vựng cách quãng'],
    weeklyTest: '8 câu từ U01, U02.', advance: ADVANCE_STD, retry: RETRY_STD,
  },
  {
    week: 3, phase: 'B', title: 'To be và danh từ số nhiều',
    goals: ['Dùng đúng am / is / are với đại từ nhân xưng', 'Chuyển danh từ số ít sang số nhiều'],
    units: ['U03', 'U04'],
    vocabTheme: [{ en: 'student', vi: 'học sinh' }, { en: 'teacher', vi: 'giáo viên' }, { en: 'friend', vi: 'bạn' }, { en: 'classroom', vi: 'lớp học' }, { en: 'box', vi: 'cái hộp' }, { en: 'city', vi: 'thành phố' }, { en: 'child', vi: 'đứa trẻ' }, { en: 'toy', vi: 'đồ chơi' }],
    structures: ['I am / You are / He is…', 'Số nhiều: -s, -es, -ies, từ bất quy tắc'],
    practice: ['Điền am/is/are', 'Chọn dạng số nhiều', 'Viết 3 câu giới thiệu bản thân'],
    weeklyTest: '8 câu từ U03, U04.', advance: ADVANCE_STD, retry: RETRY_STD,
  },
  {
    week: 4, phase: 'B', title: 'Mạo từ, sở hữu và chỉ định',
    goals: ['Chọn a / an / the đúng ngữ cảnh', 'Dùng my, your, his, her… và this, that, these, those'],
    units: ['U05', 'U06', 'U07'],
    vocabTheme: [{ en: 'egg', vi: 'quả trứng' }, { en: 'orange', vi: 'quả cam' }, { en: 'umbrella', vi: 'cái ô' }, { en: 'bag', vi: 'cái cặp' }, { en: 'parents', vi: 'bố mẹ' }, { en: 'pet', vi: 'thú cưng' }],
    structures: ['a + phụ âm / an + nguyên âm', 'my / your / his / her / its / our / their', 'This is… / Those are…'],
    practice: ['Chọn a/an', 'Điền tính từ sở hữu', 'Chọn this/that/these/those theo hình'],
    weeklyTest: '8 câu từ U05, U06, U07.', advance: ADVANCE_STD, retry: RETRY_STD,
  },
  {
    week: 5, phase: 'C', title: 'Have/has và There is/There are',
    goals: ['Nói về những gì mình có bằng have / has', 'Mô tả đồ vật trong phòng bằng there is / there are'],
    units: ['U08', 'U09'],
    vocabTheme: [{ en: 'desk', vi: 'bàn học' }, { en: 'clock', vi: 'đồng hồ' }, { en: 'wall', vi: 'bức tường' }, { en: 'garden', vi: 'khu vườn' }, { en: 'library', vi: 'thư viện' }, { en: 'phone', vi: 'điện thoại' }],
    structures: ['I/you/we/they + have; he/she/it + has', 'There is + số ít; There are + số nhiều', 'Is there…? Are there…?'],
    practice: ['Điền have/has', 'Điền is/are sau There', 'Trả lời ngắn Yes, there is/are'],
    weeklyTest: '8 câu từ U08, U09.', advance: ADVANCE_STD, retry: RETRY_STD,
  },
  {
    week: 6, phase: 'C', title: 'Đếm được/không đếm được và giới từ',
    goals: ['Phân biệt danh từ đếm được và không đếm được', 'Dùng in / on / at / under / next to'],
    units: ['U13', 'U14'],
    vocabTheme: [{ en: 'water', vi: 'nước' }, { en: 'milk', vi: 'sữa' }, { en: 'rice', vi: 'cơm/gạo' }, { en: 'table', vi: 'cái bàn' }, { en: 'under', vi: 'bên dưới' }, { en: 'next to', vi: 'bên cạnh' }],
    structures: ['some / any / a few / a little', 'in + tháng, on + thứ/ngày, at + giờ', 'in / on / under / next to'],
    practice: ['Phân loại danh từ', 'Chọn lượng từ', 'Điền giới từ theo tranh'],
    weeklyTest: '8 câu từ U13, U14.', advance: ADVANCE_STD, retry: RETRY_STD,
  },
  {
    week: 7, phase: 'C', title: 'Từ để hỏi và các dạng câu',
    goals: ['Chọn đúng từ để hỏi', 'Biến câu khẳng định thành phủ định, nghi vấn và trả lời ngắn'],
    units: ['U15', 'U17'],
    vocabTheme: [{ en: 'what', vi: 'cái gì' }, { en: 'where', vi: 'ở đâu' }, { en: 'when', vi: 'khi nào' }, { en: 'who', vi: 'ai' }, { en: 'why', vi: 'tại sao' }, { en: 'how', vi: 'như thế nào' }],
    structures: ['Wh-word + be + chủ ngữ?', 'S + be + not; Be + S?', 'Yes, I am. / No, he isn\'t.'],
    practice: ['Nối câu hỏi – câu trả lời', 'Biến đổi câu', 'Đóng vai hỏi đáp ngắn'],
    weeklyTest: '8 câu từ U15, U17.', advance: ADVANCE_STD, retry: RETRY_STD,
  },
  {
    week: 8, phase: 'D', title: 'Hiện tại đơn',
    goals: ['Dùng hiện tại đơn cho thói quen và sự thật', 'Thêm -s/-es đúng với he/she/it'],
    units: ['U10'],
    vocabTheme: [{ en: 'breakfast', vi: 'bữa sáng' }, { en: 'every day', vi: 'mỗi ngày' }, { en: 'usually', vi: 'thường xuyên' }, { en: 'brush', vi: 'đánh (răng)' }, { en: 'cook', vi: 'nấu ăn' }, { en: 'Saturday', vi: 'thứ Bảy' }],
    structures: ['I/you/we/they + V; he/she/it + V-s/es', 'Trạng từ tần suất: always, usually, sometimes'],
    practice: ['Chia động từ', 'Nối hoạt động – thời gian', 'Viết 3 câu về thói quen'],
    weeklyTest: '8 câu từ U10.', advance: ADVANCE_STD, retry: RETRY_STD,
  },
  {
    week: 9, phase: 'D', title: 'Do/does và đặt câu hỏi',
    goals: ['Đặt câu hỏi Yes/No với do/does', 'Viết câu phủ định với don\'t/doesn\'t'],
    units: ['U11'],
    vocabTheme: [{ en: 'like', vi: 'thích' }, { en: 'play', vi: 'chơi' }, { en: 'drink', vi: 'uống' }, { en: 'sometimes', vi: 'thỉnh thoảng' }, { en: 'never', vi: 'không bao giờ' }, { en: 'weekend', vi: 'cuối tuần' }],
    structures: ['Do/Does + S + V?', 'S + don\'t/doesn\'t + V (nguyên mẫu)', 'Yes, she does. / No, they don\'t.'],
    practice: ['Điền do/does', 'Sửa lỗi V-s sau doesn\'t', 'Hỏi đáp theo cặp'],
    weeklyTest: '8 câu từ U11.', advance: ADVANCE_STD, retry: RETRY_STD,
  },
  {
    week: 10, phase: 'D', title: 'Hiện tại tiếp diễn',
    goals: ['Mô tả việc đang diễn ra bằng am/is/are + V-ing', 'Phân biệt hiện tại đơn và hiện tại tiếp diễn ở mức cơ bản'],
    units: ['U12'],
    vocabTheme: [{ en: 'now', vi: 'bây giờ' }, { en: 'listen', vi: 'lắng nghe' }, { en: 'sing', vi: 'hát' }, { en: 'run', vi: 'chạy' }, { en: 'sleep', vi: 'ngủ' }, { en: 'garden', vi: 'khu vườn' }],
    structures: ['S + am/is/are + V-ing', 'Dấu hiệu: now, at the moment, Look!, Listen!'],
    practice: ['Mô tả tranh', 'Chia V-ing', 'Chọn hiện tại đơn hay tiếp diễn'],
    weeklyTest: '8 câu từ U12.', advance: ADVANCE_STD, retry: RETRY_STD,
  },
  {
    week: 11, phase: 'D', title: 'Trật tự từ, đọc hiểu và viết câu',
    goals: ['Sắp xếp tính từ, trạng từ đúng vị trí', 'Đọc đoạn ngắn tìm thông tin; viết câu đúng trật tự'],
    units: ['U16', 'U18', 'U20'],
    vocabTheme: [{ en: 'quickly', vi: 'một cách nhanh chóng' }, { en: 'slowly', vi: 'một cách chậm rãi' }, { en: 'kind', vi: 'tốt bụng' }, { en: 'small', vi: 'nhỏ' }, { en: 'because', vi: 'bởi vì' }, { en: 'every evening', vi: 'mỗi buổi tối' }],
    structures: ['Tính từ đứng trước danh từ: a small red bag', 'Trạng từ cách thức: slowly, quickly', 'Chủ ngữ + động từ + tân ngữ + nơi chốn/thời gian'],
    practice: ['Đọc đoạn văn và trả lời', 'Sắp xếp từ thành câu', 'Viết 3 câu giới thiệu gia đình'],
    weeklyTest: '8 câu từ U16, U18, U20.', advance: ADVANCE_STD, retry: RETRY_STD,
  },
  {
    week: 12, phase: 'D', title: 'Nghe hiểu, ôn tổng hợp & đánh giá lại',
    goals: ['Nghe câu ngắn và bắt thông tin chính', 'Ôn tổng hợp, đánh giá lại tiến bộ so với đầu vào'],
    units: ['U19'],
    testUnits: ['U01', 'U03', 'U04', 'U05', 'U08', 'U09', 'U10', 'U12', 'U15', 'U19'],
    vocabTheme: [{ en: 'listen', vi: 'nghe' }, { en: 'repeat', vi: 'nhắc lại' }, { en: 'answer', vi: 'trả lời' }, { en: 'question', vi: 'câu hỏi' }],
    structures: ['Ôn các cấu trúc đã học trong 11 tuần'],
    practice: ['Nghe và chọn đáp án', 'Ôn lỗi sai tích lũy', 'Bài tổng kết'],
    weeklyTest: '10 câu tổng hợp lấy từ nhiều nhóm kiến thức.',
    advance: 'Bài tổng kết ≥ 70% và các nhóm kiến thức chính đạt mức "Vững" trở lên.',
    retry: 'Chưa đạt: lập kế hoạch 2–4 tuần tiếp theo cho các nhóm còn yếu. 12 tuần là lộ trình dự kiến, không phải cam kết.',
  },
];

export const weekOfUnit = (u: UnitId): number | undefined => WEEKS.find((w) => w.units.includes(u))?.week;
export const phaseOfWeek = (w: number): Phase => PHASES.find((p) => w >= p.weeks[0] && w <= p.weeks[1]) ?? PHASES[0];
