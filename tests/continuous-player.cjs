const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
class Element{
 constructor(){this.dataset={};this.handlers={};this.currentTime=0;this.readyState=0;this.duration=100;this.hidden=false;this.disabled=false;this.classList={toggle(){}}}
 querySelectorAll(){return this.children||[]}addEventListener(name,fn){this.handlers[name]=fn}setAttribute(){}load(){this.readyState=0}pause(){this.paused=true}play(){this.paused=false;return Promise.resolve()}emit(name){this.handlers[name]?.()}
}
const ids=['broadcast','standby','clock','elapsed','progress','state','playPause','error','errorText','loading','startScreen','source','errorSource','begin','rewind','forward','mute','retry','theater','about','details','close','coverage','wireClock','newsWire','channelButtons','channelNotice','networkName','networkTitle'];
const elements=Object.fromEntries(ids.map(id=>[id,new Element()]));
const clips=[{start:'2001-09-11 07:00:00',duration:7200,offset:6480,url:'first',source:'first-source'},{start:'2001-09-11 09:00:00',duration:10800,offset:0,url:'second',source:'second-source'},{start:'2001-09-11 12:00:00',duration:1800,offset:0,url:'third',source:'third-source'}];
const ctx=vm.createContext({console,Intl,Date,document:{getElementById:id=>elements[id],querySelectorAll:()=>[],querySelector:()=>new Element(),body:new Element()},fetch:async(url)=>({ok:true,json:async()=>url==='channels.json'?[{id:'bbc',country:'United Kingdom',name:'BBC World',language:'English',recordings:[{start:'2001-09-11 08:00:00',duration:7200,offset:2880,url:'bbc-first',source:'bbc-source'}]},{id:'gap',country:'Japan',name:'Gap test',language:'Japanese',recordings:[{start:'2001-09-11 12:00:00',duration:3600,offset:0,url:'gap',source:'gap-source'}]}]:clips})});
vm.runInContext(fs.readFileSync('dist/headlines.js','utf8'),ctx);
vm.runInContext(fs.readFileSync('dist/app.js','utf8'),ctx);
setImmediate(async()=>{
 elements.broadcast.readyState=1;elements.broadcast.duration=7200;elements.broadcast.emit('loadedmetadata');
 assert.equal(elements.broadcast.currentTime,6480);assert.equal(Number(elements.progress.value),0);assert.equal(elements.standby.src,'second');
 elements.standby.readyState=1;elements.standby.duration=10800;elements.standby.emit('loadedmetadata');
 elements.begin.onclick();elements.broadcast.currentTime=7200;elements.broadcast.emit('ended');
 assert.equal(elements.standby.hidden,false);assert.equal(elements.standby.paused,false);assert.equal(elements.broadcast.hidden,true);assert.equal(Number(elements.progress.value),720);assert.equal(elements.broadcast.src,'third');
 elements.standby.currentTime=20;elements.standby.emit('timeupdate');assert.equal(Number(elements.progress.value),740);
 elements.playPause.onclick();assert.equal(elements.standby.paused,true);
 elements.progress.value=100;elements.progress.onchange();assert.equal(elements.broadcast.src,'first');elements.broadcast.readyState=1;elements.broadcast.emit('loadedmetadata');assert.equal(elements.broadcast.currentTime,6580);assert.equal(Number(elements.progress.value),100);assert.equal(elements.playPause.textContent,'▶ Play');
 vm.runInContext("updateNews('2001-09-11 09:00:00',179)",ctx);
 assert.ok(!elements.newsWire.innerHTML.includes('Second plane strikes'));
 vm.runInContext("updateNews('2001-09-11 09:00:00',180)",ctx);
 assert.ok(elements.newsWire.innerHTML.includes('Second plane strikes'));
 assert.ok(!elements.newsWire.innerHTML.includes('President speaks'));
 vm.runInContext("updateNews('2001-09-11 07:00:00',6480)",ctx);
 assert.ok(!elements.newsWire.innerHTML.includes('Second plane strikes'));
 const before=elements.broadcast.currentTime;
 vm.runInContext("switchChannel('bbc')",ctx);
 assert.equal(elements.broadcast.src,'bbc-first');
 assert.equal(elements.networkName.textContent,'BBC World');
 elements.broadcast.readyState=1;elements.broadcast.emit('loadedmetadata');
 assert.equal(elements.broadcast.currentTime,before-3600);
 assert.equal(elements.playPause.textContent,'▶ Play');
 vm.runInContext("switchChannel('gap')",ctx);
 assert.equal(elements.broadcast.src,'bbc-first');
 assert.ok(elements.channelNotice.textContent.includes('no recording'));
 vm.runInContext("switchChannel('cnn')",ctx);
 assert.equal(elements.broadcast.src,'first');
 elements.broadcast.readyState=1;elements.broadcast.emit('loadedmetadata');
 assert.equal(elements.broadcast.currentTime,before);
 const mini=new Element(),status=new Element(),tile=new Element();
 tile.dataset.channel='bbc';tile.querySelector=selector=>selector==='video'?mini:status;
 elements.channelButtons.children=[tile];
 vm.runInContext('syncPreviews()',ctx);
 assert.equal(mini.src,'bbc-first');assert.equal(mini.muted,true);
 mini.readyState=2;mini.paused=true;
 vm.runInContext('play();syncPreviews()',ctx);
 assert.equal(mini.paused,false);
 elements.playPause.onclick();assert.equal(mini.paused,false);
 elements.broadcast.currentTime=7000;elements.broadcast.emit('timeupdate');
 assert.equal(mini.currentTime,3400);
 console.log('Passed: channel synchronization, pause preservation, unavailable-slot handling, headline timing and rewind, automatic buffered handoff, one cumulative timeline, cross-boundary seeking, and pause preservation.');
});
