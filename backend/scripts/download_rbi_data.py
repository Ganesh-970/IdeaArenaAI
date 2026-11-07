"""Download candidate CSV tables from the RBI DBIE public read-only API.
No API key is documented as required. Requires internet and requests.
The API's current schema may evolve; failures are logged and skipped.
"""
import csv, json, re, sys, time
from pathlib import Path
import requests

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data" / "raw" / "rbi_dbie"
RAW.mkdir(parents=True, exist_ok=True)
BASE = "https://data-api.dbie.rbihub.in"
TERMS = ["bank", "credit", "deposit", "payment", "inflation", "price", "exchange", "interest", "finance", "state", "gdp", "money", "external"]

def get_json(url):
    r = requests.get(url, timeout=45, headers={"User-Agent":"IdeaArenaAI-Student-Research/1.0"})
    r.raise_for_status()
    return r.json()

def main():
    print("Discovering actual RBI DBIE tables...")
    payload = get_json(BASE + "/api/tables")
    if isinstance(payload, dict):
        items = payload.get("data") or payload.get("tables") or payload.get("results") or []
    elif isinstance(payload, list):
        items = payload
    else:
        items = []
    if not items:
        print("Could not identify table list in API response. Saved raw response for inspection.")
        (RAW/"api_tables_response.json").write_text(json.dumps(payload,indent=2),encoding="utf-8")
        return
    def searchable(x):
        return " ".join(str(x.get(k,"")) for k in ("title","name","schema","table","description","path")).lower() if isinstance(x,dict) else str(x).lower()
    chosen=[]
    for item in items:
        s=searchable(item)
        if any(t in s for t in TERMS):
            chosen.append(item)
    print(f"Found {len(items)} tables; {len(chosen)} match relevant search terms.")
    (RAW/"rbi_table_catalogue.json").write_text(json.dumps(chosen,indent=2),encoding="utf-8")
    success=0
    for idx,item in enumerate(chosen[:30],1):
        if not isinstance(item,dict): continue
        schema=item.get("schema") or item.get("schema_name")
        table=item.get("table") or item.get("table_name") or item.get("id")
        title=item.get("title") or item.get("name") or f"{schema}_{table}"
        if not schema or not table: continue
        url=f"{BASE}/api/tables/{schema}/{table}/csv"
        safe=re.sub(r"[^A-Za-z0-9_-]+","_",str(title)).strip("_")[:90] or f"rbi_table_{idx}"
        try:
            r=requests.get(url,timeout=90,headers={"User-Agent":"IdeaArenaAI-Student-Research/1.0"})
            r.raise_for_status()
            if not r.content or b"<html" in r.content[:500].lower():
                print("Skipped (not CSV):",title); continue
            path=RAW/f"{safe}.csv"
            path.write_bytes(r.content)
            print("Downloaded:",path.name, f"({len(r.content)} bytes)")
            success+=1
        except Exception as e:
            print("Skipped:",title,"|",str(e)[:180])
        time.sleep(.15)
    print(f"Finished. Downloaded {success} actual CSV files into {RAW}")

if __name__=="__main__":
    main()
