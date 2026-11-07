import json
import re
import httpx

OLLAMA_URL = "http://127.0.0.1:11434/api/generate"
MODEL = "qwen3:4b"

async def ask_ai(prompt: str) -> str:
    payload = {
        "model": MODEL,
        "prompt": prompt,
        "stream": False,
        "think": False,
        "format": "json",
        "keep_alive": "10m",
        "options": {
            "temperature": 0.15,
            "num_predict": 2200,
            "num_ctx": 6144
        }
    }
    timeout = httpx.Timeout(connect=10.0, read=300.0, write=20.0, pool=10.0)
    async with httpx.AsyncClient(timeout=timeout) as client:
        response = await client.post(OLLAMA_URL, json=payload)
        response.raise_for_status()
        data = response.json()
        result = data.get("response", "").strip()
        if not result:
            raise RuntimeError(
                "Ollama returned an empty response. "
                f"Thinking output: {data.get('thinking', '')[:250]}"
            )
        return result


def parse_json_response(raw: str) -> dict:
    """Extract a JSON object and handle common model formatting mistakes."""
    if not isinstance(raw, str) or not raw.strip():
        raise ValueError("The AI returned an empty response.")

    cleaned = raw.strip().lstrip("\ufeff")
    cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\s*```$", "", cleaned)

    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start < 0 or end <= start:
        raise ValueError("The AI response did not contain a complete JSON object.")

    candidate = cleaned[start:end + 1]
    # Remove trailing commas before closing braces/brackets (a frequent LLM mistake).
    candidate = re.sub(r",\s*([}\]])", r"\1", candidate)
    # Remove invalid control characters inside the candidate.
    candidate = "".join(ch for ch in candidate if ch in "\t\n\r" or ord(ch) >= 32)

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
