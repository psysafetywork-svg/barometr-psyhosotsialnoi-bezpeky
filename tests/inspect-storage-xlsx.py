import json,os
from pathlib import Path
from openpyxl import load_workbook
out=Path(os.environ['BAROMETER_QA_OUTPUT'])
results={}
for engine in ('chromium','firefox','webkit'):
    r=json.loads((out/(engine+'-backup.json')).read_text())['data']
    period=next(p for p in r['periods'] if p['id']==r['current'])
    actions=[a for a in r['plan'] if a['periodId']==period['id']]
    actual=list(load_workbook(out/(engine+'-plan.xlsx'),data_only=True).active.values)[1:]
    expected=[]
    for a in actions:
        scope=next(e['name'] for e in period['envs'] if e['id']==a['envId']) if a.get('envId') else 'Компанія загалом'
        expected.append((scope,a.get('module') or None,a.get('aspect') or None,a.get('action') or None,a.get('description') or None,a.get('priority') or None,a.get('owner') or None,a.get('due') or None,a.get('indicator') or None,a.get('status') or None))
    assert actual==expected,(engine,actual,expected)
    results[engine]={'status':'PASS','rows':len(actual),'allTenColumnsEqual':True}
(out/'storage-xlsx-equality.json').write_text(json.dumps(results,ensure_ascii=False,indent=2))
print(json.dumps(results))
