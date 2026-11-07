"""Evidence extraction starter for IdeaArena AI.
Only reports observed dataset files/columns/rows. It deliberately avoids claiming
that a dataset proves demand or market size.
"""
from pathlib import Path
import csv, re
from collections import Counter

def collect_dataset_evidence(data_dir, idea_text=""):
    root=Path(data_dir)
    files=list(root.rglob("*.csv")) if root.exists() else []
    evidence=[]
    for path in files:
        try:
            with path.open("r",encoding="utf-8-sig",errors="replace",newline="") as f:
                reader=csv.DictReader(f)
                columns=reader.fieldnames or []
                row_count=0
                sample_values=[]
                for row in reader:
                    row_count+=1
                    if len(sample_values)<3: sample_values.append(row)
            evidence.append({
                "file":path.name,
                "relative_path":str(path),
                "row_count":row_count,
                "columns":columns,
                "sample_rows":sample_values,
                "relevance":"needs semantic matching to idea and dataset metadata",
                "source_verified":False
            })
        except Exception as exc:
            evidence.append({"file":path.name,"error":str(exc),"row_count":0,"columns":[]})
    return {"files_found":len(files),"datasets":evidence,
            "warning":"Dataset presence is not evidence of market demand. Match columns, geography, dates, units and source metadata before scoring."}
