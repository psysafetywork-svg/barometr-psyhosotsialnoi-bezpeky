from pathlib import Path
import fitz,json,hashlib,math
from PIL import Image,ImageDraw
from openpyxl import load_workbook
root=Path(__file__).resolve().parents[1];p=root/'qa/profile-v45/review';out=p/'inspection';out.mkdir(exist_ok=True)
qa=[]
for pdf in sorted(p.glob('*.pdf')):
 d=fitz.open(pdf);pages=[];fonts=set();issues=[];embedded=True
 for i,page in enumerate(d):
  for f in page.get_fonts():fonts.add(f[3]);embedded=embedded and bool(d.extract_font(f[0])[3])
  for b in page.get_text('dict')['blocks']:
   if b['type']!=0:continue
   for l in b['lines']:
    for s in l['spans']:
     x0,y0,x1,y1=s['bbox']
     if x0 < -1 or y0 < -1 or x1>page.rect.width+1 or y1>page.rect.height+1:issues.append({'page':i+1,'text':s['text'],'bbox':s['bbox']})
  pix=page.get_pixmap(matrix=fitz.Matrix(.7,.7));pages.append(Image.frombytes('RGB',[pix.width,pix.height],pix.samples))
 for start in range(0,len(pages),6):
  group=pages[start:start+6];sheet=Image.new('RGB',(840,math.ceil(len(group)/2)*615),'#ccd0d3');draw=ImageDraw.Draw(sheet)
  for j,im in enumerate(group):
   x=(j%2)*420;y=(j//2)*615;sheet.paste(im,(x,y+22));draw.text((x+8,y+4),f'{pdf.stem}: page {start+j+1}',fill='black')
  sheet.save(out/f'{pdf.stem}-pages-{start+1}.jpg')
 assert embedded and not issues
 assert all('DejaVuSans' in f for f in fonts)
 qa.append({'file':pdf.name,'pages':len(d),'fonts':sorted(fonts),'all_fonts_embedded':embedded,'out_of_page_spans':issues})
for scenario in ['favorable','discrepancy','six_gaps','insufficient']:
 for width in [1440,390]:
  images=[]
  for m in range(1,8):
   im=Image.open(p/f'{scenario}-m{m}-{width}.png').convert('RGB');im.thumbnail((250,2500));images.append(im)
  h=max(im.height for im in images);sheet=Image.new('RGB',(7*260,h+25),'#ccd0d3');draw=ImageDraw.Draw(sheet)
  for j,im in enumerate(images):sheet.paste(im,(j*260,25));draw.text((j*260+8,4),f'{scenario} M{j+1} {width}',fill='black')
  sheet.save(out/f'{scenario}-{width}-all.jpg')
w=load_workbook(p/'edited-plan.xlsx',read_only=True);values=' '.join(str(v) for row in w.active.values for v in row)
for value in ['Користувацьке уточнення','Відповідальний за демонстрацію','2026-12-01','У роботі']:assert value in values
(p/'pdf-inspection.json').write_text(json.dumps(qa,ensure_ascii=False,indent=2)+'\n')
manifest={f.name:{'bytes':f.stat().st_size,'sha256':hashlib.sha256(f.read_bytes()).hexdigest()} for f in p.iterdir() if f.is_file() and f.suffix in ['.pdf','.png','.xlsx']}
(root/'qa/profile-v45/review-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps(qa,ensure_ascii=False))
