"""
AI Service — OpenRouter integration for question evaluation.
"""

import json
import httpx
from app.core.config import settings


async def evaluate_answer_with_ai(
    question_text: str,
    answer_text: str,
    role_title: str,
    difficulty: str,
) -> dict:
    """
    Call OpenRouter API to evaluate a candidate's answer.
    Returns scores, feedback, strengths, improvements, and hire recommendation.
    """

    prompt = f"""You are an expert technical interviewer evaluating a candidate's answer.

Role: {role_title}
Difficulty: {difficulty}
Question: {question_text}
Candidate's Answer: {answer_text}

Evaluate the answer and respond ONLY with a JSON object (no markdown, no explanation):
{{
  "score": <float 0-10>,
  "relevance_score": <float 0-10>,
  "clarity_score": <float 0-10>,
  "depth_score": <float 0-10>,
  "feedback": "<2-3 sentence overall feedback>",
  "ideal_answer": "<what a perfect answer would include>",
  "strengths": ["<strength 1>", "<strength 2>"],
  "improvements": ["<improvement 1>", "<improvement 2>"],
  "hire_recommendation": "<one of: strong_yes, yes, maybe, no, strong_no>",
  "overall_feedback": "<1-2 sentence summary for HR>"
}}"""

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            f"{settings.OPENROUTER_BASE_URL}/chat/completions",
            headers={
                "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
                "Content-Type": "application/json",
                "HTTP-Referer": "http://localhost:3000",
                "X-Title": "AI Mock Interview",
            },
            json={
                "model": settings.AI_MODEL,
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.3,
                "max_tokens": 800,
            },
        )
        response.raise_for_status()
        data = response.json()

    raw = data["choices"][0]["message"]["content"].strip()

    # Strip markdown code fences if present
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    raw = raw.strip()

    result = json.loads(raw)

    # Clamp scores to 0-10
    for key in ("score", "relevance_score", "clarity_score", "depth_score"):
        if key in result and result[key] is not None:
            result[key] = max(0.0, min(10.0, float(result[key])))

    return result


async def generate_question_with_ai(
    role_title: str,
    category: str,
    difficulty: str,
    question_number: int,
    previous_questions: list[str],
) -> dict:
    """Generate a unique interview question using AI."""

    prev = "\n".join(f"- {q}" for q in previous_questions) if previous_questions else "None"

    prompt = f"""You are an expert technical interviewer.

Generate question #{question_number} for a {difficulty} {role_title} ({category}) interview.

Previous questions asked (do NOT repeat these):
{prev}

Respond ONLY with a JSON object:
{{
  "question_text": "<the interview question>",
  "question_type": "<one of: technical, behavioral, situational, hr>"
}}"""

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            f"{settings.OPENROUTER_BASE_URL}/chat/completions",
            headers={
                "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
                "Content-Type": "application/json",
                "HTTP-Referer": "http://localhost:3000",
                "X-Title": "AI Mock Interview",
            },
            json={
                "model": settings.AI_MODEL,
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.7,
                "max_tokens": 200,
            },
        )
        response.raise_for_status()
        data = response.json()

    raw = data["choices"][0]["message"]["content"].strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    raw = raw.strip()

    return json.loads(raw)
