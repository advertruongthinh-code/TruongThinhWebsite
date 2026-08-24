# Archive website tham khảo

Directory này lưu research output local do
`scripts/reference/archive-reference.mjs` tạo. Archive được generate và bị Git
ignore.

Chỉ chạy crawler khi owner cung cấp origin:

```powershell
node scripts/reference/archive-reference.mjs --origin <url>
```

Archive có thể chứa source và media của bên thứ ba. Chỉ dùng nó để phân tích
layout và motion local. Không load archive vào production, không redistribute,
và không commit source URL hoặc proprietary asset.

## Chú thích thuật ngữ

- **Crawler**: tool tự động truy cập và lưu tài nguyên theo rule.
- **Archive**: bản lưu nghiên cứu local, không phải runtime dependency.
- **Origin**: URL gốc được owner cho phép crawler truy cập.
- **Redistribute**: phát tán lại source/media cho nơi khác.
