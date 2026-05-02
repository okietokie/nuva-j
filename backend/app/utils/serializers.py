from bson import ObjectId


def serialize_document(document: dict | None) -> dict | None:
    if not document:
        return None

    serialized = {}
    for key, value in document.items():
        if isinstance(value, ObjectId):
            if key == "_id":
                serialized["_id"] = str(value)
                serialized["id"] = str(value)
            else:
                serialized[key] = str(value)
        else:
            serialized[key] = value
    return serialized


def serialize_many(documents: list[dict]) -> list[dict]:
    return [serialize_document(document) for document in documents]


def sanitize_user(document: dict | None) -> dict | None:
    serialized = serialize_document(document)
    if serialized:
        serialized.pop("password", None)
        serialized.pop("passwordHash", None)
    return serialized
