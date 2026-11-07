from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import httpx
import sqlite3
import json
import hashlib
import base64
import hmac
import secrets
import time
import os
import re
from datetime import datetime, timezone
from fastapi import Depends, Header
from pathlib import Path
from ai_service import ask_ai, parse_json_response
from backend_addon.india_evidence_engine import collect_india_evidence

app = FastAPI(
    title="IdeaArena AI",
    description="AI-powered business idea evaluation platform",
    version="1.2.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "https://idea-arena-ai.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class IdeaRequest(BaseModel):
    title: str = Field(min_length=2, max_length=120)
    description: str = Field(min_length=20, max_length=5000)
    language: str = Field(default='English', max_length=20)

# Fixed rubric: criterion scores are 0-5; Python calculates the final score.
RUBRIC = [
    {"key": "problem_clarity", "label": "Problem clarity", "weight": 15},
    {"key": "market_opportunity", "label": "Market opportunity", "weight": 20},
    {"key": "customer_value", "label": "Customer value", "weight": 15},
    {"key": "technical_feasibility", "label": "Technical feasibility", "weight": 15},
    {"key": "business_model", "label": "Business model", "weight": 15},
    {"key": "differentiation", "label": "Competition and differentiation", "weight": 10},
    {"key": "scalability", "label": "Scalability", "weight": 10},
]
DB_PATH = Path(__file__).with_name("evaluations.sqlite3")


# ---------------------------------------------------------------------------
# Authentication and role-based access
# Uses only Python's standard library for password hashing and signed tokens.
# Public registration can create USER accounts only. Admins are bootstrapped
# separately from environment variables and cannot be created via signup.
# ---------------------------------------------------------------------------
TOKEN_TTL_SECONDS = 60 * 60 * 12
PASSWORD_ITERATIONS = 310_000


class RegisterRequest(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    email: str = Field(min_length=5, max_length=254)
    password: str = Field(min_length=8, max_length=128)


class LoginRequest(BaseModel):
    email: str = Field(min_length=5, max_length=254)
    password: str = Field(min_length=1, max_length=128)


def _db():
    return sqlite3.connect(DB_PATH)


def _normalise_email(email: str) -> str:
    return email.strip().lower()


def _password_hash(password: str, salt: bytes | None = None) -> str:
    salt = salt or secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt, PASSWORD_ITERATIONS
    )
    return f"pbkdf2_sha256${PASSWORD_ITERATIONS}${base64.urlsafe_b64encode(salt).decode()}${base64.urlsafe_b64encode(digest).decode()}"


def _verify_password(password: str, stored: str) -> bool:
    try:
        algorithm, iterations, salt_text, digest_text = stored.split("$", 3)
        if algorithm != "pbkdf2_sha256":
            return False
        salt = base64.urlsafe_b64decode(salt_text.encode())
        expected = base64.urlsafe_b64decode(digest_text.encode())
        actual = hashlib.pbkdf2_hmac(
            "sha256", password.encode("utf-8"), salt, int(iterations)
        )
        return hmac.compare_digest(actual, expected)
    except (ValueError, TypeError):
        return False


def _secret_key() -> bytes:
    # Persist a random local signing key if the operator has not supplied one.
    configured = os.getenv("IDEAARENA_SECRET_KEY", "").strip()
    if configured:
        if len(configured) < 32:
            raise RuntimeError("IDEAARENA_SECRET_KEY must contain at least 32 characters.")
        return configured.encode("utf-8")
    key_path = Path(__file__).with_name(".ideaarena_secret")
    if not key_path.exists():
        key_path.write_text(secrets.token_urlsafe(48), encoding="utf-8")
        try:
            os.chmod(key_path, 0o600)
        except OSError:
            pass
    return key_path.read_text(encoding="utf-8").strip().encode("utf-8")


def _b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _issue_token(user: dict) -> str:
    header = _b64(json.dumps({"alg": "HS256", "typ": "JWT"}, separators=(",", ":")).encode())
    payload = _b64(json.dumps({
        "sub": user["id"],
        "email": user["email"],
        "role": user["role"],
        "exp": int(time.time()) + TOKEN_TTL_SECONDS,
    }, separators=(",", ":")).encode())
    signing_input = f"{header}.{payload}".encode("ascii")
    signature = _b64(hmac.new(_secret_key(), signing_input, hashlib.sha256).digest())
    return f"{header}.{payload}.{signature}"


def _decode_token(token: str) -> dict:
    try:
        header, payload, signature = token.split(".")
        signing_input = f"{header}.{payload}".encode("ascii")
        expected = _b64(hmac.new(_secret_key(), signing_input, hashlib.sha256).digest())
        if not hmac.compare_digest(signature, expected):
            raise ValueError("Invalid token signature")
        decoded_header = json.loads(base64.urlsafe_b64decode(header + "=" * (-len(header) % 4)))
        data = json.loads(base64.urlsafe_b64decode(payload + "=" * (-len(payload) % 4)))
        if decoded_header.get("alg") != "HS256" or int(data.get("exp", 0)) < int(time.time()):
            raise ValueError("Expired or invalid token")
        return data
    except Exception as exc:
        raise HTTPException(status_code=401, detail="Session expired or invalid. Please log in again.") from exc


def _init_auth_db():
    with _db() as conn:
        conn.execute("""CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE COLLATE NOCASE,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('user','admin')),
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )""")
        conn.execute("""CREATE TABLE IF NOT EXISTS user_evaluations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            cache_key TEXT NOT NULL,
            title TEXT NOT NULL,
            result_json TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id)
        )""")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_user_evaluations_user ON user_evaluations(user_id, created_at DESC)")

    # First admin is created only when these environment variables are set.
    admin_email = _normalise_email(os.getenv("IDEAARENA_ADMIN_EMAIL", ""))
    admin_password = os.getenv("IDEAARENA_ADMIN_PASSWORD", "")
    if admin_email and admin_password:
        if len(admin_password) < 12:
            raise RuntimeError("IDEAARENA_ADMIN_PASSWORD must be at least 12 characters.")
        with _db() as conn:
            existing = conn.execute(
                "SELECT id, role FROM users WHERE email = ?", (admin_email,)
            ).fetchone()
            if existing is None:
                conn.execute(
                    "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'admin')",
                    ("IdeaArena Administrator", admin_email, _password_hash(admin_password))
                )
            elif existing[1] != "admin":
                raise RuntimeError("Configured admin email is already registered as a user. Choose a separate admin email.")


@app.on_event("startup")
def startup_auth():
    _init_auth_db()


def _public_user(row) -> dict:
    return {"id": row[0], "name": row[1], "email": row[2], "role": row[3], "created_at": row[4]}


def get_current_user(authorization: str | None = Header(default=None)) -> dict:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Please log in to continue.")
    claims = _decode_token(authorization.split(" ", 1)[1].strip())
    with _db() as conn:
        row = conn.execute(
            "SELECT id, name, email, role, created_at FROM users WHERE id = ?",
            (claims.get("sub"),)
        ).fetchone()
    if not row or row[3] != claims.get("role"):
        raise HTTPException(status_code=401, detail="Account is unavailable. Please log in again.")
    return _public_user(row)


def require_admin(current_user: dict = Depends(get_current_user)) -> dict:
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Administrator access required.")
    return current_user


def _record_user_evaluation(user_id: int, cache_key: str, title: str, result: dict):
    with _db() as conn:
        conn.execute(
            "INSERT INTO user_evaluations (user_id, cache_key, title, result_json) VALUES (?, ?, ?, ?)",
            (user_id, cache_key, title, json.dumps(result, ensure_ascii=False))
        )


@app.post("/api/auth/register")
def register_user(payload: RegisterRequest):
    email = _normalise_email(payload.email)
    if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email):
        raise HTTPException(status_code=400, detail="Enter a valid email address.")
    if len(payload.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters.")
    with _db() as conn:
        try:
            cursor = conn.execute(
                "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'user')",
                (payload.name.strip(), email, _password_hash(payload.password))
            )
        except sqlite3.IntegrityError:
            raise HTTPException(status_code=409, detail="An account with this email already exists.")
        row = conn.execute(
            "SELECT id, name, email, role, created_at FROM users WHERE id = ?",
            (cursor.lastrowid,)
        ).fetchone()
    user = _public_user(row)
    return {"success": True, "token": _issue_token(user), "user": user}


@app.post("/api/auth/login")
def login_user(payload: LoginRequest):
    email = _normalise_email(payload.email)
    with _db() as conn:
        row = conn.execute(
            "SELECT id, name, email, password_hash, role, created_at FROM users WHERE email = ?",
            (email,)
        ).fetchone()
    if not row or not _verify_password(payload.password, row[3]):
        raise HTTPException(status_code=401, detail="Incorrect email or password.")
    user = {"id": row[0], "name": row[1], "email": row[2], "role": row[4], "created_at": row[5]}
    if user["role"] != "user":
        raise HTTPException(status_code=403, detail="Use the administrator login for this account.")
    return {"success": True, "token": _issue_token(user), "user": user}


@app.post("/api/auth/admin/login")
def login_admin(payload: LoginRequest):
    email = _normalise_email(payload.email)
    with _db() as conn:
        row = conn.execute(
            "SELECT id, name, email, password_hash, role, created_at FROM users WHERE email = ?",
            (email,)
        ).fetchone()
    if not row or row[4] != "admin" or not _verify_password(payload.password, row[3]):
        raise HTTPException(status_code=401, detail="Invalid administrator credentials.")
    user = {"id": row[0], "name": row[1], "email": row[2], "role": row[4], "created_at": row[5]}
    return {"success": True, "token": _issue_token(user), "user": user}


@app.get("/api/auth/me")
def auth_me(current_user: dict = Depends(get_current_user)):
    return {"success": True, "user": current_user}


@app.get("/api/auth/history")
def user_history(current_user: dict = Depends(get_current_user)):
    with _db() as conn:
        rows = conn.execute(
            """SELECT id, title, result_json, created_at
               FROM user_evaluations WHERE user_id = ?
               ORDER BY created_at DESC, id DESC LIMIT 100""",
            (current_user["id"],)
        ).fetchall()
    return {"success": True, "history": [
        {"id": row[0], "title": row[1], "evaluation": json.loads(row[2]), "created_at": row[3]}
        for row in rows
    ]}


@app.get("/api/admin/overview")
def admin_overview(admin: dict = Depends(require_admin)):
    with _db() as conn:
        user_count = conn.execute("SELECT COUNT(*) FROM users WHERE role = 'user'").fetchone()[0]
        evaluation_count = conn.execute("SELECT COUNT(*) FROM user_evaluations").fetchone()[0]
        users = conn.execute(
            """SELECT u.id, u.name, u.email, u.created_at, COUNT(e.id)
               FROM users u LEFT JOIN user_evaluations e ON e.user_id = u.id
               WHERE u.role = 'user' GROUP BY u.id ORDER BY u.created_at DESC LIMIT 100"""
        ).fetchall()
        evaluations = conn.execute(
            """SELECT e.id, e.title, e.created_at, u.name, u.email
               FROM user_evaluations e JOIN users u ON u.id = e.user_id
               ORDER BY e.created_at DESC, e.id DESC LIMIT 100"""
        ).fetchall()
    return {
        "success": True,
        "stats": {"users": user_count, "user_evaluations": evaluation_count},
        "users": [{"id": r[0], "name": r[1], "email": r[2], "created_at": r[3], "evaluation_count": r[4]} for r in users],
        "evaluations": [{"id": r[0], "title": r[1], "created_at": r[2], "user_name": r[3], "user_email": r[4]} for r in evaluations]
    }


def get_cache(key: str):
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("""CREATE TABLE IF NOT EXISTS evaluations (
            cache_key TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            result_json TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )""")
        row = conn.execute(
            "SELECT result_json FROM evaluations WHERE cache_key = ?", (key,)
        ).fetchone()
    return json.loads(row[0]) if row else None

def save_cache(key: str, title: str, result: dict):
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("""CREATE TABLE IF NOT EXISTS evaluations (
            cache_key TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            result_json TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )""")
        conn.execute(
            "INSERT OR REPLACE INTO evaluations (cache_key, title, result_json) VALUES (?, ?, ?)",
            (key, title, json.dumps(result, ensure_ascii=False))
        )

@app.get("/")
def home():
    return {"message": "Welcome to IdeaArena AI Backend", "status": "running"}

@app.get("/api/health")
def health():
    return {"status": "healthy", "model": "qwen3:4b", "scoring": "fixed-weight-rubric"}

@app.post("/api/evaluate")
async def evaluate_idea(idea: IdeaRequest, current_user: dict = Depends(get_current_user)):
    # Normalize only whitespace/case for cache identity; preserve the original display title.
    normalized = " ".join(idea.title.casefold().split()) + "\n" + " ".join(idea.description.casefold().split()) + "\n" + idea.language.casefold().strip()
    cache_key = hashlib.sha256(normalized.encode("utf-8")).hexdigest()

    cached = get_cache(cache_key)
    if cached:
        _record_user_evaluation(current_user["id"], cache_key, idea.title, cached)
        return {
            "success": True,
            "idea": idea.title,
            "evaluation": cached,
            "cached": True,
            "message": "Loaded the saved evaluation for this exact idea."
        }

    rubric_text = "\n".join(
        f'- {item["key"]}: {item["label"]} (weight {item["weight"]}%)'
        for item in RUBRIC
    )
    prompt = f"""
You are a cautious startup analyst. Assess only the idea text provided.
Write all human-readable report content in this language: {idea.language}. Keep JSON keys and rubric keys in English.
Return one complete valid JSON object and no markdown.
Do not invent market statistics, customer interviews, named competitors, citations,
or facts that are not in the idea. If evidence is missing, explicitly say it is unknown.
Do not give the overall score. Score each criterion from 0 to 5 using this scale:
0 = absent or impossible to assess; 1 = very weak; 2 = weak; 3 = plausible;
4 = strong; 5 = exceptionally well-supported by the supplied information.
Be conservative. Do not award high scores merely because the idea sounds attractive.

Fixed criteria:
{rubric_text}

Idea title: {idea.title}
Idea description: {idea.description}

Return exactly this structure:
{{
  "criteria": {{
    "problem_clarity": {{"score": 0, "reason": "brief evidence-based reason"}},
    "market_opportunity": {{"score": 0, "reason": "brief reason; state unknowns"}},
    "customer_value": {{"score": 0, "reason": "brief reason"}},
    "technical_feasibility": {{"score": 0, "reason": "brief reason"}},
    "business_model": {{"score": 0, "reason": "brief reason"}},
    "differentiation": {{"score": 0, "reason": "brief reason; do not invent competitors"}},
    "scalability": {{"score": 0, "reason": "brief reason"}}
  }},
  "market_potential": "Low / Medium / High with reason",
  "market_demand": "Plausible demand and what must be validated",
  "confidence": "Low / Medium / High",
  "strengths": ["up to 3 concise points"],
  "weaknesses": ["up to 3 concise points"],
  "customer_segments": [{{"name":"Customer group","share_percent":50,"note":"hypothesis, not measured share"}}],
  "financial_estimates": [
    {{"label":"Illustrative monthly revenue (INR)","amount":0,"kind":"revenue"}},
    {{"label":"Illustrative monthly costs (INR)","amount":0,"kind":"cost"}}
  ],
  "recommendations": ["up to 4 practical next steps"],
  "workflow": ["3 to 5 short stages"],
  "verdict": "Balanced 2-4 sentence verdict",
  "assumptions": ["key assumptions that require validation"]
}}
All criterion scores must be whole numbers from 0 to 5.
For customer_segments, provide at least two plausible segments only when the idea text supports them;
shares must add to 100. If a defensible distribution cannot be proposed, return an empty array.
For financial_estimates, do not use zero as a placeholder. Return positive illustrative amounts only
when there are enough stated assumptions to estimate them; otherwise return an empty array.
Percentages and financial amounts are illustrative hypotheses only, not researched or verified.
"""
    try:
        raw = await ask_ai(prompt)
        try:
            evaluation = parse_json_response(raw)
        except (ValueError, json.JSONDecodeError):
            repair_prompt = (
                "Repair this into valid JSON matching the schema in the previous request. "
                "Preserve meaning, do not add facts. Return only JSON:\n" + raw[:10000]
            )
            evaluation = parse_json_response(await ask_ai(repair_prompt))

        criteria = evaluation.get("criteria")
        if not isinstance(criteria, dict):
            raise ValueError("The AI did not return the required criterion-by-criterion scores.")

        weighted_total = 0.0
        normalized_criteria = {}
        for item in RUBRIC:
            entry = criteria.get(item["key"], {})
            try:
                score = int(round(float(entry.get("score", 0))))
            except (TypeError, ValueError, AttributeError):
                score = 0
            score = max(0, min(5, score))
            reason = entry.get("reason", "Insufficient explanation provided.") if isinstance(entry, dict) else "Insufficient explanation provided."
            weighted_total += (score / 5) * item["weight"]
            normalized_criteria[item["key"]] = {
                "label": item["label"],
                "weight": item["weight"],
                "score": score,
                "reason": str(reason)[:500]
            }

        # Weighted percentage converted to a 0-10 score, rounded to one decimal.
        final_score = round((weighted_total / 100) * 10, 1)
        evaluation["criteria"] = normalized_criteria
        evaluation["score"] = final_score
        evaluation["score_method"] = "Fixed weighted rubric: criterion ratings (0-5) converted to a score out of 10."
        evaluation["score_weights"] = {item["key"]: item["weight"] for item in RUBRIC}

        for key in ("strengths", "weaknesses", "recommendations", "workflow", "assumptions"):
            if not isinstance(evaluation.get(key), list):
                evaluation[key] = []
        for key in ("customer_segments", "financial_estimates"):
            if not isinstance(evaluation.get(key), list):
                evaluation[key] = []

        clean_estimates = []
        for item in evaluation["financial_estimates"]:
            if not isinstance(item, dict):
                continue
            try:
                amount = float(item.get("amount"))
            except (TypeError, ValueError):
                continue
            if amount <= 0 or item.get("kind") not in ("revenue", "cost"):
                continue
            item["amount"] = amount
            clean_estimates.append(item)
        evaluation["financial_estimates"] = clean_estimates

        clean_segments = []
        for item in evaluation["customer_segments"]:
            if not isinstance(item, dict) or not str(item.get("name", "")).strip():
                continue
            try:
                share = float(item.get("share_percent"))
            except (TypeError, ValueError):
                continue
            if share > 0:
                item["share_percent"] = share
                clean_segments.append(item)
        segment_total = sum(item["share_percent"] for item in clean_segments)
        if len(clean_segments) < 2 or segment_total <= 0:
            evaluation["customer_segments"] = []
        else:
            for item in clean_segments:
                item["share_percent"] = round(item["share_percent"] / segment_total * 100, 1)
            evaluation["customer_segments"] = clean_segments

        data_dir = Path(__file__).parent / "data" / "raw"
        india_evidence = collect_india_evidence(
            str(data_dir),
            idea.title + " " + idea.description
        )
        evaluation["india_evidence"] = india_evidence

        result = evaluation
        save_cache(cache_key, idea.title, result)
        _record_user_evaluation(current_user["id"], cache_key, idea.title, result)
        return {
            "success": True,
            "idea": idea.title,
            "evaluation": result,
            "cached": False,
            "message": "Evaluation completed and saved."
        }
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"Could not reach local Ollama: {exc}") from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"{type(exc).__name__}: {exc}") from exc


