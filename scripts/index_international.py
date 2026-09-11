import json,subprocess,concurrent.futures
from pathlib import Path
from datetime import datetime,timezone
from zoneinfo import ZoneInfo
catalog=json.load(open('/tmp/international-911.json'))['response']['docs']
start=datetime.fromisoformat('2001-09-11T12:48:00+00:00').timestamp()
end=datetime.fromisoformat('2001-09-12T04:00:00+00:00').timestamp()
channels=[('bbc','BBC','United Kingdom','BBC World','English'),('nhk','NHK','Japan','NHK','Japanese'),('cctv','CCTV3','China','CCTV archive','Chinese'),('ntv','NTV','Russia','NTV','Russian')]
def fetch(row):
 ident=row['identifier'];p=Path('/tmp/'+ident+'.json')
 if p.exists():data=json.loads(p.read_text())
 else:
  data=json.loads(subprocess.check_output(['curl','-fsS','--retry','2','--max-time','30','https://archive.org/metadata/'+ident]));p.write_text(json.dumps(data))
 m=data['metadata'];f=next((f for f in data['files'] if f.get('format')=='h.264' and not f.get('private') and f['name'].endswith('.mp4')),None)
 if not f:return None
 t=datetime.fromisoformat(m['start_time']).replace(tzinfo=timezone.utc);a=t.timestamp();duration=float(f['length']);offset=max(0,start-a);duration=min(duration,end-a)
 if duration<=offset:return None
 return {'id':ident,'title':m['title'],'start':t.astimezone(ZoneInfo('America/New_York')).strftime('%Y-%m-%d %H:%M:%S'),'utcStart':m['start_time'],'duration':duration,'offset':offset,'url':'https://archive.org/download/'+ident+'/'+f['name'],'source':'https://archive.org/details/'+ident}
output=[]
for key,prefix,country,name,language in channels:
 rows=[r for r in catalog if r['identifier'].startswith(prefix+'_') and '20010911_110000'<=r['identifier'][len(prefix)+1:]<'20010912_040000']
 with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool: recordings=sorted([r for r in pool.map(fetch,rows) if r],key=lambda r:r['start'])
 output.append({'id':key,'country':country,'name':name,'language':language,'recordings':recordings})
 print(name,len(recordings),'segments',flush=True)
Path('dist/channels.json').write_text(json.dumps(output,indent=2)+'\n')
