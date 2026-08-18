const FRAMES = [{"id":"snoopy-film","name":"Snoopy Film","width":675,"height":1200,"overlay":"assets/snoopy-film.png","slots":[{"type":"rect","x":255,"y":360,"w":207,"h":126},{"type":"rect","x":255,"y":497,"w":207,"h":151},{"type":"rect","x":255,"y":660,"w":207,"h":153},{"type":"rect","x":255,"y":827,"w":207,"h":157},{"type":"rect","x":255,"y":998,"w":207,"h":153}]},{"id":"zoo-chat","name":"Zootopia Chat","width":736,"height":1308,"overlay":"assets/zoo-chat.png","slots":[{"type":"poly","pts":[[45,224],[499,167],[554,602],[96,670]]},{"type":"poly","pts":[[211,717],[689,766],[654,1195],[180,1139]]}]},{"id":"red-camera","name":"Red Camera","width":736,"height":1308,"overlay":"assets/red-camera.png","slots":[{"type":"rect","x":230,"y":330,"w":327,"h":187},{"type":"rect","x":230,"y":518,"w":327,"h":180},{"type":"rect","x":230,"y":699,"w":327,"h":125}]},{"id":"berry-buddies","name":"Berry Buddies","width":736,"height":1308,"overlay":"assets/berry-buddies.png","slots":[{"type":"ellipse","x":38,"y":548,"w":292,"h":230},{"type":"ellipse","x":405,"y":548,"w":294,"h":230}]},{"id":"snoopy-paper","name":"Snoopy Paper","width":736,"height":1308,"overlay":"assets/snoopy-paper.png","slots":[{"type":"poly","pts":[[167,417],[557,423],[637,820],[550,947],[363,1043],[125,897],[93,680]]}]},{"id":"lavender-diary","name":"Lavender Diary","width":736,"height":1308,"overlay":"assets/lavender-diary.png","slots":[{"type":"rect","x":105,"y":190,"w":526,"h":250},{"type":"rect","x":105,"y":500,"w":526,"h":250},{"type":"rect","x":105,"y":810,"w":526,"h":250}]},{"id":"pinterest-spiderman","name":"Spiderman Instagram","width":736,"height":1308,"overlay":"assets/pinterest-spiderman.jpg","slots":[{"type":"poly","pts":[[166,361],[518,286],[649,725],[284,855]]}]},{"id":"pinterest-flower-polaroid","name":"Pastel Flower Polaroid","width":736,"height":1308,"overlay":"assets/pinterest-flower-polaroid.jpg","slots":[{"type":"poly","pts":[[52,286],[464,248],[488,557],[75,595]]},{"type":"poly","pts":[[292,684],[725,737],[704,1030],[271,983]]}]},{"id":"pinterest-vintage-camera","name":"Vintage Camera","width":736,"height":1308,"overlay":"assets/pinterest-vintage-camera.jpg","slots":[{"type":"rect","x":102,"y":573,"w":290,"h":224}]},{"id":"pinterest-pastel-3cut","name":"Pastel 3-Cut","width":400,"height":687,"overlay":"assets/pinterest-pastel-3cut.jpg","slots":[{"type":"rect","x":175,"y":88,"w":200,"h":126},{"type":"rect","x":175,"y":229,"w":200,"h":126},{"type":"rect","x":175,"y":370,"w":200,"h":126}]},{"id":"pinterest-lego-spiderman","name":"LEGO Spiderman","width":736,"height":1308,"overlay":"assets/pinterest-lego-spiderman.jpg","slots":[{"type":"poly","pts":[[69,316],[711,372],[695,925],[22,894]]}]},{"id":"pinterest-cortis-4cut","name":"CORTIS 4-Cut","width":736,"height":1308,"overlay":"assets/pinterest-cortis-4cut.jpg","slots":[{"type":"rect","x":196,"y":120,"w":343,"h":272},{"type":"rect","x":196,"y":397,"w":343,"h":272},{"type":"rect","x":196,"y":675,"w":343,"h":272},{"type":"rect","x":196,"y":952,"w":343,"h":272}]}];
const video = document.getElementById('video');
const startBtn = document.getElementById('start');
const shootBtn = document.getElementById('shoot');
const retakeBtn = document.getElementById('retake');
const downloadBtn = document.getElementById('download');
const result = document.getElementById('result');
const ctx = result.getContext('2d');
const statusEl = document.getElementById('status');
const countEl = document.getElementById('photoCount');
const countdownEl = document.getElementById('countdown');
const flash = document.getElementById('flash');
const placeholder = document.getElementById('camera-placeholder');
const frameList = document.getElementById('frameList');
const slotPicker = document.getElementById('slotPicker');
const zoomInput = document.getElementById('zoom');
const rotateInput = document.getElementById('rotate');
const captionInput = document.getElementById('caption');

let selected = FRAMES[0], stream = null, photos = [], busy = false, activeSlot = 0;
const overlayCache = {};
const edits = [];
const stickers = [];
const texts = [];
let dragging = false, dragStart = null;

function blankEdit(){return {x:0,y:0,scale:1,rotate:0,mirror:false,filter:'none'};}
function ensureEdits(){while(edits.length<photos.length) edits.push(blankEdit());}
function currentEdit(){ensureEdits(); return edits[activeSlot] || (edits[activeSlot]=blankEdit());}

function makeFrameChoices(){
  frameList.innerHTML='';
  FRAMES.forEach((f,i)=>{
    const b=document.createElement('button'); b.className='frame-choice'+(i===0?' active':'');
    b.innerHTML=`<img src="${f.overlay}" alt=""><span>${f.name} · ${f.slots.length} foto</span>`;
    b.onclick=()=>{if(busy)return; document.querySelectorAll('.frame-choice').forEach(x=>x.classList.remove('active')); b.classList.add('active'); selected=f; photos=[]; edits.length=0; stickers.length=0; texts.length=0; activeSlot=0; updateCount(); render(); renderSlotPicker(); statusEl.textContent=`Frame ${f.name} dipilih — perlu ${f.slots.length} foto.`;};
    frameList.appendChild(b);
  });
}
function updateCount(){countEl.textContent=`${photos.length} / ${selected.slots.length}`;}
function wait(ms){return new Promise(r=>setTimeout(r,ms));}
async function startCamera(){
  try{if(stream)stream.getTracks().forEach(t=>t.stop()); stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:{ideal:1280},height:{ideal:720}},audio:false}); video.srcObject=stream; video.style.display='block'; placeholder.style.display='none'; shootBtn.disabled=false; startBtn.textContent='Kamera Aktif ✓'; statusEl.textContent='Siap! Klik Ambil Foto.';}
  catch(e){statusEl.textContent='Kamera tidak bisa dibuka. Coba izinkan kamera di browser dan gunakan GitHub Pages/HTTPS.';}
}
async function countdown(){for(let n=3;n>=1;n--){countdownEl.textContent=n;await wait(650);}countdownEl.textContent='';}
function captureCurrent(){const c=document.createElement('canvas');c.width=video.videoWidth||1280;c.height=video.videoHeight||720;const x=c.getContext('2d');x.translate(c.width,0);x.scale(-1,1);x.drawImage(video,0,0,c.width,c.height);return c.toDataURL('image/jpeg',0.94);}
async function shoot(){
  if(busy||!stream||photos.length>=selected.slots.length)return;
  busy=true;shootBtn.disabled=true;retakeBtn.disabled=true;downloadBtn.disabled=true;statusEl.textContent=`Foto ${photos.length+1} dari ${selected.slots.length} — siap?`;await countdown();flash.style.opacity='1';setTimeout(()=>flash.style.opacity='0',120);photos.push(captureCurrent());edits.push(blankEdit());activeSlot=photos.length-1;updateCount();renderSlotPicker();await render();busy=false;retakeBtn.disabled=false;
  if(photos.length<selected.slots.length){shootBtn.disabled=false;statusEl.textContent=`Bagus! Sekarang foto ${photos.length+1} dari ${selected.slots.length}.`;}else{statusEl.textContent='Selesai! Sekarang atur foto, sticker, dan caption sesukamu ♡';downloadBtn.disabled=false;}
}
function loadImage(src){return new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=reject;im.src=src;});}
function filterString(f){return ({none:'none',soft:'brightness(1.06) saturate(.88)',vintage:'sepia(.35) contrast(.92) saturate(.82)',bw:'grayscale(1)',pink:'sepia(.12) saturate(1.35) hue-rotate(315deg) brightness(1.03)'})[f]||'none';}
function coverDraw(c,img,x,y,w,h,e){const iw=img.width,ih=img.height;const base=Math.max(w/iw,h/ih);const scale=base*e.scale;const dw=iw*scale,dh=ih*scale;c.save();c.beginPath();c.rect(x,y,w,h);c.clip();c.translate(x+w/2+e.x,y+h/2+e.y);c.rotate(e.rotate*Math.PI/180);c.scale(e.mirror?-1:1,1);c.filter=filterString(e.filter);c.drawImage(img,-dw/2,-dh/2,dw,dh);c.restore();}
function drawSlot(c,img,s,e){
  c.save();
  if(s.type==='rect'){c.beginPath();c.rect(s.x,s.y,s.w,s.h);c.clip();coverDraw(c,img,s.x,s.y,s.w,s.h,e);}
  else if(s.type==='ellipse'){c.beginPath();c.ellipse(s.x+s.w/2,s.y+s.h/2,s.w/2,s.h/2,0,0,Math.PI*2);c.clip();coverDraw(c,img,s.x,s.y,s.w,s.h,e);}
  else{const pts=s.pts,xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]),minx=Math.min(...xs),maxx=Math.max(...xs),miny=Math.min(...ys),maxy=Math.max(...ys);c.beginPath();c.moveTo(pts[0][0],pts[0][1]);pts.slice(1).forEach(p=>c.lineTo(p[0],p[1]));c.closePath();c.clip();coverDraw(c,img,minx,miny,maxx-minx,maxy-miny,e);} c.restore();
}
async function render(){
  const f=selected;result.width=f.width;result.height=f.height;ctx.clearRect(0,0,f.width,f.height);ctx.fillStyle='#fff';ctx.fillRect(0,0,f.width,f.height);ensureEdits();
  for(let i=0;i<photos.length;i++){const im=await loadImage(photos[i]);drawSlot(ctx,im,f.slots[i],edits[i]);}
  if(!overlayCache[f.id])overlayCache[f.id]=await loadImage(f.overlay);ctx.drawImage(overlayCache[f.id],0,0,f.width,f.height);
  ctx.save();ctx.textAlign='center';ctx.textBaseline='middle';for(const t of texts){ctx.font=`800 ${t.size}px Arial`;ctx.fillStyle=t.color;ctx.shadowColor='rgba(255,255,255,.8)';ctx.shadowBlur=5;ctx.fillText(t.text,t.x,t.y);}for(const st of stickers){ctx.font=`${st.size}px Arial`;ctx.fillStyle='#333';ctx.fillText(st.char,st.x,st.y);}ctx.restore();
}
function renderSlotPicker(){slotPicker.innerHTML='';for(let i=0;i<selected.slots.length;i++){const b=document.createElement('button');b.textContent=photos[i]?`Foto ${i+1} ✓`:`Foto ${i+1}`;b.className=(i===activeSlot?'active ':'')+(photos[i]?'done':'');b.disabled=!photos[i];b.onclick=()=>{activeSlot=i;syncControls();renderSlotPicker();};slotPicker.appendChild(b);}}
function syncControls(){const e=currentEdit();zoomInput.value=e.scale;rotateInput.value=e.rotate;document.querySelectorAll('.filter').forEach(b=>b.classList.toggle('active',b.dataset.filter===e.filter));}
function updateEdit(){const e=currentEdit();e.scale=parseFloat(zoomInput.value);e.rotate=parseFloat(rotateInput.value);render();}
function move(dx,dy){const e=currentEdit();e.x+=dx;e.y+=dy;render();}
function resetPhoto(){edits[activeSlot]=blankEdit();syncControls();render();}
zoomInput.oninput=updateEdit;rotateInput.oninput=updateEdit;document.getElementById('moveLeft').onclick=()=>move(-18,0);document.getElementById('moveRight').onclick=()=>move(18,0);document.getElementById('mirror').onclick=()=>{currentEdit().mirror=!currentEdit().mirror;render();};document.getElementById('resetPhoto').onclick=resetPhoto;
document.querySelectorAll('.filter').forEach(b=>b.onclick=()=>{currentEdit().filter=b.dataset.filter;syncControls();render();});
document.querySelectorAll('[data-sticker]').forEach(b=>b.onclick=()=>{stickers.push({char:b.dataset.sticker,x:selected.width/2,y:selected.height-70,size:55});render();});
document.getElementById('addCaption').onclick=()=>{const text=captionInput.value.trim();if(!text)return;texts.push({text,x:selected.width/2,y:selected.height-35,size:28,color:'#5c4650'});captionInput.value='';render();};
document.getElementById('addDate').onclick=()=>{texts.push({text:new Date().toLocaleDateString('id-ID',{day:'2-digit',month:'short',year:'numeric'}),x:selected.width/2,y:selected.height-78,size:20,color:'#7e6970'});render();};
result.addEventListener('pointerdown',e=>{dragging=true;result.setPointerCapture(e.pointerId);dragStart={x:e.clientX,y:e.clientY,ox:currentEdit().x,oy:currentEdit().y};});
result.addEventListener('pointermove',e=>{if(!dragging||!photos[activeSlot])return;const r=result.getBoundingClientRect();const sx=selected.width/r.width,sy=selected.height/r.height;const ed=currentEdit();ed.x=dragStart.ox+(e.clientX-dragStart.x)*sx;ed.y=dragStart.oy+(e.clientY-dragStart.y)*sy;render();});
result.addEventListener('pointerup',()=>dragging=false);result.addEventListener('pointercancel',()=>dragging=false);
result.addEventListener('wheel',e=>{if(!photos[activeSlot])return;e.preventDefault();const ed=currentEdit();ed.scale=Math.min(2.5,Math.max(.7,ed.scale+(e.deltaY<0?.05:-.05)));syncControls();render();},{passive:false});
function reset(){photos=[];edits.length=0;stickers.length=0;texts.length=0;activeSlot=0;updateCount();renderSlotPicker();render();downloadBtn.disabled=true;retakeBtn.disabled=true;if(stream)shootBtn.disabled=false;statusEl.textContent=`Frame ${selected.name} dipilih — perlu ${selected.slots.length} foto.`;}
downloadBtn.onclick=()=>{result.toBlob(blob=>{const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`aneira-photobooth-${selected.id}.png`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);},'image/png');};
startBtn.onclick=startCamera;shootBtn.onclick=shoot;retakeBtn.onclick=reset;makeFrameChoices();updateCount();renderSlotPicker();syncControls();render();
