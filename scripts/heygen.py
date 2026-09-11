"""HeyGen Avatar V production runner. Secrets stay outside the public site."""
import argparse, hashlib, json, os, sys, time, subprocess
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import HTTPError
from urllib.parse import quote
ROOT = Path(__file__).resolve().parents[1]
BASE = 'https://api.heygen.com'
for line in (ROOT / '.env').read_text().splitlines() if (ROOT / '.env').exists() else []:
    name, sep, value = line.partition('=')
    if sep and name in ('HEYGEN_API_KEY', 'HEYGEN_AVATAR_ID', 'HEYGEN_VOICE_ID'):
        os.environ.setdefault(name, value.strip())

def save(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_suffix('.tmp')
    temp.write_text(json.dumps(data, indent=2) + '\n')
    temp.replace(path)

def read(path, default):
    return json.loads(path.read_text()) if path.exists() else default

def api(route, payload=None):
    key = os.environ.get('HEYGEN_API_KEY')
    if not key:
        raise RuntimeError('HeyGen is not connected. Set HEYGEN_API_KEY outside the public site.')
    config = 'url = ' + json.dumps(BASE + route) + '\nheader = ' + json.dumps('x-api-key: ' + key) + '\nheader = "Content-Type: application/json"\n'
    if payload is not None:
        config += 'request = "POST"\ndata = ' + json.dumps(json.dumps(payload)) + '\n'
    response = subprocess.run(['curl','--silent','--show-error','--fail-with-body','--max-time','60','--config','-'], input=config, text=True, capture_output=True)
    if response.returncode:
        try:
            error=json.loads(response.stdout).get('error', {})
            message=error.get('message',str(error)) if isinstance(error,dict) else str(error)
        except ValueError:
            message='Network request failed with code '+str(response.returncode)
        raise RuntimeError('HeyGen: '+message)
    result=json.loads(response.stdout)
    return result.get('data',result)

def payload_for(bulletin, avatar, voice, preview=False):
    if not preview and bulletin.get('editorial_status') != 'verified':
        raise RuntimeError('Bulletin reporting time needs source review before paid rendering.')
    if not bulletin.get('sources'):
        raise RuntimeError('A source reference is required.')
    if not avatar or not voice:
        raise RuntimeError('Select HEYGEN_AVATAR_ID and HEYGEN_VOICE_ID from the account catalog.')
    return {'type':'avatar','avatar_id':avatar,'voice_id':voice,'script':bulletin['text'],
            'title':'As It Unfolded — '+bulletin['time']+' — '+bulletin['title'],
            'resolution':'1080p','aspect_ratio':'16:9','engine':{'type':'avatar_v'},
            'motion_prompt':'A composed television news anchor delivering serious breaking news. Restrained natural gestures, attentive eye contact, sober expression. No smiling or dramatic acting.'}

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('action',choices=['catalog','render','poll'])
    parser.add_argument('--bulletin',default='bulletin-01')
    parser.add_argument('--preview',action='store_true',help='Render an explicitly requested visual pilot; does not verify historical timing.')
    args=parser.parse_args()
    if args.action=='catalog':
        save(ROOT/'production/catalog.json',{'avatars':api('/v3/avatars/looks?avatar_type=digital_twin'),'voices':api('/v3/voices')})
        print('Account avatar and voice catalog saved locally.');return
    bulletins=read(ROOT/'production/bulletins.json',[])
    bulletin=next((b for b in bulletins if b['id']==args.bulletin),None)
    if not bulletin: raise RuntimeError('Unknown bulletin.')
    jobs_path=ROOT/'production/jobs.json'; jobs=read(jobs_path,{})
    if args.action=='render':
        avatar=os.environ.get('HEYGEN_AVATAR_ID'); voice=os.environ.get('HEYGEN_VOICE_ID')
        payload=payload_for(bulletin,avatar,voice,args.preview)
        fingerprint=hashlib.sha256(json.dumps(payload,sort_keys=True).encode()).hexdigest()
        previous=jobs.get(bulletin['id'])
        if previous:
            if previous['fingerprint']!=fingerprint: raise RuntimeError('An earlier render exists for different content; review it before creating another paid job.')
            print('Existing render retained. Use poll; no duplicate charge requested.');return
        look=api('/v3/avatars/looks/'+quote(avatar,safe=''))
        if 'avatar_v' not in look.get('supported_api_engines',[]):
            raise RuntimeError('This avatar does not support Avatar V. Select an eligible account look.')
        jobs[bulletin['id']]={'fingerprint':fingerprint,'state':'submitting'}
        save(jobs_path,jobs)
        result=api('/v3/videos',payload)
        video_id=result.get('video_id') or result.get('id')
        if not video_id: raise RuntimeError('Uncertain submission result. Check HeyGen before retrying to avoid a duplicate charge.')
        jobs[bulletin['id']].update(video_id=video_id,state='submitted')
        save(jobs_path,jobs);print('Render submitted. Use poll to collect it.');return
    job=jobs.get(bulletin['id'],{})
    if not job.get('video_id'): raise RuntimeError('No confirmed job ID. Reconcile any uncertain submission in HeyGen before retrying.')
    status=api('/v3/videos/'+quote(job['video_id'],safe=''))
    if status.get('status')=='failed':
        raise RuntimeError('HeyGen render failed: '+str(status.get('failure_message') or status.get('failure_code') or 'unspecified failure'))
    if status.get('status')!='completed':
        print('Render status:',status.get('status','unknown'));return
    url=status.get('video_url','')
    if not url.startswith('https://'): raise RuntimeError('Missing secure video output URL.')
    destination=ROOT/'dist/media'/f"{bulletin['id']}.mp4"
    destination.parent.mkdir(parents=True,exist_ok=True)
    temp=destination.with_suffix('.part')
    result=subprocess.run(['curl','--silent','--show-error','--fail','--location','--max-time','120','--output',str(temp),url],capture_output=True)
    if result.returncode: raise RuntimeError('Video download failed; the existing render can be collected again with poll.')
    with temp.open('rb') as stream:
        if b'ftyp' not in stream.read(64): raise RuntimeError('Output is not a recognizable MP4; not attached to player.')
    temp.replace(destination)
    manifest_path=ROOT/'dist/media.json'; manifest=read(manifest_path,{})
    manifest[bulletin['time']]={'url':'media/'+destination.name,'provider':'HeyGen','engine':'avatar_v','script':bulletin['text']}
    save(manifest_path,manifest)
    job['state']='downloaded';save(jobs_path,jobs)
    print('HeyGen video and synchronized narration attached to the local player.')

if __name__=='__main__':
    try: main()
    except (RuntimeError,OSError,ValueError) as e:
        print(str(e),file=sys.stderr);sys.exit(1)
