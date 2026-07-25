import os
from fastapi import FastAPI, HTTPException
from recommender import recommend_for_user, evaluate

app = FastAPI()

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/recommend/{user_id}")
def recommend(user_id: int, top_n: int = 10):
    try:
        recs = recommend_for_user(user_id, top_n=top_n)
        return {"recommendations": recs}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/evaluate")
def eval_endpoint(k: int = 3):
    try:
        return evaluate(k=k)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))