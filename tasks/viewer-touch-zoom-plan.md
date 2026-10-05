# Plan viewer zoom hai ngón và chạm đúp

Spec: [advertising-viewer-touch-zoom](../docs/specs/advertising-viewer-touch-zoom.md)
(owner duyệt 2026-10-05). Card:
[Notion](https://app.notion.com/p/3f0332849a0e8178be65cd68d4de4b43).
File đứng riêng vì `tasks/plan.md` và `tasks/todo.md` đang giữ việc của thread
khác; xóa file này khi card Done.

## Nguyên tắc thực hiện

- Một PR code vào `main` gồm T1–T5, mỗi task một commit; spec, Viewer README,
  `motion.md`, `STATE.md` đổi trong cùng PR (living-docs và check sync).
- Chỉ sửa `src/site/advertising-products/photo-viewer.mjs` trong source. Không
  đổi markup, CSS (`touch-action: none` giữ nguyên), chữ ký
  `createAdvertisingPhotoViewer`, không thêm thư viện.
- Pointer Events thuần, dùng lại `runMotion`, `renderTransform`, `panLimits`,
  `cancelMotion` hiện có; không tạo state zoom thứ hai.
- Test touch mới ở file riêng `tests/site/advertising-viewer-touch.e2e.mjs`
  (Chromium, CDP `Input.dispatchTouchEvent`) để không phình file
  `advertising-photo-view.e2e.mjs` 1497 dòng; spec cập nhật `tests:`.
- Trước commit chạy ponytail-review trên diff đã stage (cloud không có git
  hook); trước merge chạy code review năm trục.

## Kiến trúc

- `level` (0, 1, 2) thay bằng `scale` liên tục. Ba nấc tính mỗi lần đo:
  `stops() = [1, coverScale(), 2 × coverScale()]`; `near(a, b)` sai số 1%.
- `setScale(next, anchor)` thay `setLevel`: dùng chung công thức anchor hiện có,
  animate `200ms ease-in-out` qua `runMotion`. Nút, con lăn, chạm đúp, bật về
  đều gọi hàm này.
- `adoptDisplayed()`: đọc `getComputedStyle(image).transform`, gán vào
  `scale`, `panX`, `panY` và style rồi mới hủy animation, để chạm giữa motion
  không nhảy (spec R6).
- Một `Map` pointer touch đang chạm trên viewport: 1 pointer là kéo, 2 pointer
  là pinch, pointer thứ ba bỏ qua. Pinch lưu `s0`, `d0`, điểm ảnh cục bộ dưới
  trung điểm; mỗi `pointermove` tính `s` có rubber band rồi pan theo trung
  điểm, kẹp bằng `panLimits`.
- `renderTransform({ announce })`: lúc pinch chỉ cập nhật transform và nút,
  `zoomStatus` cập nhật khi thao tác kết thúc (spec R5).

## Phase 1: Mô hình tỷ lệ liên tục

- [x] T1. Đổi `level` sang `scale` có nấc, giữ nguyên hành vi hiện tại
  - Làm: `stops`, `near`, `setScale`; nút `+`/`−`, con lăn tới nấc kế tiếp từ
    `scale`; Reset, middle-click về 1; disabled theo `near`; phím pan khi
    `scale > 1`; resize giữ nấc nếu đang ở nấc, nằm giữa thì giữ `scale` và kẹp.
  - Nhận: suite hiện có `PHOTO_VIEW_CONTROLS_ONLY=1` xanh trên Chromium,
    Firefox, WebKit, không sửa assertion cũ; `cursor` grab đúng khi
    `scale > 1`.
  - Files: `photo-viewer.mjs`. Cỡ S.

Checkpoint 1: hành vi desktop không đổi; diff chỉ là refactor.

## Phase 2: Thao tác chạm

- [x] T2. Pinch hai ngón, rubber band và bật về (spec R1, R2)
  - Làm: map pointer, bắt đầu pinch khi pointer thứ hai xuống trong viewport;
    rubber band một phần ba, trần 15%; buông ngoài khoảng thì `setScale` về
    giới hạn (Max giữ anchor trung điểm, Fit pan về tâm); hai pointer không
    bao giờ đóng dialog.
  - Nhận: test touch mới, Chromium `isMobile` dọc 390×844 và ngang 844×390:
    anchor sai số ≤ 1 CSS px khi chưa chạm giới hạn pan; giữ ngoài trần thì
    `s ≤ 2c × 1.15`, buông về đúng `2c`; `scrollY`, `visualViewport.scale`
    không đổi; dialog vẫn mở.
  - Files: `photo-viewer.mjs`, `tests/site/advertising-viewer-touch.e2e.mjs`.
    Cỡ M.
- [x] T3. Kéo một ngón, chuyển một và hai ngón, chạm giữa motion (spec R3, R6)
  - Làm: một ngón trên ảnh kéo khi `scale > 1`; một sang hai ngón và ngược lại
    không nhảy; `adoptDisplayed()` khi chạm lúc đang mở hoặc zoom; bỏ qua chạm
    khi đang đóng.
  - Nhận: test đo transform trước và sau mỗi lần chuyển, chênh ≤ 1 CSS px;
    vuốt từ nền ở Fit không đóng (giữ L06), chạm một lần lên nền vẫn đóng.
  - Files: như T2. Cỡ S.
- [x] T4. Chạm đúp, nút giữa hai nấc, reduced motion (spec R4, R5, R6)
  - Làm: nhận chạm đúp theo 300 ms, 24 px, di ≤ 10 px, chỉ `pointerType`
    touch trên ảnh; Fit tới Cover tại điểm chạm, `s > 1` về Fit; status
    `aria-live` cập nhật cuối thao tác.
  - Nhận: test chạm đúp hai chiều, anchor ≤ 1 CSS px; pinch dừng giữa Fit và
    Cover rồi `+` tới Cover, `−` về Fit; reduced motion đổi tức thì; VI/EN;
    double-click chuột ở Chromium desktop không đổi `scale`.
  - Files: như T2. Cỡ S.

Checkpoint 2 (cloud): test touch mới xanh; `PHOTO_VIEW_CONTROLS_ONLY=1` xanh
ba engine; `pnpm qa:static`, `pnpm qa:docs`, smoke Chromium xanh; không lỗi
console hay network.

## Phase 3: Tài liệu, review, thiết bị thật

- [x] T5. Living docs trong cùng PR
  - Làm: spec `status: live`, `tests:` thêm file mới, bỏ gate đã đóng; Viewer
    README và dòng Viewer trong `motion.md` đổi "ba mức zoom" thành tỷ lệ liên
    tục có nấc, pinch, chạm đúp; `STATE.md` cập nhật dòng M07b.
  - Nhận: `pnpm qa:docs` xanh, check sync không cần dòng miễn.
  - Files: spec, `design-system/components/Viewer/README.md`,
    `design-system/motion.md`, `docs/STATE.md`. Cỡ S.
- [ ] T6. Review và merge
  - Làm: code review năm trục trên diff; sửa finding chặn; CI xanh thì merge
    theo quy tắc tự merge; sau merge publish lại Design System lên claude.ai
    (docs-system R7).
  - Nhận: CI xanh, không còn finding chặn, artifact Design System đọc lại
    thấy Viewer mới.
- [ ] T7. A05s thật qua Remote Control trên PC
  - Làm: phiên Remote Control trên `E:\TruongThinh-Website` (owner bấm cho
    phép một lần trên thẻ): checkout `main`, `pnpm dev`,
    `adb reverse tcp:8787 tcp:8787`, `adb forward tcp:9222
    localabstract:chrome_devtools_remote`; chạy chính test touch qua CDP trên
    Chrome thật dọc và ngang (giả lập viewport như quy ước), chạm đúp bằng
    `adb shell input tap` hai lần.
  - Nhận: cùng assertion như cloud trên A05s; ghi kết quả vào mô tả PR hoặc
    comment; card Notion chuyển Done. Không deploy demo (deploy theo đợt do
    điều phối báo owner).

Checkpoint 3: card Done; xóa file plan này trong PR kế tiếp chạm `tasks/`.

## Ước lượng

Khoảng 400 LOC: source khoảng 170 dòng thêm hoặc sửa trong `photo-viewer.mjs`,
test khoảng 230 dòng. Ghi vào card Notion theo quy tắc từ 200 LOC.

## Rủi ro

| Rủi ro | Mức | Cách giảm |
| --- | --- | --- |
| Touch giả lập qua CDP trong Chromium headless khác Chrome Android thật (coalesced event, thứ tự pointer) | Vừa | T7 chạy cùng test trên A05s thật trước khi Done |
| iPhone Safari vẫn có thể zoom trang khi pinch dù `touch-action: none` (suy luận, chưa kiểm vì không có máy) | Vừa | Giữ gate iPhone trong spec; nếu lỗi thì chặn `gesturestart` trong viewer ở PR riêng |
| Đổi `level` sang `scale` làm lệch test wheel hiện có | Thấp | T1 riêng, chạy suite cũ ba engine trước khi thêm chạm |
| Thread M02b đang sửa `catalog-runtime.mjs`, `detail.css` | Thấp | Plan không chạm hai file đó; nếu conflict thì merge `main` vào branch |

## Mặc định đã chọn

- Merge PR code khi checkpoint 2 cloud xanh; A05s (T7) chạy ngay sau trên
  `main`, card chỉ Done khi T7 đạt.
- Không deploy demo trong thread này.

## Chú thích thuật ngữ

- **Rubber band**: ảnh co giãn ít hơn tay khi vượt giới hạn rồi bật về.
- **Anchor**: điểm ảnh giữ đứng yên khi đổi tỷ lệ.
- **CDP**: Chrome DevTools Protocol, điều khiển Chrome từ script.
- **Living docs**: tài liệu sở hữu contract đổi cùng PR với code.
- **LOC**: số dòng source và test thêm, sửa, xóa.
- **Checkpoint**: điểm kiểm tổng trước khi sang phase sau.
