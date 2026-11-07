from pathlib import Path
import csv
ROOT=Path(__file__).resolve().parents[1]
RAW=ROOT/"data"/"raw"
OUT=ROOT/"data"/"processed"/"dataset_inventory.csv"
OUT.parent.mkdir(parents=True,exist_ok=True)
rows=[]
for p in RAW.rglob("*.csv"):
    try:
        with p.open("r",encoding="utf-8-sig",errors="replace",newline="") as f:
            reader=csv.reader(f); header=next(reader,[])
            sample=[]
            for _,row in zip(range(3),reader): sample.append(row)
        rows.append({"file":str(p.relative_to(ROOT)),"columns":len(header),"column_names":" | ".join(header),"sample_rows":len(sample),"status":"readable"})
    except Exception as e:
        rows.append({"file":str(p.relative_to(ROOT)),"columns":0,"column_names":"","sample_rows":0,"status":"error: "+str(e)})
with OUT.open("w",encoding="utf-8-sig",newline="") as f:
    fields=["file","columns","column_names","sample_rows","status"]
    w=csv.DictWriter(f,fieldnames=fields); w.writeheader(); w.writerows(rows)
print(f"Inspected {len(rows)} CSV files. Inventory: {OUT}")
