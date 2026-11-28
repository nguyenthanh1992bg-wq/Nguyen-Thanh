import type { Question } from '../types';
import type { GradeResult } from '../logic/grading';

/**
 * Gia sư dựa trên luật: chỉ dùng nội dung đã được biên soạn và kiểm duyệt trong ngân hàng câu hỏi.
 * Không sinh nội dung mới, không bịa quy tắc. Giao diện này có thể được thay bằng gia sư AI
 * (qua backend) mà không phải sửa màn hình: xem docs/ROADMAP.md.
 */
export interface TutorService {
  /** Gợi ý theo bậc (0 = nhẹ nhất). Không bao giờ trả về đáp án. */
  hint(q: Question, level: number): string | null;
  /** Lời phản hồi sau khi trả lời sai, chưa tiết lộ đáp án. */
  nudge(q: Question, g: GradeResult, tryNo: number): string;
}

export const ruleBasedTutor: TutorService = {
  hint(q, level) {
    return q.hints[level] ?? null;
  },
  nudge(_q, g, tryNo) {
    if (g.dontKnow) return 'Không sao, chưa biết là chuyện bình thường. Mình xem lời giải cùng nhau nhé.';
    if (g.mistake) return g.mistake.reason;
    return tryNo === 0
      ? 'Chưa đúng rồi, nhưng em đã thử – như vậy là tốt. Đọc gợi ý bên dưới rồi thử lại nhé.'
      : 'Vẫn chưa đúng. Mình cùng xem lời giải nhé.';
  },
};
