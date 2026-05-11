import adalflow as adal

from api.config import configs


def get_embedder() -> adal.Embedder:
    embedder_config = configs["embedder"]

    model_client_class = embedder_config["model_client"]
    if "initialize_kwargs" in embedder_config:
        model_client = model_client_class(**embedder_config["initialize_kwargs"])
    else:
        model_client = model_client_class()

    embedder_kwargs = {"model_client": model_client, "model_kwargs": embedder_config["model_kwargs"]}

    embedder = adal.Embedder(**embedder_kwargs)

    if "batch_size" in embedder_config:
        embedder.batch_size = embedder_config["batch_size"]
    return embedder
