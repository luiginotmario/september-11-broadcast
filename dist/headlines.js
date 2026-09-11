// Editorial summaries, keyed to documented event times rather than first airtime.
const memorialSource='https://www.911memorial.org/plan-your-own-911-anniversary-observance';
const headlines=[
 {time:'08:46',title:'Plane strikes World Trade Center',body:'An aircraft strikes the North Tower in Lower Manhattan.',source:memorialSource,label:'9/11 Memorial & Museum'},
 {time:'09:03',title:'Second plane strikes South Tower',body:'A second aircraft hits the World Trade Center’s South Tower.',source:memorialSource,label:'9/11 Memorial & Museum'},
 {time:'09:30',title:'President speaks from Florida',body:'President Bush addresses the attacks from Emma E. Booker Elementary School in Sarasota.',source:'https://www.georgewbushlibrary.gov/explore/photograph-video-galleries/september-11-2001-gallery-0',label:'George W. Bush Presidential Library'},
 {time:'09:37',title:'Plane strikes Pentagon',body:'An aircraft crashes into the Pentagon in Arlington, Virginia.',source:memorialSource,label:'9/11 Memorial & Museum'},
 {time:'09:59',title:'South Tower collapses',body:'The South Tower of the World Trade Center collapses.',source:memorialSource,label:'9/11 Memorial & Museum'},
 {time:'10:03',title:'Plane crashes in Pennsylvania',body:'A fourth aircraft crashes near Shanksville, Pennsylvania.',source:memorialSource,label:'9/11 Memorial & Museum'},
 {time:'10:28',title:'North Tower collapses',body:'The remaining World Trade Center tower collapses.',source:memorialSource,label:'9/11 Memorial & Museum'},
 {time:'17:20:52',title:'7 World Trade Center collapses',body:'The 47-story building collapses after burning for hours.',source:'https://www.nist.gov/world-trade-center-investigation/study-faqs/wtc-7-investigation',label:'National Institute of Standards and Technology'},
 {time:'20:30',title:'President addresses the nation',body:'President Bush delivers a televised address from the Oval Office.',source:'https://prologue.blogs.archives.gov/lanier-lewis-zawacki-p7131-15/',label:'National Archives'}
].map(item=>({...item,at:Date.parse('2001-09-11T'+item.time+(item.time.length===5?':00':'')+'-04:00')}));
let renderedNewsCount=-1;
function updateNews(start,seconds){
 const now=Date.parse(start.replace(' ','T')+'-04:00')+seconds*1000;
 const visible=headlines.filter(item=>item.at<=now);
 document.getElementById('wireClock').textContent=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',hour:'numeric',minute:'2-digit'}).format(now)+' EDT';
 if(visible.length===renderedNewsCount)return;
 renderedNewsCount=visible.length;
 const list=document.getElementById('newsWire');
 list.innerHTML=visible.length?visible.reverse().map(item=>`<li class="wire-item"><time datetime="2001-09-11T${item.time}${item.time.length===5?':00':''}-04:00">${new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',hour:'numeric',minute:'2-digit'}).format(item.at)} EDT</time><h4>${item.title}</h4><p>${item.body}</p><a href="${item.source}" target="_blank" rel="noreferrer">${item.label} ↗</a></li>`).join(''):'<li class="wire-empty">No updates at this point in the replay.</li>';
 list.scrollTop=0;
}
