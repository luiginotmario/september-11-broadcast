import json, subprocess
from pathlib import Path
from urllib.parse import quote
root=Path(__file__).resolve().parents[1]
identifier='CNN_20010911_110000_CNN_Live_at_Daybreak'
segments=[];seen=set()
while identifier and identifier not in seen and len(segments)<30:
 seen.add(identifier)
 result=subprocess.run(['curl','-L','--fail','--silent','--show-error','https://archive.org/metadata/'+quote(identifier)],capture_output=True,check=True)
 data=json.loads(result.stdout);m=data['metadata']
 if m['start_localtime'][:10]!='2001-09-11':break
 video=next((f for f in data['files'] if f.get('format')=='h.264' and not f.get('private') and f['name'].endswith('.mp4')),None)
 if not video:raise RuntimeError('No publicly listed MP4 for '+identifier)
 segments.append({'id':identifier,'title':m['title'],'start':m['start_localtime'],'utcStart':m['start_time'],'utcEnd':m['stop_time'],'duration':float(video['length']),'url':'https://archive.org/download/'+quote(identifier)+'/'+quote(video['name']),'source':'https://archive.org/details/'+quote(identifier),'offset':6480 if not segments else 0})
 identifier=m.get('next_item')
(root/'dist/archive.json').write_text(json.dumps(segments,indent=2)+'\n')
for s in segments:print(s['start'],s['duration'],s['id'])
print('Indexed',len(segments),'consecutive archive records using next_item links.')
