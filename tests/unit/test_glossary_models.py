"""Unit tests for glossary Pydantic models."""

import sys
from pathlib import Path

import pytest

project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from api.models.glossary import (
    GlossaryExtractRequest,
    GlossaryIndexItem,
    GlossaryOccurrence,
    GlossaryTerm,
    GlossaryWithStats,
)

pytestmark = pytest.mark.unit


def test_glossary_term_creation():
    term = GlossaryTerm(
        term="RAG",
        label="Retrieval Augmented Generation",
        wikiUrl=None,
        googleQuery="RAG LLM",
        description="A retrieval-augmented generation pattern",
    )

    assert term.term == "RAG"
    assert term.wikiUrl is None


def test_glossary_term_optional_wiki_url():
    term = GlossaryTerm(
        term="FAISS",
        label="FAISS",
        googleQuery="FAISS vector search",
        description="A vector similarity search library",
    )

    assert term.wikiUrl is None


def test_glossary_with_stats_creation():
    term = GlossaryTerm(
        term="RAG",
        label="RAG",
        googleQuery="RAG LLM",
        description="A retrieval-augmented generation pattern",
    )
    stats = {"RAG": 2}

    payload = GlossaryWithStats(terms=[term], statistics=stats, cached=False)

    assert payload.statistics == stats
    assert payload.cached is False


def test_glossary_extract_request_creation():
    request = GlossaryExtractRequest(
        page_id="page-1",
        page_content="Content",
        existing_terms=None,
    )

    assert request.page_id == "page-1"


def test_glossary_index_item_creation():
    term = GlossaryTerm(
        term="RAG",
        label="RAG",
        googleQuery="RAG LLM",
        description="A retrieval-augmented generation pattern",
    )
    occurrence = GlossaryOccurrence(pageId="page-1", pageTitle="Page 1", count=2)

    item = GlossaryIndexItem(term=term, occurrences=[occurrence])

    assert item.occurrences[0].count == 2


if __name__ == "__main__":
    raise SystemExit(pytest.main([__file__]))
