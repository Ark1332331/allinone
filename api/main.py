import os
import sys
import logging
from dotenv import load_dotenv

load_dotenv()

from api.logging_config import setup_logging

setup_logging()
logger = logging.getLogger(__name__)

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import uvicorn

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8001))

    # Initialize Google Gemini if API key is set
    from api.config import GOOGLE_API_KEY
    if GOOGLE_API_KEY:
        try:
            import google.generativeai as genai

            genai.configure(api_key=GOOGLE_API_KEY)
        except Exception as exc:
            logger.warning("GOOGLE_API_KEY is set but google.generativeai is unavailable: %s", exc)
    else:
        logger.warning("GOOGLE_API_KEY not configured")

    from api.api import app

    logger.info(f"Starting API on port {port}")

    uvicorn.run(
        "api.api:app",
        host="0.0.0.0",
        port=port,
    )
