# -*- coding: utf-8 -*-
from io import BytesIO
from pathlib import Path

from pypdf import PdfReader, PdfWriter
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parents[2]
PDF_PATH = ROOT / "output" / "pdf" / "kbo-talk-app-portfolio.pdf"
TMP_PATH = ROOT / "output" / "pdf" / "kbo-talk-app-portfolio.tmp.pdf"

pdfmetrics.registerFont(TTFont("Malgun", r"C:\Windows\Fonts\malgun.ttf"))
pdfmetrics.registerFont(TTFont("Malgun-Bold", r"C:\Windows\Fonts\malgunbd.ttf"))

PAGE_W, PAGE_H = landscape(A4)
NAVY = colors.HexColor("#071A3D")
RED = colors.HexColor("#D71920")
SOFT = colors.HexColor("#F6F8FC")
WHITE = colors.white

HEADINGS = {
    1: "01. 문제 정의와 기획 방향",
    2: "02. 웹 게시판 MVP",
    3: "03. 모바일 앱형 UX",
    4: "04. 기록실과 뉴스",
    5: "05. AI 기능과 기술 구조",
    6: "06. 제출 링크와 요약",
}


def make_overlay(page_index: int):
    packet = BytesIO()
    c = canvas.Canvas(packet, pagesize=landscape(A4))

    bg = SOFT if page_index == 6 else WHITE
    c.setFillColor(bg)
    c.rect(15 * mm, 153 * mm, 185 * mm, 48 * mm, stroke=0, fill=1)

    c.setFont("Malgun-Bold", 25)
    c.setFillColor(NAVY)
    c.drawString(18 * mm, 174 * mm, HEADINGS[page_index])

    c.setFillColor(RED)
    c.rect(18 * mm, 166.5 * mm, 22 * mm, 1.6 * mm, stroke=0, fill=1)

    c.save()
    packet.seek(0)
    return PdfReader(packet).pages[0]


reader = PdfReader(str(PDF_PATH))
writer = PdfWriter()

for index, page in enumerate(reader.pages):
    if index in HEADINGS:
        page.merge_page(make_overlay(index))
    writer.add_page(page)

with TMP_PATH.open("wb") as output:
    writer.write(output)

TMP_PATH.replace(PDF_PATH)
print(PDF_PATH)
