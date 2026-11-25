import json,os,html
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4,landscape
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph
from reportlab.lib.styles import ParagraphStyle
d=json.load(open('tests/capture-data.json'))
os.makedirs('test-results/capture',exist_ok=True)
pdfmetrics.registerFont(TTFont('K','/usr/share/fonts/truetype/nanum/NanumGothic.ttf'))
W,H=landscape(A4)
c=canvas.Canvas('test-results/capture/pangyo-capture-reconstructed.pdf',pagesize=(W,H))
c.setTitle('판교 AIDC 캡처 전사 시험용 PDF — 원본 PDF 파일 아님')
c.setFillColorRGB(.11,.13,.18);c.rect(0,H-45,W,45,fill=1,stroke=0)
c.setFillColorRGB(1,1,1);c.setFont('K',15);c.drawString(20,H-28,'판교 AIDC | 신성이엔지 판교 사옥 B1 리모델링 GPU 데이터센터')
c.setFont('K',7);c.drawString(20,H-40,'최초자료 2026.06.30 · 기준일 2026.11.18 · 집중 추진 · 사업계획')
style=ParagraphStyle('body',fontName='K',fontSize=7.1,leading=10,wordWrap='CJK')
def para(t,x,y,w,size=None,color=None):
 s=style if size is None else ParagraphStyle('p',parent=style,fontSize=size,leading=size*1.4)
 p=Paragraph(html.escape(t).replace('\n','<br/>'),s);_,h=p.wrap(w,H);p.drawOn(c,x,y-h);return y-h-5
def heading(t,x,y,w):
 c.setStrokeColorRGB(.7,.7,.7);c.line(x,y-13,x+w,y-13)
 return para(t,x,y,w,8.5)-8
x1,x2,x3=22,210,520
w1,w2,w3=168,290,300
y=H-62;c.setFillColorRGB(.94,.95,.96);c.rect(x1-7,28,w1+14,H-85,fill=1,stroke=0)
c.setFillColorRGB(0,0,0)
y=heading('핵심 지표',x1,y,w1)
for label,value,note in d['metrics']:
 y=para(value,x1,y,w1,13);y=para(label+' · '+note,x1,y,w1,6.8)-4
y=heading('사업성 지표',x1,y,w1)
for label,value,note in d['fin']:
 y=para(value,x1,y,w1,13);y=para(label+' · '+note,x1,y,w1,6.8)-4
print('LEFT_BOTTOM',y)
y=H-62
for title,text in [('사업 개요',d['overview']),('입지 및 전력 인프라',d['infra']),('사업 구조 및 수익 모델',d['finance']),('추진 현황 및 주요 특성',d['status'])]:
 y=heading(title,x2,y,w2);y=para(text,x2,y,w2)
print('CENTER_BOTTOM',y)
y=heading('사업 개요',x3,H-62,w3)
for label,value in d['rows']:y=para(label+' | '+value,x3,y,w3,6.7)
y=heading('추진 일정',x3,y,w3)
for row in d['schedule']:y=para(' | '.join(row),x3,y,w3,6.7)
y=heading('주요 리스크 및 검토사항',x3,y,w3);y=para(d['risk'],x3,y,w3,6.7)
print('RIGHT_BOTTOM',y)
assert y>15,'content overflow'
c.setFont('K',6);c.drawString(22,12,'사용자 제공 캡처를 전사·재구성한 업로드 시험용 PDF. 원본 PDF와 동일한 파일이 아님.')
c.save()
