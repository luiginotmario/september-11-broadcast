const extraBroadcasts=[
 {id:'tvp',country:'Poland',name:'TVP / Wiadomości',note:'18:00 special bulletin · Polish',youtube:'mU3a3n880wI'},
 {id:'pop24',country:'Slovenia',name:'POP TV / 24UR',note:'1h 5m bulletin · Slovenian',unavailable:'Geographic restrictions · Watch on broadcaster’s site',source:'https://www.24ur.com/video/085810-11september_62612415.html'},
 {id:'ct',country:'Czechia',name:'Česká televize',note:'September 11 bulletin · Czech',unavailable:'Broadcaster has no online playback rights',source:'https://www.ceskatelevize.cz/porady/1097181328-udalosti/201411000100911/'},
 {id:'rai',country:'Italy',name:'RAI / TG1',note:'Extended recording · Italian',youtube:'jrs9JtB-Kuc'},
 {id:'ard',country:'Germany',name:'ARD',note:'20:00 bulletin · German',url:'https://tagesschau-progressive.ard-mcdn.de/video/2021/0907/TV-20210907-1158-4600.webs.h264.mp4',source:'https://www.tagesschau.de/multimedia/sendung/tagesschau_vor_20_jahren/video-915069.html'},
 {id:'france2',country:'France',name:'France 2 / INA',note:'Excerpt · French',youtube:'br1gtfuqvmE'},
 {id:'srf',country:'Switzerland',name:'SRF archive',note:'Evening bulletin · German',url:'https://srf-vod-amd.akamaized.net/world/hls/ts20/2019/04/ts20_20190412_085610_14472891_v_webcast_h264_,q40,q10,q20,q30,q50,.mp4.csmil/master.m3u8',source:'https://www.srf.ch/play/tv/tagesschau/video/tagesschau-hauptausgabe-vom-11-09-2001?urn=urn:srf:video:528d301f-ff34-4ab2-8914-dec9cfaffee9'},
 {id:'nos',country:'Netherlands',name:'NOS',note:'Extended recording · Dutch',youtube:'mjMo2N8xWh4'},
 {id:'mbc',country:'South Korea',name:'MBC',note:'Official September 12 excerpt · Korean',url:'https://video.imnews.imbc.com/video/_definst_/imnews/video.imnews.imbc.com/archive/desk/2001/DN20010255-00.mp4/playlist.m3u8?wowzaplaystart=358000&wowzaplayduration=140013',source:'https://imnews.imbc.com/replay/2001/nwdesk/article/1881531_30743.html'},
 {id:'nrk',country:'Norway',name:'NRK',note:'Evening bulletin · Norwegian',youtube:'NFK-sWXYs9I'},
 {id:'tve',country:'Spain',name:'TVE',note:'7h 10m · Spanish · Provider login',embed:'https://www.rtve.es/drmn/embed/video/6091578?autoplay=false',source:'https://www.rtve.es/play/videos/fue-noticia-en-el-archivo-de-rtve/telediario-del-11s-2001-completo/6091578/'}
];
const extraPlayers=new Map();let extraActive=null,extraResume=false,mainExtraPlayer=null,extrasLoaded=false;
let youtubeReady;
function youtubeAPI(){
 if(youtubeReady)return youtubeReady;
 youtubeReady=new Promise(resolve=>{if(window.YT?.Player)return resolve();window.onYouTubeIframeAPIReady=resolve;const s=document.createElement('script');s.src='https://www.youtube.com/iframe_api';document.head.appendChild(s)});return youtubeReady;
}
function attachStream(el,url){
 if(url.includes('.m3u8')&&!el.canPlayType('application/vnd.apple.mpegurl')&&window.Hls?.isSupported()){
 const hls=new Hls({maxBufferLength:10,maxMaxBufferLength:20,startLevel:0});hls.loadSource(url);hls.attachMedia(el);el._hls=hls;
 }else el.src=url;
}
function extraSource(c){return c.source||'https://www.youtube.com/watch?v='+c.youtube}
function loadExtras(){
 if(extrasLoaded)return;extrasLoaded=true;
 const wall=document.getElementById('extraWall');
 for(const c of extraBroadcasts){
 const tile=document.createElement('article');tile.className='channel-tile extra-tile';
 tile.innerHTML=`<div class="mini-screen" id="screen-${c.id}"><div id="player-${c.id}"></div><span class="mini-muted">${c.embed?'SIGN IN TO PLAY':'MUTED'}</span><button class="promote" aria-label="Watch ${c.name} in main player"></button></div><div class="mini-label"><b>${c.country} · ${c.name}</b><span>${c.note}</span><a href="${extraSource(c)}" target="_blank" rel="noreferrer">Original source ↗</a><span id="extra-error-${c.id}" class="extra-error" hidden></span></div>`;
 wall.appendChild(tile);
 if(c.unavailable){
 const screen=tile.querySelector('.mini-screen');screen.replaceChildren();
 const link=document.createElement('a');link.href=c.source;link.target='_blank';link.rel='noreferrer';link.style.cssText='display:flex;align-items:center;justify-content:center;text-align:center;width:100%;height:100%;padding:20px;box-sizing:border-box;color:inherit';link.textContent=c.unavailable+' ↗';screen.appendChild(link);
 continue;
 }
 tile.querySelector('.promote').onclick=()=>openExtra(c);
 if(c.youtube){
 youtubeAPI().then(()=>{const p=new YT.Player('player-'+c.id,{videoId:c.youtube,playerVars:{autoplay:1,mute:1,playsinline:1,controls:1,loop:1,playlist:c.youtube,origin:location.origin},events:{onReady:e=>{e.target.mute();e.target.playVideo()},onError:event=>{console.warn('YouTube embed',c.id,event.data);const e=document.getElementById('extra-error-'+c.id);e.hidden=false;e.textContent='Provider blocked this embed. Open original source.'}}});extraPlayers.set(c.id,p)});
 }else if(c.url){
 const v=document.createElement('video');v.muted=true;v.autoplay=true;v.loop=true;v.playsInline=true;v.preload='auto';document.getElementById('player-'+c.id).replaceWith(v);attachStream(v,c.url);v.play().catch(()=>{});extraPlayers.set(c.id,v);
 v.addEventListener('error',()=>{const e=document.getElementById('extra-error-'+c.id);e.hidden=false;e.textContent='Source unavailable. Open original source.'});
 }else{
 const frame=document.createElement('iframe');frame.src=c.embed;frame.title=c.name+' official player';frame.allow='fullscreen; encrypted-media';frame.allowFullscreen=true;document.getElementById('player-'+c.id).replaceWith(frame);
 }
 }
}
function closeExtra(){
 if(!extraActive)return;
 if(mainExtraPlayer?.destroy)mainExtraPlayer.destroy();
 const mount=document.getElementById('extraMain');const v=mount.querySelector('video');if(v){v.pause();v._hls?.destroy()}
 mount.replaceChildren();mount.hidden=true;mainExtraPlayer=null;extraActive=null;
 video.hidden=false;document.querySelector('.playback').hidden=false;document.getElementById('clock').hidden=false;
 const c=channels.find(c=>c.id===activeChannel);document.getElementById('networkName').textContent=c.name;document.getElementById('networkTitle').textContent=c.name.toUpperCase()+' — SEPTEMBER 11';
 document.getElementById('source').href=recordings[selected].source;document.getElementById('source').textContent='Internet Archive · '+c.name+' television recordings ↗';
 document.getElementById('channelNotice').textContent='Watching '+c.name+' · synchronized archive feed';
 document.getElementById('wireClock').textContent='';updateClock();
}
function openExtra(c){
 closeExtra();extraResume=wantsPlay;wantsPlay=false;video.pause();video.hidden=true;standby.pause();extraActive=c.id;
 document.getElementById('startScreen').hidden=true;document.getElementById('loading').hidden=true;document.getElementById('error').hidden=true;
 document.querySelector('.playback').hidden=true;document.getElementById('clock').hidden=true;
 document.getElementById('networkName').textContent=c.name;document.getElementById('networkTitle').textContent=c.name.toUpperCase()+' — INDIVIDUAL RECORDING';
 document.getElementById('source').href=extraSource(c);document.getElementById('source').textContent=c.name+' · original source ↗';
 document.getElementById('channelNotice').textContent=c.name+' · '+c.note+'. Independent recording; the news wire remains at your last synchronized replay time.';
 setState('INDIVIDUAL RECORDING');document.getElementById('wireClock').textContent='REPLAY PAUSED';
 const mount=document.getElementById('extraMain');mount.hidden=false;
 if(c.youtube){const el=document.createElement('div');el.id='mainYoutube';mount.appendChild(el);const time=extraPlayers.get(c.id)?.getCurrentTime?.()||0;youtubeAPI().then(()=>{if(extraActive!==c.id)return;mainExtraPlayer=new YT.Player('mainYoutube',{videoId:c.youtube,playerVars:{autoplay:1,playsinline:1,start:Math.floor(time),origin:location.origin},events:{onReady:e=>{e.target.unMute();e.target.playVideo()}}});});}
 else if(c.url){const v=document.createElement('video');v.controls=true;v.playsInline=true;mount.appendChild(v);attachStream(v,c.url);v.addEventListener('loadedmetadata',()=>{v.currentTime=extraPlayers.get(c.id)?.currentTime||0;v.play().catch(()=>{})},{once:true});}
 else{const frame=document.createElement('iframe');frame.src=c.embed;frame.title=c.name+' official player';frame.allow='autoplay; fullscreen; encrypted-media';frame.allowFullscreen=true;mount.appendChild(frame)}
 document.querySelector('.television').scrollIntoView({behavior:'smooth',block:'start'});
}
