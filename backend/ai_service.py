
import json
import re
import os
import httpx

GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
MODEL = "openai/gpt-oss-20b"


async def ask_ai(prompt: str) -> str:
    api_key = os.getenv("GROQ_API_KEY")

    if not api_key:
        raise RuntimeError("GROQ_API_KEY environment variable is missing.")

    payload = {
        "model": MODEL,
        "messages": [
            {
                "role": "user",
                "content": prompt
            }
        ],
        "temperature": 0.15,
        "max_completion_tokens": 2200,
        "response_format": {
            "type": "json_object"
        }
    }

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

    timeout = httpx.Timeout(
        connect=15.0,
        read=120.0,
        write=20.0,
        pool=10.0
    )

    async with httpx.AsyncClient(timeout=timeout) as client:
        response = await client.post(
            GROQ_URL,
            json=payload,
            headers=headers
        )
        response.raise_for_status()

        data = response.json()
        choices = data.get("choices", [])

        if not choices:
            raise RuntimeError("Groq returned an empty response.")

        result = choices[0].get("message", {}).get("content", "")

        if not result or not result.strip():
            raise RuntimeError("Groq returned empty AI content.")

        return result.strip()


def parse_json_response(raw: str) -> dict:
    """Extract a JSON object and handle common model formatting mistakes."""

    if not isinstance(raw, str) or not raw.strip():
        raise ValueError("The AI returned an empty response.")

    cleaned = raw.strip().lstrip("\ufeff")
    cleaned = re.sub(
        r"^```(?:json)?\s*",
        "",
        cleaned,
        flags=re.IGNORECASE
    )
    cleaned = re.sub(r"\s*```$", "", cleaned)

    start = cleaned.find("{")
    end = cleaned.rfind("}")

    if start < 0 or end <= start:
        raise ValueError(
            "The AI response did not contain a complete JSON object."
        )

    candidate = cleaned[start:end + 1]

    candidate = re.sub(r",\s*([}\]])", r"\1", candidate)
    candidate = "".join(
        ch for ch in candidate
        if ch in "\t\n\r" or ord(ch) >= 32
    )

    try:
        result = json.loads(candidate)
    except json.JSONDecodeError as exc:
        raise ValueError(
            f"The AI produced malformed JSON near line {exc.lineno}, "
            f"column {exc.colno}. The server will retry once."
        ) from exc

    if not isinstance(result, dict):
        raise ValueError("The AI response must be a JSON object.")

    return result
