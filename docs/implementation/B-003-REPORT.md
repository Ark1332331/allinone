# B-003 完成报告：FastAPI 路由 + 路由注册

> **Spec编号**：B-003  
> **完成时间**：2026年5月1日  
> **执行者**：Coding Model  
> **状态**：✅ 完成

---

## 📋 改动摘要

| 操作 | 文件路径 | 说明 | 行数 |
|------|---------|------|------|
| 新建 | `api/routes/glossary.py` | 术语 4 路由实现 | 120 |
| 修改 | `api/api.py` | 注册 glossary router | +4 |

---

## ✅ 合约对齐清单

- [x] 路由前缀：`/wiki`
- [x] 4 个端点齐备：`/glossary`、`/glossary/extract`、`/glossary/index`、`/glossary/refresh`
- [x] `response_model` 使用对齐后的 Pydantic 模型
- [x] 错误统一 `HTTPException`
- [x] Wiki cache 不存在返回 404

---

## 🧠 关键实现点

1. **延迟 import `read_wiki_cache`**
   - 避免 `api.api` 与 `api.routes.glossary` 循环依赖
   - 在函数内部导入

2. **缓存读取逻辑**
   - `GET /glossary` 与 `POST /glossary/refresh`：先读缓存，缺失返回 404
   - `GET /glossary/index` 同理

3. **Wiki pages 获取**
   - 从 `cache_data.wiki_structure.pages` 读取
   - 缺失时返回空列表

---

## 📦 路由清单

- `GET /wiki/glossary`
- `POST /wiki/glossary/extract`
- `GET /wiki/glossary/index`
- `POST /wiki/glossary/refresh`

---

## ⚠️ 注意事项

- `POST /wiki/glossary/extract` 当前使用默认 `provider="google"` 和 `model=None`，若需前端选择模型，B-004 可补充测试并在 B-003 后续迭代中扩展。

---

## 🎯 结论

✅ **B-003 已完成并对齐 Spec，可进入 B-004（单元测试）。**
