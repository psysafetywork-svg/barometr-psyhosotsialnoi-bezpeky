from pathlib import Path
import os,re,json
import fitz
from PIL import Image,ImageDraw
from openpyxl import load_workbook
out=Path(os.environ['BAROMETER_UI_OUTPUT']);norm=lambda s:re.sub(r'\s+',' ',s).strip();expected=json.loads(Path('tests/fixtures/profile-approved-copy.json').read_text());diag=json.loads((out/'ui-diagnostic-copy.json').read_text());result={'status':'PASS','pdf':{},'xlsx':{},'upgrade':'PASS'}
for p in sorted(out.glob('*.pdf')):
 d=fitz.open(p);texts=[x.get_text()for x in d];text=norm(' '.join(texts));assert all(len(t.strip())>60 for t in texts),(p.name,'blank page');last=norm(texts[-1]);assert not(len(d)>1 and last.startswith('Використання результатів.')),(p.name,'orphan usage');words=d[-1].get_text('words');span=max(w[3]for w in words)-min(w[1]for w in words);assert len(d)==1 or span>=150,(p.name,'nearly empty final page',span)
 for page in d:
  for w in page.get_text('words'):assert w[0]>=-1 and w[1]>=-1 and w[2]<=page.rect.width+1 and w[3]<=page.rect.height+1,(p.name,page.number,w)
 html=(out/(p.stem+'.html')).read_text();method=norm(re.search(r'id="report-methodology"[^>]*>([\s\S]*?)</div>',html)[1]);eligible=any(x in p.stem for x in ['ui-E20','ui-E31','ui-elp-main','ui-neither','ui-C01','ui-e-only','ui-l-only'])
 for n in ['75%','15%','30%','55%']:assert (n in method)==eligible,(p.name,n)
 if p.stem=='ui-e-only':assert '20 валідних' in method and '10 валідних' not in method
 if p.stem=='ui-l-only':assert '10 валідних' in method and '20 валідних' not in method
 if p.stem in ['ui-p-only-main','ui-all-transitions']:
  for code in ['P35','P38']:
   for para in expected[code]['steps']:assert norm(para)in text,(p.name,code,para)
   assert norm(expected[code]['check'])in text,(p.name,code,'full outcome')
  assert norm(expected['P38']['conclusion'])in text
 for code in ['E20','E31']:
  on=p.stem in ['ui-elp-main','ui-'+code]
  assert (norm(diag[code])in text)==on,(p.name,code)
 assert 'PRIVATE_UI_NOTE' not in text
 layout=json.loads((out/(p.stem+'-layout.json')).read_text());assert all(x['marginTop']=='30px'and x['paddingTop']=='18px'and x['borderTop']=='1px' for x in layout)
 result['pdf'][p.name]={'pages':len(d),'lastPageTextSpanPoints':round(span,1),'lastPageCharacters':len(last),'noBlankOrNearlyEmptyFinalPage':True,'textWithinPage':True,'moduleSpacing':'30px + 18px, 1px rule'}
 thumbs=[]
 for i,page in enumerate(d):
  pix=page.get_pixmap(matrix=fitz.Matrix(1.25,1.25),alpha=False);im=Image.frombytes('RGB',[pix.width,pix.height],pix.samples)
  if p.stem in ['ui-p-only-main','ui-elp-main','ui-all-transitions']:im.save(out/(p.stem+'-page-'+str(i+1)+'.png'))
  if i==len(d)-1:im.save(out/(p.stem+'-last-page.png'))
  im.thumbnail((350,500));tile=Image.new('RGB',(370,530),'#e8ece6');tile.paste(im,(10,24));ImageDraw.Draw(tile).text((10,6),p.stem+' / '+str(i+1),fill='#193831');thumbs.append(tile)
 cols=min(3,len(thumbs));sheet=Image.new('RGB',(cols*370,((len(thumbs)+cols-1)//cols)*530),'white')
 for i,im in enumerate(thumbs):sheet.paste(im,((i%cols)*370,(i//cols)*530))
 sheet.save(out/(p.stem+'-contact.png'))
state=json.loads((out/'ui-plan-state.json').read_text());period=next(p for p in state['periods']if p['id']==state['current']);plan=[a for a in state['plan']if a['periodId']==state['current']];rows=list(load_workbook(out/'ui-plan.xlsx',data_only=True).active.values)[1:];expectedRows=[]
for a in plan:
 scope=next(e['name']for e in period['envs']if e['id']==a['envId'])if a.get('envId')else 'Компанія загалом';expectedRows.append([scope]+[a.get(k)or ''for k in ['module','aspect','action','description','priority','owner','due','indicator','status']])
assert [[x if x is not None else ''for x in row]for row in rows]==expectedRows;assert len(rows)==6
before=json.loads((out/'ui-upgrade-before.json').read_text());after=json.loads((out/'ui-upgrade-after.json').read_text());assert before==after;assert state['plan'][0]==before['plan'][0];new=next(x for x in state['plan']if x.get('sourceTarget')=='PRACTICE:P32');assert 'та оцініть результат' in new['description'];assert 'і оцінити результат' in state['plan'][0]['description'];result['xlsx']={'rows':6,'allTenColumnsEqual':True,'oldP32Unchanged':True,'newP32Correct':True};(out/'ui-artifact-validation.json').write_text(json.dumps(result,ensure_ascii=False,indent=2));print(json.dumps(result,ensure_ascii=False))
