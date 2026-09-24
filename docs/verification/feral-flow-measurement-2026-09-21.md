# Đo lường Feral Flow — 2026-09-21

- Reference: [FeralUI Gradient Builder](https://feralui.dev/gradients).
- Thời điểm fetch: 2026-09-21 05:34:16–05:34:17 UTC+07:00
  (Asia/Bangkok).
- Phạm vi: preset `Flow`, canvas runtime, pins, bands, `Field` và `Finish`.
- Trạng thái: evidence từ bundle public hiện tại và phép đo browser trực tiếp;
  không phải giấy phép sao chép source, spec triển khai hoặc claim pixel parity.

## Quy ước mức chắc chắn

| Nhãn | Nghĩa |
| --- | --- |
| **Exact extracted** | Constant, preset hoặc công thức đọc được từ byte bundle có hash bên dưới |
| **Exact measured** | Giá trị DOM/canvas/CDP đo trực tiếp trên reference trong phiên này |
| **Resolved default** | Preset không ghi field riêng; runtime lấy default exact của type `Flow` |
| **Inference** | Diễn giải hoặc dự báo từ evidence; cần kiểm lại bằng parity test |
| **Candidate** | Giá trị/kiến trúc đề xuất để owner tune; không phải behavior của Feral |

## Provenance byte

| Asset | Bytes | SHA-256 |
| --- | ---: | --- |
| [`JapaneseGradients-PCv7QsRz.js`](https://feralui.dev/assets/JapaneseGradients-PCv7QsRz.js) | 861.180 | `78c24636d3ea8e217d48bf750ab24c37ced00ecde061ebe49703fcee5119d921` |
| [`JapaneseGradients-2ly7VCvq.css`](https://feralui.dev/assets/JapaneseGradients-2ly7VCvq.css) | 152.253 | `01431d241273fb8edb38332c53b59132ded06192b029da2a789eee4bf1fcc676` |
| [`index-ClPsj74W.js`](https://feralui.dev/assets/index-ClPsj74W.js) | 1.059.905 | `f4b12689b38621c1a31dd2c2204e1a471b46730bd867f92ab7c2aa2185bc417c` |

Hai URL `.js.map` tương ứng trả HTML shell của site, không trả source map.
Shared bundle chỉ có license header của dependency React; không thấy LICENSE
riêng cho Gradient Builder. [Terms](https://feralui.dev/terms) chỉ xác nhận
package đã publish có LICENSE riêng mới thuộc MIT; vì vậy implementation phải là
clean-room, không chép minified source.

## Renderer và lớp hiển thị

**Exact measured:** preview `Flow` dùng
`<canvas class="jg-wave-layers" width="240" height="160">`. Canvas có context
2D; `webgl` và `webgl2` đều không có. Canvas 240 × 160 được kéo lên khoảng
860 × 518 CSS trong phép đo desktop.

**Exact extracted:** khi animation tắt, renderer vẽ nháp 320 × 210 rồi vẽ lại
640 × 420 sau khoảng 140 ms. Khi animation chạy, mỗi frame đi qua toàn bộ
240 × 160 pixel trên main thread. Grain là một lớp DOM riêng trên canvas.

**Exact measured, phụ thuộc máy:** trong cửa sổ đo 3 giây, một preview đang chạy
dùng khoảng 2.407 ms `ScriptDuration` và 2.487 ms `TaskDuration`; cùng trang với
`Speed = 0` dùng khoảng 10,8 ms và 12,1 ms. Số này chỉ chứng minh chênh lệch trên
máy/browser đo, không là performance budget đa thiết bị.

## Công thức `Flow`

Ký hiệu `sat(x)` là clamp 0..1; `smooth(x) = sat(x)^2(3-2sat(x))`;
`fract(x) = x - floor(x)`. Tọa độ và màu bên dưới được diễn giải toán học từ
bundle, không sao chép code.

| Thành phần | Công thức exact extracted |
| --- | --- |
| Clock | `t0 = 20,75`; mỗi RAF: `t += (speed/100) × 1,2 × min(0,05; deltaSeconds)` |
| Scale | `C = 0,4 + 1,2 × scale/100`; `px = (((x+0,5)/width)-0,5)/C+0,5`, tương tự `py` |
| Anchor tự động | Với màu `i`: `phase=0,37i`; `fx=0,6+0,9fract(i/3)`; `fy=0,8+fract((i+1)/4)`; `ax=0,5+0,5sin(t×fx+phase)`; `ay=0,5+0,5cos(t×fy+1,5phase)` |
| Distortion | `u=distortion/100`; `r=smooth(hypot(px-0,5; py-0,5))`; `edge=1-r`. Chạy hai pass `z=1,2`: cộng vào x `u×edge/z×sin(t+0,4z×smooth(y))×cos(0,2t+2,4z×smooth(y))`; cộng vào y `u×edge/z×cos(t+2z×smooth(x))` |
| Swirl | `s=swirl/100`; xoay điểm quanh tâm một góc `-3sr` radian |
| Balance | `edges=[0, divider1…dividerN, 1]`; hệ số màu `i = colorCount × (edges[i+1]-edges[i])` |
| Blend live | `d2=(x-ax)^2+(y-ay)^2`; trọng số `balanceWeight/(d2^2+0,0001)`; trung bình có trọng số trực tiếp trên RGB 8-bit |
| Blend static | Trọng số `balanceWeight/(distance^3,5+0,0001)`; blend trong OKLab rồi đổi về sRGB |
| Soften | `filter: blur(Npx)` trên toàn surface fill; scale bù mép `1+N/200` |
| Noise | Tile grayscale 256 × 256; mỗi pixel `round((random()+random())/2×255)`; alpha 255; repeat, `mix-blend-mode: overlay`, `image-rendering: pixelated`; opacity `0,5×noise/100` |

`Speed = 0` dừng renderer. Delta time bị cap 50 ms nên tab resume không cộng
một bước clock quá lớn. `prefers-reduced-motion: reduce` vẫn để `Flow` chạy trong
phép đo live; implementation Trường Thịnh phải tự render frame tĩnh cho mode này.

## Pins và bands

**Exact extracted:** 12 preset `Flow` không lưu pins hoặc bands riêng. Bands
mặc định được sinh đều: `25 / 50 / 75`, nên bốn màu có hệ số
`1 / 1 / 1 / 1`.

Pins mặc định được suy ra xác định từ `Scale`, bốn anchor tại `t0` và clamp
3..97%:

`pinPercent = clamp(3; 97; 50 + (anchor(t0)-0,5) × C × 100)`.

| Scale | Pin 1 | Pin 2 | Pin 3 | Pin 4 |
| ---: | --- | --- | --- | --- |
| 46 | 44,473252 / 3,383645 | 59,244024 / 14,988327 | 73,123272 / 36,581410 | 89,889365 / 89,696364 |
| 48 | 44,333923 / 3 | 59,477066 / 14,105680 | 73,706212 / 36,243126 | 90,894980 / 90,697113 |
| 50 | 44,194593 / 3 | 59,710109 / 13,223033 | 74,289151 / 35,904842 | 91,900594 / 91,697861 |
| 52 | 44,055263 / 3 | 59,943152 / 12,340385 | 74,872091 / 35,566558 | 92,906208 / 92,698610 |

Mỗi ô là `x% / y%`. Khi user kéo pin đến `B`, ring UI đứng yên còn anchor nội
bộ tiếp tục drift nhỏ:

`(B/100-0,5)/C+0,5 + 0,2×(anchor(t)-anchor(t0))/C`.

**Exact measured:** kéo pin 1 từ `44,1946% / 3%` đến
`54,1188% / 18,3923%` chỉ đổi pin đó, bật `Reset`, và ring giữ nguyên sau
1,2 giây trong khi canvas tiếp tục chạy.

**Candidate:** nếu owner muốn composition khác default, tune pins và bands trong
dev UI rồi lưu explicit. Không gán ngẫu nhiên pins/bands chưa qua owner preview.

## 12 preset `Flow`

Các palette, `Field`, `Speed` và `Noise` của preset 2–12 là **exact extracted**
từ entry tương ứng. Iridescent cloud lấy `Field 50/60/10` và `Speed 30` theo
**resolved default**. `Soften 0` là **resolved default** cho cả 12 preset.

| Preset | Palette theo thứ tự | Scale / Distortion / Swirl | Speed | Soften | Noise | Pin group |
| --- | --- | --- | ---: | ---: | ---: | ---: |
| Iridescent cloud | `#EAF4FC` `#1E50A2` `#F09199` `#895B8A` | 50 / 60 / 10 | 30 | 0 | 6 | 50 |
| Opal | `#F6F9FF` `#9BE0E8` `#C4B5F7` `#F8B8D9` | 52 / 46 / 8 | 24 | 0 | 5 | 52 |
| Lagoon | `#EAFBF7` `#5CE3E6` `#0F9CC2` `#274A78` | 52 / 44 / 6 | 26 | 0 | 5 | 52 |
| Emerald | `#F0FBEF` `#8FE3B0` `#22C79A` `#0B5F51` | 50 / 44 / 6 | 26 | 0 | 5 | 50 |
| Solar flare | `#FFF6DE` `#FFC24B` `#F4664D` `#8A2E5E` | 50 / 52 / 10 | 28 | 0 | 6 | 50 |
| Orchid | `#FBEFFB` `#E794C9` `#9678CE` `#4A3894` | 48 / 46 / 9 | 26 | 0 | 5 | 48 |
| Peach glow | `#FFF3EC` `#FFC9A3` `#F08A8C` `#B65E8C` | 50 / 48 / 8 | 28 | 0 | 5 | 50 |
| Electric tide | `#DFFBFF` `#6FD8F2` `#4C5BE0` `#2A2450` | 50 / 60 / 14 | 32 | 0 | 6 | 50 |
| Sunset | `#FFE9C4` `#FFAE3F` `#F0574D` `#5D2A66` | 46 / 70 / 16 | 34 | 0 | 6 | 46 |
| Mint ice | `#F2FDF9` `#A8F0DC` `#52CBB0` `#147A5F` | 50 / 55 / 10 | 30 | 0 | 6 | 50 |
| Midnight bloom | `#12142E` `#4C3894` `#B387E8` `#F6C6E2` | 46 / 78 / 22 | 36 | 0 | 8 | 46 |
| Rose gold | `#FFF4E8` `#FBC9AC` `#E79BA7` `#8E5A74` | 52 / 50 / 8 | 26 | 0 | 6 | 52 |

**Exact measured:** slider dùng step 1. `Scale`, `Distortion`, `Swirl`, `Speed`
và `Noise` có range 0..100; `Soften` có range 0..80; ba balance handle có
range 0..100.

## Motion và giới hạn parity

Trong khoảng 1,2 giây ở preset mặc định, mean absolute RGB delta là khoảng
21,35/255; 59,45% channel sample đổi hơn 5 và 39,32% đổi hơn 15. Đây là
**exact measured** cho sample/time của phiên này, không là threshold sản phẩm.

Các yếu tố ngăn pixel identity giữa hai lần render:

1. Grain dùng `Math.random()` không seed.
2. Phase phụ thuộc timestamp RAF và thời điểm mount.
3. Uint8 rounding, Canvas upscale và GPU texture interpolation khác browser.
4. Live RGB path và static OKLab path cố ý không cùng pipeline.
5. Bundle URL là asset hash của build hiện tại, không là API version ổn định.

**Inference:** clean-room WebGL có thể đạt control parity đầy đủ và motion/
composition parity rất cao nếu giữ cùng công thức, texture 240 × 160, clock và
linear upscale. Không claim byte-for-byte hoặc pixel-identical trước screenshot
oracle. `95–99%` chỉ là candidate perceptual target, chưa là kết quả đo.

**Candidate triển khai:** fragment shader cho bốn anchor, hai distortion pass,
swirl và inverse-distance blend; noise overlay riêng; chỉ animate card visible,
pause khi tab ẩn và render frame tĩnh dưới reduced motion. Một CPU canvas/RAF
cho mỗi skeleton card không phù hợp với số đo main-thread ở trên.

## Export và giới hạn trích xuất

Export UI có PNG, JPG, SVG, MP4, HTML, CSS và JSON. CSS tự ghi rằng nó chỉ là
fallback linear gradient và không vẽ được mesh. JSON chứa palette, dividers,
soften, noise và speed nhưng bỏ Scale, Distortion, Swirl và pin positions. MP4
dùng loop 4/6/8/10 giây ở 30 fps. Reference không cung cấp motion-code export;
artifact này chỉ lưu measurement đủ để tái tạo clean-room.

## Chú thích thuật ngữ

- **Pin**: điểm neo vị trí của một màu trên trường gradient.
- **Band**: khoảng ảnh hưởng của một màu, giới hạn bởi balance divider.
- **Resolved default**: giá trị runtime lấy từ default của type khi preset không
  khai báo riêng.
- **Clean-room**: tái tạo từ behavior và phép đo, không sao chép source.
- **Pixel parity**: từng pixel bằng nhau theo oracle đã xác định.
- **Perceptual parity**: hình và motion đủ giống về cảm nhận dù pixel có sai số.
