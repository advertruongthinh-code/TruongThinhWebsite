# Tạo và chấm media AI

Nguồn rule duy nhất cho mọi media tạo bằng AI trên site: công cụ, brief, chuỗi ảnh
một không gian (công trình mẫu), duyệt, phóng to, chấm điểm. Brief theo
[Ảnh Advertising](../../design-system/advertising-images.md) và
[Content và media](../../design-system/content.md); bối cảnh hợp ngành của
khách hàng Trường Thịnh theo [nghiên cứu khách hàng](../reference/advertising-client-products.md).

## Công cụ

Owner chốt 2026-10-18. Công cụ đầu lỗi, hết lượt hoặc hết quota thì sang công cụ kế
tiếp đúng thứ tự; không bỏ bước. Trả phí chỉ bằng coin runninghub.ai, không dùng model
tính giá đô la (owner 2026-10-24).

| Việc | Thứ tự |
| --- | --- |
| Tạo ảnh | ChatGPT web, ChatGPT Codex hoặc CLI, runninghub.ai, kie.ai |
| Tạo video bằng model AI | kie.ai, runninghub.ai |
| Tạo nhạc | YuE2 trên runninghub.ai |
| AI agent biên tập video | [hyperframe.dev](http://hyperframe.dev/) |

- kie.ai chỉ dùng cho ảnh owner chỉ định; sửa chữ trên ảnh owner chỉ định bằng
  gpt-image-2.5 Sunburst trên kie.ai. API key theo [API key](TOOLING.md#api-key).
- ChatGPT web trên Chrome PC: tải ảnh lên chatgpt.com chỉ khi owner gõ cho phép trong
  chính thread làm việc; Chrome chạy không cướp focus.
- Codex: `codex exec -m gpt-6-sol -s workspace-write -C <dir> -i <ref>`, effort mặc định
  (effort cao, prompt skill ngắn không tốt hơn); giữ prompt dài, tạo mới thay vì sửa
  chồng; khi sửa ảnh dặn Codex không resize, không lưu lại. Tắt `gen.ps1` và tiến trình
  codex cũ trước khi chạy lại (2026-10-14).

### gpt-image-2.5 trên kie.ai

Rút từ trang model kie.ai và bài so sánh bên thứ ba, lấy 2026-10-18; mặc định ban đầu,
sửa khi owner chấm ảnh thật.

- Flare và Sunburst cùng request, cùng giá; đổi model là đổi tên
  (`gpt-image-2-5-sunburst-text-to-image`, `-image-to-image`; Flare tương tự). Ảnh tham khảo
  truyền qua `input_urls`.
- Mặc định Sunburst cho ảnh lên site: viết đúng chữ nhỏ hoặc dày hơn Flare, ít vân da giả.
  Flare (nhanh hơn 15 đến 40%) chỉ cho ảnh không chữ cần thử bố cục nhanh, hoặc khi Sunburst lỗi.
- Phân giải: 1K 6 credit, 2K 10, 4K 16; tối đa 3840x2160, cạnh chia hết cho 16, tỷ lệ 1:3 tới
  3:1; 27:16, 16:27, 9:8, 8:9 chỉ ở 1K. Chọn theo slot ([tải ảnh](../specs/media-delivery.md)):
  2K mặc định; 4K cho hero trang chủ; 1K chỉ thử prompt, không lên site.

## Media chung

Áp dụng cho ảnh, video và âm thanh (lời thoại, jingle) (owner chốt 2026-10-18):

- tên trên sản phẩm (biển, backdrop, bao bì, menu, bảng tên, cúp) không dùng danh
  từ riêng hay tên thương hiệu; dùng danh từ chung nói rõ tiệm làm gì ("Sửa xe",
  "Nước giải khát") kèm dòng phụ; owner chỉ định tên, slogan hay chữ thì dùng đúng
  nguyên văn; địa chỉ, đơn vị hành chính ghi bằng số (Khu phố 3, Ấp 2), không tên;
- từ xưng hô Nam Bộ (cô Ba, chú Tư, bà Năm) chỉ dùng ở bối cảnh bình dân, thân
  thuộc, gần gũi, hoặc niche sản phẩm cao cấp phong cách hoài cổ; không dùng ở văn
  phòng, hội nghị, showroom, tiệc cưới, nhà hàng;
- trong một bộ media (masonry, trang sản phẩm, chuỗi video) mỗi từ xưng hô xuất
  hiện tối đa một lần;
- chữ tiếng Việt phải là từ có thật, đúng từng chữ; tên món là món phổ biến ở địa
  phương (kẹo dừa, kẹo chuối), không chữ lỗi hay chữ vô nghĩa; kiểm ở bản phóng to,
  video kiểm mọi khung có chữ, âm thanh nghe lại toàn bộ lời;
- tay đỡ, thanh sắt bắt từ tường ra bảng vẫy hoặc từ trần xuống bảng treo: xem ảnh
  thực tế ở địa phương trước, làm chỉnh chu, hiện đại, gọn (thép hộp thẳng hàng,
  sơn cùng tông bảng, bản mã bắt bulông, tỷ lệ cân với bảng); không tạm bợ, cẩu thả;
- LED neon là dây neon silicone bản 6 đến 10 mm thi công được: nét liền, cong theo
  bán kính dây uốn được (không góc gắt, không nét mảnh kiểu neon thủy tinh), gài
  vào rãnh phay CNC trên mica nền hoặc máng nhôm, dây nguồn đi gọn. Dạng phổ biến
  trong decor: mica in UV hình màu, cắt CNC theo viền hình, LED neon chỉ nhấn nét
  chính. Áp cho mọi ảnh bảng hiệu LED; bảng có hình chi tiết (người, tô món, ly
  nước) làm dạng in UV, neon chỉ viền và nhấn nét;
- bảng tên, biển chức danh tối giản, không hoa văn rườm rà;
- hero Kinh doanh và nhà ở có nhiều nội thất, decor gia công CNC được; cabin,
  phòng nghỉ đặt ở vùng riêng tư, khuất lối đi chính; backdrop tiệc cưới là decor
  dựng, không in ấn.


## Tạo ảnh

1. **Tham khảo trước.** Mỗi brief có 2 đến 4 ảnh thực tế ở Việt Nam, tìm trên
   Pinterest trước, thiếu mới tìm Google Ảnh; lưu link nguồn. Chưa có tham khảo
   thì chưa tạo. Tham khảo chỉ để học loại sản phẩm, vật liệu, cấu tạo; không
   chép chữ, logo, người, watermark hay thiết kế y nguyên.
2. **Brief.** Agent viết brief từng ảnh rồi tạo, không qua agent phản biện brief
   (owner chốt 2026-10-14). Owner không duyệt brief, trừ sản phẩm chưa từng có
   ảnh trên site.
   ChatGPT tự thiết kế mọi media, agent khác chỉ nêu rule (owner chốt 2026-10-18): brief chỉ nêu các rule dưới đây và ý tưởng đại khái
   (loại sản phẩm, ngành, bối cảnh, cảm giác), không tả chi tiết hình khối, chữ hay
   bố cục. Model được tự sáng tạo trong khuôn khổ rule, đúng sản phẩm Trường Thịnh
   làm và dựng được thật (owner chốt 2026-10-17). Bối cảnh nằm trong vùng địa lý đã
   khảo sát ([SEO R2](../specs/seo.md)). Không tên thương hiệu, logo hay nhãn hàng
   thật; tên, chữ, xưng hô và khung treo theo [Media chung](#media-chung).
   Brief nào cũng phải:
   - nêu cách che mặt của từng người bằng hình học khả thi với tư thế và góc
     máy (quay lưng, đi ra xa, nghiêng hoặc cúi, đầu khuất sau vật cao, vành nón,
     phụ kiện hoặc vật thể che, ngoài khung); mặt có thể thấy một phần nhưng
     không thấy rõ trọn vẹn; hiệu ứng ảnh nghệ thuật (ngược sáng, bóng che) được
     dùng để mặt không nhìn rõ; không kính hay mặt bóng hướng về máy; người buộc
     phải hướng về máy (người bán quay về phía khách) thì mặt không trực diện,
     chìm trong bóng che hoặc ngược sáng (owner chốt 2026-10-14, nới 2026-10-26);
   - xe bán hàng, quầy di động chụp từ hướng khách hàng, thấy trọn mặt trước xe;
     người bán đứng trong quầy, quay về phía khách (owner chốt 2026-10-14);
   - ngành kinh doanh khớp bối cảnh thật (không quầy khách sạn trong hội chợ);
   - đo vùng hiển thị thật của slot trong code khi ảnh bị cover crop hoặc có chữ
     đè, rồi ghi vị trí chủ thể theo vùng đó; chủ thể luôn giữa khung;
   - chữ trên biển, hộp đèn, decal là tên gọi hấp dẫn bằng từ ghép kèm một dòng
     phụ (slogan, motto), không ghi một từ trơn; thiết kế bắt mắt, đọc rõ từ xa
     theo tinh thần "để thương hiệu luôn trong tầm mắt" (không in câu này); chữ
     đủ lớn để đọc đúng dấu; biển một mặt quay về máy; chữ LED ma trận không đặt
     ở cỡ nhỏ (owner chốt 2026-10-14); chữ lớn, nét dày, ưu tiên hình;
     chữ AI lỗi thì đổi font hoặc góc nhìn (2026-10-26); dòng phụ là slogan,
     motto, không phải địa danh (owner 2026-10-14);
   - không dùng xe đẩy inox kiểu cũ có tủ kính ba mặt (như xe hủ tiếu), owner
     loại 2026-10-14;
   - graphic trên sản phẩm (decal, mặt in, mặt hộp đèn) cũng theo tinh thần trên:
     nhận diện đậm, đơn giản, nhận ra từ xa; hạn chế ảnh sản phẩm đặt tại xưởng,
     ưu tiên nơi dùng thật (owner chốt 2026-10-14);
   - chỉ tả sản phẩm Trường Thịnh làm: có làm màn hình LED ghép module cho sân khấu
     và hội trường (backdrop sân khấu có khung trang trí, màn hội trường, phòng họp);
     ảnh phải thấy rõ màn ghép module (đường ghép đều, cabinet, khung đỡ hoặc treo
     chắc, mới, sạch) để không giống màn máy chiếu (owner chốt 2026-10-17, thay chốt
     2026-10-14). Chỉ làm màn LED ghép module lắp cố định cho sân khấu và hội trường;
     màn LED cho thuê sự kiện (dựng tạm, truss cho thuê) và màn LED ngoài trời gắn
     tường nhà không làm, ảnh các loại đó là sai nhóm (owner chốt 2026-10-17); hộp
     đèn sáng đều, trông mới, không loang lổ;
   - bối cảnh tài chính, ngân hàng chỉ dùng cho nhóm sản phẩm văn phòng, cảnh
     trong văn phòng hoặc mặt tiền tòa nhà (owner chốt 2026-10-14);
   - ảnh có thể thuộc nhiều phân loại (vừa bảng hiệu vừa LED decor): mọi sản phẩm
     Trường Thịnh làm hiện trong ảnh đều chỉnh chu, độc đáo, đúng tinh thần slogan;
     giá treo, tay đỡ, khung trông mới (owner chốt 2026-10-14);
   - không lặp cảnh, chữ của ảnh owner đã giữ trong cùng nhóm.
   - không gian chỉnh chu, sạch sẽ, tử tế: tường sơn phẳng, sàn khô sạch, đồ xếp
     gọn; không bẩn, ố, rêu, bong tróc, rác, vũng nước. Độ thật lấy từ ánh sáng và
     nhiễu ảnh, không từ vết bẩn (owner chốt 2026-10-14). Quán xưa cũ có gu là
     niche được giữ: không gian làm nền, sản phẩm nổi bật và hợp chất liệu với
     không gian (hộp đèn khung gỗ trong quán cổ).
   - ảnh như chụp bằng máy ảnh thật: ánh sáng tự nhiên, nhiễu cảm biến, độ sâu
     trường ảnh; không bề mặt mịn bóng kiểu dựng 3D (owner chốt 2026-10-13);
   - nội thất đúng công năng: lối đi, chân cầu thang thông thoáng; sofa quay vào
     phòng, không chắn lối; không tủ cao sát bếp (owner chốt 2026-10-17).
   - kiến trúc có thật ngoài đời, không kiến trúc giả tưởng; tỷ lệ trụ và bảng như
     công trình thật; đường chân trời phía sau liền mạch; không cảnh trao tay ở nhà
     thuốc, y tế (owner 2026-10-14).
   - mặt xe bán hàng, standee: owner thích in ảnh tràn mặt (sản phẩm thật ở nửa dưới,
     lá nhiệt đới ở góc, tên và slogan trên cùng); không mảng phẳng hai màu một icon.
     Thiết kế lại thì nêu mục tiêu và ràng buộc, để model tự thiết kế, giữ ảnh nền đã
     chọn làm tham khảo.
   - ảnh News không dùng lại ảnh có trên site; ảnh công trình chỉ ở trang công trình đó.
3. **Tạo.** Công cụ theo thứ tự fallback ở [Công cụ](#công-cụ)
   (ChatGPT web trước; owner chốt 2026-10-18, thay chốt "chỉ Codex, không RunningHub"
   2026-10-15). Mỗi yêu cầu hoặc brief chỉ 1 ảnh; owner yêu cầu thì mới tạo thêm
   (owner chốt 2026-10-13). `record.json` ghi công cụ và model đọc từ C2PA của ảnh
   ("ChatGPT gpt-image"); phiên Codex chạy gpt-6-sol (owner chốt 2026-10-17). Không
   tự đổi model trong một công cụ. Không bao giờ dùng
   model astra ở bất kỳ bước dựng ảnh nào (owner chốt 2026-10-14).
   Prompt viết theo những gì model làm theo được (rút từ lượt thử F1 2026-10-13):
   - ràng buộc chính của chủ thể đặt ở đầu prompt, viết dạng khẳng định có vị trí
     cụ thể ("bình gas ở đầu TRÁI xe"), vì câu cấm hay bị bỏ qua;
   - bố cục tả bằng lời (cảnh toàn, trung, cận; trái, giữa, phải; góc máy), không
     dùng phần trăm khung hình;
   - bối cảnh tỉnh lẻ miền Tây ghi rõ nhà thấp tầng, không tòa tháp, không resort;
   - chữ chủ thể gồm tên và một dòng phụ, prompt đánh vần từng dấu; biển nền
     không có chữ đọc được;
   - tư thế người không mâu thuẫn với cách che mặt (nhân viên trao ly thì khách
     buộc phải quay về máy);
   - ảnh tham khảo chỉ để học hình dạng, vật liệu, cấu tạo, tỷ lệ thật; không học
     bố cục, người, chữ, thương hiệu;
   - không dùng từ headline, title, caption trong prompt vì model in chữ vào ảnh;
     ảnh không chữ ghi rõ không có chữ ở bất kỳ đâu (owner chốt 2026-10-17);
   - chuỗi ảnh một không gian theo [rule riêng](agent-rule-image-series.md);
   - sửa ảnh owner đã chọn bằng chế độ image edit trên chính ảnh đó, liệt kê phần
     giữ nguyên và phần sửa (owner chốt 2026-10-17); ảnh đã sửa hai lần mà còn
     lỗi thì tạo mới từ đầu, vì sửa chồng làm ảnh xuống cấp (owner chốt 2026-10-18);
   - thiết bị mặt trơn không logo; hút mùi rộng bằng bếp và đúng tâm bếp;
   - ảnh hero trang chủ: chữ hero canh giữa khung (`src/site/style.css`
     `.hero-content` top 50%), nên dải giữa khung để trơn, chủ thể ở phần ba dưới
     để cắt dọc điện thoại vẫn thấy; decor nhẹ tông trầm, tương phản thấp được phép
     cả phía sau chữ, nhưng vật sáng (hộp đèn, mặt đá sáng, đèn, mảng trắng) không
     được nằm sau chữ; không gian phải có tỷ lệ công trình thật (thấy trần, chiều
     cao tường và kích thước đồ hợp lý), không tạo khoảng tường tối cao vô tận chỉ
     để có chỗ đặt chữ; sản phẩm quảng cáo trong hero chỉ có icon và mảng màu,
     không chữ, vì chữ hero đè lên (owner chốt 2026-10-17);
   - prompt đúng của từng ảnh lưu `p-<id>.txt`;
   - chữ trong ảnh kiểm từng ký tự có dấu ở bản phóng to (dễ sai: Ờ, Ừ, Ữ, Ỡ); sai
     một dấu là chữ chủ thể sai.
4. **Hồ sơ.** Mỗi đợt một thư mục `source-assets/<đợt>/` trên PC: prompt
   `p-<id>.txt`, ảnh gốc, `record.json` (file, SHA-256, kích thước, provenance
   kèm model đọc từ C2PA, thiếu thì `unknown`), `ref/` gồm ảnh tham khảo và
   `sources.json`.
5. **Owner duyệt cuối** trên trang duyệt (artifact claude.ai, không đưa đường dẫn PC):
   ảnh cũ cạnh ảnh mới, kèm điểm, link tham khảo, link chat ChatGPT, zoom toàn màn hình
   100%, công cụ khoanh vùng (mask) để sửa, ô ghi chú gen lại; không hiện logo SVG.
   Chỉ ảnh owner lấy mới vào PR; ảnh không đạt thì gen lại, owner quyết ảnh gen lại có
   quay lại trang duyệt không. Lựa chọn cho việc chạy trên PC phải là chữ owner gõ
   trong thread làm việc; bấm card không tới được PC.

## Chuỗi ảnh một không gian

Rule chuỗi ảnh của một không gian (bản vẽ, ảnh ref, moodboard, nhất quán giữa các góc, thiết kế)
nằm ở [Chuỗi ảnh một không gian](agent-rule-image-series.md).

## Phóng to

- Owner tự phóng to ảnh gốc của site bằng Topaz Gigapixel (2026-11-12). Agent phóng to
  bằng workflow B (SeedVR2 chia khối, làm nét) trên runninghub.ai, 12 đến 15 coin mỗi ảnh
  (owner chọn 2026-10-24, xác nhận 2026-10-25).
- Đã loại: Real-ESRGAN (bề mặt như nhựa), upscale 4K của kie.ai, SeedVR2 7B và Qwen-Image
  (sai dấu chữ Việt hoặc đổi khung), VOSR2 (bịa họa tiết). Biển có chữ không dùng model
  phục hồi sinh chữ.
- Chọn ảnh theo file site build thật tham chiếu (`.site-output` từ
  `scripts/site/prepare-static-assets.mjs`), không theo file trong thư mục assets.
- Xóa metadata ảnh từ runninghub.ai (có thể chứa token owner), rồi chấm lại đúng SHA-256 mới.
- Ảnh phóng to đã duyệt giữ làm bản gốc ở `source-assets\upscale-da-duyet` trên ổ E và
  chép sang ổ D; ảnh gốc từng card ở `source-assets\anh-goc-theo-the`, tên `<số card>-<tên>`.
  Owner có thể sửa tay ảnh gốc ở đó và yêu cầu cập nhật mọi chỗ liên quan.

## Chấm điểm

Ảnh của mỗi brief phải đạt **Audit ≥ 8/10 và Critique ≥ 8/10**;
không lấy trung bình.

| Audit | Điểm |
| --- | --- |
| Đúng cụm, sản phẩm, tag, bối cảnh, ngành khách hàng, góc chụp theo brief | 3 |
| Kết cấu, vật liệu, tỷ lệ, khả năng gia công và lắp đặt | 3 |
| Không lỗi hình học, chữ, ánh sáng, phản chiếu, chi tiết AI | 2 |
| Đúng tỷ lệ ảnh, pixel thật, metadata, provenance | 2 |

| Critique | Điểm |
| --- | --- |
| Bố cục rõ chủ thể ở ảnh lớn và thumbnail | 3 |
| Ánh sáng, vật liệu, độ sắc nét | 3 |
| Hợp ngôn ngữ thị giác ([Design System](../../design-system/README.md)), tinh tế nhưng trung thực cấu tạo | 2 |
| Bổ sung khác biệt hữu ích cho bộ ảnh | 2 |

**Loại thẳng dù đủ điểm**: thấy rõ trọn mặt (mặt thấy một phần, bị che bởi tư
thế, góc khuất, phụ kiện, vật thể, ngược sáng hay bóng che thì không loại); thương hiệu hoặc watermark sao
chép; chép chữ, logo hoặc thiết kế của ảnh tham khảo; chữ chủ thể sai; kết cấu
bất khả thi hoặc xưởng không làm được; sai nhóm; sản phẩm lớn bị cắt; crop
hoặc kéo méo để ép tỷ lệ; khai sai provenance; bản crop hoặc export lại coi
như ảnh mới; ảnh trong chuỗi không định vị được trên mặt bằng hoặc mâu thuẫn ảnh
khác của chuỗi; chủ thể hoặc chi tiết sáng nằm trong vùng chữ của slot.

Ngoại lệ (owner chốt 2026-10-18): với đợt ảnh tạo bằng ChatGPT web, owner tự audit
ảnh, không dùng agent chấm.

Một agent chấm, độc lập với agent tạo ảnh (owner chốt 2026-10-13, thay cho ba
agent). Câu hỏi đầu tiên: người xem có tin ảnh này do máy ảnh chụp không; ảnh trông
như tranh vẽ hay dựng 3D là trượt. Agent mở ảnh, chấm đủ hai bảng, ghi điểm từng mục và lỗi; soi cả kết
cấu, vật liệu, chi tiết AI, chữ và dấu, bố cục, thumbnail, ngành khách hàng.
Lỗi loại thẳng là loại.

Mỗi yêu cầu tạo tối đa 3 lần: ảnh trượt thì sửa prompt theo lý do agent chấm
nêu rồi tạo lại một ảnh. Ba lần đều không đạt thì dừng, trình owner cả ba ảnh
kèm điểm từng bảng và lý do loại; owner có thể ra lệnh một đợt mới 3 lần với
brief đã sửa, hoặc giữ một ảnh trượt (báo cáo ghi rõ owner giữ dù chưa qua gate)
(owner chốt 2026-10-17). Báo cáo cho owner gọi ảnh bằng số thẻ trong báo cáo
(owner chốt 2026-10-17). Main kiểm lại, không tự nâng điểm. Ảnh sửa
thì chấm lại đúng SHA-256 mới; ngoại lệ: retouch chỉ xóa logo nhỏ hay vết lạ thì không
cần chấm lại, còn ảnh hero trang chủ được duyệt thì phóng to (upscale) trước khi lên
site và chấm lại đúng SHA-256 mới (owner chốt 2026-10-17). Owner phát hiện lỗi thì acceptance cũ mất hiệu lực.

## Chú thích thuật ngữ

- **Audit**: kiểm độ đúng kỹ thuật và nội dung của ảnh.
- **Critique**: đánh giá chất lượng thị giác và đóng góp cho bộ ảnh.
- **Provenance**: nguồn gốc có thể truy nguyên của ảnh (model, SHA-256, tham khảo).
- **C2PA**: metadata nhúng trong ảnh cho biết công cụ và model đã tạo ảnh.
- **Công trình mẫu**: công trình dựng bằng ảnh AI để minh họa năng lực trên trang Công trình.
- **CSV**: file bảng dạng chữ, mỗi dòng một món.
- **Upscale**: phóng to ảnh lên độ phân giải cao hơn.
