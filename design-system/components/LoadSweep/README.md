# Vệt sáng

Trạng thái chờ của khung ảnh nội dung trên mọi trang và của nút
[Suggestion](../Suggestion/README.md) "Có thể bạn thích" chưa bật, tới khi ảnh
tải và giải mã xong ([tải ảnh R6](../../../docs/specs/media-delivery.md#r6-vệt-sáng-chờ-ảnh-tĩnh)).
Owner duyệt 2026-10-07, thay vòng xoay và thanh tải ở đáy nút. Style ở
`src/site/style.css` và `src/site/detail.css`, không có markup riêng. Card masonry
Advertising chờ ảnh bằng blur trên màu chủ đạo ([Media card](../MediaCard/README.md)), không dùng vệt.

## Hành vi

- Khung nền `media-loading-surface` `#2b2c2b`, ảnh `opacity: 0`.
- Một dải sáng đối xứng, trắng `16%` ở tâm, nghiêng 60 độ (cùng góc dải mark),
  rộng khoảng hai phần năm khung, vẽ bằng `::before` của khung. Độ sáng giảm
  về 0 qua 17 điểm màu theo đường cosine nên mép mờ dần (owner 2026-10-10).
- Vệt vào từ ngoài mép trái, ra hẳn mép phải, lặp liên tục, mỗi lượt `1.6s`
  linear. Chỉ animate `transform`; khung ra ngoài viewport thì vệt dừng.
- Ảnh (JXL, trình duyệt chưa đọc JXL thì WebP) tải xong toàn bộ file và
  `decode()` xong mới hiện, không hiện bản tải dở: khung có `.is-media-settled`,
  vệt gỡ, ảnh `opacity` `0` sang `1` trong `0.45s` `cubic-bezier(0.16, 1, 0.3, 1)`
  ([tải theo nấc R3](../../../docs/specs/progressive-loading.md#r3-ảnh-chỉ-hiện-khi-tải-xong)).
- Khung lớn (hero, ảnh lớn detail) hiện xong rồi mới tải bản gốc khi trang ngừng
  cuộn; giải mã xong thì đổi thẳng, không vệt lần nữa
  ([R10](../../../docs/specs/progressive-loading.md#r10-lên-bản-gốc-sau-khi-hiện)).
- Nút suggestion đang bật nền trắng, không có vệt; nhãn luôn nằm trên vệt.
- Reduced motion: không lướt; cả lớp sáng tối nhẹ chu kỳ `2s`.
- Không JavaScript: không có class `media-gate` trên root, ảnh hiện như thường.

Preview dựng một khung ảnh chưa tải và ba nút không có ảnh; nút thứ ba ở trạng
thái bật.

## Chú thích thuật ngữ

- **Settle**: ảnh đã tải và giải mã xong, hoặc lỗi; khung thôi chờ.
- **Decode**: giải mã ảnh thành pixel trước khi vẽ, để không lộ ảnh tải dở.
