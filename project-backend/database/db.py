# =============================================================================
# database/db.py — SQLite Database Module
# แทน mock_db.py — ข้อมูลไม่หายเมื่อ restart server
# =============================================================================

import sqlite3
import json
import os
from pathlib import Path
from datetime import datetime
from typing import Optional
from contextlib import contextmanager

# =============================================================================
# CONFIG
# =============================================================================

DB_DIR = Path(__file__).resolve().parent
DB_PATH = DB_DIR / "fontai.db"
SCHEMA_PATH = DB_DIR / "schema.sql"


# =============================================================================
# CONNECTION MANAGER
# =============================================================================

def get_connection() -> sqlite3.Connection:
    """สร้าง connection พร้อม row_factory เป็น dict"""
    conn = sqlite3.connect(str(DB_PATH), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")      # เร็วขึ้น + อ่าน/เขียนพร้อมกันได้
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


@contextmanager
def get_db():
    """Context manager สำหรับใช้ connection แล้วปิดอัตโนมัติ"""
    conn = get_connection()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def dict_from_row(row) -> dict:
    """แปลง sqlite3.Row เป็น dict"""
    if row is None:
        return None
    return dict(row)


def init_db():
    """สร้าง tables ทั้งหมดจาก schema.sql (รันครั้งเดียวตอน startup)"""
    if not SCHEMA_PATH.exists():
        print(f"⚠️ Schema file not found: {SCHEMA_PATH}")
        return

    with get_db() as conn:
        schema_sql = SCHEMA_PATH.read_text(encoding="utf-8")
        conn.executescript(schema_sql)

        # === Migration: เพิ่มคอลัมน์ deep_insight ถ้ายังไม่มี ===
        cols = {r["name"] for r in conn.execute("PRAGMA table_info(audio_analyses)").fetchall()}
        if "deep_insight" not in cols:
            try:
                conn.execute("ALTER TABLE audio_analyses ADD COLUMN deep_insight TEXT DEFAULT '{}'")
                print("   🔧 Migration: added column audio_analyses.deep_insight")
            except Exception as e:
                print(f"   ⚠️ Migration failed for deep_insight: {e}")

    print(f"✅ Database initialized: {DB_PATH}")
    print(f"   Size: {DB_PATH.stat().st_size / 1024:.1f} KB")


# =============================================================================
# AUDIO FILES — CRUD
# =============================================================================

def save_audio_file(file_data: dict) -> dict:
    """บันทึกข้อมูลไฟล์เสียงใหม่"""
    with get_db() as conn:
        conn.execute("""
            INSERT OR REPLACE INTO audio_files
            (file_id, original_filename, uploaded_path, converted_path,
             customer_phone, agent_id, agent_name, call_direction,
             call_date, file_size_mb, status, file_hash, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            file_data["file_id"],
            file_data.get("original_filename", ""),
            file_data.get("uploaded_path", ""),
            file_data.get("converted_path", ""),
            file_data.get("customer_phone", "N/A"),
            file_data.get("agent_id", "N/A"),
            file_data.get("agent_name", ""),
            file_data.get("call_direction", "Unknown"),
            file_data.get("call_date"),
            file_data.get("file_size_mb", 0),
            file_data.get("status", "processing"),
            file_data.get("file_hash"),
            file_data.get("created_by"),
        ))
    return file_data


def get_audio_file_by_id(file_id: str) -> Optional[dict]:
    """ดึงข้อมูลไฟล์เสียงจาก file_id"""
    with get_db() as conn:
        row = conn.execute(
            "SELECT * FROM audio_files WHERE file_id = ?", (file_id,)
        ).fetchone()
    return dict_from_row(row)


def update_audio_file_status(file_id: str, status: str):
    """อัปเดตสถานะไฟล์"""
    with get_db() as conn:
        conn.execute(
            "UPDATE audio_files SET status = ?, updated_at = datetime('now','localtime') WHERE file_id = ?",
            (status, file_id)
        )


def delete_audio_file(file_id: str) -> bool:
    """ลบไฟล์เสียง + analysis ที่เกี่ยวข้อง"""
    with get_db() as conn:
        conn.execute("DELETE FROM audio_analyses WHERE file_id = ?", (file_id,))
        cursor = conn.execute("DELETE FROM audio_files WHERE file_id = ?", (file_id,))
    return cursor.rowcount > 0


def list_audio_files(
    search: str = None,
    brand: str = None,
    product: str = None,
    date_from: str = None,
    date_to: str = None,
    status: str = None,
    page: int = 1,
    per_page: int = 10,
) -> dict:
    """
    ดึงรายการไฟล์ทั้งหมด พร้อม analysis ล่าสุด + filter + pagination

    Returns: { total, page, per_page, total_pages, files: [...] }
    """
    with get_db() as conn:
        # Join audio_files กับ analysis ล่าสุด
        query = """
            SELECT
                f.file_id, f.original_filename, f.customer_phone, f.agent_id,
                f.agent_name, f.call_direction, f.call_date, f.status,
                a.sentiment, a.brand_names, a.product_category, a.intent,
                a.created_at as analysis_date
            FROM audio_files f
            LEFT JOIN (
                SELECT file_id, sentiment, brand_names, product_category, intent, created_at,
                       ROW_NUMBER() OVER (PARTITION BY file_id ORDER BY created_at DESC) as rn
                FROM audio_analyses
            ) a ON f.file_id = a.file_id AND a.rn = 1
            WHERE 1=1
        """
        params = []

        if search:
            query += """ AND (
                f.original_filename LIKE ?
                OR f.customer_phone LIKE ?
                OR f.agent_id LIKE ?
                OR COALESCE(a.brand_names, '') LIKE ?
                OR COALESCE(a.intent, '') LIKE ?
            )"""
            s = f"%{search}%"
            params.extend([s, s, s, s, s])

        if brand:
            query += " AND UPPER(COALESCE(a.brand_names,'')) LIKE UPPER(?)"
            params.append(f"%{brand}%")

        if product:
            query += " AND UPPER(COALESCE(a.product_category,'')) = UPPER(?)"
            params.append(product)

        if date_from:
            query += " AND f.call_date >= ?"
            params.append(date_from)

        if date_to:
            query += " AND SUBSTR(f.call_date, 1, 10) <= ?"
            params.append(date_to)

        if status:
            if status.upper() == "COMPLETE":
                query += " AND f.status = 'analyzed'"
            elif status.upper() == "PROCESSING":
                query += " AND f.status = 'processing'"
            elif status.upper() == "FAILED":
                query += " AND f.status = 'failed'"

        # Count total
        count_query = f"SELECT COUNT(*) as cnt FROM ({query})"
        total = conn.execute(count_query, params).fetchone()["cnt"]

        # Order + paginate
        query += " ORDER BY COALESCE(f.call_date, f.created_at) DESC LIMIT ? OFFSET ?"
        params.extend([per_page, (page - 1) * per_page])

        rows = conn.execute(query, params).fetchall()

    # Format results
    files = []
    for row in rows:
        r = dict_from_row(row)
        brand_names = _parse_json(r.get("brand_names", "[]"))
        file_status = r.get("status", "processing")

        files.append({
            "file_id": r["file_id"],
            "name": r["original_filename"],
            "customer": r["customer_phone"] or "N/A",
            "agent": r["agent_id"] or "N/A",
            "agent_name": r.get("agent_name", ""),
            "brand": ", ".join(brand_names) if brand_names else "",
            "brands": brand_names,
            "product": r.get("product_category", ""),
            "sentiment": (r.get("sentiment") or "NEUTRAL").upper(),
            "status": "COMPLETE" if file_status == "analyzed" else "FAILED" if file_status == "failed" else "PROCESSING",
            "date": r.get("call_date", ""),
            "call_direction": r.get("call_direction", ""),
        })

    total_pages = max(1, (total + per_page - 1) // per_page)

    return {
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": total_pages,
        "files": files,
    }


# =============================================================================
# AUDIO ANALYSES — CRUD
# =============================================================================

def save_analysis_result(analysis_data: dict) -> dict:
    """บันทึกผลวิเคราะห์ AI"""
    with get_db() as conn:
        cursor = conn.execute("""
            INSERT INTO audio_analyses
            (file_id, task_id, is_retest, transcript, corrected_transcript,
             audio_duration_seconds, sentiment, sentiment_score, intent,
             brand_names, product_category, sale_channel,
             qa_score, csat_score, summary_text, summary_points,
             key_insights, keywords, action_items, deep_insight, segments,
             model_version, pipeline_duration, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            analysis_data.get("file_id", ""),
            analysis_data.get("task_id", ""),
            1 if analysis_data.get("is_retest") else 0,
            analysis_data.get("transcript", ""),
            analysis_data.get("corrected_transcript", ""),
            analysis_data.get("audio_duration_seconds", 0),
            analysis_data.get("sentiment", "neutral"),
            analysis_data.get("sentiment_score", 0.5),
            analysis_data.get("intent", ""),
            json.dumps(analysis_data.get("brand_names", []), ensure_ascii=False),
            analysis_data.get("product_category", "Unknown"),
            analysis_data.get("sale_channel", "Unknown"),
            analysis_data.get("qa_score", 0),
            analysis_data.get("csat_predicted", analysis_data.get("csat_score", 0)),
            analysis_data.get("summary", analysis_data.get("summary_text", "")),
            json.dumps(analysis_data.get("summary_points", []), ensure_ascii=False),
            analysis_data.get("key_insights", ""),
            json.dumps(analysis_data.get("keywords", []), ensure_ascii=False),
            json.dumps(analysis_data.get("action_items", []), ensure_ascii=False),
            json.dumps(analysis_data.get("deep_insight", {}), ensure_ascii=False),
            json.dumps(analysis_data.get("transcription", analysis_data.get("segments", [])), ensure_ascii=False),
            analysis_data.get("model_version", ""),
            analysis_data.get("pipeline_duration", 0),
            analysis_data.get("created_by"),
        ))
        analysis_id = cursor.lastrowid

    analysis_data["analysis_id"] = str(analysis_id)
    analysis_data["created_at"] = datetime.now().isoformat()
    return analysis_data


def get_analysis_by_file_id(file_id: str) -> Optional[dict]:
    """ดึงผลวิเคราะห์ล่าสุดจาก file_id"""
    with get_db() as conn:
        row = conn.execute("""
            SELECT * FROM audio_analyses
            WHERE file_id = ?
            ORDER BY created_at DESC
            LIMIT 1
        """, (file_id,)).fetchone()

    if not row:
        return None

    r = dict_from_row(row)
    return _format_analysis(r)


def get_dashboard_stats() -> dict:
    """ดึงข้อมูล Dashboard ทั้งหมดใน query เดียว — A1, C1, C3, D1"""
    with get_db() as conn:
        # A1: KPI Cards
        total = conn.execute("SELECT COUNT(*) as cnt FROM audio_files").fetchone()["cnt"]
        analyzed = conn.execute("SELECT COUNT(*) as cnt FROM audio_files WHERE status='analyzed'").fetchone()["cnt"]
        processing = conn.execute("SELECT COUNT(*) as cnt FROM audio_files WHERE status='processing'").fetchone()["cnt"]
        failed = conn.execute("SELECT COUNT(*) as cnt FROM audio_files WHERE status='failed'").fetchone()["cnt"]

        # Sentiment counts (จาก analysis ล่าสุดของแต่ละไฟล์)
        sentiment_rows = conn.execute("""
            SELECT a.sentiment, COUNT(*) as cnt
            FROM audio_analyses a
            INNER JOIN (
                SELECT file_id, MAX(created_at) as max_created
                FROM audio_analyses GROUP BY file_id
            ) latest ON a.file_id = latest.file_id AND a.created_at = latest.max_created
            GROUP BY a.sentiment
        """).fetchall()
        sentiments = {"positive": 0, "neutral": 0, "negative": 0}
        for r in sentiment_rows:
            s = (r["sentiment"] or "neutral").lower()
            if s in sentiments:
                sentiments[s] = r["cnt"]

        # C1: Top Intents (ประเภทปัญหา)
        intent_rows = conn.execute("""
            SELECT a.intent, COUNT(*) as cnt
            FROM audio_analyses a
            INNER JOIN (
                SELECT file_id, MAX(created_at) as max_created
                FROM audio_analyses GROUP BY file_id
            ) latest ON a.file_id = latest.file_id AND a.created_at = latest.max_created
            WHERE a.intent IS NOT NULL AND a.intent != ''
            GROUP BY a.intent
            ORDER BY cnt DESC
            LIMIT 10
        """).fetchall()
        top_intents = [{"intent": r["intent"], "count": r["cnt"]} for r in intent_rows]

        # C3: Top Keywords
        keyword_rows = conn.execute("""
            SELECT a.keywords
            FROM audio_analyses a
            INNER JOIN (
                SELECT file_id, MAX(created_at) as max_created
                FROM audio_analyses GROUP BY file_id
            ) latest ON a.file_id = latest.file_id AND a.created_at = latest.max_created
            WHERE a.keywords IS NOT NULL AND a.keywords != '[]'
        """).fetchall()

        from collections import Counter
        keyword_counter = Counter()
        for r in keyword_rows:
            kws = _parse_json(r["keywords"])
            for kw in kws:
                if kw and kw.strip():
                    keyword_counter[kw.strip()] += 1
        top_keywords = [{"keyword": k, "count": c} for k, c in keyword_counter.most_common(20)]

        # D1: Daily Call Volume (ทั้งหมด — frontend เลือกเดือนเอง)
        daily_rows = conn.execute("""
            SELECT SUBSTR(f.call_date, 1, 10) as day,
                   COUNT(*) as total,
                   SUM(CASE WHEN a.sentiment = 'positive' THEN 1 ELSE 0 END) as positive,
                   SUM(CASE WHEN a.sentiment = 'neutral' THEN 1 ELSE 0 END) as neutral,
                   SUM(CASE WHEN a.sentiment = 'negative' THEN 1 ELSE 0 END) as negative
            FROM audio_files f
            LEFT JOIN (
                SELECT file_id, sentiment,
                       ROW_NUMBER() OVER (PARTITION BY file_id ORDER BY created_at DESC) as rn
                FROM audio_analyses
            ) a ON f.file_id = a.file_id AND a.rn = 1
            WHERE f.call_date IS NOT NULL
            GROUP BY day
            ORDER BY day ASC
        """).fetchall()
        daily_volume = [dict_from_row(r) for r in daily_rows]

        # E1: Agent Performance
        agent_rows = conn.execute("""
            SELECT f.agent_id,
                   COUNT(*) as total_calls,
                   ROUND(AVG(a.qa_score), 1) as avg_qa,
                   ROUND(AVG(a.csat_score), 1) as avg_csat,
                   SUM(CASE WHEN a.sentiment = 'positive' THEN 1 ELSE 0 END) as pos,
                   SUM(CASE WHEN a.sentiment = 'neutral' THEN 1 ELSE 0 END) as neu,
                   SUM(CASE WHEN a.sentiment = 'negative' THEN 1 ELSE 0 END) as neg
            FROM audio_files f
            LEFT JOIN (
                SELECT file_id, qa_score, csat_score, sentiment,
                       ROW_NUMBER() OVER (PARTITION BY file_id ORDER BY created_at DESC) as rn
                FROM audio_analyses
            ) a ON f.file_id = a.file_id AND a.rn = 1
            WHERE f.agent_id IS NOT NULL AND f.agent_id != 'N/A'
            GROUP BY f.agent_id
            ORDER BY total_calls DESC
        """).fetchall()
        agents = [dict_from_row(r) for r in agent_rows]

        # F1: Anomaly Detection (negative sentiment OR QA < 5)
        anomaly_rows = conn.execute("""
            SELECT f.file_id, f.original_filename, f.customer_phone, f.agent_id, f.call_date,
                   a.sentiment, a.qa_score, a.csat_score, a.key_insights
            FROM audio_files f
            LEFT JOIN (
                SELECT file_id, sentiment, qa_score, csat_score, key_insights,
                       ROW_NUMBER() OVER (PARTITION BY file_id ORDER BY created_at DESC) as rn
                FROM audio_analyses
            ) a ON f.file_id = a.file_id AND a.rn = 1
            WHERE a.sentiment = 'negative' OR a.qa_score < 5
            ORDER BY a.qa_score ASC
            LIMIT 10
        """).fetchall()
        anomalies = [dict_from_row(r) for r in anomaly_rows]

    return {
        "kpi": {
            "total_files": total,
            "analyzed": analyzed,
            "processing": processing,
            "failed": failed,
            "sentiments": sentiments,
        },
        "top_intents": top_intents,
        "top_keywords": top_keywords,
        "daily_volume": daily_volume,
        "agents": agents,
        "anomalies": anomalies,
    }


def get_all_analyses() -> list:
    """ดึงผลวิเคราะห์ทั้งหมด"""
    with get_db() as conn:
        rows = conn.execute("""
            SELECT * FROM audio_analyses ORDER BY created_at DESC
        """).fetchall()
    return [_format_analysis(dict_from_row(r)) for r in rows]


def get_filtered_analysis(
    brand: str = None,
    product: str = None,
    channel: str = None,
) -> list:
    """กรองผลวิเคราะห์ตาม brand / product / channel"""
    with get_db() as conn:
        query = "SELECT * FROM audio_analyses WHERE 1=1"
        params = []

        if brand:
            query += " AND UPPER(brand_names) LIKE UPPER(?)"
            params.append(f"%{brand}%")
        if product:
            query += " AND UPPER(product_category) = UPPER(?)"
            params.append(product)
        if channel:
            query += " AND UPPER(sale_channel) = UPPER(?)"
            params.append(channel)

        rows = conn.execute(query, params).fetchall()

    return [_format_analysis(dict_from_row(r)) for r in rows]


def get_available_brands() -> list:
    """ดึงรายชื่อแบรนด์ที่มี"""
    with get_db() as conn:
        rows = conn.execute("SELECT brand_name FROM brands ORDER BY brand_name").fetchall()
    return [r["brand_name"] for r in rows]


def get_available_products() -> list:
    """ดึงรายชื่อ product categories"""
    with get_db() as conn:
        rows = conn.execute("SELECT category_name FROM categories ORDER BY category_name").fetchall()
    return [r["category_name"] for r in rows]


def get_available_channels() -> list:
    """ดึงรายชื่อ channels"""
    with get_db() as conn:
        rows = conn.execute("SELECT channel_name FROM channels ORDER BY channel_name").fetchall()
    return [r["channel_name"] for r in rows]


# =============================================================================
# CUSTOMERS
# =============================================================================

def find_customer_by_id(customer_id) -> Optional[dict]:
    with get_db() as conn:
        row = conn.execute("SELECT * FROM customers WHERE customer_id = ?", (customer_id,)).fetchone()
    return dict_from_row(row)


def find_customer_by_phone(phone: str) -> Optional[dict]:
    with get_db() as conn:
        row = conn.execute("SELECT * FROM customers WHERE phone = ?", (phone,)).fetchone()
    return dict_from_row(row)


def list_customers(search: str = None) -> list:
    """ดึงรายชื่อลูกค้าทั้งหมด + search"""
    with get_db() as conn:
        query = "SELECT * FROM customers WHERE 1=1"
        params = []
        if search:
            query += " AND (first_name LIKE ? OR last_name LIKE ? OR phone LIKE ? OR email LIKE ?)"
            s = f"%{search}%"
            params.extend([s, s, s, s])
        query += " ORDER BY customer_id DESC"
        rows = conn.execute(query, params).fetchall()
    return [dict_from_row(r) for r in rows]


def get_customer_detail(customer_id: int) -> Optional[dict]:
    """ดึงข้อมูลลูกค้าครบ: info + address + warranty + ประวัติโทร"""
    customer = find_customer_by_id(customer_id)
    if not customer:
        return None

    with get_db() as conn:
        # Address
        addr_row = conn.execute(
            "SELECT * FROM addresses WHERE customer_id = ?", (customer_id,)
        ).fetchone()

        # Warranty registrations + product + brand + channel
        warranties = conn.execute("""
            SELECT w.*, p.model, p.size, p.sku, p.serial_no, p.label_no,
                   b.brand_name, c.category_name, ch.channel_name
            FROM warranty_registrations w
            LEFT JOIN products p ON w.product_id = p.product_id
            LEFT JOIN brands b ON p.brand_id = b.brand_id
            LEFT JOIN categories c ON p.category_id = c.category_id
            LEFT JOIN channels ch ON w.channel_id = ch.channel_id
            WHERE w.customer_id = ?
            ORDER BY w.created_at DESC
        """, (customer_id,)).fetchall()

        # ประวัติการโทร — match จากเบอร์โทร
        phone = customer.get("phone", "")
        call_history = []
        if phone:
            # format phone สำหรับ search (ทั้งแบบมี - และไม่มี)
            phone_clean = phone.replace("-", "")
            phone_dash = f"{phone_clean[:3]}-{phone_clean[3:6]}-{phone_clean[6:]}" if len(phone_clean) == 10 else phone

            rows = conn.execute("""
                SELECT f.file_id, f.original_filename, f.call_direction,
                       f.call_date, f.agent_id, f.status,
                       a.sentiment, a.brand_names, a.summary_text, a.key_insights
                FROM audio_files f
                LEFT JOIN (
                    SELECT file_id, sentiment, brand_names, summary_text, key_insights,
                           ROW_NUMBER() OVER (PARTITION BY file_id ORDER BY created_at DESC) as rn
                    FROM audio_analyses
                ) a ON f.file_id = a.file_id AND a.rn = 1
                WHERE f.customer_phone = ? OR f.customer_phone = ?
                ORDER BY f.call_date DESC
            """, (phone_clean, phone_dash)).fetchall()
            call_history = [dict_from_row(r) for r in rows]

    return {
        "customer": customer,
        "address": dict_from_row(addr_row) if addr_row else None,
        "warranties": [dict_from_row(w) for w in warranties],
        "call_history": call_history,
    }


def get_warranty_detail(registration_id: int) -> Optional[dict]:
    """ดึงข้อมูล warranty ครบ: warranty info + product + customer + address + proof + activities"""
    with get_db() as conn:
        # Warranty + Product + Brand + Category + Channel
        row = conn.execute("""
            SELECT w.*,
                   p.model, p.size, p.sku, p.serial_no, p.label_no,
                   b.brand_name, c.category_name, ch.channel_name
            FROM warranty_registrations w
            LEFT JOIN products p ON w.product_id = p.product_id
            LEFT JOIN brands b ON p.brand_id = b.brand_id
            LEFT JOIN categories c ON p.category_id = c.category_id
            LEFT JOIN channels ch ON w.channel_id = ch.channel_id
            WHERE w.registration_id = ?
        """, (registration_id,)).fetchone()

        if not row:
            return None

        warranty = dict_from_row(row)

        # Customer
        customer = conn.execute(
            "SELECT * FROM customers WHERE customer_id = ?",
            (warranty["customer_id"],)
        ).fetchone()

        # Address
        address = conn.execute(
            "SELECT * FROM addresses WHERE customer_id = ?",
            (warranty["customer_id"],)
        ).fetchone()

        # Proof of purchase
        proofs = conn.execute(
            "SELECT * FROM proof_of_purchase WHERE registration_id = ? ORDER BY uploaded_at DESC",
            (registration_id,)
        ).fetchall()

        # Activities
        activities_rows = conn.execute("""
            SELECT act.*, au.full_name as admin_name
            FROM activities act
            LEFT JOIN admin_users au ON act.admin_user_id = au.admin_user_id
            WHERE act.registration_id = ?
            ORDER BY act.created_at DESC
        """, (registration_id,)).fetchall()

    return {
        "warranty": warranty,
        "customer": dict_from_row(customer) if customer else None,
        "address": dict_from_row(address) if address else None,
        "proofs": [dict_from_row(p) for p in proofs],
        "activities": [dict_from_row(a) for a in activities_rows],
    }


# =============================================================================
# HELPERS
# =============================================================================

def _parse_json(value) -> list:
    """Parse JSON string → list อย่างปลอดภัย"""
    if isinstance(value, list):
        return value
    if not value:
        return []
    try:
        result = json.loads(value)
        return result if isinstance(result, list) else []
    except (json.JSONDecodeError, TypeError):
        return []


def _format_analysis(r: dict) -> dict:
    """Format analysis row เป็น dict ที่ frontend ใช้ได้"""
    brand_names = _parse_json(r.get("brand_names", "[]"))
    # parse deep_insight (เป็น dict ไม่ใช่ list)
    deep_insight_raw = r.get("deep_insight", "{}") or "{}"
    try:
        deep_insight = json.loads(deep_insight_raw) if isinstance(deep_insight_raw, str) else (deep_insight_raw if isinstance(deep_insight_raw, dict) else {})
    except (json.JSONDecodeError, TypeError):
        deep_insight = {}

    return {
        "analysis_id": str(r.get("analysis_id", "")),
        "file_id": r.get("file_id", ""),
        "task_id": r.get("task_id", ""),
        "is_retest": bool(r.get("is_retest", 0)),
        "transcript": r.get("transcript", ""),
        "corrected_transcript": r.get("corrected_transcript", ""),
        "audio_duration_seconds": r.get("audio_duration_seconds", 0),
        "sentiment": r.get("sentiment", "neutral"),
        "sentiment_score": r.get("sentiment_score", 0.5),
        "intent": r.get("intent", ""),
        "brand_name": brand_names[0] if brand_names else "Unknown",
        "brand_names": brand_names,
        "product_category": r.get("product_category", "Unknown"),
        "sale_channel": r.get("sale_channel", "Unknown"),
        "qa_score": r.get("qa_score", 0),
        "csat_score": r.get("csat_score", 0),
        "summary": r.get("summary_text", ""),
        "summary_text": r.get("summary_text", ""),
        "summary_points": _parse_json(r.get("summary_points", "[]")),
        "key_insights": r.get("key_insights", ""),
        "keywords": _parse_json(r.get("keywords", "[]")),
        "action_items": _parse_json(r.get("action_items", "[]")),
        "deep_insight": deep_insight if isinstance(deep_insight, dict) else {},
        "transcription": _parse_json(r.get("segments", "[]")),
        "segments": _parse_json(r.get("segments", "[]")),
        "model_version": r.get("model_version", ""),
        "pipeline_duration": r.get("pipeline_duration", 0),
        "created_at": r.get("created_at", ""),
    }


# =============================================================================
# STARTUP — สร้าง DB ตอน import
# =============================================================================

init_db()
