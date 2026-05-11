# B-003 变更计划：FastAPI 路由 + 路由注册

> 目标：新增术语功能 4 个路由，并注册到主应用。

---

## 范围

- 新建：`api/routes/glossary.py`
- 修改：`api/api.py`（注册路由）

不修改：`api/services/glossary_service.py`、`api/models/glossary.py`、`api/simple_chat.py`。

---

## 路由清单

- `GET /wiki/glossary`
- `POST /wiki/glossary/extract`
- `GET /wiki/glossary/index`
- `POST /wiki/glossary/refresh`

---

## 关键逻辑

- `GET /wiki/glossary` 与 `POST /wiki/glossary/refresh`：
  - 先读取 wiki cache
  - cache 不存在 → 404 "Wiki cache not found, please generate wiki first"
  - 从 `wiki_structure.pages` 取内容传给 service

- `GET /wiki/glossary/index`：
  - 读取缓存并取 pages，调用 `get_glossary_index`

- `POST /wiki/glossary/extract`：
  - 直接调用 `extract_terms_from_page`

---

## 契约对齐

- `response_model` 使用 B-001 对齐后的模型
- 参数使用 `Query` 注解，默认 provider=google
- 错误通过 `HTTPException` 返回

---

## 风险与规避

- 循环依赖风险：
  - `api/routes/glossary.py` 不能在顶层 import `read_wiki_cache`
  - 解决：在函数内部延迟 import

---

## 完成标准

- 4 个路由可访问并返回正确模型
- `/` 根端点中能列出新路由
- 无 lint 错误
