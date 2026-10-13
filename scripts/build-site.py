#!/usr/bin/env python3
"""Insert the editable page template into the self-contained HTML bundle."""

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BUNDLE = ROOT / "contxt.html"
TEMPLATE = ROOT / "src/contxt.template.html"


def build():
    bundle = BUNDLE.read_text(encoding="utf-8")
    template = TEMPLATE.read_text(encoding="utf-8")
    encoded = json.dumps(template, ensure_ascii=False).replace("</", "<\\u002F")
    pattern = r'(<script type="__bundler/template">\s*)([\s\S]*?)(\s*</script>)'
    bundle, count = re.subn(pattern, lambda match: match[1] + encoded + match[3], bundle)
    if count != 1:
        raise ValueError("Expected exactly one bundled page template")

    bundle = bundle.replace("<html>", '<html lang="ko">', 1)
    head = """<meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>CONTXT | 맥락으로 엮는 학습 콘텐츠</title>
  <meta name="description" content="흩어진 지식을 맥락으로 엮어 오래 남는 학습 콘텐츠를 만듭니다. CONTXT 회사 소개와 7단계 서비스, 채용 및 제휴 문의.">
  <link rel="canonical" href="https://contxt.im/">
  <meta name="theme-color" content="#0A0A0A">"""
    bundle, count = re.subn(
        r'<meta charset="utf-8">\s*(?:<meta name="viewport"[^>]*>\s*)?<title>[^<]*</title>(?:\s*<meta name="description"[^>]*>\s*<link rel="canonical"[^>]*>\s*<meta name="theme-color"[^>]*>)?',
        lambda _: head,
        bundle,
        count=1,
    )
    if count != 1:
        raise ValueError("Expected one outer bundle title")

    for output in (BUNDLE, ROOT / "index.html"):
        output.write_text(bundle, encoding="utf-8")
    (ROOT / "CNAME").write_text("contxt.im\n", encoding="utf-8")
    (ROOT / ".nojekyll").touch()
    print("Built contxt.html and index.html")


if __name__ == "__main__":
    build()
