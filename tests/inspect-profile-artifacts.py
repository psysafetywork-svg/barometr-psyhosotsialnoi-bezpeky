import json,os,re
from pathlib import Path
import fitz
from PIL import Image,ImageDraw
from openpyxl import load_workbook
out=Path(os.environ['BAROMETER_PROFILE_OUTPUT']);norm=lambda s:re.sub(r'\s+',' ',s).strip();approved=json.loads(Path('tests/fixtures/profile-approved-copy.json').read_text());diagnostic=json.loads((out/'profile-diagnostic-copy.json').read_text());result={'status':'PASS','pdf':{},'xlsx':{},'upgrade':'PASS'}
for p in sorted(out.glob('*.pdf')):
 doc=fitz.open(p);texts=[page.get_text() for page in doc];text=norm(' '.join(texts));assert all(len(t.strip())>60 for t in texts),(p.name,'blank page')
 for page in doc:
  for w in page.get_text('words'):assert w[0]>=-1 and w[1]>=-1 and w[2]<=page.rect.width+1 and w[3]<=page.rect.height+1,(p.name,page.number,w)
 last=norm(texts[-1]);assert not(len(doc)>1 and last.startswith('Використання результатів.')),(p.name,'orphan usage-only final page')
 if p.stem=='profile-p-only':
  assert len(doc)<=5,(p.name,'expanded recommendation pagination leaves avoidable extra page')
  assert 'PRIVATE_PROFILE_NOTE' not in text
  for code in ['P35','P38']:
   for para in approved[code]['steps']:assert norm(para) in text,(p.name,code,para)
   assert norm(approved[code]['check']) in text,(p.name,code,'outcome')
  assert norm(approved['P38']['conclusion']) in text
 for code in ['E20','E31']:
  on=p.stem in ['profile-elp','elp-'+code]
  assert (norm(diagnostic[code]) in text)==on,(p.name,code,'full diagnostic text')
 words=doc[-1].get_text('words');span=max(w[3] for w in words)-min(w[1] for w in words)
 result['pdf'][p.name]={'pages':len(doc),'charactersOnLastPage':len(last),'lastPageTextSpanPoints':round(span,1),'usageOnlyFinalPage':False,'textWithinPage':True,'noBlankPages':True}
 thumbs=[]
 for i,page in enumerate(doc):
  pix=page.get_pixmap(matrix=fitz.Matrix(1.25,1.25),alpha=False);im=Image.frombytes('RGB',[pix.width,pix.height],pix.samples)
  if p.stem in ['profile-p-only','profile-elp']:im.save(out/(p.stem+'-page-'+str(i+1)+'.png'))
  if i==len(doc)-1:im.save(out/(p.stem+'-last-page.png'))
  im.thumbnail((350,500));tile=Image.new('RGB',(370,530),'#e8ece6');tile.paste(im,(10,24));ImageDraw.Draw(tile).text((10,6),p.stem+' / '+str(i+1),fill='#193831');thumbs.append(tile)
 cols=min(3,len(thumbs));sheet=Image.new('RGB',(cols*370,((len(thumbs)+cols-1)//cols)*530),'white')
 for i,im in enumerate(thumbs):sheet.paste(im,((i%cols)*370,(i//cols)*530))
 sheet.save(out/(p.stem+'-contact.png'))
state=json.loads((out/'profile-plan-state.json').read_text());period=next(p for p in state['periods'] if p['id']==state['current']);plan=[a for a in state['plan'] if a['periodId']==state['current']];rows=list(load_workbook(out/'profile-plan.xlsx',data_only=True).active.values)[1:];expected=[]
for a in plan:
 scope=next(e['name'] for e in period['envs'] if e['id']==a['envId']) if a.get('envId') else 'Компанія загалом';expected.append([scope]+[a.get(k) or '' for k in ['module','aspect','action','description','priority','owner','due','indicator','status']])
assert [[x if x is not None else '' for x in row] for row in rows]==expected
assert len(rows)==5;result['xlsx']={'rows':5,'allTenColumnsEqual':True}
assert json.loads((out/'upgrade-before.json').read_text())==json.loads((out/'upgrade-after.json').read_text())
(out/'profile-artifact-validation.json').write_text(json.dumps(result,ensure_ascii=False,indent=2));print(json.dumps(result,ensure_ascii=False))
