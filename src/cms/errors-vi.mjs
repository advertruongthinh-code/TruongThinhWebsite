// Vietnamese wording and place of a save error (cms-editor R4, R8). Pure module. `error` is one entry of the Worker's `errors` or
// `missing` list: { message, level, code? }. Returns { text, block, field }: block is the block index the preview selects, field the
// page field the Thông tin tab marks (null for neither). Anything not listed reads "Chưa hợp lệ: <message>".
const BY_CODE = {
  "layout-locked": (error) => `Layout này cần thêm ${error.missing} media.`,
  "media-min": (error) => `Cần thêm ${error.missing} media cho layout này.`,
  "media-max": (error) => `Thừa ${error.extra} media so với layout này: bớt media hoặc chọn layout lớn hơn.`,
  "layout-chain": () => "Các khối chưa khớp layout. Chọn lại layout.",
  "layout-unknown": () => "Chưa chọn layout.",
  "crop-ratio": () => "Khung cắt ảnh chưa đúng tỉ lệ của chỗ đặt.",
  "media-unknown": () => "Có media không còn trong thư viện.",
  "media-kind": () => "Loại media này không đặt được ở đây.",
  "media-reuse": (error) => {
    const [, media, where] = /media (\S+) is already used by (.+?) \(/.exec(error.message) ?? [];
    return media ? `Ảnh ${media} đã dùng ở ${where}. Mỗi ảnh chỉ đặt ở một trang.` : "Ảnh này đã dùng ở bài khác.";
  },
  "alt-dup": () => "Hai media trong card có mô tả (alt) giống nhau.",
  "link-target": () => "Một link trong chữ trỏ tới trang không có.",
  "card-min": () => "Card công trình cần ít nhất 2 media.",
  "card-foreign": () => "Media của card phải nằm trong media của bài.",
  "marks-mismatch": () => "Dấu định dạng tiếng Việt và tiếng Anh không khớp.",
  "list-mismatch": () => "Danh sách tiếng Việt và tiếng Anh không khớp.",
};
const BY_TEXT = [
  [/missing VI text/, "Chưa có chữ tiếng Việt."],
  [/missing EN text/, "Chưa có chữ tiếng Anh."],
  [/paragraph counts differ/, "Số đoạn tiếng Việt và tiếng Anh khác nhau."],
  [/missing alt(Vi|En)/, "Media thiếu mô tả (alt)."],
  [/slugVi must be/, "Link tiếng Việt phải là chữ thường không dấu, nối bằng gạch ngang."],
  [/slugEn must be/, "Link tiếng Anh phải là chữ thường không dấu, nối bằng gạch ngang."],
  [/published phải là/, "Ngày đăng phải có dạng năm-tháng-ngày."],
  [/group phải là/, "Chưa chọn nhóm."],
  [/sector phải là/, "Chưa chọn mảng."],
  [/type phải là/, "Loại công trình không thuộc mảng này."],
  [/seoTitle phải có/, "Tiêu đề SEO cần chữ Việt."],
  [/contact-quick \(CTA\) must be the last block/, "Khối liên hệ phải nằm cuối."],
  [/needs at least one block/, "Bài chưa có khối nào."],
  [/mark/i, "Dấu định dạng trong chữ chưa đúng."],
];
const FIELDS = /(?:\.|: )(title|description|cover|slugVi|slugEn|published|group|sector|type|seoTitle)\b/;

export function explain(error) {
  const message = String(error?.message ?? "");
  const block = /blocks\[(\d+)\]/.exec(message);
  const field = block ? null : FIELDS.exec(message)?.[1] ?? null;
  const text = BY_CODE[error?.code]?.(error) ?? BY_TEXT.find(([pattern]) => pattern.test(message))?.[1] ?? `Chưa hợp lệ: ${message}`;
  return { text, block: block ? Number(block[1]) : null, field };
}

// Why the layout cannot hold the media list (relayout error code or "stale"), for the Save block and the Media tab.
export const fitMessage = (code) => (code === "video-slot"
  ? "Video chỉ đặt được ở khung một media. Đổi thứ tự hoặc layout để video vào khung đó."
  : "Số media chưa khớp layout. Chọn layout ở tab Layout.");
