import os,json,base64
from pathlib import Path
import fitz
from PIL import Image,ImageOps,ImageDraw
from openpyxl import load_workbook
out=Path(os.environ['BAROMETER_QA_OUTPUT'])
plan=json.loads((out/'plan-examples.json').read_text())
wb=load_workbook(out/'organisational-plan.xlsx',data_only=True)
rows=list(wb.active.values)
assert len(rows)==len(plan)+1
for row,a in zip(rows[1:],plan):
    assert row[0]=='Компанія загалом'
    assert row[3]==a['action']
    assert row[4]==a['description']
    assert row[8]==a['indicator']
pages_summary={}
for name in ['p-only','p-plus-e','p-plus-l','p-plus-e-plus-l']:
    doc=fitz.open(out/(name+'-report.pdf'))
    texts=[p.get_text() for p in doc]
    assert len(doc)>=3
    assert all(len(t.strip())>100 for t in texts), 'Blank page '+name
    assert sum('Як читати карту і статуси.' in t for t in texts)==1
    if name=='p-only': assert 'Результати організаційного чекапу' in texts[0]
    for p in doc:
        for word in p.get_text('words'):
            assert word[0]>=-1 and word[2]<=p.rect.width+1 and word[1]>=-1 and word[3]<=p.rect.height+1, (name,p.number,word)
    pages_summary[name]={'pages':len(doc),'methodologyPage':next(i+1 for i,t in enumerate(texts) if 'Як читати карту і статуси.' in t)}
    thumb=[]
    for i,p in enumerate(doc):
        pix=p.get_pixmap(matrix=fitz.Matrix(1000/p.rect.width,1000/p.rect.width))
        im=Image.frombytes('RGB',[pix.width,pix.height],pix.samples)
        im.save(out/(name+'-page-'+str(i+1)+'.png'))
        small=im.copy();small.thumbnail((400,580));tile=Image.new('RGB',(420,610),'#e8e8e8');tile.paste(small,(10,25));ImageDraw.Draw(tile).text((10,7),name+' / '+str(i+1),fill='black');thumb.append(tile)
        if 'Як читати карту і статуси.' in texts[i]:
            preview=out/(name+'-methodology.jpg');im.save(preview,quality=80)
            print('REVIEW_IMAGE '+json.dumps({'name':preview.name,'data':base64.b64encode(preview.read_bytes()).decode()}))
    cols=min(3,len(thumb));nrows=(len(thumb)+cols-1)//cols
    contact=Image.new('RGB',(cols*420,nrows*610),'white')
    for i,im in enumerate(thumb):contact.paste(im,((i%cols)*420,(i//cols)*610))
    cp=out/(name+'-contact.jpg');contact.save(cp,quality=80)
    print('REVIEW_IMAGE '+json.dumps({'name':cp.name,'data':base64.b64encode(cp.read_bytes()).decode()}))
summary=json.loads((out/'corrective-qa-results.json').read_text())
summary['pdfs']=pages_summary;summary['xlsx']='PASS: exact title, full description and outcome for three actual exported Plan rows';summary['pdfBounds']='PASS';summary['visualReview']='Pending human/model inspection of rendered pages'
(out/'corrective-qa-results.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2))
print('PDF_REVIEW_RESULTS '+json.dumps(pages_summary))
