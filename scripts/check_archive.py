import json,subprocess,concurrent.futures
from pathlib import Path
clips=json.loads(Path('dist/archive.json').read_text())
def check(c):
 p=subprocess.run(['curl','--silent','--show-error','--location','--head','--max-time','35','--output','/dev/null','--write-out','%{http_code} %{content_type}',c['url']],text=True,capture_output=True)
 return c['id'],p.stdout,p.returncode
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
 results=list(pool.map(check,clips))
for result in results:print(*result)
assert all(code==0 and status.startswith('200 video/') for _,status,code in results),'At least one recording unavailable'
assert all(clips[i]['start']<clips[i+1]['start'] for i in range(len(clips)-1))
print('All 14 streams responded as video; chronological order verified.')
