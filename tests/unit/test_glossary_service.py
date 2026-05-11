"""Unit tests for glossary service functions."""

import asyncio
import sys
from pathlib import Path

import pytest

project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from api.models.glossary import GlossaryTerm, GlossaryWithStats
from api.services import glossary_service as gs

pytestmark = pytest.mark.unit


def _make_term(name: str) -> GlossaryTerm:
    return GlossaryTerm(
        term=name,
        label=name,
        googleQuery=f"{name} search",
        description=f"{name} description",
    )


def test_match_terms_in_content_basic():
    content = "RAG is great. RAG helps. rag works."
    stats = gs._match_terms_in_content(content, ["RAG"])

    assert stats == {"RAG": 3}


def test_match_terms_in_content_case_insensitive():
    content = "faiss FAISS Faiss"
    stats = gs._match_terms_in_content(content, ["FAISS"])

    assert stats == {"FAISS": 3}


def test_match_terms_in_content_word_boundary():
    content = "RAPID API APIX"
    stats = gs._match_terms_in_content(content, ["API"])

    assert stats == {"API": 1}


def test_match_terms_in_content_empty():
    stats = gs._match_terms_in_content("", ["RAG"])

    assert stats == {}


def test_match_terms_in_content_special_characters():
    content = "C++ and .NET are platforms."
    stats = gs._match_terms_in_content(content, ["C++", ".NET"])

    assert stats == {}


def test_parse_llm_json_response_clean():
    raw = '{"terms": [{"term": "RAG"}]}'
    parsed = gs._parse_llm_json_response(raw)

    assert parsed == [{"term": "RAG"}]


def test_parse_llm_json_response_with_markdown():
    raw = "```json\n{\"terms\": [{\"term\": \"RAG\"}]}\n```"
    parsed = gs._parse_llm_json_response(raw)

    assert parsed == [{"term": "RAG"}]


def test_parse_llm_json_response_invalid():
    parsed = gs._parse_llm_json_response("not json")

    assert parsed == []


def test_read_glossary_cache_not_found(tmp_path, monkeypatch):
    cache_path = tmp_path / "cache.json"

    monkeypatch.setattr(gs, "_get_glossary_cache_path", lambda *args, **kwargs: str(cache_path))

    assert gs._read_glossary_cache("o", "r", "t", "en") is None


def test_write_and_read_glossary_cache(tmp_path, monkeypatch):
    cache_path = tmp_path / "cache.json"
    monkeypatch.setattr(gs, "_get_glossary_cache_path", lambda *args, **kwargs: str(cache_path))

    term = _make_term("RAG")
    payload = GlossaryWithStats(terms=[term], statistics={"RAG": 2}, cached=False)

    assert gs._write_glossary_cache("o", "r", "t", "en", payload) is True
    cached = gs._read_glossary_cache("o", "r", "t", "en")

    assert cached is not None
    assert cached.cached is True
    assert cached.statistics == {"RAG": 2}


def test_read_glossary_cache_corrupt(tmp_path, monkeypatch):
    cache_path = tmp_path / "cache.json"
    cache_path.write_text("{bad json", encoding="utf-8")

    monkeypatch.setattr(gs, "_get_glossary_cache_path", lambda *args, **kwargs: str(cache_path))

    assert gs._read_glossary_cache("o", "r", "t", "en") is None
    assert not cache_path.exists()


def test_get_glossary_from_cache(tmp_path, monkeypatch):
    cache_path = tmp_path / "cache.json"
    monkeypatch.setattr(gs, "_get_glossary_cache_path", lambda *args, **kwargs: str(cache_path))

    payload = GlossaryWithStats(terms=[_make_term("RAG")], statistics={"RAG": 1}, cached=False)
    gs._write_glossary_cache("o", "r", "t", "en", payload)

    def _fail_call(*_args, **_kwargs):
        raise AssertionError("LLM should not be called on cache hit")

    monkeypatch.setattr(gs, "_call_llm_extract", _fail_call)

    result = asyncio.run(
        gs.get_glossary(
            owner="o",
            repo="r",
            repo_type="t",
            language="en",
            provider="google",
            model=None,
            wiki_pages=[],
        )
    )

    assert result.cached is True
    assert result.statistics == {"RAG": 1}


def test_get_glossary_with_cache_write(tmp_path, monkeypatch):
    cache_path = tmp_path / "cache.json"
    monkeypatch.setattr(gs, "_get_glossary_cache_path", lambda *args, **kwargs: str(cache_path))

    async def _fake_call(_content, _provider, _model):
        return [_make_term("RAG")]

    monkeypatch.setattr(gs, "_call_llm_extract", _fake_call)

    pages = [
        {"id": "p1", "title": "Page 1", "content": "RAG helps. rag works."}
    ]

    result = asyncio.run(
        gs.get_glossary(
            owner="o",
            repo="r",
            repo_type="t",
            language="en",
            provider="google",
            model=None,
            wiki_pages=pages,
        )
    )

    assert result.cached is False
    assert result.statistics == {"RAG": 2}
    assert cache_path.exists()


if __name__ == "__main__":
    raise SystemExit(pytest.main([__file__]))
