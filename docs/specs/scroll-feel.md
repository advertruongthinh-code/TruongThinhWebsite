---
title: Cảm giác cuộn chung theo trang chủ
status: live
source: []
tests:
  - tests/site/scroll-feel.e2e.mjs
  - tests/site/middle-autoscroll.e2e.mjs
notion: https://app.notion.com/p/3f0332849a0e8153bb2edbde0c76b6ed
updated: 2026-10-11
---

# Cảm giác cuộn chung theo trang chủ

## Mục đích

Mọi trang cuộn với cùng cảm giác như trang chủ: cùng smooth scroll, cùng độ mượt, cùng một kiểu parallax và chỉ đặt
parallax ở nơi hợp lý. Kèm khối "Giữ nghề" trang chủ theo banner CTA của Espacio, có link sang About. Trang chủ là chuẩn, không chỉnh. Spec này giữ quy tắc chung; code nằm ở file do
[shell](site-shell.md), [trang chủ](page-home.md), [ba trang con](detail-pages.md) và
[masonry](advertising-masonry.md) sở hữu, nên PR code sửa spec sở hữu file trong cùng PR.

## Hành vi

### R1. Một chuẩn cuộn cho mọi trang

Trang chủ, Residential, Commercial, About, Advertising, Advertising lọc theo nhóm (`?category=<nhóm>`, đích của 6 route
cũ `/advertising-products/<nhóm>/`) và detail ảnh (trang card `p/<id>`) dùng đúng một cấu hình cuộn: Locomotive từ 981px, scroll native dưới 981px, khi giảm chuyển
động hoặc khi menu mở ([motion](../../design-system/motion.md#smooth-scroll-và-parallax)). Không trang nào có cấu hình
riêng (`lerp`, `multiplier`, breakpoint). Cùng một lượt lăn chuột cho cùng quãng đường và cùng đường trượt trên mọi trang.
Trong lúc trượt không có frame nào nhảy vượt hai frame kề bên; chỉ khi chiều cao trang đổi mới gọi Locomotive tính lại.

```gherkin
Given cửa sổ PC rộng từ 981px, không giảm chuyển động
When lăn chuột cùng số nấc ở đầu bất kỳ trang nào trong R1
Then quãng đường và thời gian trượt tới khi dừng bằng trang chủ, sai số 1px và 1 frame
```

### R2. Advertising và route con mượt như trang chủ trên PC

Hiện Advertising và route con tính layout gấp 3 đến 4 lần và chạy script gấp khoảng 2 lần trang chủ trong cùng lượt lăn
chuột (đo local, chưa có GPU thật). Sau thay đổi, cuộn bằng chuột từ đầu tới cuối trang trên PC của owner không khựng.
Đo bằng Chrome trace trên PC thật (GPU thật, cửa sổ thật), cùng một script lăn chuột cho trang chủ và từng trang đo.
Nguyên nhân và cách sửa do plan xác định từ trace, không đoán trước.

Trang đo: Advertising (masonry tất cả), Advertising lọc một nhóm, một detail ảnh có related. Trang chủ đo cùng lượt làm mốc.

```gherkin
Given PC của owner, Chrome, cửa sổ tối đa, trang đã tải xong ảnh trong viewport đầu
When script lăn chuột đều từ đầu tới cuối trang Advertising, Advertising lọc nhóm và detail ảnh
Then trong lúc cuộn không có task nào trên 50ms
And tỉ lệ frame rớt không cao hơn trang chủ đo cùng lượt
And owner cuộn thử và xác nhận cảm giác giống trang chủ
```

### R3. Quy tắc parallax

Parallax chỉ đặt ở hero có tiêu đề hoặc chữ lớn nằm trên nền không đơn màu (ảnh hoặc video). Ngoài hero, ngoại lệ
duy nhất là CTA cuối Advertising với parallax riêng ([CTA](advertising-cta-center-parallax.md)). Cơ chế tái dùng y hệt
hero trang chủ: lớp media nền nhận `data-scroll` với `data-scroll-speed="-2"`, trôi chậm hơn cuộn 20%; chữ, lớp tối
(shade) và nút đi theo trang. Không có speed khác, không hiệu ứng mới. Vì dựa vào Locomotive, parallax chỉ chạy ở chế độ
smooth của R1; dưới 981px và khi giảm chuyển động thì không lệch, giống trang chủ.

Lớp media nền phủ kín section suốt lúc section nằm trong viewport: không lộ mép trên hay dưới ở bất kỳ vị trí cuộn nào,
mọi cỡ cửa sổ từ 981px. Phần tử không thỏa quy tắc thì bỏ parallax.

```gherkin
Given hero có chữ lớn trên nền ảnh, cửa sổ từ 981px, không giảm chuyển động
When cuộn từ đầu trang tới lúc hero ra khỏi viewport
Then ảnh nền trôi chậm hơn chữ 20%, chữ đi theo trang
And không lúc nào lộ mép ảnh
```

### R4. Danh sách áp dụng

| Section | Nền | Hiện tại | Sau thay đổi |
| --- | --- | --- | --- |
| Hero trang chủ, Residential, Commercial | Ảnh | `-2` | Giữ, là chuẩn |
| Hero About (`.about-hero__media`) | Ảnh | Không | Thêm `-2` |
| "Giữ nghề. Không ngừng làm mới." trang chủ (`.legacy-closer`) | Ảnh, ngoài hero | Không | Không |
| CTA Residential, Commercial, About (`.detail-cta` có ảnh) | Ảnh, ngoài hero | Không | Không |
| Ba ảnh About (`legacy-hands`, `design-sketch`, `workshop-wide`) | Ảnh ngoài hero, không có chữ đè | `-0.12`, `-0.1`, `-0.12` | Bỏ |
| Hero Advertising (mọi nhóm) | Đơn màu | Không | Không |
| CTA cuối Advertising | Skeleton, Kính | Parallax riêng | Giữ, ngoại lệ owner duyệt |
| CTA footer "Có mặt bằng?" | Đơn màu | Không | Không |
| Rail dự án trang chủ (trượt ngang) | Không phải chữ trên nền | `4` ngang | Giữ, là chuẩn trang chủ |
| Card portal, montage "Kinh nghiệm và sáng tạo" | Ảnh trong card, ngoài hero | Không | Không |

Danh sách lấy từ khảo sát DOM cả 11 trang ở 1440×900: mọi chữ từ 40px và phần tử ảnh, video, canvas hoặc
`background-image` nằm dưới nó. Hero mới sau này theo R3, không cần sửa bảng trừ khi owner chỉnh quy tắc.

### R5. Khối "Giữ nghề" theo banner CTA của Espacio

Khối "Giữ nghề. Không ngừng làm mới." trên trang chủ (`.legacy-closer`) dựng giống khối "80 years shaping tradition
into design" của Espacio (`layout-banner-cta`, đo trên PC thật 2026-10-06, Chrome desktop và giả lập điện thoại cho
cùng số), ở mọi cỡ cửa sổ và thiết bị, bằng component và token sẵn có của Design System:

| Cửa sổ | Cao khối | Gutter hai bên | Khoảng dưới khối |
| --- | --- | --- | --- |
| Trên 1200px | 600px | 35px, khối rộng tối đa 1500px | 90px |
| 961 tới 1200px | 500px | 25px | 90px |
| 751 tới 960px | 400px | 25px | 60px |
| 579 tới 750px | 400px | 15px | 60px |
| Tới 578px | 400px | 15px | 30px |

- Ảnh phủ kín khối (`object-fit: cover`, giữa), lớp đen phủ opacity `0.2`. Không parallax (R3).
- Vùng chữ rộng 85% khối, nằm trong flow, xếp cột căn giữa. Tiêu đề theo rule CTA chung
  ([trang con R10](detail-pages.md#r10-cta-marquee-hover-và-ảnh-dưới-chữ-trắng)): chữ thường, căn giữa, weight 600,
  cỡ `--cta-title-size`, line-height `0.98`, không JS co chữ (owner 2026-10-15). Cao trong bảng là tối thiểu; chữ dài
  hơn (cửa sổ hẹp, chữ 200%) thì khối cao theo chữ.
- Dưới tiêu đề 16px là link sang About ("VỀ CHÚNG TÔI" / "ABOUT US"), tái dùng phụ đề portal trang chủ
  ([trang chủ R5](page-home.md#r5-portal-chữ-một-dòng-cùng-cỡ)): 16px, semibold, viết hoa, gạch chân 3px chạy từ trái
  khi hover hoặc focus. Cả khối bấm được, đích `/vi/about/` hoặc `/en/about/`.
- Hover cả khối: ảnh phóng theo hover ảnh dùng chung ([trang chủ R6](page-home.md#r6-hover-ảnh-dùng-chung)).
  Focus bàn phím có focus ring của Design System (Espacio bỏ focus ring, không chép).
- Vào viewport: dòng tiêu đề trượt lên trong mask (`2em → -0.1em`, 1,9s, stagger 0,1s), link hiện sau 0,3s; dùng hook
  reveal sẵn có, không thêm thư viện.

```gherkin
Given /vi/ ở bất kỳ bề rộng nào từ 320 tới 1920px, VI hoặc EN
When cuộn tới khối "Giữ nghề"
Then chiều cao (tối thiểu), gutter, khoảng dưới khối đúng bảng R5, tiêu đề cỡ CTA chung và không tràn vùng chữ
And bấm khối hoặc nhấn Enter khi focus mở trang About cùng ngôn ngữ
```

### R6. Cuộn bằng chuột giữa như Chrome trên PC

Locomotive (R1) chặn cuộn native nên autoscroll của trình duyệt không chạy. Site tự làm lại autoscroll kiểu Chrome
trên Windows, chỉ khi Locomotive đang chạy (từ 981px, không giảm chuyển động, menu đóng); dưới 981px và khi giảm
chuyển động trang cuộn native nên trình duyệt tự lo.

- Bắt đầu: nhấn chuột giữa lên chỗ không phải link, nút, ô nhập liệu hay viewer ảnh. Tại điểm nhấn hiện biểu tượng
  gốc (vòng tròn 32px, xem mục UI). Nhấn chuột giữa lên link vẫn mở tab mới như cũ.
- Cuộn: chuột cách gốc theo chiều dọc `d` CSS px. Trong vùng chết `|d| <= 15` trang đứng yên; ngoài vùng đó trang cuộn
  theo hướng chuột với vận tốc `0.04 × |d|^2.2` px/giây, không có trần, đổi ngay khi chuột di chuyển. Đây đúng là công
  thức autoscroll của Chrome (`autoscroll_controller.cc`: `0.000008 × |d|^2.2` nhân `5000` của `FixedVelocityCurve`),
  nên cảm giác như website thường: 50px khoảng 220, 100px khoảng 1000, 200px khoảng 4600, 300px khoảng 11300 px/giây.
  Chuyển động đi qua Locomotive như lăn chuột, nên header ẩn hiện (shell R3), parallax và giới hạn đầu cuối trang giữ
  nguyên. Con trỏ là mũi tên lên khi `d < -15`, mũi tên xuống khi `d > 15`, còn lại là con trỏ cuộn bốn hướng.
- Hai kiểu như Chrome: nhả chuột giữa khi chuột chưa ra khỏi vùng chết thì vào chế độ dính, tiếp tục cuộn theo chuột
  tới khi nhấn bất kỳ nút chuột nào, lăn chuột, nhấn phím bất kỳ hoặc cửa sổ mất focus. Nhấn giữ rồi kéo ra khỏi vùng
  chết thì nhả chuột giữa là dừng.
- Dừng thì biểu tượng biến mất ngay, trang trượt hết quán tính Locomotive rồi đứng. Cú nhấn để dừng không kích hoạt
  link hay nút bên dưới.
- Không bắt đầu, hoặc dừng ngay nếu đang chạy, khi viewer ảnh hay full menu mở hoặc cuộn logic bị khóa
  (`lockLogicalScroll`), khi cửa sổ thu dưới 981px, hoặc khi điều hướng sang route khác.

```gherkin
Given trang chủ ở cửa sổ 1440×900, không giảm chuyển động
When nhấn rồi nhả chuột giữa ở chỗ trống và đưa chuột xuống dưới gốc 116px
Then biểu tượng gốc hiện tại điểm nhấn và trang cuộn xuống khoảng 1400px mỗi giây
When đưa chuột xuống dưới gốc 216px
Then trang cuộn xuống khoảng 5500px mỗi giây
When lăn chuột
Then biểu tượng biến mất và trang dừng sau quán tính
When nhấn giữ chuột giữa, kéo lên trên gốc 116px rồi nhả
Then trang cuộn lên trong lúc giữ và dừng khi nhả
When nhấn chuột giữa lên một link
Then không có biểu tượng gốc
```

## Giao diện và dữ liệu

| Loại | Tên | Vai trò |
| --- | --- | --- |
| DOM hook | `[data-scroll]`, `[data-scroll-speed]` | Locomotive đọc; gắn trên lớp media nền theo R3 |
| Cấu hình | `initSmoothScroll` trong `src/site/motion.js` | Cấu hình cuộn duy nhất của R1 |
| Hàm public | `window.TruongThinhMotion` | Khóa, đặt, đọc vị trí cuộn logic; Advertising dùng chung |
| Phần tử | `.autoscroll-origin` | Biểu tượng gốc của R6, `aria-hidden`, gắn vào `body` khi bắt đầu và gỡ khi dừng |

## UI

Chuẩn cuộn và quy tắc parallax ghi ở [Motion](../../design-system/motion.md#smooth-scroll-và-parallax). Link khối
"Giữ nghề" dùng phụ đề portal trang chủ, focus ring chung của site. Biểu tượng gốc R6 là vòng tròn 32px,
nền `white`, viền `ink` 2px, hai tam giác đặc `ink` (rộng 12px, cao 6px, đỉnh cách mép 6px) và chấm tròn `ink` 6px ở
tâm, không animation khi hiện hoặc ẩn. Không dùng nét mảnh dưới 2px; cạnh đáy tam giác nằm trên lưới 4px; vị trí
làm tròn theo pixel màn hình, nên không răng cưa ở tỉ lệ 100%, 125%, 150%, 200%.

## Kiểm tra

| R | Test hoặc command |
| --- | --- |
| R1 | `tests/site/scroll-feel.e2e.mjs` (trang chủ, ba trang con, Advertising, lọc nhóm ở 1440px; 40 nấc lăn không frame nào nhảy) |
| R2 | `pnpm qa:scroll-trace -- --headed --trace` trên PC của owner (`CHROME_CHANNEL=chrome`); trên cloud chỉ là mốc tương đối |
| R3, R4 | `tests/site/scroll-feel.e2e.mjs` (`data-scroll-speed` từng trang, hero không lộ mép ở 5 vị trí cuộn) |
| R5 | `tests/site/scroll-feel.e2e.mjs` (11 bề rộng, VI, EN: cao, gutter, khoảng dưới, cỡ chữ, link) |
| R6 | `tests/site/middle-autoscroll.e2e.mjs` (1440px: chế độ dính, nhấn giữ kéo, vận tốc ở 116px và 216px theo công thức Chrome, icon bám pixel ở DPR 1, 1.25, 1.5, dừng bằng lăn, nút, phím; link, viewer, menu, 390px, giảm chuyển động không bắt đầu) |

## Chú thích thuật ngữ

- **Smooth scroll**: cuộn có quán tính do Locomotive tính, thay vì nhảy theo từng nấc chuột.
- **Parallax**: lớp nền trôi khác tốc độ với chữ khi cuộn, tạo chiều sâu.
- **Speed `-2`**: độ lệch bằng khoảng cách tâm viewport tới tâm phần tử nhân `0.2`, tức trôi chậm hơn 20%.
- **Frame rớt**: frame trình duyệt không vẽ kịp trong nhịp màn hình, mắt thấy là khựng.
- **Task trên 50ms**: việc chặn luồng chính đủ lâu để cuộn và nhập liệu bị trễ.
- **Route con**: Advertising lọc nhóm `?category=<nhóm>` và detail ảnh tại trang card `p/<id>`.
- **Frame nhảy**: frame trượt xa hơn 1,3 lần cả hai frame kề bên, mắt thấy là giật tốc độ.
- **Lộ mép**: khoảng trống hiện ra ở mép section khi lớp ảnh trôi lệch khỏi khung.
- **Autoscroll**: nhấn chuột giữa rồi đưa chuột ra xa điểm nhấn để trang tự cuộn, tốc độ theo khoảng cách.
- **Vùng chết**: khoảng quanh gốc mà chuột di trong đó trang không cuộn.
- **Chế độ dính**: autoscroll tiếp tục sau khi nhả chuột giữa, tới khi người dùng nhấn hoặc lăn để dừng.
