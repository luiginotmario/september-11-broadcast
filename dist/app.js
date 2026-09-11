const $=id=>document.getElementById(id);
let recordings=[],selected=0,total=0,wantsPlay=false,started=false,video=$('broadcast'),standby=$('standby');
const slots=[video,standby];
let channels=[],activeChannel='cnn';
function timestamp(r,seconds=0){return Date.parse(r.start.replace(' ','T')+'-04:00')+seconds*1000}
let channelWallKey='',previewClock=null;
function renderChannels(){
 const key=channels.map(c=>c.id).join(',');
 if(key!==channelWallKey){
 channelWallKey=key;
 $('channelButtons').innerHTML=channels.map(c=>`<button type="button" class="channel-tile" data-channel="${c.id}" aria-label="Watch ${c.name}, ${c.country}" aria-pressed="${c.id===activeChannel}"><span class="mini-screen"><video muted autoplay playsinline preload="auto" aria-hidden="true"></video><span class="mini-status" hidden></span><span class="mini-muted">MUTED</span></span><span class="mini-label"><b>${c.name}</b><span>${c.country} · ${c.language}</span></span></button>`).join('');
 $('channelButtons').querySelectorAll('.channel-tile').forEach(button=>{
 button.onclick=()=>switchChannel(button.dataset.channel);
 const preview=button.querySelector('video');preview.muted=true;
 preview.addEventListener('loadedmetadata',()=>{preview.currentTime=Number(preview.dataset.target)||0;preview.play().catch(()=>{});});
 preview.addEventListener('playing',()=>{button.querySelector('.mini-status').hidden=true});
 preview.addEventListener('waiting',()=>{const status=button.querySelector('.mini-status');status.hidden=false;status.textContent='BUFFERING';});
 preview.addEventListener('error',()=>{const status=button.querySelector('.mini-status');status.hidden=false;status.textContent='PREVIEW UNAVAILABLE';});
 });
 }
 $('channelButtons').querySelectorAll('.channel-tile').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.channel===activeChannel)));
 syncPreviews();
}
function syncPreviews(){
 if(!recordings.length)return;
 const current=recordings[selected];
 const seconds=video.readyState>=1?Math.max(current.offset,video.currentTime):Number(video.dataset.target)||current.offset;
 const now=timestamp(current,seconds),jump=previewClock!==null&&Math.abs(now-previewClock)>5000;previewClock=now;
 $('channelButtons').querySelectorAll('.channel-tile').forEach(button=>{
 const channel=channels.find(c=>c.id===button.dataset.channel),preview=button.querySelector('video'),status=button.querySelector('.mini-status');
 const clip=channel.recordings.find(r=>timestamp(r,r.offset)<=now&&now<timestamp(r,r.duration));
 if(!clip){preview.pause();preview.hidden=true;status.hidden=false;status.textContent='NO RECORDING AT THIS TIME';return}
 preview.hidden=false;preview.muted=true;
 const target=(now-timestamp(clip))/1000;preview.dataset.target=String(target);
 if(preview.dataset.clip!==(clip.id||clip.url)){preview.dataset.clip=clip.id||clip.url;preview.src=clip.url;preview.load();status.hidden=false;status.hidden=true;}
 else if(jump&&preview.readyState>=1&&!preview.seeking)preview.currentTime=target;
 if(preview.readyState>=2&&preview.paused)preview.play().catch(()=>{});
 });
}
function switchChannel(id){
 if(typeof closeExtra==='function')closeExtra();
 if(id===activeChannel){play();return;}
 const channel=channels.find(c=>c.id===id);if(!channel||!recordings.length)return;
 const current=recordings[selected];
 const seconds=video.readyState>=1?Math.max(current.offset,video.currentTime):Number(video.dataset.target)||current.offset;
 const now=timestamp(current,seconds);
 const index=channel.recordings.findIndex(r=>timestamp(r,r.offset)<=now&&now<timestamp(r,r.duration));
 if(index<0){$('channelNotice').textContent=`${channel.name}: no recording at ${hour(current.start,seconds)} EDT. Your current channel keeps playing. Try another point in the replay.`;return}
 const resume=wantsPlay;
 for(const el of slots){el.pause();el.dataset.index='-1'}
 total=0;recordings=channel.recordings.map(r=>{const copy={...r,elapsed:total};total+=r.duration-r.offset;return copy});
 activeChannel=id;selected=index;wantsPlay=resume;
 $('progress').max=total;$('coverage').textContent=(total/3600).toFixed(1)+' hours · available '+channel.name+' recordings';
 $('networkName').textContent=channel.name;$('networkTitle').textContent=channel.name.toUpperCase()+' — SEPTEMBER 11';
 $('source').href=recordings[index].source;$('source').textContent='Internet Archive · '+channel.name+' television recordings ↗';$('errorSource').href=recordings[index].source;
 $('channelNotice').textContent=`Watching ${channel.name} · ${channel.country} · ${channel.language}. Same approximate historical time.`+(id==='cctv'?' Cataloged as CCTV3; includes regular programming, not uninterrupted news.':id==='ntv'?' Includes regular programming.':'');
 $('error').hidden=true;$('loading').hidden=!resume;
 const target=(now-timestamp(recordings[index]))/1000;
 prepare(video,index,target);buttons();setState(resume?'TUNING CHANNEL':'PAUSED');renderChannels();
 $('startScreen').hidden=true;
}
function loadChannels(cnn){
 channels=[{id:'cnn',country:'United States',name:'CNN',language:'English',recordings:cnn}];renderChannels();
 return fetch('channels.json').then(r=>{if(!r.ok)throw new Error('Channel index unavailable');return r.json()}).then(data=>{channels.push(...data.filter(c=>c.recordings?.length));renderChannels();if(typeof loadExtras==='function')loadExtras()}).catch(()=>{$('channelNotice').textContent='CNN is available. International channels could not load; refresh to retry.'});
}

function hour(start,seconds=0){const d=new Date(start.replace(' ','T')+'-04:00');return new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',hour:'numeric',minute:'2-digit',second:seconds?'2-digit':undefined}).format(new Date(d.getTime()+seconds*1000))}
function duration(seconds){seconds=Math.max(0,Math.floor(seconds));return `${Math.floor(seconds/3600)}:${String(Math.floor(seconds/60)%60).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`}
function position(){const r=recordings[selected];return r?Math.min(total,r.elapsed+Math.max(0,video.currentTime-r.offset)):0}
function updateClock(){const r=recordings[selected];if(!r)return;$('clock').textContent='≈ '+hour(r.start,Math.max(r.offset,video.currentTime))+' EDT';$('progress').value=position();$('elapsed').textContent=duration(position())+' / '+duration(total);$('progress').setAttribute('aria-valuetext',$('clock').textContent);updateNews(r.start,Math.max(r.offset,video.currentTime));syncPreviews()}
function setState(s){$('state').textContent=s}
function buttons(){$('playPause').textContent=wantsPlay?'Ⅱ Pause':'▶ Play';$('playPause').setAttribute('aria-label',wantsPlay?'Pause broadcast':'Play broadcast')}
function showError(message){$('loading').hidden=true;$('error').hidden=false;$('errorText').textContent=message;wantsPlay=false;buttons();setState('PLAYBACK UNAVAILABLE')}
function prepare(el,index,time){el.dataset.index=String(index);el.dataset.target=String(time);el.preload=el===video?'auto':'metadata';el.src=recordings[index].url;el.load()}
function prefetch(){if(selected+1>=recordings.length)return;if(Number(standby.dataset.index)!==selected+1)prepare(standby,selected+1,recordings[selected+1].offset);if(video.duration-video.currentTime<60&&standby.preload!=='auto')standby.preload='auto'}
function play(){if(!recordings.length)return;started=true;wantsPlay=true;buttons();$('startScreen').hidden=true;if(Number(video.dataset.index)!==selected||video.readyState<1){$('loading').hidden=false;return}const active=video;active.play().catch(()=>{if(active!==video)return;wantsPlay=false;buttons();setState('PRESS PLAY TO CONTINUE');$('loading').hidden=true})}
function activate(index,time,autoplay){const incoming=standby;video.pause();video.hidden=true;standby=video;video=incoming;video.hidden=false;video.muted=standby.muted;selected=index;wantsPlay=autoplay;buttons();$('error').hidden=true;$('loading').hidden=!autoplay;const r=recordings[index];$('source').href=r.source;$('errorSource').href=r.source;setState(autoplay?'CONTINUING BROADCAST':'PAUSED');
 if(Number(video.dataset.index)===index&&video.readyState>=1){video.currentTime=time;updateClock();if(autoplay)play();prefetch()}else prepare(video,index,time);
}
function seek(seconds){if(!recordings.length)return;seconds=Math.max(0,Math.min(total-.1,seconds));const index=recordings.findIndex(r=>seconds<r.elapsed+r.duration-r.offset);const r=recordings[index],target=r.offset+seconds-r.elapsed;if(index===selected){video.currentTime=target;updateClock()}else activate(index,target,wantsPlay)}
for(const el of slots){el.addEventListener('loadedmetadata',()=>{el.currentTime=Number(el.dataset.target)||0;if(el===video){updateClock();if(wantsPlay)play();prefetch()}});el.addEventListener('playing',()=>{if(el!==video)return;wantsPlay=true;buttons();$('loading').hidden=true;$('error').hidden=true;$('startScreen').hidden=true;setState('ORIGINAL BROADCAST')});el.addEventListener('waiting',()=>{if(el===video&&wantsPlay){$('loading').hidden=false;setState('BUFFERING')}});el.addEventListener('timeupdate',()=>{if(el===video){updateClock();prefetch()}});el.addEventListener('error',()=>{if(el===video)showError('The broadcast could not load. Try again to resume, or open the original source.');else el.dataset.index='-1'});el.addEventListener('ended',()=>{if(el!==video)return;if(selected+1<recordings.length){const next=recordings[selected+1];const gap=(timestamp(next,next.offset)-timestamp(recordings[selected],recordings[selected].duration))/1000;if(gap>5)$('channelNotice').textContent='Archive gap: continuing at '+hour(next.start,next.offset)+' EDT.';activate(selected+1,next.offset,true);}else{wantsPlay=false;buttons();updateClock();setState('END OF SEPTEMBER 11 COVERAGE')}})}
$('begin').onclick=play;$('playPause').onclick=()=>{if(!recordings.length)return;if(wantsPlay){wantsPlay=false;video.pause();buttons();$('loading').hidden=true;setState('PAUSED');syncPreviews()}else{if(video.ended&&selected===recordings.length-1)seek(0);play()}};$('rewind').onclick=()=>seek(position()-30);$('forward').onclick=()=>seek(position()+30);$('progress').onchange=()=>seek(Number($('progress').value));$('mute').onclick=()=>{video.muted=!video.muted;standby.muted=video.muted;$('mute').textContent=video.muted?'Unmute':'Mute';$('mute').setAttribute('aria-pressed',String(video.muted))};$('retry').onclick=()=>{wantsPlay=true;buttons();prepare(video,selected,Math.max(recordings[selected].offset,video.currentTime||0))};$('theater').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.querySelector('.television').requestFullscreen()}catch{document.body.classList.toggle('theater')}};$('about').onclick=()=>$('details').showModal();$('close').onclick=()=>$('details').close();
fetch('archive.json').then(r=>{if(!r.ok)throw new Error('Archive index unavailable');return r.json()}).then(data=>{if(!Array.isArray(data)||!data.length)throw new Error('No recordings indexed');recordings=data.map(r=>{const copy={...r,elapsed:total};total+=r.duration-r.offset;return copy});$('progress').max=total;$('coverage').textContent=(total/3600).toFixed(1)+' hours · one continuous broadcast';$('begin').disabled=false;$('begin').textContent='▶  Watch original coverage';document.querySelectorAll('.playback button, .playback input').forEach(el=>el.disabled=false);video.dataset.index='-1';standby.dataset.index='-1';$('source').href=recordings[0].source;$('errorSource').href=recordings[0].source;prepare(video,0,recordings[0].offset);updateClock();loadChannels(data)}).catch(()=>{$('begin').textContent='Archive unavailable';showError('The archive could not load. Please refresh or visit the Internet Archive.');$('errorSource').href='https://archive.org/details/911'});
