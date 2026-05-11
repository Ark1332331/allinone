# B-002 变更计划：术语服务核心

> 目标：实现术语抽取、统计与缓存逻辑，严格对齐对外契约字段。

---

## 范围

- 新建服务层：`api/services/glossary_service.py`
- 追加提示词：`api/prompts.py`（新增 `GLOSSARY_EXTRACT_PROMPT`）

不修改：`api/simple_chat.py`、`api/api.py`、前端代码。

---

## 依赖与约束

- 依赖 B-001 已对齐的模型：`label`、`wikiUrl`、`googleQuery`、`statistics`、`pageTitle`、`count`。
- LLM 调用必须非流式，沿用既有 provider 体系。
- 缓存目录：`~/.adalflow/glossary/{repo_type}_{owner}_{repo}_{language}.json`。
- 输出 JSON 需容错解析（允许 markdown 代码块包裹）。

---

## 关键函数（服务层）

公开接口：
- `get_glossary(...) -> GlossaryWithStats`
- `extract_terms_from_page(...) -> GlossaryExtractResponse`
- `get_glossary_index(...) -> GlossaryIndexResponse`
- `refresh_glossary(...) -> GlossaryRefreshResponse`

内部函数：
- `_call_llm_extract(content, provider, model) -> List[GlossaryTerm]`
- `_match_terms_in_content(content, terms) -> Dict[str, int]`
- `_read_glossary_cache(...) -> Optional[GlossaryWithStats]`
- `_write_glossary_cache(...) -> bool`
- `_parse_llm_json_response(raw_text) -> List[dict]`

---

## 数据流

1. Route 调用 Service。
2. Service 读取缓存：
   - 有缓存：返回 `GlossaryWithStats(cached=True)`
   - 无缓存：调用 LLM 抽取、统计词频、写缓存、返回 `cached=False`
3. `get_glossary_index` 基于 `wiki_pages` 生成 `GlossaryOccurrence(pageId, pageTitle, count)`。

---

## LLM 返回文本抽取策略

非流式调用，按 provider 提取文本：
- google: `response.text`
- openai / azure: `response.choices[0].message.content`
- openrouter: 迭代收集文本
- ollama: `response.message.content`
- bedrock: 直接 `str(response)`
- dashscope: `response.data`

---

## 统计输出与字段对齐

- `GlossaryWithStats.statistics`: `Dict[str, int]`
- `GlossaryRefreshResponse.statistics`: `Dict[str, int]`
- `GlossaryOccurrence.pageTitle`: 必填
- `GlossaryOccurrence.count`: 必填

---

## 风险与规避

- LLM 输出非 JSON：正则清洗 + try/except，返回空列表
- 缓存损坏：删除缓存后重新抽取
- 术语边界误判：使用 `\b` + `re.IGNORECASE`

---

## 完成标准

- 术语抽取可用，缓存可读写
- `statistics` 与 per-page `count` 正确生成
- 全部字段对齐契约
- 无新增依赖
