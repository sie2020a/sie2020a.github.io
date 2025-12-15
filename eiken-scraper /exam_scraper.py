from __future__ import annotations
import os, re, csv, json, time, io
from dataclasses import dataclass, asdict
from typing import List, Dict, Optional, Tuple
from urllib.parse import urlparse, urljoin
import requests
from bs4 import BeautifulSoup
from pdfminer.high_level import extract_text as pdf_extract_text
from urllib import robotparser
from urllib3.util.retry import Retry
from requests.adapters import HTTPAdapter
from dotenv import load_dotenv

# ====== 設定（ここを自分用に編集） ======
ALLOWED_DOMAINS = [
    # 例：公式・配布OKを自分で確認した上で入れる
    # "https://www.eiken.or.jp/eiken/exam/",         # ←例（実際の可否は自分で規約確認）
    # "www.mhlw.go.jp",          # ←例：官公庁PDFなど
    # "www.pmda.go.jp",          # ←例
]
SEARCH_QUERIES = {
    "eiken": ["英検 過去問 PDF", "英検 サンプル 問題"],
    "pharmacist": ["薬剤師 国家試験 過去問 PDF", "薬剤師 国家試験 問題 解答"],
}
OUTPUT_DIR = "output"
RATE_LIMIT_SEC = 1.0
USER_AGENT = "ExamScraper/1.0 (+honest-use; respect robots.txt)"
USE_BING = True  # 検索にBing APIを使うなら True

# ====== 低レイヤ：HTTP/robots ======
session = requests.Session()
retry = Retry(total=3, backoff_factor=0.5, status_forcelist=[429, 500, 502, 503, 504])
session.mount("https://", HTTPAdapter(max_retries=retry))
session.mount("http://", HTTPAdapter(max_retries=retry))
session.headers.update({"User-Agent": USER_AGENT})

robots_cache: Dict[str, robotparser.RobotFileParser] = {}

def can_fetch(url: str, ua: str = USER_AGENT) -> bool:
    netloc = urlparse(url).netloc
    if netloc not in robots_cache:
        rp = robotparser.RobotFileParser()
        robots_url = f"{urlparse(url).scheme}://{netloc}/robots.txt"
        try:
            rp.set_url(robots_url)
            rp.read()
        except Exception:
            # robots取得失敗したら慎重に：許可を取れていないなら中止
            return False
        robots_cache[netloc] = rp
    return robots_cache[netloc].can_fetch(ua, url)

def allowed_domain(url: str) -> bool:
    netloc = urlparse(url).netloc
    return any(netloc == d or netloc.endswith("." + d) for d in ALLOWED_DOMAINS)

def http_get(url: str) -> Optional[requests.Response]:
    if not allowed_domain(url):
        print(f"[SKIP] not in ALLOWED_DOMAINS: {url}")
        return None
    if not can_fetch(url):
        print(f"[SKIP] robots.txt disallow: {url}")
        return None
    time.sleep(RATE_LIMIT_SEC)
    try:
        r = session.get(url, timeout=20)
        if r.status_code == 200:
            return r
        print(f"[WARN] HTTP {r.status_code}: {url}")
    except Exception as e:
        print(f"[ERR] GET fail {url}: {e}")
    return None

# ====== 検索（Bing API推奨／自分のキーが必要） ======
def bing_search(query: str, count: int = 20) -> List[str]:
    key = os.getenv("BING_API_KEY")
    if not key:
        print("[INFO] BING_API_KEYなし。SEARCHをスキップ。")
        return []
    url = "https://api.bing.microsoft.com/v7.0/search"
    params = {"q": query, "count": count, "responseFilter": "Webpages"}
    headers = {"Ocp-Apim-Subscription-Key": key}
    try:
        resp = session.get(url, params=params, headers=headers, timeout=20)
        resp.raise_for_status()
        data = resp.json()
        items = data.get("webPages", {}).get("value", [])
        return [it["url"] for it in items if "url" in it]
    except Exception as e:
        print(f"[ERR] bing search: {e}")
        return []

# ====== パース：テキスト → 問題ブロック抽出 ======
@dataclass
class QAItem:
    exam: str
    source_url: str
    q_number: Optional[str]
    question: str
    choices: List[str]
    answer: Optional[str]

Q_BLOCK_RE = re.compile(
    r"(?:第?\s*(\d{1,3})\s*問|問\s*(\d{1,3}))\s*(.+?)(?=(?:第?\s*\d{1,3}\s*問|問\s*\d{1,3}|^\Z))",
    re.DOTALL | re.MULTILINE
)

def split_choices(block: str) -> Tuple[str, List[str], Optional[str]]:
    lines = [l.strip() for l in block.splitlines() if l.strip()]
    # 選択肢候補：ア〜エ／A〜D／1〜5 など
    choice_lines = []
    q_lines = []
    answer = None
    for ln in lines:
        if re.match(r"^[ア-エ]\s*[:．.\)]\s*", ln) or \
           re.match(r"^[A-D]\s*[:．.\)]\s*", ln) or \
           re.match(r"^[①-⑤]\s*", ln) or \
           re.match(r"^(?:[1-5])\s*[:．.\)]\s*", ln):
            choice_lines.append(ln)
        elif re.search(r"(解答|正解)\s*[:： ]\s*(.+)", ln):
            m = re.search(r"(解答|正解)\s*[:： ]\s*(.+)", ln)
            answer = m.group(2).strip() if m else None
        else:
            q_lines.append(ln)
    question = "\n".join(q_lines).strip()
    return question, choice_lines, answer

def parse_questions(text: str, exam: str, url: str) -> List[QAItem]:
    items: List[QAItem] = []
    for m in Q_BLOCK_RE.finditer(text):
        qnum = m.group(1) or m.group(2)
        block = m.group(3).strip()
        question, choices, answer = split_choices(block)
        if not question:
            continue
        items.append(QAItem(
            exam=exam, source_url=url, q_number=qnum, question=question, choices=choices, answer=answer
        ))
    # もし「問◯」が無い資料なら、全体を1問として雑に拾う（任意）
    if not items:
        clean = re.sub(r"\n{3,}", "\n\n", text).strip()
        if len(clean) > 200:  # 短すぎるページは除外
            items.append(QAItem(exam=exam, source_url=url, q_number=None,
                                question=clean[:3000], choices=[], answer=None))
    return items

# ====== コンテンツ取得（HTML/PDF） ======
def extract_text_from_response(resp: requests.Response) -> Optional[str]:
    ctype = resp.headers.get("Content-Type", "")
    if "application/pdf" in ctype or resp.url.lower().endswith(".pdf"):
        try:
            return pdf_extract_text(io.BytesIO(resp.content))
        except Exception as e:
            print(f"[ERR] PDF parse: {resp.url} {e}")
            return None
    else:
        soup = BeautifulSoup(resp.text, "html.parser")
        # ナビなどを緩く除外
        for tag in soup(["nav", "header", "footer", "script", "style"]):
            tag.decompose()
        return soup.get_text("\n")

# ====== 収集フロー ======
def dedupe_urls(urls: List[str]) -> List[str]:
    seen = set()
    out = []
    for u in urls:
        if u not in seen:
            seen.add(u); out.append(u)
    return out

def collect_urls() -> List[str]:
    urls: List[str] = []
    if USE_BING:
        for exam, qs in SEARCH_QUERIES.items():
            for q in qs:
                # 許可ドメインだけ拾いたい場合、クエリに site: を併用
                for dom in ALLOWED_DOMAINS:
                    q2 = f"{q} site:{dom}"
                    urls += bing_search(q2, count=20)
    return dedupe_urls(urls)

def run():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    load_dotenv()

    urls = collect_urls()
    print(f"[INFO] candidate urls: {len(urls)}")

    results: List[QAItem] = []
    for url in urls:
        if not allowed_domain(url):
            continue
        resp = http_get(url)
        if not resp: 
            continue
        text = extract_text_from_response(resp)
        if not text:
            continue

        # exam種別はクエリ発見元などで本当は分けるべき。ここは簡易推定。
        exam = "pharmacist" if "薬剤師" in text or "国家試験" in text else "eiken" if "英検" in text else "unknown"

        items = parse_questions(text, exam, resp.url)
        if items:
            results.extend(items)
            print(f"[OK] {resp.url} -> {len(items)} items")

    # 出力
    csv_path = os.path.join(OUTPUT_DIR, "questions.csv")
    jsonl_path = os.path.join(OUTPUT_DIR, "questions.jsonl")
    with open(csv_path, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["exam","source_url","q_number","question","choices","answer"])
        for it in results:
            w.writerow([it.exam, it.source_url, it.q_number, it.question, " | ".join(it.choices), it.answer or ""])

    with open(jsonl_path, "w", encoding="utf-8") as f:
        for it in results:
            f.write(json.dumps(asdict(it), ensure_ascii=False) + "\n")

    print(f"[DONE] saved: {csv_path} ({len(results)} items), {jsonl_path}")

if __name__ == "__main__":
    run()
