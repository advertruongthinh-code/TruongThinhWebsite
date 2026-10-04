---
title: <tên capability>
status: live
source:
  - <glob file source spec này sở hữu, ví dụ src/site/about/**>
tests:
  - <file test chứng minh hành vi>
notion: none
updated: YYYY-MM-DD
---

# <Tên capability>

<!-- Mẫu theo docs/specs/docs-system.md R2. Tối đa 300 dòng; dài hơn thì tách
capability. Viết từ source và test hiện tại. Không ghi lịch sử, delta hay
evidence có ngày: Git log và mô tả PR giữ. status: live | planned | dormant. -->

## Mục đích

<Tối đa 5 dòng: capability làm gì cho ai, ranh giới với capability khác.>

## Hành vi

### R1. <Tên requirement>

<Một đoạn ngắn mô tả hành vi hiện tại. Câu chưa chắc ghi
`[CẦN LÀM RÕ: câu hỏi]`, không đoán.>

```gherkin
Given <bối cảnh>
When <hành động>
Then <kết quả quan sát được>
```

## Giao diện và dữ liệu

| Loại | Tên | Vai trò |
| --- | --- | --- |
| DOM hook | `[data-...]` | <ai đọc, ai ghi> |
| Data | `<file>` | <nội dung, ai sinh> |
| Hàm public | `<tên>` | <input, output, lỗi> |

## UI

<Link tới component và section trong `design-system/`. Không chép token,
khoảng cách hay timing.>

## Kiểm tra

| R | Test hoặc command |
| --- | --- |
| R1 | `<file test>` hoặc "chưa có test" |

## Gate còn mở

<Chỉ việc NOT PASS chưa đóng, mỗi dòng nêu thiếu gì và ai đóng. Xóa dòng khi
đóng. Không còn gì thì ghi "Không có".>

## Chú thích thuật ngữ

- **<Thuật ngữ>**: <nghĩa ngắn>.
