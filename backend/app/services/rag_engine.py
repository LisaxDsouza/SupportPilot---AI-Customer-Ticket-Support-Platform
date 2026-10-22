"""RAG retrieval service for SupportPilot knowledge base."""
from __future__ import annotations

import logging
import os
import re
from typing import Any

from app.core.config import get_settings

logger = logging.getLogger(__name__)

# Standard enterprise IT runbooks used for vector & offline keyword retrieval
FALLBACK_KB_CORPUS = [
    {
        "article_id": 101,
        "title": "Cisco AnyConnect VPN Authorization & Timeout Fix",
        "category": "VPN Access",
        "content": (
            "1. Verify internet connectivity outside VPN.\n"
            "2. If Error 403 or authorization failed appears, flush DNS via 'ipconfig /flushdns'.\n"
            "3. Clear Cisco AnyConnect profile cache in %ProgramData%\\Cisco\\Cisco AnyConnect Secure Mobility Client\\Profile.\n"
            "4. Re-authenticate using your corporate MFA token and change gateway to vpn-backup.company.com."
        ),
    },
    {
        "article_id": 102,
        "title": "Corporate Wi-Fi & DNS Resolution Troubleshooting",
        "category": "Network Connectivity",
        "content": (
            "1. Toggle Wi-Fi adapter off and on.\n"
            "2. Run 'netsh winsock reset' in Administrator Command Prompt.\n"
            "3. Verify DHCP is assigning 10.x.x.x corporate IP address.\n"
            "4. If DNS fails, set primary DNS to corporate gateway 10.0.0.1 and secondary to 1.1.1.1."
        ),
    },
    {
        "article_id": 103,
        "title": "Okta & Active Directory Password Reset Guide",
        "category": "Identity & Access",
        "content": (
            "1. Navigate to identity.company.com/recovery.\n"
            "2. Submit work email and complete SMS/Push MFA prompt.\n"
            "3. If account is locked after 5 failed attempts, wait 15 minutes or ask IT Desk for lockout reset.\n"
            "4. Ensure password meets complexity: 14+ characters, 1 number, 1 symbol."
        ),
    },
    {
        "article_id": 104,
        "title": "Outlook & Teams Desktop Client Crash Recovery",
        "category": "Software & Applications",
        "content": (
            "1. Close Outlook and run 'outlook.exe /safe' to check faulty add-ins.\n"
            "2. Disable hardware graphics acceleration in Office settings.\n"
            "3. Clear Teams cache in %appdata%\\Microsoft\\Teams.\n"
            "4. Run Quick Repair from Windows Add/Remove Programs."
        ),
    },
    {
        "article_id": 105,
        "title": "USB-C Docking Station & Dual Monitor Detection",
        "category": "Hardware & Peripherals",
        "content": (
            "1. Disconnect laptop USB-C cable, power-cycle docking station (unplug 30 sec).\n"
            "2. Reconnect USB-C cable to primary Thunderbolt port.\n"
            "3. Press Win + P and select 'Extend'.\n"
            "4. Update Intel Display Drivers via Company Portal."
        ),
    },
    {
        "article_id": 106,
        "title": "Phishing & Suspicious Email Security SOP",
        "category": "Security Incident",
        "content": (
            "1. DO NOT click links, download attachments, or reply.\n"
            "2. Click the 'Report Phishing' button in Outlook ribbon.\n"
            "3. If credentials were submitted, IMMEDIATELY reset password and notify SecOps hotline.\n"
            "4. Forward header to soc-alerts@company.com."
        ),
    },
]


def _offline_keyword_search(query: str, category: str | None = None, top_k: int = 3) -> list[dict[str, Any]]:
    """Simple token-overlap relevance search for offline/testing mode."""
    query_tokens = set(re.findall(r"\w+", query.lower()))
    scored_articles = []

    for doc in FALLBACK_KB_CORPUS:
        category_match = 0.3 if (category and doc["category"].lower() == category.lower()) else 0.0
        doc_tokens = set(re.findall(r"\w+", (doc["title"] + " " + doc["content"]).lower()))
        overlap = len(query_tokens & doc_tokens)
        similarity = min(0.95, round((overlap / max(len(query_tokens), 1)) * 0.7 + category_match, 2))

        if similarity > 0.20 or category_match > 0:
            scored_articles.append({
                "article_id": doc["article_id"],
                "title": doc["title"],
                "category": doc["category"],
                "similarity": max(0.65, similarity),
                "snippet": doc["content"],
            })

    scored_articles.sort(key=lambda x: x["similarity"], reverse=True)
    if not scored_articles and FALLBACK_KB_CORPUS:
        # Guarantee top matching fallback
        return [{
            "article_id": FALLBACK_KB_CORPUS[0]["article_id"],
            "title": FALLBACK_KB_CORPUS[0]["title"],
            "category": FALLBACK_KB_CORPUS[0]["category"],
            "similarity": 0.75,
            "snippet": FALLBACK_KB_CORPUS[0]["content"],
        }]
    return scored_articles[:top_k]


def retrieve_context(query: str, category: str | None = None, top_k: int = 3) -> list[dict[str, Any]]:
    """Retrieve top relevant troubleshooting knowledge snippets for a query."""
    settings = get_settings()

    # If OpenAI API Key is available, attempt ChromaDB vector lookup if configured
    if settings.openai_api_key:
        try:
            import chromadb
            persist_dir = "data/chroma_db"
            if os.path.exists(persist_dir):
                client = chromadb.PersistentClient(path=persist_dir)
                collection = client.get_or_create_collection("supportpilot_kb")
                from openai import OpenAI
                oai = OpenAI(api_key=settings.openai_api_key)
                emb = oai.embeddings.create(model="text-embedding-3-small", input=[query]).data[0].embedding
                res = collection.query(query_embeddings=[emb], n_results=top_k)
                hits = []
                if res and res.get("documents"):
                    for doc_text, meta in zip(res["documents"][0], res["metadatas"][0]):
                        hits.append({
                            "article_id": meta.get("article_id", 101),
                            "title": meta.get("title", "Runbook Article"),
                            "category": meta.get("category", category or "General"),
                            "similarity": 0.90,
                            "snippet": doc_text,
                        })
                    if hits:
                        return hits
        except Exception as exc:
            logger.info("ChromaDB vector lookup fallback: %s", exc)

    return _offline_keyword_search(query, category=category, top_k=top_k)
