import re


STOPWORDS = {
    "the", "this", "that", "with", "from", "into", "over", "under", "after", "before",
    "claim", "claims", "against", "about", "live", "breaking",
}

PERSON_HINTS = {"mr", "mrs", "ms", "dr", "president", "prime", "minister", "cm", "home"}
ORG_HINTS = {
    "government", "ministry", "court", "police", "bbc", "ndtv", "cnn", "bjp", "congress",
    "company", "agency", "committee", "commission", "department", "un", "who",
}
PLACE_HINTS = {
    "india", "saudi", "arabia", "uae", "manipur", "delhi", "karnataka", "west bengal",
    "iran", "pakistan", "china", "usa", "uk", "burundi",
}

SUPPORT_TOKENS = {"confirmed", "according", "verified", "supports", "evidence", "official", "reported"}
REFUTE_TOKENS = {"false", "misleading", "debunked", "refutes", "denied", "lack", "no evidence", "fake"}


def truncate(text: str, max_len: int) -> str:
    if len(text) <= max_len:
        return text
    return f"{text[:max_len - 3]}..."


def extract_entities(text: str) -> list[str]:
    matches = re.findall(r"\b(?:[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2}|[A-Z]{2,}(?:\s+[A-Z]{2,})*)\b", text or "")
    entities = []
    for item in matches:
        cleaned = item.strip()
        if len(cleaned) <= 2:
            continue
        if cleaned.lower() in STOPWORDS:
            continue
        entities.append(cleaned)
    return entities


def classify_entity(entity: str) -> str:
    lower = entity.lower()
    tokens = set(lower.split())
    if tokens & PLACE_HINTS or lower in PLACE_HINTS:
        return "place"
    if tokens & ORG_HINTS:
        return "org"
    if tokens & PERSON_HINTS:
        return "person"
    if len(entity.split()) >= 2:
        return "person"
    return "topic"


def classify_relation(text: str) -> str:
    lower = (text or "").lower()
    if any(token in lower for token in REFUTE_TOKENS):
        return "refutes"
    if any(token in lower for token in SUPPORT_TOKENS):
        return "supports"
    return "mentions"


def _normalize_relation(relation: str | None) -> str:
    value = (relation or "").lower()
    if value in {"supports", "refutes", "mentions"}:
        return value
    return "mentions"


def build_claim_graph(claim: str, evidence: list[str], evidence_citations: list[dict] | None = None, graph_relations: list[str] | None = None) -> dict:
    entity_map: dict[str, dict] = {}
    citation_map: dict[int, dict] = {}

    for citation in evidence_citations or []:
        index = citation.get("index")
        if isinstance(index, int):
            citation_map[index] = {
                "relation": _normalize_relation(citation.get("relation")),
                "confidence": float(citation.get("confidence", 0.5) or 0.5),
            }

    for entity in extract_entities(claim):
        key = entity.lower()
        current = entity_map.get(key, {
            "id": f"entity:{key}",
            "label": entity,
            "type": classify_entity(entity),
            "mentions": 0,
            "evidence_indexes": set(),
        })
        current["mentions"] += 2
        entity_map[key] = current

    for index, entry in enumerate((evidence or [])[:6]):
        for entity in extract_entities(entry):
            key = entity.lower()
            current = entity_map.get(key, {
                "id": f"entity:{key}",
                "label": entity,
                "type": classify_entity(entity),
                "mentions": 0,
                "evidence_indexes": set(),
            })
            current["mentions"] += 1
            current["evidence_indexes"].add(index)
            entity_map[key] = current

    ranked_entities = sorted(entity_map.values(), key=lambda item: item["mentions"], reverse=True)[:12]

    nodes = [{
        "id": "claim",
        "label": truncate(claim, 72),
        "kind": "claim",
        "group": "claim",
        "size": 34,
    }]

    for entity in ranked_entities:
        nodes.append({
            "id": entity["id"],
            "label": entity["label"],
            "kind": "entity",
            "group": entity["type"],
            "size": 18 + min(entity["mentions"] * 2, 12),
            "mentions": entity["mentions"],
        })

    for index, entry in enumerate((evidence or [])[:6]):
        citation = citation_map.get(index, {})
        relation = citation.get("relation", classify_relation(entry))
        confidence = citation.get("confidence", 0.45 if relation == "mentions" else 0.7)
        nodes.append({
            "id": f"evidence:{index}",
            "label": truncate(re.sub(r"\s+", " ", entry), 120),
            "kind": "evidence",
            "group": relation,
            "size": 18,
            "relation": relation,
            "confidence": confidence,
        })

    edges = []
    for entity in ranked_entities:
        edges.append({
            "from": "claim",
            "to": entity["id"],
            "label": "mentions",
            "relation": "mentions",
            "weight": 0.45,
        })
        for evidence_index in sorted(entity["evidence_indexes"]):
            citation = citation_map.get(evidence_index, {})
            relation = citation.get("relation", classify_relation((evidence or [])[evidence_index]))
            confidence = citation.get("confidence", 0.45 if relation == "mentions" else 0.7)
            edges.append({
                "from": entity["id"],
                "to": f"evidence:{evidence_index}",
                "label": relation,
                "relation": relation,
                "weight": confidence,
            })

    relation_pattern = re.compile(r"(claim|entity:\s*[^ ]+)\s+(mentions|supports|refutes)\s+evidence\[(\d+)\]", re.IGNORECASE)
    for relation_hint in graph_relations or []:
        match = relation_pattern.search(relation_hint)
        if not match:
            continue
        source_hint, relation, evidence_index = match.groups()
        evidence_id = f"evidence:{int(evidence_index)}"
        source_hint = source_hint.strip()
        if source_hint.lower() == "claim":
            source_id = "claim"
        else:
            label = source_hint.split(":", 1)[-1].strip().lower()
            source_id = f"entity:{label}"
        edges.append({
            "from": source_id,
            "to": evidence_id,
            "label": _normalize_relation(relation),
            "relation": _normalize_relation(relation),
            "weight": 0.9,
        })

    return {
        "nodes": nodes,
        "edges": edges,
        "summary": {
            "entity_count": len(ranked_entities),
            "evidence_count": min(len(evidence or []), 6),
            "groups": {
                "person": sum(1 for entity in ranked_entities if entity["type"] == "person"),
                "org": sum(1 for entity in ranked_entities if entity["type"] == "org"),
                "place": sum(1 for entity in ranked_entities if entity["type"] == "place"),
                "topic": sum(1 for entity in ranked_entities if entity["type"] == "topic"),
            },
        },
    }
