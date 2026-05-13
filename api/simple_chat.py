import logging
from typing import List, Optional
from urllib.parse import unquote

from adalflow.core.types import ModelType
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from api.config import get_model_config, configs, OPENAI_API_KEY
from api.data_pipeline import count_tokens, get_file_content
from api.openai_client import OpenAIClient
from api.rag import RAG
from api.prompts import SIMPLE_CHAT_SYSTEM_PROMPT

from api.logging_config import setup_logging

setup_logging()
logger = logging.getLogger(__name__)

app = FastAPI(title="Simple Chat API", description="Streaming chat completions via OpenAI-compatible API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatCompletionRequest(BaseModel):
    repo_url: str = Field(..., description="URL of the repository to query")
    messages: List[ChatMessage] = Field(..., description="List of chat messages")
    filePath: Optional[str] = Field(None, description="Optional path to a file in the repository")
    token: Optional[str] = Field(None, description="Personal access token for private repositories")
    type: Optional[str] = Field("github", description="Repository type")
    provider: str = Field("openai", description="Model provider")
    model: Optional[str] = Field(None, description="Model name")
    language: Optional[str] = Field("zh", description="Language for content generation")
    excluded_dirs: Optional[str] = Field(None, description="Comma-separated directories to exclude")
    excluded_files: Optional[str] = Field(None, description="Comma-separated file patterns to exclude")
    included_dirs: Optional[str] = Field(None, description="Comma-separated directories to include")
    included_files: Optional[str] = Field(None, description="Comma-separated file patterns to include")

@app.post("/chat/completions/stream")
async def chat_completions_stream(request: ChatCompletionRequest):
    try:
        input_too_large = False
        if request.messages and len(request.messages) > 0:
            last_message = request.messages[-1]
            if hasattr(last_message, 'content') and last_message.content:
                tokens = count_tokens(last_message.content)
                logger.info(f"Request size: {tokens} tokens")
                if tokens > 8000:
                    logger.warning(f"Request exceeds recommended token limit ({tokens} > 7500)")
                    input_too_large = True

        try:
            request_rag = RAG(provider=request.provider, model=request.model)

            excluded_dirs = None
            excluded_files = None
            included_dirs = None
            included_files = None

            if request.excluded_dirs:
                excluded_dirs = [unquote(dir_path) for dir_path in request.excluded_dirs.split('\n') if dir_path.strip()]
            if request.excluded_files:
                excluded_files = [unquote(file_pattern) for file_pattern in request.excluded_files.split('\n') if file_pattern.strip()]
            if request.included_dirs:
                included_dirs = [unquote(dir_path) for dir_path in request.included_dirs.split('\n') if dir_path.strip()]
            if request.included_files:
                included_files = [unquote(file_pattern) for file_pattern in request.included_files.split('\n') if file_pattern.strip()]

            request_rag.prepare_retriever(request.repo_url, request.type, request.token, excluded_dirs, excluded_files, included_dirs, included_files)
        except ValueError as e:
            raise HTTPException(status_code=500, detail=f"Error: {str(e)}")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error preparing retriever: {str(e)}")

        if not request.messages or len(request.messages) == 0:
            raise HTTPException(status_code=400, detail="No messages provided")

        last_message = request.messages[-1]
        if last_message.role != "user":
            raise HTTPException(status_code=400, detail="Last message must be from the user")

        for i in range(0, len(request.messages) - 1, 2):
            if i + 1 < len(request.messages):
                user_msg = request.messages[i]
                assistant_msg = request.messages[i + 1]
                if user_msg.role == "user" and assistant_msg.role == "assistant":
                    request_rag.memory.add_dialog_turn(
                        user_query=user_msg.content,
                        assistant_response=assistant_msg.content
                    )

        query = last_message.content
        context_text = ""

        if not input_too_large:
            try:
                rag_query = query
                if request.filePath:
                    rag_query = f"Contexts related to {request.filePath}"

                retrieved_documents = request_rag(rag_query, language=request.language)

                if retrieved_documents and retrieved_documents[0].documents:
                    documents = retrieved_documents[0].documents
                    docs_by_file = {}
                    for doc in documents:
                        file_path = doc.meta_data.get('file_path', 'unknown')
                        if file_path not in docs_by_file:
                            docs_by_file[file_path] = []
                        docs_by_file[file_path].append(doc)

                    context_parts = []
                    for file_path, docs in docs_by_file.items():
                        header = f"## File Path: {file_path}\n\n"
                        content = "\n\n".join([doc.text for doc in docs])
                        context_parts.append(f"{header}{content}")

                    context_text = "\n\n" + "-" * 10 + "\n\n".join(context_parts)
            except Exception as e:
                logger.error(f"Error in RAG retrieval: {str(e)}")

        repo_url = request.repo_url
        repo_name = repo_url.split("/")[-1] if "/" in repo_url else repo_url
        repo_type = request.type
        language_code = request.language or "zh"
        language_name = "中文"

        system_prompt = SIMPLE_CHAT_SYSTEM_PROMPT.format(
            repo_type=repo_type,
            repo_url=repo_url,
            repo_name=repo_name,
            language_name=language_name
        )

        file_content = ""
        if request.filePath:
            try:
                file_content = get_file_content(request.repo_url, request.filePath, request.type, request.token)
            except Exception as e:
                logger.error(f"Error retrieving file content: {str(e)}")

        conversation_history = ""
        for turn_id, turn in request_rag.memory().items():
            if not isinstance(turn_id, int) and hasattr(turn, 'user_query') and hasattr(turn, 'assistant_response'):
                conversation_history += f"<turn>\n<user>{turn.user_query.query_str}</user>\n<assistant>{turn.assistant_response.response_str}</assistant>\n</turn>\n"

        prompt = f"/no_think {system_prompt}\n\n"

        if conversation_history:
            prompt += f"<conversation_history>\n{conversation_history}</conversation_history>\n\n"

        if file_content:
            prompt += f"<currentFileContent path=\"{request.filePath}\">\n{file_content}\n</currentFileContent>\n\n"

        CONTEXT_START = "<START_OF_CONTEXT>"
        CONTEXT_END = "<END_OF_CONTEXT>"
        if context_text.strip():
            prompt += f"{CONTEXT_START}\n{context_text}\n{CONTEXT_END}\n\n"
        else:
            prompt += "<note>Answering without retrieval augmentation.</note>\n\n"

        prompt += f"<query>\n{query}\n</query>\n\nAssistant: "

        model_config = get_model_config(request.provider, request.model)["model_kwargs"]

        async def response_stream():
            try:
                if request.provider == "google":
                    try:
                        import google.generativeai as genai
                    except Exception as exc:
                        raise RuntimeError(
                            "Google provider requested but google.generativeai is unavailable"
                        ) from exc

                    model = genai.GenerativeModel(
                        model_name=model_config["model"],
                        generation_config={
                            "temperature": model_config.get("temperature", 1.0),
                            "top_p": model_config.get("top_p", 0.8),
                            "top_k": model_config.get("top_k", 20),
                        },
                    )
                    response = model.generate_content(prompt, stream=True)
                    for chunk in response:
                        if hasattr(chunk, "text"):
                            yield chunk.text
                else:
                    model_client = OpenAIClient()
                    model_kwargs = {
                        "model": request.model or model_config["model"],
                        "stream": True,
                        "temperature": model_config.get("temperature", 0.7)
                    }
                    if "top_p" in model_config:
                        model_kwargs["top_p"] = model_config["top_p"]

                    api_kwargs = model_client.convert_inputs_to_api_kwargs(
                        input=prompt,
                        model_kwargs=model_kwargs,
                        model_type=ModelType.LLM
                    )
                    response = await model_client.acall(api_kwargs=api_kwargs, model_type=ModelType.LLM)
                    async for chunk in response:
                        choices = getattr(chunk, "choices", [])
                        if len(choices) > 0:
                            delta = getattr(choices[0], "delta", None)
                            if delta is not None:
                                text = getattr(delta, "content", None)
                                if text is not None:
                                    yield text
            except Exception as e:
                logger.error(f"Error in streaming response: {str(e)}")
                yield f"\nError: {str(e)}"

        return StreamingResponse(response_stream(), media_type="text/event-stream")

    except HTTPException:
        raise
    except Exception as e_handler:
        error_msg = f"Error in streaming chat completion: {str(e_handler)}"
        logger.error(error_msg)
        raise HTTPException(status_code=500, detail=error_msg)

@app.get("/")
async def root():
    return {"status": "API is running", "message": "Navigate to /docs for API documentation"}
