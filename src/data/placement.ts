import type { Question } from '../types';
import { fill, mcq, reorder } from './builders';

/**
 * 40 câu đánh giá đầu vào: mỗi nhóm kiến thức có 1 câu mức 1 (nền tảng) và 1 câu mức 2 (vận dụng).
 * Tất cả nội dung do nhóm dự án tự biên soạn.
 */
export const PLACEMENT_QUESTIONS: Question[] = [
  // U01 – Bảng chữ cái
  mcq('pl-u01-1', 'U01', 1, 'Which letter comes after D in the alphabet?', ['C', 'E', 'F', 'G'], 'E',
    'Bảng chữ cái: A, B, C, D, E, F… nên sau D là E.',
    { C: 'C đứng trước D, không phải sau D.', F: 'F đứng sau E. Giữa D và F còn chữ E.', G: 'G ở xa hơn nữa: D, E, F, G.' },
    ['Đọc thầm bảng chữ cái từ A: A, B, C, D…', 'Chữ nào đi ngay sau D?'], { assesses: 'Thứ tự chữ cái' }),
  mcq('pl-u01-2', 'U01', 2, 'Which group has only vowels?', ['A, E, I, O, U', 'A, B, C, D, E', 'E, F, G, H, I', 'B, C, D, F, G'], 'A, E, I, O, U',
    'Tiếng Anh có 5 chữ cái nguyên âm: A, E, I, O, U. Các chữ còn lại là phụ âm.',
    { 'A, B, C, D, E': 'Chỉ A và E là nguyên âm; B, C, D là phụ âm.', 'E, F, G, H, I': 'F, G, H là phụ âm.', 'B, C, D, F, G': 'Cả nhóm này đều là phụ âm, không có nguyên âm.' },
    ['Nguyên âm là A, E, I, O, U. Em nhớ 5 chữ này nhé.', 'Tìm nhóm mà chữ nào cũng nằm trong 5 chữ đó.'], { assesses: 'Nhận biết nguyên âm' }),

  // U02 – Từ vựng
  mcq('pl-u02-1', 'U02', 1, 'What does "apple" mean in Vietnamese?', ['quả chuối', 'quả táo', 'quả cam', 'quả nho'], 'quả táo',
    '"apple" nghĩa là quả táo.',
    { 'quả chuối': '"banana" mới là quả chuối.', 'quả cam': '"orange" là quả cam.', 'quả nho': '"grape" là quả nho.' },
    ['Hình dung loại quả màu đỏ hoặc xanh, tròn, dùng làm logo của một hãng điện thoại nổi tiếng.', 'Nghĩ xem từ nào em đã gặp: banana, orange, grape, apple.'], { assesses: 'Nghĩa từ chỉ trái cây' }),
  mcq('pl-u02-2', 'U02', 2, 'She is my mother\'s sister. She is my ___.', ['aunt', 'uncle', 'cousin', 'grandmother'], 'aunt',
    'Chị/em gái của mẹ là dì (aunt).',
    { uncle: '"uncle" là chú, bác, cậu (nam).', cousin: '"cousin" là anh/chị/em họ.', grandmother: '"grandmother" là bà.' },
    ['Người này là phụ nữ, cùng thế hệ với mẹ.', 'Loại bỏ từ chỉ nam giới và từ chỉ người lớn tuổi hơn mẹ.'], { assesses: 'Từ vựng gia đình' }),

  // U03 – to be
  mcq('pl-u03-1', 'U03', 1, 'I ___ a student.', ['am', 'is', 'are', 'be'], 'am',
    'Với chủ ngữ I, ta dùng am: I am a student.',
    { is: '"is" dùng với he, she, it.', are: '"are" dùng với you, we, they và số nhiều.', be: '"be" là dạng nguyên mẫu, không đứng một mình sau I.' },
    ['Nhìn chủ ngữ của câu: I.', 'I chỉ đi với một dạng của to be. Em nhớ "I ... ?"'], { assesses: 'Chia to be với I' }),
  mcq('pl-u03-2', 'U03', 2, 'My brothers ___ at school now.', ['am', 'is', 'are', 'be'], 'are',
    '"My brothers" là số nhiều (nhiều hơn một người) nên dùng are.',
    { is: '"is" chỉ dùng cho một người/vật. "brothers" có -s nghĩa là nhiều người.', am: '"am" chỉ đi với I.', be: 'Trong câu này cần dạng chia của to be, không dùng "be".' },
    ['Chủ ngữ là "My brothers" – một người hay nhiều người?', 'Chủ ngữ số nhiều dùng giống với they.'], { assesses: 'Chia to be với chủ ngữ số nhiều' }),

  // U04 – Số nhiều
  mcq('pl-u04-1', 'U04', 1, 'One book, two ___.', ['book', 'books', 'bookes', 'bookies'], 'books',
    'Phần lớn danh từ số nhiều chỉ cần thêm -s: books.',
    { book: '"two" là hai, nên cần dạng số nhiều.', bookes: 'Chỉ thêm -es khi từ kết thúc bằng s, x, ch, sh. "book" thì chỉ thêm -s.', bookies: '"bookie" là từ khác, không phải số nhiều của book.' },
    ['Có hai quyển sách nên danh từ cần ở dạng số nhiều.', 'Cách thông thường nhất để tạo số nhiều là gì?'], { assesses: 'Số nhiều thêm -s' }),
  mcq('pl-u04-2', 'U04', 2, 'What is the plural of "baby"?', ['babys', 'babies', 'babyes', 'babyies'], 'babies',
    'Từ tận cùng là phụ âm + y thì đổi y thành i rồi thêm -es: baby → babies.',
    { babys: 'Sau phụ âm (b) + y, em đổi y thành i, không chỉ thêm s.', babyes: 'Phải bỏ y trước khi thêm -es.', babyies: 'Không giữ lại y: bỏ y rồi thêm -ies.' },
    ['Chữ cái đứng trước y trong "baby" là b – nguyên âm hay phụ âm?', 'Phụ âm + y: đổi y → i rồi thêm es.'], { assesses: 'Số nhiều của danh từ tận cùng -y' }),

  // U05 – a/an/the
  mcq('pl-u05-1', 'U05', 1, 'She has ___ egg.', ['a', 'an', 'the', 'some'], 'an',
    '"egg" bắt đầu bằng âm nguyên âm /e/ nên dùng an: an egg.',
    { a: '"a" dùng trước từ bắt đầu bằng âm phụ âm (a book).', the: '"the" dùng khi người nghe đã biết rõ là cái nào. Ở đây chỉ nói một quả trứng bất kỳ.', some: '"some" dùng với số nhiều hoặc không đếm được; "egg" là số ít.' },
    ['Đọc to chữ đầu của "egg": âm đầu là nguyên âm hay phụ âm?', 'Trước âm nguyên âm ta dùng a hay an?'], { assesses: 'Chọn a/an theo âm đầu' }),
  mcq('pl-u05-2', 'U05', 2, 'I have a cat. ___ cat is white.', ['A', 'An', 'The', 'Some'], 'The',
    'Con mèo đã được nhắc ở câu trước nên người nghe biết là con nào, ta dùng The.',
    { A: '"A" dùng khi nhắc đến lần đầu. Con mèo này đã được nhắc rồi.', An: '"An" đi với âm nguyên âm, và cũng dùng cho lần nhắc đầu tiên.', Some: '"some cat" sai vì cat là danh từ số ít đếm được.' },
    ['Con mèo xuất hiện lần thứ mấy trong hai câu?', 'Khi đã nhắc đến rồi, người nghe biết đó là con nào – dùng mạo từ nào?'], { assesses: 'Dùng the cho vật đã nhắc đến' }),

  // U06 – Tính từ sở hữu
  mcq('pl-u06-1', 'U06', 1, 'I have a bag. ___ bag is blue.', ['My', 'I', 'Me', 'Mine'], 'My',
    'Trước danh từ (bag) ta dùng tính từ sở hữu: My bag.',
    { I: '"I" là đại từ làm chủ ngữ, không đứng trước danh từ để chỉ sở hữu.', Me: '"me" là tân ngữ (give it to me).', Mine: '"mine" đứng một mình (The bag is mine), không đi kèm danh từ.' },
    ['Chỗ trống đứng ngay trước danh từ "bag" để chỉ cái cặp của ai.', 'Từ nào có nghĩa là "của tôi" và đứng trước danh từ?'], { assesses: 'my + danh từ' }),
  mcq('pl-u06-2', 'U06', 2, 'Mai and Nam are brother and sister. ___ parents are teachers. (both of them)', ['His', 'Her', 'Their', 'Our'], 'Their',
    'Bố mẹ của cả Mai và Nam (hai người) nên dùng Their.',
    { His: '"His" chỉ của một bạn nam.', Her: '"Her" chỉ của một bạn nữ.', Our: '"Our" là của chúng tôi, người nói phải nằm trong nhóm.' },
    ['Có mấy người sở hữu bố mẹ trong câu này?', 'Nhiều người cùng sở hữu, người nói không nằm trong nhóm: dùng từ nào?'], { vi: '(bố mẹ của cả hai bạn)', assesses: 'Chọn tính từ sở hữu theo chủ sở hữu' }),

  // U07 – this/that/these/those
  mcq('pl-u07-1', 'U07', 1, '___ is my pen.', ['This', 'That', 'These', 'Those'], 'This',
    'Vật số ít ở gần người nói dùng This.',
    { That: '"That" dùng cho vật số ít ở xa.', These: '"These" dùng cho vật số nhiều ở gần, đi với are.', Those: '"Those" dùng cho vật số nhiều ở xa, đi với are.' },
    ['Cái bút là một hay nhiều? Nó ở gần hay xa em?', 'Số ít + gần → chọn từ nào?'], { vi: '(Cái bút ở ngay trong tay em)', assesses: 'this cho vật số ít ở gần' }),
  mcq('pl-u07-2', 'U07', 2, 'Look at the two birds over there! ___ are beautiful.', ['This', 'That', 'These', 'Those'], 'Those',
    'Hai con chim (số nhiều) ở xa nên dùng Those. Động từ đi cùng là are.',
    { This: '"This" là số ít, gần. Đi với is.', That: '"That" là số ít, xa. Câu này có "are" nên chủ ngữ phải số nhiều.', These: '"These" là số nhiều nhưng ở gần. Hai con chim ở "over there" (đằng kia) – xa.' },
    ['"two birds" là số ít hay số nhiều? "over there" là gần hay xa?', 'Số nhiều + xa → chọn từ nào?'], { assesses: 'those cho vật số nhiều ở xa' }),

  // U08 – have/has
  mcq('pl-u08-1', 'U08', 1, 'He ___ a new bike.', ['have', 'has', 'having', 'haves'], 'has',
    'Với he/she/it ta dùng has: He has a new bike.',
    { have: '"have" dùng với I, you, we, they.', having: '"having" cần thêm trợ động từ, không dùng đơn lẻ ở đây.', haves: 'Không có dạng "haves". Dạng đúng của he/she/it là has.' },
    ['Chủ ngữ là He – ngôi thứ mấy?', 'He/She/It dùng have hay has?'], { assesses: 'has với ngôi thứ ba số ít' }),
  mcq('pl-u08-2', 'U08', 2, 'My parents ___ two cars.', ['has', 'have', 'is', 'are'], 'have',
    '"My parents" là số nhiều, giống they, nên dùng have.',
    { has: '"has" chỉ dùng với chủ ngữ số ít (he/she/it).', is: '"is" là của to be, không có nghĩa "có".', are: '"are" là của to be, không có nghĩa "có".' },
    ['"My parents" là một hay nhiều người?', 'Chủ ngữ số nhiều thay bằng they. They dùng have hay has?'], { assesses: 'have với chủ ngữ số nhiều' }),

  // U09 – there is/are
  mcq('pl-u09-1', 'U09', 1, 'There ___ a pen on the desk.', ['is', 'are', 'am', 'be'], 'is',
    '"a pen" là số ít nên dùng There is.',
    { are: '"are" dùng với danh từ số nhiều.', am: '"am" chỉ đi với I.', be: 'Cần dạng chia, không dùng "be" ở đây.' },
    ['Sau chỗ trống là "a pen" – một hay nhiều cái?', 'Một vật → There is hay There are?'], { assesses: 'There is + số ít' }),
  mcq('pl-u09-2', 'U09', 2, 'There ___ three windows in my classroom.', ['is', 'are', 'am', 'has'], 'are',
    '"three windows" là số nhiều nên dùng There are.',
    { is: '"is" chỉ dùng với số ít hoặc không đếm được.', am: '"am" chỉ đi với I.', has: '"There has" không phải cấu trúc đúng; ta dùng There is/are để nói có cái gì ở đâu.' },
    ['Em đếm: three windows là mấy cái?', 'Nhiều hơn một → There is hay There are?'], { assesses: 'There are + số nhiều' }),

  // U10 – hiện tại đơn
  mcq('pl-u10-1', 'U10', 1, 'My father ___ to work by bus.', ['go', 'goes', 'going', 'gos'], 'goes',
    'My father = he, nên động từ thêm -es: goes (go tận cùng là o).',
    { go: 'Với he/she/it (My father), động từ phải thêm -s/-es.', going: '"going" là dạng V-ing, không dùng một mình cho thói quen.', gos: 'Từ tận cùng bằng o thì thêm -es chứ không chỉ -s: goes.' },
    ['"My father" thay bằng đại từ nào? He/She/It dùng động từ thế nào?', 'go tận cùng chữ o – thêm s hay es?'], { assesses: 'Hiện tại đơn ngôi thứ ba, -es' }),
  fill('pl-u10-2', 'U10', 2, 'She ___ (watch) TV every evening. Write the correct verb form.', ['watches'],
    'Chủ ngữ She nên động từ thêm đuôi; watch tận cùng -ch nên thêm -es: watches.',
    { watch: 'Với she/he/it phải thêm -s/-es.', watchs: 'Từ tận cùng ch, sh, s, x, o thì thêm -es chứ không chỉ -s.', watching: 'Đây là câu thói quen "every evening", dùng hiện tại đơn, không dùng V-ing.' },
    ['She là ngôi thứ ba số ít, động từ cần thêm đuôi.', 'watch tận cùng bằng "ch" – thêm s hay es?'], { assesses: 'Thêm -es sau ch' }),

  // U11 – do/does
  mcq('pl-u11-1', 'U11', 1, '___ you like pizza?', ['Do', 'Does', 'Are', 'Is'], 'Do',
    'Câu hỏi hiện tại đơn với you dùng Do: Do you like pizza?',
    { Does: '"Does" dùng với he, she, it.', Are: '"Are you…?" thường đi với tính từ hoặc danh từ (Are you happy?), còn "like" là động từ thường nên cần Do.', Is: '"Is" dùng với he/she/it và đi với to be, không đi với động từ like.' },
    ['Trong câu có động từ thường "like". Câu hỏi với động từ thường dùng trợ động từ nào?', 'Chủ ngữ là you: Do hay Does?'], { assesses: 'Do với I/you/we/they' }),
  mcq('pl-u11-2', 'U11', 2, 'My sister doesn\'t ___ coffee.', ['drink', 'drinks', 'drinking', 'drank'], 'drink',
    'Sau doesn\'t, động từ trở về dạng nguyên mẫu: doesn\'t drink.',
    { drinks: 'doesn\'t đã mang dấu hiệu ngôi thứ ba, nên động từ không thêm -s nữa.', drinking: 'Sau doesn\'t không dùng V-ing.', drank: 'Sau doesn\'t không dùng quá khứ.' },
    ['Sau doesn\'t, động từ ở dạng nguyên mẫu hay thêm đuôi?', 'Dạng nguyên mẫu của "drink" là gì?'], { assesses: 'doesn\'t + động từ nguyên mẫu' }),

  // U12 – hiện tại tiếp diễn
  mcq('pl-u12-1', 'U12', 1, 'Look! The cat ___ on the sofa.', ['sleep', 'sleeps', 'is sleeping', 'sleeping'], 'is sleeping',
    '"Look!" cho biết việc đang xảy ra ngay lúc nói, dùng is + V-ing: is sleeping.',
    { sleep: 'Cần cấu trúc cho việc đang xảy ra, không dùng động từ nguyên mẫu.', sleeps: 'Hiện tại đơn dùng cho thói quen. "Look!" báo hiệu việc đang diễn ra.', sleeping: 'Thiếu is. Phải có am/is/are trước V-ing.' },
    ['Từ "Look!" gợi ý việc xảy ra lúc nào?', 'Việc đang xảy ra: am/is/are + V-ing. Chủ ngữ "The cat" đi với am, is hay are?'], { assesses: 'Nhận biết hiện tại tiếp diễn' }),
  fill('pl-u12-2', 'U12', 2, 'Listen! The children ___ (sing) in the garden. Write the correct verb phrase.', ['are singing'],
    '"Listen!" báo hiệu việc đang diễn ra; "The children" số nhiều nên dùng are singing.',
    { 'is singing': '"The children" là số nhiều nên dùng are, không dùng is.', singing: 'Thiếu are. Cần am/is/are trước V-ing.', sing: 'Cần dạng am/is/are + V-ing cho việc đang diễn ra.' },
    ['"The children" là số ít hay số nhiều? Dùng am/is/are nào?', 'Công thức: are + V-ing. sing → ?'], { assesses: 'are + V-ing' }),

  // U13 – đếm được / không đếm được
  mcq('pl-u13-1', 'U13', 1, 'Which word is uncountable?', ['book', 'apple', 'water', 'chair'], 'water',
    '"water" (nước) không đếm được bằng số (không nói "two waters" khi nói về chất nước).',
    { book: 'Có thể đếm: one book, two books.', apple: 'Có thể đếm: one apple, two apples.', chair: 'Có thể đếm: one chair, two chairs.' },
    ['Thử thêm số đếm: "two ___". Từ nào nghe không tự nhiên?', 'Từ nào chỉ chất lỏng hoặc chất liệu?'], { assesses: 'Nhận biết danh từ không đếm được' }),
  mcq('pl-u13-2', 'U13', 2, 'I need ___ milk for my cake.', ['a', 'many', 'some', 'a few'], 'some',
    '"milk" không đếm được; some dùng được với danh từ không đếm được.',
    { a: '"a" chỉ dùng với danh từ đếm được số ít.', many: '"many" dùng với danh từ đếm được số nhiều.', 'a few': '"a few" dùng với danh từ đếm được số nhiều.' },
    ['"milk" đếm được hay không đếm được?', 'Từ nào dùng được với danh từ không đếm được?'], { assesses: 'some với danh từ không đếm được' }),

  // U14 – giới từ
  mcq('pl-u14-1', 'U14', 1, 'The ball is ___ the table.', ['in', 'on', 'under', 'at'], 'under',
    'Câu cho biết quả bóng ở phía dưới bàn nên dùng under.',
    { in: '"in" là ở bên trong.', on: '"on" là ở trên bề mặt.', at: '"at" dùng cho điểm/địa điểm hoặc giờ, không chỉ vị trí phía dưới.' },
    ['Hình dung quả bóng nằm dưới gầm bàn.', 'Từ nào có nghĩa "bên dưới"?'], { vi: '(quả bóng nằm dưới gầm bàn)', assesses: 'Giới từ chỉ vị trí under' }),
  mcq('pl-u14-2', 'U14', 2, 'My birthday is ___ June.', ['in', 'on', 'at', 'by'], 'in',
    'Dùng in trước tháng: in June.',
    { on: '"on" dùng cho ngày cụ thể (on Monday, on June 5th).', at: '"at" dùng cho giờ (at 7 o\'clock).', by: '"by" nghĩa là "trước hoặc vào lúc", không dùng để nói tháng sinh nhật.' },
    ['June là tháng. Với tháng, năm, mùa ta dùng giới từ nào?', 'On dùng cho ngày; At dùng cho giờ. Vậy còn lại?'], { assesses: 'in + tháng' }),

  // U15 – từ để hỏi
  mcq('pl-u15-1', 'U15', 1, '___ is your name?', ['What', 'Where', 'Who', 'When'], 'What',
    'Hỏi về tên (cái gì) dùng What: What is your name?',
    { Where: '"Where" hỏi nơi chốn.', Who: '"Who" hỏi người (Who is he?).', When: '"When" hỏi thời gian.' },
    ['Em đang hỏi về cái gì? Về tên.', 'Từ để hỏi về sự vật/thông tin chung là gì?'], { assesses: 'What hỏi thông tin' }),
  mcq('pl-u15-2', 'U15', 2, '— ___ is that boy? — He is my cousin.', ['What', 'Who', 'Why', 'How'], 'Who',
    'Câu trả lời giới thiệu một người (my cousin) nên câu hỏi dùng Who.',
    { What: '"What" hỏi sự vật/việc.', Why: '"Why" hỏi lý do. Câu trả lời không nêu lý do.', How: '"How" hỏi cách thức hoặc tình trạng.' },
    ['Câu trả lời nói về một người hay một vật?', 'Từ để hỏi về người là gì?'], { assesses: 'Who hỏi người' }),

  // U16 – tính từ, trạng từ, trật tự từ
  mcq('pl-u16-1', 'U16', 1, 'My teacher speaks ___.', ['slow', 'slowly', 'slowness', 'slows'], 'slowly',
    'Bổ nghĩa cho động từ speaks ta dùng trạng từ slowly.',
    { slow: '"slow" là tính từ, thường bổ nghĩa cho danh từ (a slow bus).', slowness: '"slowness" là danh từ.', slows: '"slows" là động từ (làm chậm lại), không đúng ngữ cảnh.' },
    ['Chỗ trống bổ nghĩa cho động từ "speaks" – cô nói như thế nào?', 'Trạng từ cách thức thường kết thúc bằng -ly.'], { assesses: 'Trạng từ cách thức' }),
  mcq('pl-u16-2', 'U16', 2, 'Choose the correct sentence.', ['She has a small red bag.', 'She has a red small bag.', 'She has red a small bag.', 'She has a bag small red.'], 'She has a small red bag.',
    'Tính từ đứng trước danh từ; tính từ chỉ kích thước (small) đứng trước tính từ chỉ màu (red).',
    { 'She has a red small bag.': 'Thứ tự thông thường là kích thước trước, màu sắc sau: small red.', 'She has red a small bag.': 'Mạo từ a phải đứng trước các tính từ.', 'She has a bag small red.': 'Tính từ đứng trước danh từ, không đứng sau.' },
    ['Tính từ đứng trước hay sau danh từ?', 'Hai tính từ: chỉ kích thước và chỉ màu. Cái nào đứng trước?'], { assesses: 'Trật tự tính từ cơ bản' }),

  // U17 – các dạng câu
  mcq('pl-u17-1', 'U17', 1, 'Choose the negative sentence for "She is a teacher."', ['She not is a teacher.', 'She isn\'t a teacher.', 'She don\'t a teacher.', 'She no is a teacher.'], 'She isn\'t a teacher.',
    'Với to be, thêm not sau is: She is not (isn\'t) a teacher.',
    { 'She not is a teacher.': 'not đứng sau is, không đứng trước.', 'She don\'t a teacher.': 'don\'t dùng với động từ thường, còn câu này có to be.', 'She no is a teacher.': 'Phủ định ở đây dùng not, không dùng no.' },
    ['Câu gốc dùng động từ to be (is).', 'Phủ định của to be: thêm not ngay sau be.'], { assesses: 'Phủ định với to be' }),
  mcq('pl-u17-2', 'U17', 2, 'Are you hungry? Choose the correct short answer (yes).', ['Yes, I am.', 'Yes, I do.', 'Yes, I\'m not.', 'Yes, you are.'], 'Yes, I am.',
    'Câu hỏi bắt đầu bằng Are, nên trả lời ngắn bằng Yes, I am.',
    { 'Yes, I do.': '"do" dùng khi câu hỏi có Do/Does.', 'Yes, I\'m not.': '"not" là phủ định, không đi với Yes.', 'Yes, you are.': 'Người hỏi hỏi "you", khi trả lời người nói tự xưng là I.' },
    ['Câu hỏi mở đầu bằng trợ từ nào? Câu trả lời phải dùng lại từ đó.', 'Em là "you" khi bị hỏi, nhưng khi tự trả lời thì em nói về mình: I + ?'], { assesses: 'Trả lời ngắn với Are' }),

  // U18 – Đọc hiểu
  mcq('pl-u18-1', 'U18', 1, 'How old is Lan?', ['Ten', 'Eleven', 'Twelve', 'Thirteen'], 'Eleven',
    'Bài đọc có câu "I am eleven years old", nên Lan 11 tuổi.',
    { Ten: 'Đọc lại câu thứ hai của bài.', Twelve: 'Không có thông tin này trong bài.', Thirteen: 'Không có thông tin này trong bài.' },
    ['Tìm câu nói về tuổi trong bài (từ "years old").', 'Số nào đứng ngay trước "years old"?'],
    { passage: 'My name is Lan. I am eleven years old. I live in Hai Phong with my parents and my little brother. Every morning, I walk to school with my friend Mai. I like English because my teacher is kind.', assesses: 'Tìm thông tin chi tiết' }),
  mcq('pl-u18-2', 'U18', 2, 'Why does Lan like English?', ['Because her friend likes it.', 'Because her teacher is kind.', 'Because she lives in Hai Phong.', 'Because she walks to school.'], 'Because her teacher is kind.',
    'Câu cuối: "I like English because my teacher is kind."',
    { 'Because her friend likes it.': 'Bài không nói bạn Mai thích tiếng Anh.', 'Because she lives in Hai Phong.': 'Đây là nơi Lan sống, không phải lý do thích tiếng Anh.', 'Because she walks to school.': 'Đây là việc Lan làm mỗi sáng, không liên quan đến lý do thích tiếng Anh.' },
    ['Tìm từ "because" (bởi vì) trong bài.', 'Đọc phần ngay sau "because".'],
    { passage: 'My name is Lan. I am eleven years old. I live in Hai Phong with my parents and my little brother. Every morning, I walk to school with my friend Mai. I like English because my teacher is kind.', assesses: 'Hiểu lý do trong văn bản' }),

  // U19 – Nghe hiểu (cần giọng đọc của thiết bị)
  mcq('pl-u19-1', 'U19', 1, 'Listen. How old is Tom?', ['Eight', 'Nine', 'Ten', 'Eleven'], 'Ten',
    'Bài nghe: "My name is Tom. I am ten." – Tom 10 tuổi.',
    { Eight: 'Nghe lại số tuổi ở cuối bài.', Nine: 'Nghe lại số tuổi ở cuối bài.', Eleven: 'Nghe lại số tuổi ở cuối bài.' },
    ['Nhấn nút nghe lại. Chú ý con số ở cuối.', 'Tom nói "I am ..." – số nào?'],
    { audioText: 'My name is Tom. I am ten.', assesses: 'Nghe số tuổi' }),
  mcq('pl-u19-2', 'U19', 2, 'Listen. Where is the dog?', ['Under the chair', 'On the sofa', 'On the table', 'In the box'], 'On the sofa',
    'Bài nghe: "The cat is under the chair. The dog is on the sofa." Con chó ở trên ghế sofa.',
    { 'Under the chair': 'Đó là chỗ của con mèo, không phải con chó.', 'On the table': 'Bài nghe không nhắc đến cái bàn.', 'In the box': 'Bài nghe không nhắc đến cái hộp.' },
    ['Có hai con vật. Em đang tìm con chó (dog).', 'Nghe lại câu thứ hai: The dog is ...'],
    { audioText: 'The cat is under the chair. The dog is on the sofa.', assesses: 'Nghe vị trí' }),

  // U20 – Viết câu
  reorder('pl-u20-1', 'U20', 1, 'Put the words in the correct order.', ['apples', 'like', 'I'], ['I like apples'],
    'Trật tự cơ bản: chủ ngữ + động từ + tân ngữ → I like apples.',
    { 'like I apples': 'Câu tiếng Anh thường bắt đầu bằng chủ ngữ (I).' },
    ['Ai làm hành động? Đặt từ đó đầu câu.', 'Chủ ngữ → động từ → thứ được thích.'], { assesses: 'Trật tự S – V – O' }),
  reorder('pl-u20-2', 'U20', 2, 'Put the words in the correct order.', ['homework', 'every', 'She', 'her', 'evening', 'does'],
    ['She does her homework every evening', 'Every evening she does her homework'],
    'Câu đúng: She does her homework every evening. (Cụm chỉ thời gian đứng cuối câu hoặc đầu câu.)',
    { 'She does every evening her homework': 'Cụm "every evening" thường đứng cuối câu hoặc đầu câu, không đứng giữa động từ và tân ngữ.' },
    ['Bắt đầu bằng chủ ngữ và động từ: She does…', 'Thứ cô ấy làm (tân ngữ) đứng trước cụm chỉ thời gian "every evening".'], { assesses: 'Trật tự câu có trạng ngữ thời gian' }),
];
