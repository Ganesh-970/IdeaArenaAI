"""Hybrid score utility. AI score and evidence score must be on 0-10 scale."""
def calculate_hybrid_score(ai_score, evidence_score=None, evidence_coverage=0.0, ai_weight=0.65):
    ai=max(0.0,min(10.0,float(ai_score)))
    coverage=max(0.0,min(1.0,float(evidence_coverage)))
    if evidence_score is None or coverage <= 0:
        return {"final_score":round(ai,2),"ai_score":round(ai,2),"evidence_score":None,
                "evidence_coverage":round(coverage,2),"confidence":"low",
                "note":"No validated relevant dataset evidence; AI score shown without dataset adjustment."}
    ev=max(0.0,min(10.0,float(evidence_score)))
    evidence_weight=(1-ai_weight)*coverage
    final=ai*(1-evidence_weight)+ev*evidence_weight
    confidence="high" if coverage>=0.75 else "medium" if coverage>=0.4 else "low"
    return {"final_score":round(final,2),"ai_score":round(ai,2),"evidence_score":round(ev,2),
            "evidence_coverage":round(coverage,2),"confidence":confidence,
            "note":"Evidence influence is scaled by coverage; missing evidence is not treated as negative demand."}
