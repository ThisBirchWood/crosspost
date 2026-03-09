import pkgutil
import importlib
import connectors
from connectors.base import BaseConnector

def _discover_connectors() -> list[type[BaseConnector]]:
    """Walk the connectors package and collect all BaseConnector subclasses."""
    for _, module_name, _ in pkgutil.iter_modules(connectors.__path__):
        if module_name in ("base", "registry"):
            continue
        importlib.import_module(f"connectors.{module_name}")

    return [
        cls for cls in BaseConnector.__subclasses__()
        if cls.source_name  # guard against abstract intermediaries
    ]

def get_available_connectors() -> list[type[BaseConnector]]:
    return [c for c in _discover_connectors() if c.is_available()]

def get_connector_metadata() -> list[dict]:
    return [
        {"id": c.source_name, "label": c.display_name}
        for c in get_available_connectors()
    ]