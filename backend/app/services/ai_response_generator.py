"""AI Draft Response Generator for SupportPilot (Person 1)."""
from __future__ import annotations

import json
import logging
from typing import Any

from app.core.config import get_settings

logger = logging.getLogger(__name__)

RESPONSE_GEN_PROMPT = """You are a senior, empathetic IT Support Desk Engineer writing a resolution email to an employee.
Your task is to write a helpful, clear, and actionable troubleshooting response.

GROUNDING RULES:
1. Base your troubleshooting steps strictly on the verified runbook snippets provided in <knowledge_base_context>.
2. Do not invent company server names, internal URLs, or unsupported tools.
3. If the context does not provide an exact fix, provide standard safe diagnostics and state that a Tier-2 specialist will assist if needed.
4. Maintain a warm, professional, and reassuring tone.
5. Format the solution using clean GitHub Markdown with numbered steps.

Respond strictly with a JSON object with these exact keys:
- solution_text: String containing the complete response (greeting, steps, closing).
- confidence_score: Float from 0.0 to 1.0 (>= 0.85 if strong KB match, < 0.70 if guessing).
- citations_used: Array of article_id integers that were directly cited.
- requires_escalation: Boolean (true if confidence < 0.70 or high risk).
"""


def _offline_generate_response(
    title: str,
    description: str,
    category: str,
    citations: list[dict[str, Any]],
) -> dict[str, Any]:
    """Fallback resolution generator when offline."""
    steps = []
    used_ids = []

    if citations:
        top_cite = citations[0]
        used_ids.append(top_cite.get("article_id", 101))
        steps.append(f"**Step 1: Check Standard Knowledge Base Runbook**\nAccording to **{top_cite.get('title', 'IT Runbook')}**:\n{top_cite.get('snippet', '')}")
        steps.append("**Step 2: Verification**\nVerify that network/application connectivity resumes normally.")
    else:
        steps.append("**Step 1:** Verify your local network and restart the application.")
        steps.append("**Step 2:** Ensure your corporate credentials and MFA tokens are active.")

    formatted_steps = "\n\n".join(steps)
    solution = (
        f"Hi there,\n\n"
        f"Thank you for contacting the IT Service Desk regarding **\"{title}\"**.\n\n"
        f"We investigated your issue and identified the following grounded troubleshooting procedure:\n\n"
        f"{formatted_steps}\n\n"
        f"If the issue persists after following these steps, please reply to this ticket and we will escalate immediately.\n\n"
        f"Best regards,\n"
        f"**SupportPilot IT Incident Desk**"
    )

    return {
        "solution_text": solution,
        "confidence_score": 0.92 if citations else 0.65,
        "citations_used": used_ids,
        "requires_escalation": False if citations else True,
    }


def generate_ticket_response(
    title: str,
    description: str,
    category: str = "General",
    summary: dict[str, Any] | None = None,
    citations: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    """Generates an AI resolution proposal grounded in knowledge citations."""
    settings = get_settings()
    citations = citations or []

    if not settings.openai_api_key:
        return _offline_generate_response(title, description, category, citations)

    try:
        from openai import OpenAI
        client = OpenAI(api_key=settings.openai_api_key, timeout=settings.openai_timeout_seconds)

        kb_context = ""
        for cite in citations:
            kb_context += f"\n[Article ID: {cite.get('article_id')} | Title: {cite.get('title')}]\n{cite.get('snippet')}\n"

        user_content = (
            f"Ticket Title: {title}\n"
            f"Category: {category}\n"
            f"Description: {description}\n"
            f"<knowledge_base_context>\n{kb_context or 'No specific knowledge articles found.'}\n</knowledge_base_context>"
        )

        response = client.chat.completions.create(
            model=settings.openai_model,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": RESPONSE_GEN_PROMPT},
                {"role": "user", "content": user_content},
            ],
            temperature=0.2,
        )

        raw = response.choices[0].message.content or "{}"
        data = json.loads(raw)
        return data
    except Exception as exc:
        logger.warning("AI response generator fallback: %s", exc)
        return _offline_generate_response(title, description, category, citations)
