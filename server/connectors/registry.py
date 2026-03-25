import pkgutil
import importlib
import server.connectors
from server.connectors.base import BaseConnector


def _discover_connectors() -> list[type[BaseConnector]]:
    """Walk the connectors package and collect all BaseConnector subclasses."""
    for _, module_name, _ in pkgutil.iter_modules(server.connectors.__path__):
        if module_name in ("base", "registry"):
            continue
        importlib.import_module(f"server.connectors.{module_name}")

    return [
        cls
        for cls in BaseConnector.__subclasses__()
        if cls.source_name  # guard against abstract intermediaries
    ]


def get_available_connectors() -> dict[str, type[BaseConnector]]:
    return {c.source_name: c for c in _discover_connectors() if c.is_available()}


def get_connector_metadata() -> dict[str, dict]:
    res = {}
    for id, obj in get_available_connectors().items():
        res[id] = {
            "id": id,
            "label": obj.display_name,
            "search_enabled": obj.search_enabled,
            "categories_enabled": obj.categories_enabled,
        }

    return res
