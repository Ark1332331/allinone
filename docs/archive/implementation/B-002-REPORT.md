# B-002 完成报告：术语服务核心

> **Spec编号**：B-002  
> **完成时间**：2026年5月1日  
> **执行者**：Coding Model  
> **状态**：✅ 完成并验证

---

## 📋 改动摘要

| 操作 | 文件路径 | 说明 | 行数 |
|------|---------|------|------|
| 新建 | `api/services/glossary_service.py` | 术语服务核心逻辑 | 274 |
| 修改 | `api/prompts.py` | 追加 `GLOSSARY_EXTRACT_PROMPT` | +31 |

---

## 🧠 实现要点

### 公开接口（4个）
- `get_glossary(...) -> GlossaryWithStats`
- `extract_terms_from_page(...) -> GlossaryExtractResponse`
- `get_glossary_index(...) -> GlossaryIndexResponse`
- `refresh_glossary(...) -> GlossaryRefreshResponse`

### 内部函数（5个）
- `_call_llm_extract(...)`：非流式多 Provider LLM 调用
- `_match_terms_in_content(...)`：正则统计词频
- `_read_glossary_cache(...)` / `_write_glossary_cache(...)`：缓存读写
- `_parse_llm_json_response(...)`：容错 JSON 解析

---

## ✅ 合约对齐清单

- [x] `label / wikiUrl / googleQuery` 全部对齐
- [x] `statistics: Dict[str, int]` 对齐
- [x] `pageTitle / count` 对齐
- [x] `GlossaryIndexResponse.terms` 对齐
- [x] `GlossaryRefreshResponse.statistics` 对齐
- [x] 缓存路径：`~/.adalflow/glossary/{repo_type}_{owner}_{repo}_{language}.json`

---

## 🧪 验证结果

**用户已执行导入验证**：
```
python -c "from api.services.glossary_service import get_glossary,extract_terms_from_page,get_glossary_index,refresh_glossary;print('Import OK')"
```
结果：`Import OK`

---

## 🔧 修正记录

针对 Opus 审查的 MEDIUM 建议，已修复 JSON 解析正则潜在截断问题：
- 不再用非贪婪正则捕获 JSON
- 改为先剥离 fenced block，再 `json.loads`

---

## ⚠️ 注意事项

1. **LLM 返回结构容错**：支持 fenced JSON 或裸 JSON，异常时返回空列表
2. **OpenRouter 非流式**：兼容 async generator，逐段拼接
3. **统计结构**：`statistics` 直接由 `_match_terms_in_content` 输出

---

## 🎯 结论

✅ **B-002 已完成并通过审查，可进入 B-003。**
