# Trang 404

Nguồn: `src/site/404.html` (CSS riêng trong `<style>` của trang); spec [Shell R10](../../../docs/specs/site-shell.md#r10-floating-cta-và-footer).

Trang không tìm thấy theo mẫu 404 của Espacio: số lớn và một câu, canh giữa, vừa đúng một màn hình, không cuộn
(owner 2026-10-12).

- Container cao `100svh`: header, cụm chữ giữa phần còn lại, footer ở đáy.
- Số `404`: `clamp(4rem, min(30vw, 22svh), 10rem)` 600, line-height 1 (160px ở 1440, 117px ở 390).
- Câu: 1rem 700 chữ hoa, cách số 2rem.
- Motion: cả cụm `scale 1.1 → 1` `2.5s` `--ease`, câu rồi số hiện dần `1s expo.out`
  ([Motion](../../motion.md#text)). Floating CTA không hiện vì footer luôn trong viewport.

## Chú thích thuật ngữ

- **svh**: phần trăm chiều cao viewport nhỏ nhất (thanh địa chỉ đang hiện).
