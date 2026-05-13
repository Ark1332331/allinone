"""Experimental Copilot proxy provider.

Thin bridge to an externally-run Copilot OpenAI-compatible proxy.
allinone does NOT embed Copilot auth, token exchange, or header mimicry.

Setup:
    1. Run a community Copilot proxy tool externally (e.g., copilot-gpt4-service)
    2. Set COPILOT_PROXY_BASE_URL (default: http://localhost:8080/v1)
    3. Set COPILOT_PROXY_API_KEY if the proxy requires one
    4. Use provider="copilot_proxy" in requests
"""

import os
import logging
from typing import Optional

from api.openai_client import OpenAIClient

logger = logging.getLogger(__name__)


class CopilotProxyClient(OpenAIClient):
    """OpenAI-compatible client backed by an external Copilot proxy.

    This client does NOT handle GitHub OAuth, token exchange, or header
    impersonation. Those responsibilities belong to the external proxy tool.

    When the proxy is unavailable, the client raises a clear error with
    setup instructions rather than silently failing.
    """

    def __init__(self, api_key: Optional[str] = None, base_url: Optional[str] = None):
        proxy_url = base_url or os.getenv("COPILOT_PROXY_BASE_URL", "")
        if not proxy_url:
            raise ValueError(
                "copilot_proxy provider 需要配置外部代理地址。\n"
                "请设置环境变量 COPILOT_PROXY_BASE_URL，\n"
                "例如: COPILOT_PROXY_BASE_URL=http://localhost:8080/v1\n"
                "详见 docs/workflows/experimental-copilot-proxy.md"
            )

        super().__init__(
            api_key=api_key or os.getenv("COPILOT_PROXY_API_KEY", "copilot"),
            base_url=proxy_url,
            env_api_key_name="COPILOT_PROXY_API_KEY",
            env_base_url_name="COPILOT_PROXY_BASE_URL",
        )
