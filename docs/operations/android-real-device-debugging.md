---
title: Debug Chrome trên Android thật qua USB
type: operations
status: connection-verified
updated: 2026-09-27
related_specs:
  - ../specs/site-shell.md
---

# Debug Android thật qua USB

Owner xác nhận thiết bị là Android, browser Chrome, máy host Windows chạy
Codex. Trang chạy trên điện thoại thật; viewport desktop emulation không thay
gate này. Ngày27/09/2026 đã đọc DOM và chụp ảnh trang Advertising local qua
Chrome DevTools MCP (nay đã gỡ) trên Galaxy A05s thật (máy cũ; từ 2026-10-18 owner dùng phone Android khác, cùng quy trình adb/CDP). Đây là PASS kết nối/debug; chưa là
nghiệm thu giao diện. Owner yêu cầu local trước, sau phát hành mới debug demo Cloudflare.

## Cài đặt điện thoại

1. Mở Cài đặt → Giới thiệu điện thoại → Số bản dựng/Build number. Với Samsung,
   mục này thường trong Thông tin phần mềm. Chạm7 lần, nhập PIN nếu được hỏi.
2. Mở Tùy chọn nhà phát triển/Developer options; bật Gỡ lỗi USB/USB debugging.
3. Cắm cáp truyền dữ liệu trực tiếp vào máy Windows; mở khóa màn hình.
4. Khi có prompt cho phép máy tính debug qua USB, chọn Cho phép. Prompt có thể
   chỉ xuất hiện sau khi host bắt đầu discovery; chưa có prompt không là FAIL.
5. Sau khi host nối cổng local ở mục dưới, trong Chrome điện thoại mở
   [Advertising local](http://localhost:8790/vi/advertising-products/).
   Server hiện tại không map `/`; nhập chỉ `localhost:8790` sẽ báo Not found.

Nguồn: [Android developer options](https://developer.android.com/studio/debug/dev-options)
và [Chrome remote debugging](https://developer.chrome.com/docs/devtools/remote-debugging/).
Tên/menu thay đổi theo hãng; chỉ chọn các mục phục vụ USB debug.

## Kết nối host

Chrome trên Windows có thể discovery bằng `chrome://inspect/#devices` với
Discover USB devices. Đúng model và tab Advertising phải xuất hiện trước khi
gọi kết nối thành công. Nếu dùng CLI/CDP cho Codex, cần `adb` khả dụng;
standalone [SDK Platform-Tools](https://developer.android.com/tools/releases/platform-tools)
cung cấp công cụ này, không cần cài full Android Studio.

Ngày27/09 đã tải Platform-Tools37.0.1 từ link Windows chính thức của Google
vào `E:\TruongThinh-Website\.tooling\android\platform-tools\`; `adb` là
1.0.41. Archive SHA-256:
`45F4D63113E895EBDE0C90F194099A4676B6AC653BD28D54314A9E022BBC1A99`.
Thư mục này là generated local, Git ignore. Không sửa global PATH/MCP config
hoặc cài driver; Windows nhận ADB Interface ở trạng thái OK.

Lệnh sau chỉ chạy khi đúng executable đã có. `$androidAdb` trỏ path thật;
port9223 phải còn trống. Không chọn nhầm thiết bị khi có nhiều serial.

```powershell
$androidAdb = 'E:\TruongThinh-Website\.tooling\android\platform-tools\adb.exe'
& $androidAdb devices -l
```

Chọn serial có trạng thái `device`, không phải `unauthorized` hoặc `offline`:

```powershell
$androidSerial = '<serial từ devices -l>'
& $androidAdb -s $androidSerial forward tcp:9223 localabstract:chrome_devtools_remote
$androidVersion = Invoke-RestMethod -Uri 'http://127.0.0.1:9223/json/version'
$androidVersion | Select-Object Browser, 'Protocol-Version'
```

Google [documented CDP socket forwarding](https://developer.chrome.com/docs/devtools/remote-debugging/#debug-manually-through-android-debug-bridge-adb).
Nếu endpoint không có hoặc socket khác, đọc exact error và transport của
browser đang chạy; không nối desktop Chrome để giả là điện thoại.

Chrome DevTools MCP đã gỡ (owner 2026-10-19). Attach qua CDP script trong `tests/site/`
(ví dụ `DEVICE_CDP=http://127.0.0.1:9223`). Dùng phiên debug riêng, không chuyển
target của session desktop đang chạy. Phạm vi đọc là tab website cần test;
không đọc cookie/token hoặc trang riêng tư khác.

## Local preview và public baseline

Điện thoại không tự truy cập server của PC bằng `127.0.0.1`. Cách đã kiểm là
ADB reverse qua USB; kiểm server đúng checkout đang nghe trước, rồi:

```powershell
& $androidAdb -s $androidSerial reverse --no-rebind tcp:8790 tcp:8790
& $androidAdb -s $androidSerial reverse --list
```

Mở phone `http://localhost:8790/vi/advertising-products/`. Cổng8790 là nội dung;
cổng9223 là CDP. [ADB manual](https://android.googlesource.com/platform/packages/modules/adb/+/refs/heads/main/docs/user/adb.1.md)
sở hữu `reverse` và `--no-rebind`. Khi rút/cắm lại USB, mapping có thể mất;
đọc `forward --list`/`reverse --list`, chỉ tạo lại mapping thiếu. Không ghi đè
mapping khác hoặc dùng `--remove-all`.

Cách thay thế là Chrome host Port forwarding ánh xạ phone8790 tới
`localhost:8790` của PC, theo [Google port forwarding](https://developer.chrome.com/docs/devtools/remote-debugging/local-server#case-2-set-up-port-forwarding-through-usb-for-your-android-device).
Không bật đồng thời hai cách trên cùng phone port.

Baseline demo Cloudflare và candidate local phải được gắn version/source riêng. Không
gọi kết quả local là kết quả bản public. Không thêm desktop viewport override,
đổi font/display scale, animation scale hoặc browser flags để làm ảnh giống nhau.

## Probe kết nối đã kiểm — 2026-09-27

- Máy cũ Galaxy A05s, model `SM-A057F`, Android15/API35; Chrome153.0.8010.52,
  package `com.android.chrome`, CDP1.3; MCP1.9.0. ADB trạng thái `device` sau
  owner cho phép USB debugging; không dùng browser desktop thay thế.
- Read-only `evaluate_script` trả đúng route Advertising VI, title, shell DOM,
  font loaded và viewport411×782 CSS px; DPR2.625, visual viewport khoảng
  411.43×782.48, scale1. Native `take_screenshot` thành công.
  User agent Chrome dùng Android10/K do reduction; Android15 lấy từ device
  property, không suy OS từ user agent; [Google giải thích UA reduction](https://privacysandbox.google.com/blog/user-agent-reduction-android-model-and-version).
- Device font scale1.0; physical1080×2400, density450 và override420 đã tồn
  tại lúc đọc. Task chỉ đọc, không sửa display/font scale hoặc viewport.
- Preview8790 trả HTML khớp output checkout recovery
  `E:\TruongThinh-Website\.tmp\advertising-random-media\.site-output\`;
  served HTML SHA-256
  `9b145a3a880511562d4d92987f393384b0ca742550fe8ca4d71473fe047f7405`.
  Đây là preview candidate đã có, không là source commit sạch hoặc bản demo.
- Raw evidence local: [.tmp/android-usb-debug/connection.json](../../.tmp/android-usb-debug/connection.json)
  và [screenshot](../../.tmp/android-usb-debug/android-chrome-website.png).
  Transport/MCP listing, DOM read và screenshot PASS; scrollbar/skeleton/nút,
  console/network acceptance, iPhone và full parity chưa chạy trong probe này.

## Tương tác và ghi lại thao tác owner

Owner ưu tiên autonomy debug ngày27/09. Phiên interaction đã verify mở/đóng
menu bằng MCP và hai chiều vuốt bằng
[CDP Input.dispatchTouchEvent](https://chromedevtools.github.io/devtools-protocol/tot/Input/#method-dispatchTouchEvent)
trên browser điện thoại thật. Không dùng mobile desktop emulation hoặc đổi
viewport/device scale. Vuốt lên reveal header đang ẩn trước khi bấm menu;
menu open/close và scrollY xác nhận bằng DOM. Evidence:
[interactions.json](../../.tmp/android-usb-debug/interactions.json).

Khi owner yêu cầu tự thao tác, main dừng input/navigation tự động, attach
recorder read-only vào đúng tab local và báo READY trước khi owner bắt đầu.
Recorder lấy DOM/CSS, node identity, viewport/visualViewport, console/exception,
network metadata và screenshot có timestamp. Không ghi header, cookie, body
request/response hoặc thêm handler/class/style vào page. Screenshot có overhead;
không dùng phiên này để kết luận FPS/performance.

Phiên owner27/09 đã dừng theo tín hiệu “Đã thao tác xong”:652 DOM/CSS samples,
49 PNG và2140 events; entry point `owner-manual-android`, run id
`manual-2026-09-27T07-56-19-831Z`. Raw local:
[metadata](../../.tmp/android-usb-debug/manual-2026-09-27T07-56-19-831Z/metadata.json),
[events](../../.tmp/android-usb-debug/manual-2026-09-27T07-56-19-831Z/events.ndjson),
[summary](../../.tmp/android-usb-debug/manual-2026-09-27T07-56-19-831Z/summary.json).
Route transitions owner và scroll-only Advertising phải được phân tích riêng;
không gộp cancellation lúc navigation vào lỗi skeleton/image reload. `Log.enable`
có thể trả warning buffered trước attach; host receive time không là thời điểm
warning phát sinh. Native screenshot ghi page content, không gồm toolbar/status
bar của Chrome/Android. Logs viewport giữ tác động toolbar cho việc đối chiếu.

Quan sát skeleton 27/09 (timeline, raw hash nằm trong Git history) đã vào
[gate skeleton](../specs/advertising-skeleton.md#gate-còn-mở). Đã ghi nhận frame thay khi visual
height đổi trong cùng batch; không gộp canvas-only virtualization hoặc abort
lúc chuyển trang vào số lần skeleton reset. Recorder đã exit; mappings giữ
để tiếp tục debug local khi có yêu cầu.

## Bằng chứng cần thu khi QA giao diện

- Model, Android/Chrome version, orientation, CSS viewport, visualViewport,
  DPR, font/display scale, locale và source SHA của demo.
- Nút: screenshot thật cùng rect/computed font, line-height, padding và vị trí
  chữ/icon; ghi thời điểm font ready. Không kết luận chỉ từ screenshot scaled.
- Skeleton: cuộn bằng tay từ đáy lên qua vùng báo lỗi; correlate card identity,
  mount/reveal/renderer state, viewport resize, scrollY và network requests.
  Phân biệt reset/render với HTTP image reload; chưa xác nhận cause từ triệu chứng.
- Scrollbar: đối chiếu state có oracle trong module contract; state thiếu
  evidence reference để open, không tự chọn timing/drag implementation.
- Lỗi console/network và chuỗi thao tác có timestamp. Snapshot/video và trace
  timing chạy riêng; [Google ghi screencast giảm frame rate](https://developer.chrome.com/docs/devtools/remote-debugging/#screencast).

Lần kết nối đầu chỉ xác nhận target/metadata và khả năng thu evidence. Product
QA thực thi theo spec/plan đã duyệt; không resume QA/release/P11 đang paused.
Android PASS không chứng minh iPhone/Safari PASS. Giữ iPhone gate open đến khi
có thiết bị hoặc phương pháp được verify riêng.

## Preview correction scrollbar27/09

Verification scrollbar (gộp vào [shell website](../specs/site-shell.md#r9-scrollbar)) dùng
preview8792 của managed checkout `codex/mobile-ui-contract`; source/build/served
hash được đối chiếu riêng. Chỉ thêm `reverse --no-rebind tcp:8792 tcp:8792`.
Mapping8790 và forward9223 giữ cho phiên debug đang dùng; recovery QA vẫn paused.
Máy cũ Galaxy A05s đã kiểm native scrollbar VI/EN và owner xoay ngang thật, không override
viewport/DPR/scale. Native mode đạt; visual landscape và iPhone acceptance còn mở.

Chỉ gỡ reverse8792 của correction khi preview không còn cần. Không gỡ8790/9223
theo lệnh minh họa bên dưới nếu phiên khác còn phụ thuộc các mapping này.

## Gỡ kết nối

Sau khi xong phiên test, gỡ đúng forwarding vừa tạo; giữ mapping khác:

```powershell
& $androidAdb -s $androidSerial forward --remove tcp:9223
& $androidAdb -s $androidSerial reverse --remove tcp:8790
```

Nếu thay bằng Chrome Port forwarding8790, tắt đúng mapping đó. Tắt USB debugging
trên điện thoại khi không còn dùng phiên debug.

## Chú thích thuật ngữ

- **ADB**: Android Debug Bridge, kết nối host với thiết bị Android.
- **USB debugging**: quyền cho host dùng ADB qua cáp.
- **CDP**: Chrome DevTools Protocol, giao thức đọc/debug browser runtime.
- **Port forwarding**: chuyển cổng giữa host và điện thoại; không đổi route site.
- **Visual viewport**: vùng nhìn hiện tại sau toolbar, keyboard hoặc zoom.
- **Emulation**: mô phỏng thiết bị; không thay phép đo trên browser điện thoại thật.
