---
title: Mở trực tiếp giống chuyển trang, phần nhẹ hiện trước
status: live
source: []
tests:
  - tests/site/first-load-parity.e2e.mjs
notion: https://app.notion.com/p/3fd332849a0e81eda926d2c089fa4d5a
updated: 2026-10-18
---

# Mở trực tiếp giống chuyển trang, phần nhẹ hiện trước

## Mục đích

Khách thường mở site từ link Zalo, Google hoặc bấm F5. Lần mở đó phải giống hệt lúc chuyển trang trong site: chữ
hero chạy đủ motion, và phần nhẹ hiện trước. Phần nặng như ảnh, catalog, masonry tải song song ở nền và không chặn
phần nhẹ. Áp dụng cho mọi trang có hero, PC và phone. Không thêm motion mới, không cắt hay tua nhanh motion hiện có
(owner, 2026-10-18).

## Hiện trạng đã đo (Chromium cloud, localhost, bản `main` 393ace7)

- Mở trực tiếp: motion của chữ hero có chạy, nhưng trước khi `motion.js` claim thì chữ hiện đủ khoảng 0,1 đến 0,2 s,
  sau đó bị đặt về `opacity: 0` rồi mới fade. Mắt người thấy chữ đứng yên, không thấy motion. Đo trên Trang chủ,
  Residential, Commercial và Advertising.
- Advertising mở trực tiếp: các từ của title bắt đầu fade lúc veil (`.route-veil`) còn khoảng 0,5 opacity. Khi veil
  tan hết thì từ đầu đã gần xong, nên phần lớn motion bị veil che.
- Chuyển trang mềm (Barba): title đứng yên trong lúc veil chạy, sau đó từng từ fade với stagger. Đây là chuẩn mà
  owner muốn có cho cả lần mở trực tiếp.
- Cloud không vào được demo Cloudflare. Mọi số đo nghiệm thu phải chạy qua phiên PC
  ([thiết bị](../operations/android-real-device-debugging.md)).

## Hành vi

### R1. Đo nền trước khi đổi

Trước khi đổi code, đo trên demo Cloudflare (không đo localhost), ở PC Chrome 1440 và phone Android thật nối adb.
Đo Trang chủ, Residential, Commercial, About và Advertising. Mỗi trang đo 5 lượt mở trực tiếp và 5 lượt chuyển mềm.
Ghi lại các mốc sau:

- thời điểm chữ hero hiện lần đầu, kể cả nháy;
- thời điểm veil tan;
- thời điểm từ đầu tiên bắt đầu fade và từ cuối cùng xong;
- thời điểm rail và chip của Advertising hiện;
- thời điểm khung masonry và ảnh đầu tiên hiện;
- LCP, CLS và long task.

Số đo (median, p90) ghi trong mô tả PR.

### R2. Motion chữ hero khi mở trực tiếp giống chuyển mềm

Mọi phần tử chữ trong hero chạy motion theo đúng thứ tự, timing và easing của lúc chuyển mềm. Phần tử chữ gồm kicker,
title, dòng phụ và chữ trong hero của trang cụm và trang sản phẩm. Riêng Advertising tính thêm rail và chip.

Khi có JavaScript, chữ ở trạng thái đầu của motion ngay từ lần vẽ đầu, nên không nháy chữ đủ rồi mới ẩn. Delay intro
hero (title, kicker, zoom, rail và chip) đếm từ lúc veil bắt đầu mở, ở cả hai đường. Trước đây delay đếm từ lúc mount,
nên khi mở trực tiếp mà catalog hay font về chậm thì chữ chạy dưới veil. Không đổi `duration`, `stagger`, `delay` hay
easing ([trang con R5](detail-pages.md), [trang chủ](page-home.md)).

Mốc chuẩn là lúc veil bắt đầu mở, không phải lúc veil tan hết. Lý do: chuyển mềm vào Advertising (`words-06`, delay
0,6 s) vốn cho từ đầu fade khi veil còn mở dở, và chuẩn là giống chuyển mềm (đo 2026-10-18, Chromium cloud).

```gherkin
Given một trang có hero, PC 1440 hoặc phone Android, mở bằng link hoặc F5 trên demo
When ghi hình 60 fps từ lúc điều hướng tới lúc chữ hero xong
Then không có frame nào chữ hero hiện đủ trước khi motion bắt đầu
And từ đầu tiên của title bắt đầu fade sau khi veil bắt đầu mở
And độ trễ từ lúc veil bắt đầu mở tới lúc từ đầu bắt đầu fade khác bản chuyển mềm không quá 100 ms
And khoảng stagger từ từ đầu tới từ cuối khác bản chuyển mềm không quá 100 ms

Given trang Advertising mở bằng link hoặc F5
When rail và chip vào khung nhìn đầu
Then rail và chip chạy motion giống lúc chuyển mềm vào trang đó
```

Giữ nguyên các trường hợp sau:

- Reduced motion: chữ ở trạng thái cuối, không animation.
- Không có JavaScript, hoặc `motion.js` lỗi (`motion-fallback`): chữ hiện đủ ngay, không bị kẹt ẩn.
- Đổi ngôn ngữ tại chỗ, Back và bfcache theo [site-shell](site-shell.md) và [trang con R11](detail-pages.md).

### R3. Phần nhẹ hiện trước, phần nặng không chặn

Thứ tự ưu tiên và tầng tải khi mở trực tiếp ở [tải theo nấc R4, R5](progressive-loading.md#r4-tầng-tải-trang-và-lúc-veil-mở):
header, veil, chữ hero, rail, chip và khung có kích thước cố định đi trước ảnh; ảnh ngoài khung nhìn tải ở nền.

Việc nặng không được giữ veil hay làm trễ motion chữ. Ảnh đổ vào khung đã có sẵn kích thước, nên bố cục không nhảy.

```gherkin
Given demo Cloudflare, cache trống, PC Chrome 1440 và phone Android thật nối adb
When mở /vi/advertising-products/ và mọi trang có hero bằng link
Then header, chữ hero, rail và chip hiện (veil tan) dưới 1 s sau điều hướng, median 5 lượt mỗi thiết bị
And khung masonry có kích thước đúng trước khi ảnh đầu về
And CLS từ lúc điều hướng tới lúc ảnh khung nhìn đầu xong không vượt 0,05
And không có long task trên 50 ms nằm giữa lúc veil tan và lúc từ cuối của title fade xong
```

Không cheat: không tua nhanh, rút ngắn hay bỏ motion để đạt số; không đo trên localhost để nghiệm thu.

### R4. Ngoài phạm vi

Không đổi nội dung, font, màu, motion mới, layout masonry, nhịp slide hero hay ảnh. Typography hero và khoảng cách
dòng thuộc [hero-typography](hero-typography.md). [Reveal hero và LCP](hero-motion-reveal.md) (phương án A, tách
title hero khỏi lô chuẩn bị chữ) làm chung code với R2, nên plan gộp hai việc để không sửa `detail.js` hai lần.

## Kiểm tra

| R | Test hoặc command |
| --- | --- |
| R1, R3 | Script đo qua CDP trên demo, chạy từ phiên PC (plan chốt tên file) |
| R2 | `node tests/site/first-load-parity.e2e.mjs`: ghi opacity chữ hero theo frame, so mở trực tiếp với chuyển mềm ở 1440 và 390 |

## Gate còn mở

- R1 và R3 chạy trên demo, cần phiên PC và phone nối adb. R2 mới đo trên Chromium cloud, localhost.
- Ngưỡng 100 ms của R2 rộng hơn 50 ms dự kiến: Chromium headless trên cloud có frame dài 80 đến 120 ms đúng lúc từ
  đầu bắt đầu fade ở cả hai đường. Đo lại trên demo bằng PC và phone.
- Phương án A của [Reveal hero và LCP](hero-motion-reveal.md) chưa làm, chờ số đo LCP R1 của spec đó.

## Chú thích thuật ngữ

- **Chuyển mềm**: chuyển trang trong site bằng Barba, không tải lại toàn trang.
- **Veil**: lớp phủ trắng che màn hình lúc chuyển trang hoặc lúc mở trang.
- **Claim**: lúc `motion.js` nhận quyền điều khiển motion, thay script dự phòng trong head.
- **LCP**: thời điểm phần tử lớn nhất trong khung nhìn đầu được vẽ.
- **CLS**: mức bố cục bị nhảy trong lúc tải.
- **Long task**: đoạn JavaScript chạy liền trên 50 ms, làm khựng motion.
- **Median, p90**: giá trị giữa và giá trị mà 90% lượt đo không vượt.
