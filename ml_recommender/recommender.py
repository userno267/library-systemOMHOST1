import pandas as pd
import numpy as np
import re
import sys
import os
import json
import random
from collections import defaultdict
from sqlalchemy import create_engine

from sklearn.metrics.pairwise import cosine_similarity
from sklearn.decomposition import TruncatedSVD
from sklearn.feature_extraction.text import TfidfVectorizer

# ===============================
# CONFIG
# ===============================
DB_USER = os.getenv("DB_USER")
DB_PASS = os.getenv("DB_PASSWORD")
DB_HOST = os.getenv("DB_HOST")
DB_PORT = os.getenv("DB_PORT", "3306")
DB_NAME = os.getenv("DB_NAME")

print(f"[Config] Connecting to DB: {DB_USER}@{DB_HOST}:{DB_PORT}/{DB_NAME}")

engine = create_engine(
    f"mysql+pymysql://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
)

print("[Config] DB engine created ✅")

DEBUG = False
EVAL_MODE = len(sys.argv) > 2 and sys.argv[2] == "eval"

def log(msg):
    if DEBUG or EVAL_MODE:
        print(f"[DEBUG] {msg}")

# ===============================
# LOAD DATA
# ===============================
print("[Data] Loading books from database...")

query = """
SELECT
    b.id,
    b.title,
    b.author,
    b.description,
    b.cover_image,
    b.section,
    GROUP_CONCAT(DISTINCT s.name SEPARATOR ' ') AS subjects
FROM books b
LEFT JOIN book_subjects bs ON b.id = bs.book_id
LEFT JOIN subjects s ON bs.subject_id = s.id
GROUP BY b.id;
"""

df = pd.read_sql(query, engine)
print(f"[Data] Loaded {len(df)} books ✅")

# ===============================
# CLEAN TEXT
# ===============================
print("[Data] Cleaning text columns...")

text_cols = ["title", "author", "description", "section", "subjects"]

for col in text_cols:
    df[col] = df[col].fillna("").astype(str)

def clean_text(text):
    tokens = re.split(r"[\/,;]", text)
    return " ".join([t.strip().lower() for t in tokens if t.strip()])

# normalize title (remove volume info)
def normalize_title(title):
    title = title.lower()
    title = re.sub(r'\b(vol|volume|book|part)\s*\d+\b', '', title)
    title = re.sub(r'\b\d+\b$', '', title)
    title = re.sub(r'\s+', ' ', title)
    return title.strip()

for col in text_cols:
    df[col] = df[col].apply(clean_text)

df["combined_text"] = (
    df["title"] + " " +
    df["author"] + " " +
    df["description"] + " " +
    df["section"] + " " +
    df["subjects"]
)

print("[Data] Text cleaning done ✅")

# ===============================
# ML MODEL: TF-IDF (content-based)
# ===============================
print("[TF-IDF] Fitting TF-IDF vectorizer...")

tfidf = TfidfVectorizer(stop_words="english", ngram_range=(1, 2), min_df=2)
tfidf_matrix = tfidf.fit_transform(df["combined_text"])

print(f"[TF-IDF] Matrix shape: {tfidf_matrix.shape} (books x features) ✅")

# ===============================
# COLLABORATIVE FILTERING (SVD)
# ===============================
def train_cf():
    print("[CF] Loading borrow data for collaborative filtering...")
    ratings = pd.read_sql("SELECT user_id, book_id, status FROM borrows", engine)

    if ratings.empty:
        print("[CF] ⚠️  No borrow data found — collaborative filtering disabled")
        return None, None, None

    print(f"[CF] Loaded {len(ratings)} borrow records")

    ratings["value"] = ratings["status"].apply(lambda x: 2 if x == "borrowed" else 1)

    matrix = ratings.pivot_table(
        index="user_id",
        columns="book_id",
        values="value",
        fill_value=0
    )

    print(f"[CF] User-item matrix shape: {matrix.shape} (users x books)")

    if matrix.shape[1] < 2:
        print("[CF] ⚠️  Not enough books in matrix — collaborative filtering disabled")
        return None, None, None

    n_components = min(10, matrix.shape[1] - 1)
    print(f"[CF] Training SVD with {n_components} components...")

    svd = TruncatedSVD(n_components=n_components)
    user_factors = svd.fit_transform(matrix)
    item_factors = svd.components_

    explained = svd.explained_variance_ratio_.sum()
    print(f"[CF] SVD trained ✅ — explained variance: {explained:.2%}")

    return matrix, user_factors, item_factors

user_item_matrix, user_factors, item_factors = train_cf()

if user_item_matrix is not None:
    print(f"[CF] Collaborative filtering ready ✅ — {user_item_matrix.shape[0]} users, {user_item_matrix.shape[1]} books")
else:
    print("[CF] Collaborative filtering not available — will use TF-IDF only")

# ===============================
# HELPERS
# ===============================
def get_user_books(user_id):
    print(f"[UserBooks] Fetching borrow history for user {user_id}...")
    q = """
    SELECT DISTINCT book_id
    FROM borrows
    WHERE user_id=%s AND status IN ('borrowed','returned')
    """
    res = pd.read_sql(q, engine, params=(user_id,))
    book_ids = res["book_id"].tolist()
    print(f"[UserBooks] User {user_id} has borrowed {len(book_ids)} distinct book(s): {book_ids}")
    return book_ids

def format_book(book_id, score, rec_type, reason):
    book = df[df["id"] == book_id]
    if book.empty:
        print(f"[Format] ⚠️  book_id {book_id} not found in df — skipping")
        return None

    b = book.iloc[0]

    return {
        "id": int(book_id),
        "title": b["title"],
        "author": b["author"],
        "section": b["section"],
        "subjects": b["subjects"],
        "cover_image": b["cover_image"] if pd.notna(b["cover_image"]) else None,
        "score": float(score),
        "type": rec_type,
        "reason": reason
    }

# ===============================
# TF-IDF FALLBACK
# ===============================
def fallback_recommend(user_id, top_n=5):
    print(f"[Fallback] Running TF-IDF fallback for user {user_id}, top_n={top_n}...")

    borrowed = get_user_books(user_id)
    if not borrowed:
        print(f"[Fallback] ⚠️  No borrow history for user {user_id} — returning empty")
        return []

    idxs = df[df["id"].isin(borrowed)].index.tolist()
    if not idxs:
        print(f"[Fallback] ⚠️  Borrowed book IDs not found in df for user {user_id} — returning empty")
        return []

    user_vec = np.asarray(tfidf_matrix[idxs].mean(axis=0)).ravel()
    sims = cosine_similarity([user_vec], tfidf_matrix)[0]
    ranked = np.argsort(sims)[::-1]

    results = []
    used = set()
    seen_titles = set()

    for i in ranked:
        book_id = int(df.iloc[i]["id"])
        title = df.iloc[i]["title"]
        base_title = normalize_title(title)

        if (
            book_id in borrowed or
            book_id in used or
            base_title in seen_titles
        ):
            continue

        rec = format_book(book_id, sims[i], "tfidf-fallback", "fallback similarity")
        if rec:
            results.append(rec)
            used.add(book_id)
            seen_titles.add(base_title)

        if len(results) >= top_n:
            break

    print(f"[Fallback] Returning {len(results)} fallback recs for user {user_id}")
    return results

# ===============================
# MAIN RECOMMENDER (HYBRID: TF-IDF + COLLABORATIVE)
# ===============================
def recommend_for_user(user_id, top_n=10, min_score=0.05, override_borrowed_ids=None):
    print(f"\n[Recommend] ── Starting recommendation for user {user_id}, top_n={top_n} ──")

    if override_borrowed_ids is not None:
        borrowed = override_borrowed_ids
        min_score = 0.0
        log("[EVAL MODE] Using training data")
        print(f"[Recommend] EVAL MODE — using {len(borrowed)} override borrowed IDs")
    else:
        borrowed = get_user_books(user_id)

    if not borrowed:
        print(f"[Recommend] ⚠️  User {user_id} has no borrow history — returning empty")
        return []

    idxs = df[df["id"].isin(borrowed)].index.tolist()
    if not idxs:
        print(f"[Recommend] ⚠️  None of user {user_id}'s borrowed books found in df — returning empty")
        return []

    print(f"[Recommend] Found {len(idxs)} borrowed book(s) in df for user {user_id}")

    results = []
    used = set()
    seen_titles = set()

    # ===========================
    # CONTENT-BASED (TF-IDF)
    # ===========================
    print(f"[Recommend] Running content-based (TF-IDF) phase...")

    user_vec = np.asarray(tfidf_matrix[idxs].mean(axis=0)).ravel()
    sims = cosine_similarity([user_vec], tfidf_matrix)[0]

    tfidf_target = int(top_n * 0.6)
    tfidf_added = 0

    for i in np.argsort(sims)[::-1]:

        book_id = int(df.iloc[i]["id"])
        title = df.iloc[i]["title"]
        base_title = normalize_title(title)

        if (
            book_id in borrowed or
            book_id in used or
            base_title in seen_titles
        ):
            continue

        if sims[i] < min_score:
            print(f"[Recommend] TF-IDF score {sims[i]:.4f} below min_score {min_score} — stopping TF-IDF phase")
            break

        rec = format_book(book_id, sims[i], "content-tfidf", "content similarity")
        if rec:
            results.append(rec)
            used.add(book_id)
            seen_titles.add(base_title)
            tfidf_added += 1
            print(f"[Recommend]   TF-IDF → \"{title}\" (score={sims[i]:.4f})")

        if len(results) >= tfidf_target:
            break

    print(f"[Recommend] TF-IDF phase done — added {tfidf_added} recs (target was {tfidf_target})")

    # ===========================
    # COLLABORATIVE (SVD)
    # ===========================
    if user_item_matrix is not None and user_id in user_item_matrix.index:
        print(f"[Recommend] Running collaborative filtering (SVD) phase...")

        uid = list(user_item_matrix.index).index(user_id)
        scores = np.dot(user_factors[uid], item_factors)

        ranked = sorted(
            zip(user_item_matrix.columns, scores),
            key=lambda x: x[1],
            reverse=True
        )

        cf_added = 0

        for book_id, score in ranked:

            if score < 0.01:
                print(f"[Recommend] SVD score {score:.4f} below 0.01 — stopping CF phase")
                break

            book_row = df[df["id"] == book_id]
            if book_row.empty:
                continue

            title = book_row.iloc[0]["title"]
            base_title = normalize_title(title)

            if (
                book_id in borrowed or
                book_id in used or
                base_title in seen_titles
            ):
                continue

            rec = format_book(book_id, score, "collaborative-ml", "SVD learning")
            if rec:
                results.append(rec)
                used.add(book_id)
                seen_titles.add(base_title)
                cf_added += 1
                print(f"[Recommend]   SVD → \"{title}\" (score={score:.4f})")

            if len(results) >= top_n:
                break

        print(f"[Recommend] CF phase done — added {cf_added} recs")
    else:
        if user_item_matrix is None:
            print(f"[Recommend] Skipping CF phase — user-item matrix not available")
        else:
            print(f"[Recommend] Skipping CF phase — user {user_id} not in user-item matrix")

    # ===========================
    # FALLBACK
    # ===========================
    if len(results) < top_n:
        print(f"[Recommend] Only {len(results)}/{top_n} recs so far — running TF-IDF fallback...")
        fb = fallback_recommend(user_id, top_n)
        fb_added = 0
        for r in fb:
            if r["id"] not in used:
                results.append(r)
                fb_added += 1
                print(f"[Recommend]   Fallback → \"{r['title']}\" (score={r['score']:.4f})")
            if len(results) >= top_n:
                break
        print(f"[Recommend] Fallback phase done — added {fb_added} recs")
    else:
        print(f"[Recommend] Skipping fallback — already have {len(results)} recs")

    print(f"[Recommend] ── Done for user {user_id}: returning {len(results)} recommendations ──\n")
    return results

# ===============================
# EVALUATION
# ===============================
def split_train_test(ratio=0.2):
    print(f"[Eval] Splitting train/test with ratio={ratio}...")
    data = pd.read_sql("SELECT user_id, book_id FROM borrows", engine)
    print(f"[Eval] Loaded {len(data)} borrow records for evaluation")

    groups = defaultdict(list)

    for _, r in data.iterrows():
        groups[r["user_id"]].append(r["book_id"])

    train, test = defaultdict(list), defaultdict(list)

    eligible = 0
    for u, books in groups.items():
        if len(books) < 5:
            continue
        eligible += 1
        random.shuffle(books)
        cut = int(len(books) * (1 - ratio))
        train[u] = books[:cut]
        test[u] = books[cut:]

    print(f"[Eval] {eligible} users eligible for evaluation (≥5 borrows)")
    return train, test


def precision_recall_at_k(user_id, train, test, k=3):

    train_books = set(train.get(user_id, []))
    test_books = set(test.get(user_id, []))

    if not train_books or not test_books:
        return None

    recs = recommend_for_user(user_id, k, override_borrowed_ids=list(train_books))
    rec_ids = [r["id"] for r in recs if r["id"] not in train_books]

    hits = len(set(rec_ids) & test_books)

    return hits / k, hits / len(test_books)


def evaluate(k=3):
    print(f"[Eval] Starting evaluation at k={k}...")
    train, test = split_train_test()

    p, r = [], []

    for u in test.keys():
        res = precision_recall_at_k(u, train, test, k)
        if res:
            p1, r1 = res
            p.append(p1)
            r.append(r1)

    if not p:
        print("[Eval] ⚠️  No users had enough data to evaluate")
        return {"Precision@K": 0, "Recall@K": 0}

    result = {
        "Precision@K": sum(p)/len(p),
        "Recall@K": sum(r)/len(r),
        "Users_Evaluated": len(p)
    }
    print(f"[Eval] Results: Precision@{k}={result['Precision@K']:.4f}, Recall@{k}={result['Recall@K']:.4f}, Users={result['Users_Evaluated']}")
    return result

# ===============================
# MAIN
# ===============================
if __name__ == "__main__":
    try:
        user_id = int(sys.argv[1])
        mode = sys.argv[2] if len(sys.argv) > 2 else "prod"

        print(f"[Main] Running in {'EVAL' if mode == 'eval' else 'PROD'} mode for user {user_id}")

        if mode == "eval":
            print(json.dumps(evaluate(k=3), indent=2))
        else:
            recs = recommend_for_user(user_id, top_n=10)
            print(json.dumps(recs, indent=2))

    except Exception as e:
        print(json.dumps({"error": str(e)}))