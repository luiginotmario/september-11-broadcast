const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
class Element{
 constructor(){this.dataset={};this.handlers={};this.currentTime=0;this.readyState=0;this.duration=100;this.hidden=false;this.disabled=false;this.classList={toggle(){}}}
 addEventListener(name,fn){this.handlers[name]=fn}setAttribute(){}load(){this.readyState=0}pause(){this.paused=true}play(){this.paused=false;return Promise.resolve()}emit(name){this.handlers[name]?.()}
}
const ids=['broadcast','standby','clock','elapsed','progress','state','playPause','error','errorText','loading','startScreen','source','errorSource','begin','rewind','forward','mute','retry','theater','about','details','close','coverage'];
const elements=Object.fromEntries(ids.map(id=>[id,new Element()]));
const clips=[{start:'2001-09-11 07:00:00',duration:7200,offset:6480,url:'first',source:'first-source'},{start:'2001-09-11 09:00:00',duration:10800,offset:0,url:'second',source:'second-source'},{start:'2001-09-11 12:00:00',duration:1800,offset:0,url:'third',source:'third-source'}];
const ctx=vm.createContext({console,Intl,Date,document:{getElementById:id=>elements[id],querySelectorAll:()=>[],querySelector:()=>new Element(),body:new Element()},fetch:async()=>({ok:true,json:async()=>clips})});
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
 console.log('Passed: automatic buffered handoff, one cumulative timeline, cross-boundary seeking, and pause preservation.');
});
