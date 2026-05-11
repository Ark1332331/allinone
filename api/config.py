import os
import json
import logging
import re
from pathlib import Path
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

from api.openai_client import OpenAIClient

OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY')
GOOGLE_API_KEY = os.environ.get('GOOGLE_API_KEY')
if OPENAI_API_KEY:
    os.environ["OPENAI_API_KEY"] = OPENAI_API_KEY
if GOOGLE_API_KEY:
    os.environ["GOOGLE_API_KEY"] = GOOGLE_API_KEY

from adalflow import GoogleGenAIClient

CONFIG_DIR = os.environ.get('DEEPWIKI_CONFIG_DIR', None)

CLIENT_CLASSES = {
    "OpenAIClient": OpenAIClient,
    "GoogleGenAIClient": GoogleGenAIClient,
}

def replace_env_placeholders(config):
    pattern = re.compile(r"\$\{([A-Z0-9_]+)\}")
    def replacer(match):
        env_var_name = match.group(1)
        original_placeholder = match.group(0)
        env_var_value = os.environ.get(env_var_name)
        if env_var_value is None:
            logger.warning(
                f"Environment variable placeholder '{original_placeholder}' was not found. "
                f"The placeholder string will be used as is."
            )
            return original_placeholder
        return env_var_value

    if isinstance(config, dict):
        return {k: replace_env_placeholders(v) for k, v in config.items()}
    elif isinstance(config, list):
        return [replace_env_placeholders(item) for item in config]
    elif isinstance(config, str):
        return pattern.sub(replacer, config)
    else:
        return config

def load_json_config(filename):
    try:
        if CONFIG_DIR:
            config_path = Path(CONFIG_DIR) / filename
        else:
            config_path = Path(__file__).parent / "config" / filename

        logger.info(f"Loading configuration from {config_path}")

        if not config_path.exists():
            logger.warning(f"Configuration file {config_path} does not exist")
            return {}

        with open(config_path, 'r', encoding='utf-8') as f:
            config = json.load(f)
            config = replace_env_placeholders(config)
            return config
    except Exception as e:
        logger.error(f"Error loading configuration file {filename}: {str(e)}")
        return {}

def load_generator_config():
    generator_config = load_json_config("generator.json")
    if "providers" in generator_config:
        for provider_id, provider_config in generator_config["providers"].items():
            if provider_config.get("client_class") in CLIENT_CLASSES:
                provider_config["model_client"] = CLIENT_CLASSES[provider_config["client_class"]]
            elif provider_id == "google":
                provider_config["model_client"] = GoogleGenAIClient
            elif provider_id == "openai":
                provider_config["model_client"] = OpenAIClient
            else:
                logger.warning(f"Unknown provider: {provider_id}")
    return generator_config

def load_embedder_config():
    embedder_config = load_json_config("embedder.json")
    if "embedder" in embedder_config and "client_class" in embedder_config["embedder"]:
        class_name = embedder_config["embedder"]["client_class"]
        if class_name in CLIENT_CLASSES:
            embedder_config["embedder"]["model_client"] = CLIENT_CLASSES[class_name]
    return embedder_config

def load_repo_config():
    return load_json_config("repo.json")

DEFAULT_EXCLUDED_DIRS: List[str] = [
    "./.venv/", "./venv/", "./env/", "./virtualenv/",
    "./node_modules/", "./bower_components/", "./jspm_packages/",
    "./.git/", "./.svn/", "./.hg/", "./.bzr/",
    "./__pycache__/", "./.pytest_cache/", "./.mypy_cache/", "./.ruff_cache/", "./.coverage/",
    "./dist/", "./build/", "./out/", "./target/", "./bin/", "./obj/",
    "./docs/", "./_docs/", "./site-docs/", "./_site/",
    "./.idea/", "./.vscode/", "./.vs/", "./.eclipse/", "./.settings/",
    "./logs/", "./log/", "./tmp/", "./temp/",
]

DEFAULT_EXCLUDED_FILES: List[str] = [
    "yarn.lock", "pnpm-lock.yaml", "npm-shrinkwrap.json", "poetry.lock",
    "Pipfile.lock", "requirements.txt.lock", "Cargo.lock", "composer.lock",
    ".lock", ".DS_Store", "Thumbs.db", "desktop.ini", "*.lnk", ".env",
    ".env.*", "*.env", "*.cfg", "*.ini", ".flaskenv", ".gitignore",
    ".gitattributes", ".gitmodules", ".github", ".gitlab-ci.yml",
    ".prettierrc", ".eslintrc", ".eslintignore", ".stylelintrc",
    ".editorconfig", ".jshintrc", ".pylintrc", ".flake8", "mypy.ini",
    "pyproject.toml", "tsconfig.json", "webpack.config.js", "babel.config.js",
    "rollup.config.js", "jest.config.js", "karma.conf.js", "vite.config.js",
    "next.config.js", "*.min.js", "*.min.css", "*.bundle.js", "*.bundle.css",
    "*.map", "*.gz", "*.zip", "*.tar", "*.tgz", "*.rar", "*.7z", "*.iso",
    "*.dmg", "*.img", "*.msix", "*.appx", "*.appxbundle", "*.xap", "*.ipa",
    "*.deb", "*.rpm", "*.msi", "*.exe", "*.dll", "*.so", "*.dylib", "*.o",
    "*.obj", "*.jar", "*.war", "*.ear", "*.jsm", "*.class", "*.pyc", "*.pyd",
    "*.pyo", "__pycache__", "*.a", "*.lib", "*.lo", "*.la", "*.slo", "*.dSYM",
    "*.egg", "*.egg-info", "*.dist-info", "*.eggs", "node_modules",
    "bower_components", "jspm_packages", "lib-cov", "coverage", "htmlcov",
    ".nyc_output", ".tox", "dist", "build", "bld", "out", "bin", "target",
    "packages/*/dist", "packages/*/build", ".output"
]

configs = {}

generator_config = load_generator_config()
embedder_config = load_embedder_config()
repo_config = load_repo_config()

if generator_config:
    configs["default_provider"] = generator_config.get("default_provider", "openai")
    configs["providers"] = generator_config.get("providers", {})

if embedder_config:
    for key in ["embedder", "retriever", "text_splitter"]:
        if key in embedder_config:
            configs[key] = embedder_config[key]

if repo_config:
    for key in ["file_filters", "repository"]:
        if key in repo_config:
            configs[key] = repo_config[key]

# Simple language config: only zh
configs["lang_config"] = {
    "supported_languages": {"zh": "中文"},
    "default": "zh"
}

def get_model_config(provider="openai", model=None):
    if "providers" not in configs:
        raise ValueError("Provider configuration not loaded")

    provider_config = configs["providers"].get(provider)
    if not provider_config:
        raise ValueError(f"Configuration for provider '{provider}' not found")

    model_client = provider_config.get("model_client")
    if not model_client:
        raise ValueError(f"Model client not specified for provider '{provider}'")

    if not model:
        model = provider_config.get("default_model")
        if not model:
            raise ValueError(f"No default model specified for provider '{provider}'")

    model_params = {}
    if model in provider_config.get("models", {}):
        model_params = provider_config["models"][model]
    else:
        default_model = provider_config.get("default_model")
        model_params = provider_config["models"][default_model]

    result = {
        "model_client": model_client,
        "model_kwargs": {"model": model, **model_params},
    }

    return result
