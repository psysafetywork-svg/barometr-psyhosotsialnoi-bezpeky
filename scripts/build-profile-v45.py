#!/usr/bin/env python3
"""Embed the reviewed semantic layer and local fonts in both offline portal copies."""
from pathlib import Path
import json,re,base64
root=Path(__file__).resolve().parents[1];src=root/'src/profile-v45'
fontcss=''
for filename,weight in [('DejaVuSans.woff',400),('DejaVuSans-Bold.woff',700)]:
 b64=(src/'fonts'/(filename+'.b64')).read_text().strip()
 assert base64.b64decode(b64)[:4]==b'wOFF'
 fontcss+=f"@font-face{{font-family:'DejaVu Sans';src:url(data:font/woff;base64,{b64}) format('woff');font-weight:{weight};font-style:normal;font-display:block}}\n"
parts=['/* PROFILE_V45_START */','const PROFILE_V45_COPY='+json.dumps(json.loads((src/'approved-copy.json').read_text()),ensure_ascii=False)+';', 'const PROFILE_V45_SAMPLE='+json.dumps(json.loads((src/'sample-copy.json').read_text()),ensure_ascii=False)+';', 'const PROFILE_V45_FONT_CSS='+json.dumps(fontcss)+';','const PROFILE_V45_CSS='+json.dumps((src/'style.css').read_text())+';','const PROFILE_V45_REPORT_CSS='+json.dumps((src/'report.css').read_text())+';', 'const PROFILE_V45_GROUNDED='+json.dumps(json.loads((src/'grounded-copy.json').read_text()),ensure_ascii=False)+';', (src/'engine.js').read_text(),(src/'plan-text.js').read_text(),(src/'view.js').read_text(),(src/'availability.js').read_text(),'/* PROFILE_V45_END */']
layer='\n'.join(parts)
p=root/'local/index.html';s=p.read_bytes().decode()
if '/* PROFILE_V45_START */' in s:s=re.sub(r'/\* PROFILE_V45_START \*/.*?/\* PROFILE_V45_END \*/',lambda m:layer,s,flags=re.S)
else:
 at=s.rfind('render();');assert at>0;s=s[:at]+layer+'\n\n'+s[at:]
p.write_bytes(s.encode())
pub=root/'index.html';text=pub.read_bytes().decode();data=base64.b64encode(s.encode()).decode()
pattern=r"(const embeddedLocalPortal = ')[^']*(';?)"
assert len(re.findall(pattern,text))==1
text=re.sub(pattern,lambda m:m[1]+data+m[2],text);pub.write_bytes(text.encode())
print('Embedded profile v45; local bytes',len(s.encode()))
