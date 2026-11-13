"""
AI-Based Semantic Response Comparison Engine
Compares student's explanation with parent's explanation using semantic understanding,
intent classification, permission verification, and contradiction detection.
"""

from __future__ import annotations

import json
import logging
import os
import re
import urllib.error
import urllib.request
from dataclasses import asdict, dataclass
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


def compare_with_gemini(
    student_transcript: str,
    parent_transcript: str,
    student_reason: str,
    parent_reason: str,
    api_key: str,
    model: str = "gemini-3.5-flash",
) -> Optional[ComparisonResult]:
    """Uses Google Gemini (e.g. gemini-3.5-flash, gemini-3.5-flash-lite, gemini-1.5-flash) for deep semantic reasoning and contradiction detection."""
    if api_key.startswith("AQ.") and model in ("gemini-2.5-flash", "gemini-1.5-flash", "gemini-1.5-pro", ""):
        model = "gemini-3.5-flash"
    elif model in ("gemini-2.5-flash", "2.5-flash", ""):
        model = "gemini-3.5-flash"
    try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
        prompt = (
            "You are a strict college attendance verification AI auditor. Analyze these two explanations.\n\n"
            f"Student Statement:\n{student_transcript}\n(Stated Reason: {student_reason})\n\n"
            f"Parent Statement:\n{parent_transcript}\n(Stated Reason: {parent_reason})\n\n"
            "Compare semantic meaning, awareness, and permission. Respond strictly in JSON format with:\n"
            "1. 'match_status': 'MATCHED' (absence genuine, parent aware & approved) or 'MISMATCHED' (suspected bunking, contradiction, parent unaware/unapproved)\n"
            "2. 'semantic_match_score': float from 0.0 to 1.0\n"
            "3. 'reason_match': boolean\n"
            "4. 'permission_confirmed': boolean\n"
            "5. 'knowledge_confirmed': boolean\n"
            "6. 'conflicting_statements': list of string bullet points explaining any contradictions\n"
            "7. 'analysis_summary': clear 1-2 sentence verdict\n"
            "8. 'severity': 'LOW', 'MEDIUM', 'HIGH', or 'CRITICAL'"
        )

        payload = json.dumps({
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "responseMimeType": "application/json",
                "temperature": 0.2,
            },
        }).encode("utf-8")

        req = urllib.request.Request(
            url,
            data=payload,
            headers={"Content-Type": "application/json", "User-Agent": "NoBunkersAI-Gemini/1.0"},
            method="POST",
        )

        with urllib.request.urlopen(req, timeout=12.0) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            content = data["candidates"][0]["content"]["parts"][0]["text"]
            content = re.sub(r"^```json\s*", "", content.strip())
            content = re.sub(r"\s*```$", "", content.strip())
            parsed = json.loads(content)
            logger.info(f"Gemini ({model}) evaluated verification: {parsed.get('match_status')} score={parsed.get('semantic_match_score')}")
            return ComparisonResult(
                match_status=parsed.get("match_status", "INCONCLUSIVE"),
                semantic_match_score=float(parsed.get("semantic_match_score", 0.5)),
                reason_match=bool(parsed.get("reason_match", False)),
                permission_confirmed=bool(parsed.get("permission_confirmed", False)),
                knowledge_confirmed=bool(parsed.get("knowledge_confirmed", False)),
                conflicting_statements=parsed.get("conflicting_statements", []),
                analysis_summary=parsed.get("analysis_summary", ""),
                severity=parsed.get("severity", "MEDIUM"),
                student_stated_reason=student_reason,
                parent_stated_reason=parent_reason,
            )
    except Exception as exc:
        logger.warning(f"Gemini ({model}) comparison failed: {exc}. Trying fallback.")
        return None


def compare_with_llm(
    student_transcript: str,
    parent_transcript: str,
    student_reason: str,
    parent_reason: str,
    api_key: str,
    provider: str = "openai",  # "openai" or "groq"
) -> Optional[ComparisonResult]:
    """Uses OpenAI GPT-4o-mini or Groq Llama 3.3 for deep semantic comparison and bunking detection."""
    try:
        url = "https://api.openai.com/v1/chat/completions" if provider == "openai" else "https://api.groq.com/openai/v1/chat/completions"
        model = "gpt-4o-mini" if provider == "openai" else "llama-3.3-70b-versatile"

        prompt = (
            f"You are a strict college attendance verification AI auditor. Analyze these two explanations.\n\n"
            f"Student Statement:\n{student_transcript}\n(Stated Reason: {student_reason})\n\n"
            f"Parent Statement:\n{parent_transcript}\n(Stated Reason: {parent_reason})\n\n"
            f"Compare semantic meaning, awareness, and permission. Respond strictly in JSON format with:\n"
            f"1. 'match_status': 'MATCHED' (absence genuine, parent aware & approved) or 'MISMATCHED' (suspected bunking, contradiction, parent unaware/unapproved)\n"
            f"2. 'semantic_match_score': float from 0.0 to 1.0\n"
            f"3. 'reason_match': boolean\n"
            f"4. 'permission_confirmed': boolean\n"
            f"5. 'knowledge_confirmed': boolean\n"
            f"6. 'conflicting_statements': list of string bullet points explaining any contradictions\n"
            f"7. 'analysis_summary': clear 1-2 sentence verdict\n"
            f"8. 'severity': 'LOW', 'MEDIUM', 'HIGH', or 'CRITICAL'"
        )

        payload = json.dumps({
            "model": model,
            "messages": [
                {"role": "system", "content": "You are a college attendance verification AI auditor that outputs only JSON."},
                {"role": "user", "content": prompt}
            ],
            "response_format": {"type": "json_object"},
            "temperature": 0.2,
        }).encode("utf-8")

        req = urllib.request.Request(
            url,
            data=payload,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "User-Agent": "NoBunkersAI-LLMEngine/1.0",
            },
            method="POST",
        )

        with urllib.request.urlopen(req, timeout=10.0) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            content = data["choices"][0]["message"]["content"]
            parsed = json.loads(content)
            logger.info(f"LLM ({provider}) evaluated verification: {parsed.get('match_status')} score={parsed.get('semantic_match_score')}")
            return ComparisonResult(
                match_status=parsed.get("match_status", "INCONCLUSIVE"),
                semantic_match_score=float(parsed.get("semantic_match_score", 0.5)),
                reason_match=bool(parsed.get("reason_match", False)),
                permission_confirmed=bool(parsed.get("permission_confirmed", False)),
                knowledge_confirmed=bool(parsed.get("knowledge_confirmed", False)),
                conflicting_statements=parsed.get("conflicting_statements", []),
                analysis_summary=parsed.get("analysis_summary", ""),
                severity=parsed.get("severity", "MEDIUM"),
                student_stated_reason=student_reason,
                parent_stated_reason=parent_reason,
            )
    except Exception as exc:
        logger.warning(f"LLM comparison using {provider} failed: {exc}. Using internal semantic matcher.")
        return None


@dataclass
class ComparisonResult:
    match_status: str  # "MATCHED", "MISMATCHED", "INCONCLUSIVE"
    semantic_match_score: float  # 0.0 to 1.0
    reason_match: bool
    permission_confirmed: bool
    knowledge_confirmed: bool
    conflicting_statements: List[str]
    analysis_summary: str
    severity: str  # "LOW", "MEDIUM", "HIGH", "CRITICAL"
    student_stated_reason: str
    parent_stated_reason: str

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


# Semantic clusters for intent identification
SEMANTIC_CLUSTERS = {
    "medical_illness": [
        "sick", "fever", "ill", "unwell", "hospital", "doctor", "clinic", "medicine",
        "headache", "stomach", "cough", "cold", "infection", "vomiting", "dengue",
        "food poisoning", "injury", "fracture", "pain", "medical", "treatment", "bed rest"
    ],
    "family_function": [
        "marriage", "wedding", "function", "ceremony", "relative", "family event",
        "cousin", "festival", "pooja", "demise", "funeral", "family gathering"
    ],
    "family_emergency": [
        "emergency", "accident", "hospitalized", "urgent", "critical", "family crisis"
    ],
    "travel_commute": [
        "bus missed", "train delayed", "traffic", "breakdown", "bike puncture",
        "car breakdown", "rain", "heavy rain", "flood", "transport strike"
    ],
    "unaware_at_college": [
        "left for college", "went to college", "should be in class", "left home",
        "left in the morning", "attending class", "at college", "not aware", "don't know",
        "no idea", "didn't inform", "did not inform", "lied", "did not tell"
    ],
    "permission_denied": [
        "did not allow", "didn't give permission", "did not permit", "no permission",
        "did not approve", "should not have bunked", "refused"
    ]
}

PARENT_CONFIRMATION_KEYWORDS = [
    "yes", "i allowed", "i permitted", "i gave permission", "i approved", "i know",
    "i informed", "aware", "we visited", "he told me", "she told me", "staying home",
    "allowed him", "allowed her", "he is sick", "she is sick", "he had fever"
]

PARENT_DENIAL_KEYWORDS = [
    "don't know", "do not know", "no idea", "didn't tell", "did not tell",
    "didn't inform", "did not inform", "left for college", "went to college",
    "should be in college", "no permission", "not aware", "did not approve"
]


def _extract_intent_categories(text: str) -> List[str]:
    """Finds all semantic categories present in text."""
    lower = text.lower()
    categories = []
    for cat, keywords in SEMANTIC_CLUSTERS.items():
        if any(kw in lower for kw in keywords):
            categories.append(cat)
    return categories


def _detect_parent_permission(parent_text: str) -> tuple[bool, bool]:
    """
    Returns (knowledge_confirmed, permission_confirmed).
    """
    lower = parent_text.lower()
    
    # Check explicit denial or ignorance
    has_denial = any(re.search(r"\b" + re.escape(kw) + r"\b", lower) for kw in PARENT_DENIAL_KEYWORDS)
    if has_denial:
        return False, False

    # Check explicit knowledge and permission
    has_knowledge = any(kw in lower for kw in ["yes", "i know", "aware", "told me", "informed me", "he is", "she is", "has fever", "was sick"])
    has_permission = any(kw in lower for kw in ["allowed", "permitted", "permission", "approved", "told him to rest", "told her to rest", "stay home", "allowed him", "allowed her"])
    
    return bool(has_knowledge), bool(has_permission or has_knowledge)


def _detect_student_claims(student_text: str) -> tuple[bool, bool]:
    """
    Returns (student_claims_parent_informed, student_claims_parent_approved).
    """
    lower = student_text.lower()
    claims_informed = any(kw in lower for kw in ["informed", "told my parents", "told mom", "told dad", "parents know", "knows about it", "they know"])
    claims_approved = any(kw in lower for kw in ["allowed me", "gave permission", "approved", "permitted", "told me to rest", "stay home"])
    return bool(claims_informed or claims_approved), bool(claims_approved or claims_informed)


def compare_responses(
    student_transcript: str,
    parent_transcript: str,
    student_extracted_reason: Optional[str] = None,
    parent_extracted_reason: Optional[str] = None,
) -> ComparisonResult:
    """
    Performs AI-based semantic comparison between student's and parent's explanations.
    Uses deep semantic intent clustering, contradiction detection, and permission cross-referencing.
    """
    s_text = (student_transcript or "").strip()
    p_text = (parent_transcript or "").strip()

    # Fallback to extracted reasons if transcripts are brief
    if not s_text and student_extracted_reason:
        s_text = student_extracted_reason
    if not p_text and parent_extracted_reason:
        p_text = parent_extracted_reason

    # Handle incomplete or empty transcripts (Scenario C)
    if not s_text or not p_text:
        return ComparisonResult(
            match_status="INCONCLUSIVE",
            semantic_match_score=0.0,
            reason_match=False,
            permission_confirmed=False,
            knowledge_confirmed=False,
            conflicting_statements=["Insufficient transcript data collected to verify absence."],
            analysis_summary="One or both parties did not provide a recorded conversation.",
            severity="LOW",
            student_stated_reason=student_extracted_reason or "Not recorded",
            parent_stated_reason=parent_extracted_reason or "Not recorded",
        )

    # Check if external LLM provider is active (Gemini, OpenAI, or Groq)
    gemini_key = os.getenv("GEMINI_API_KEY", "").strip() or os.getenv("GOOGLE_API_KEY", "").strip()
    gemini_model = os.getenv("GEMINI_MODEL", "gemini-3.5-flash").strip()
    if gemini_key.startswith("AQ.") and gemini_model in ("gemini-2.5-flash", "gemini-1.5-flash", "gemini-1.5-pro", ""):
        gemini_model = "gemini-3.5-flash"
    elif gemini_model in ("gemini-2.5-flash", "2.5-flash", ""):
        gemini_model = "gemini-3.5-flash"
    openai_key = os.getenv("OPENAI_API_KEY", "").strip()
    groq_key = os.getenv("GROQ_API_KEY", "").strip()
    active_llm = os.getenv("ACTIVE_LLM_PROVIDER", "auto").lower()

    if (active_llm in ("gemini", "auto") and gemini_key):
        gemini_res = compare_with_gemini(s_text, p_text, student_extracted_reason or "", parent_extracted_reason or "", gemini_key, gemini_model)
        if gemini_res:
            return gemini_res

    if (active_llm in ("openai", "auto") and openai_key):
        llm_res = compare_with_llm(s_text, p_text, student_extracted_reason or "", parent_extracted_reason or "", openai_key, "openai")
        if llm_res:
            return llm_res

    if (active_llm in ("groq", "auto") and groq_key):
        llm_res = compare_with_llm(s_text, p_text, student_extracted_reason or "", parent_extracted_reason or "", groq_key, "groq")
        if llm_res:
            return llm_res

    # Fallback to local semantic categorization engine
    # 1. Semantic Categorization
    s_cats = _extract_intent_categories(s_text)
    p_cats = _extract_intent_categories(p_text)

    # 2. Extract Claims & Confirmations
    s_claims_informed, s_claims_approved = _detect_student_claims(s_text)
    p_knew, p_permitted = _detect_parent_permission(p_text)

    # 3. Direct Contradiction Detection
    conflicting_statements = []
    
    # Contradiction Type 1: Parent states student went to college while student claims sickness/hospital/staying home
    if "unaware_at_college" in p_cats or not p_knew:
        if "medical_illness" in s_cats or "family_function" in s_cats or s_claims_informed:
            conflicting_statements.append(
                f"Student stated: '{student_extracted_reason or s_text[:120]}' claiming parental awareness."
            )
            conflicting_statements.append(
                f"Parent stated: '{parent_extracted_reason or p_text[:120]}' - parent was unaware and expected student at college."
            )

    # Contradiction Type 2: Incompatible reasons (e.g. Student claims medical emergency, parent says something completely different)
    shared_categories = set(s_cats).intersection(set(p_cats))
    
    # Reason match evaluation
    reason_match = False
    if shared_categories and ("medical_illness" in shared_categories or "family_function" in shared_categories or "travel_commute" in shared_categories):
        reason_match = True

    # Check for direct denial of permission
    if "permission_denied" in p_cats:
        conflicting_statements.append("Parent explicitly stated they did not grant permission for the leave.")

    # 4. Final Verdict Determination
    if conflicting_statements or not p_knew or not p_permitted:
        # Scenario B: MISMATCH
        match_status = "MISMATCHED"
        semantic_score = 0.20 if reason_match else 0.08
        severity = "CRITICAL" if ("unaware_at_college" in p_cats or not p_knew) else "HIGH"
        
        if not conflicting_statements:
            conflicting_statements.append("Parent did not validate student's absence explanation or permission.")
            
        summary = (
            f"SUSPICIOUS ABSENCE DETECTED: Student and parent statements directly contradict. "
            f"Student claimed absence due to '{student_extracted_reason or 'personal reasons'}' with parental approval, "
            f"whereas parent communicated: '{parent_extracted_reason or p_text[:100]}'."
        )
    elif reason_match and p_permitted and p_knew:
        # Scenario A: MATCH
        match_status = "MATCHED"
        semantic_score = 0.95
        severity = "LOW"
        summary = (
            f"VERIFIED GENUINE ABSENCE: Both student and parent explanations communicate the same reason. "
            f"Parent explicitly confirmed awareness and granted permission."
        )
    else:
        # Partial match or neutral confirmation
        if p_permitted or p_knew:
            match_status = "MATCHED"
            semantic_score = 0.85
            severity = "LOW"
            summary = "Absence verified with parent approval, minor variance in phrasing."
        else:
            match_status = "INCONCLUSIVE"
            semantic_score = 0.50
            severity = "MEDIUM"
            conflicting_statements.append("Conversation could not conclusively confirm parental authorization.")
            summary = "Inconclusive responses requiring manual staff review."

    return ComparisonResult(
        match_status=match_status,
        semantic_match_score=semantic_score,
        reason_match=reason_match or match_status == "MATCHED",
        permission_confirmed=p_permitted,
        knowledge_confirmed=p_knew,
        conflicting_statements=conflicting_statements,
        analysis_summary=summary,
        severity=severity,
        student_stated_reason=student_extracted_reason or (s_text[:120] if s_text else "Not specified"),
        parent_stated_reason=parent_extracted_reason or (p_text[:120] if p_text else "Not specified"),
    )
