---
title: Hook có một dispatcher cho mỗi event
status: superseded
date: 2026-08-08
scope: historical project decision
supersedes: []
related_specs: []
related_reports: []
superseded_by: native-graphify-hooks-and-watcher.md
---

# Hook có một dispatcher cho mỗi event

> Đã migrate từ decision history trước ADR vào 2026-08-09. Descriptive filename
> hiện là stable reference.

## Decision

Mỗi event có một dispatcher duy nhất, trước đây phụ trách quick doctor, ADHD
injection, update notification, Graphify/Serena freshness, Impeccable và watcher
cleanup. Hook dùng debounce/lock/loop guard, log error và không được tạo
false-positive QA/freshness.

## Hệ quả

Decision này đã bị supersede bởi
[`native-graphify-hooks-and-watcher.md`](native-graphify-hooks-and-watcher.md); giữ lại
để giải thích lịch sử project.

## Chú thích thuật ngữ

- **Dispatcher**: thành phần nhận event và điều phối action.
- **Debounce**: gom event gần nhau để tránh chạy lặp.
- **False-positive**: báo fail dù behavior thực tế không fail.
