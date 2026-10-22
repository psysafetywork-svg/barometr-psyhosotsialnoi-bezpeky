import json,os,re
from pathlib import Path
import fitz
from openpyxl import load_workbook
from PIL import Image,ImageDraw
out=Path(os.environ['BAROMETER_FINAL_OUTPUT']);results={'pdf':{},'xlsx':{},'status':'PASS'}
normalize=lambda s:re.sub(r'\s+',' ',s).strip()
copy=json.loads((out/'approved-diagnostic-texts.json').read_text())
for p in sorted(out.glob('*.pdf')):
 doc=fitz.open(p);texts=[page.get_text() for page in doc];text=normalize(' '.join(texts))
 assert len(doc)>0 and all(len(t.strip())>60 for t in texts),p.name+' empty page'
 for page in doc:
  for w in page.get_text('words'):
   assert w[0]>=-1 and w[1]>=-1 and w[2]<=page.rect.width+1 and w[3]<=page.rect.height+1,(p.name,page.number,w)
 if p.stem.startswith('diagnostic-'):
  which=p.stem.removeprefix('diagnostic-')
  for code in ['E20','E31']:
   expected=which in ['both',code]
   assert (normalize(copy[code]) in text)==expected,(p.name,code,'full approved text mismatch')
 if p.stem=='p-only-analytical-profile':
  assert 'Результати організаційного чекапу' in text
  assert 'PRIVATE_NOTE_DO_NOT_EXPORT' not in text
 if p.stem.startswith('C01-'):
  ids=json.loads((out/('C01-all-codes.json' if p.stem=='C01-all-no' else 'C01-two-codes.json')).read_text())
  assert all(code+':' in text for code in ids),(p.name,ids)
 results['pdf'][p.name]={'pages':len(doc),'noBlankPages':True,'textWithinPage':True}
 # Contact sheets use real rendered pages, with no synthetic reconstruction.
 if p.stem in ['p-only-analytical-profile','diagnostic-both','C01-P05-P29','C01-all-no']:
  thumbs=[]
  for i,page in enumerate(doc):
   pix=page.get_pixmap(matrix=fitz.Matrix(1.1,1.1),alpha=False)
   im=Image.frombytes('RGB',[pix.width,pix.height],pix.samples)
   if p.stem in ['p-only-analytical-profile','diagnostic-both']:
    im.save(out/(p.stem+'-page-'+str(i+1)+'.png'))
   im.thumbnail((350,500));tile=Image.new('RGB',(370,530),'#e8ece6');tile.paste(im,(10,24));ImageDraw.Draw(tile).text((10,6),p.stem+' / '+str(i+1),fill='#193831');thumbs.append(tile)
  cols=min(3,len(thumbs));sheet=Image.new('RGB',(cols*370,((len(thumbs)+cols-1)//cols)*530),'white')
  for i,im in enumerate(thumbs):sheet.paste(im,((i%cols)*370,(i//cols)*530))
  sheet.save(out/(p.stem+'-contact.png'))
state=json.loads((out/'p-only-state.json').read_text());period=next(p for p in state['periods'] if p['id']==state['current']);plan=[a for a in state['plan'] if a['periodId']==state['current']]
rows=list(load_workbook(out/'p-only-plan.xlsx',data_only=True).active.values)[1:]
expected=[]
for a in plan:
 scope=next(e['name'] for e in period['envs'] if e['id']==a['envId']) if a.get('envId') else 'Компанія загалом'
 expected.append([scope]+[a.get(k) or '' for k in ['module','aspect','action','description','priority','owner','due','indicator','status']])
actual=[[x if x is not None else '' for x in r] for r in rows];assert actual==expected,(actual,expected)
results['xlsx']['p-only-plan.xlsx']={'rows':len(rows),'allTenColumnsEqual':True}
for name in ['criterion','partial-composite','old-composite']:
 before=json.loads((out/(name+'-before.json')).read_text());after=json.loads((out/(name+'-after.json')).read_text());assert after['plan'][0]==before['plan'][0];assert len(after['plan'])==len(before['plan'])+1
results['legacyRecords']='PASS: exact old record equality in all three actual browser upgrade scenarios'
(out/'artifact-validation.json').write_text(json.dumps(results,ensure_ascii=False,indent=2));print(json.dumps(results,ensure_ascii=False))
