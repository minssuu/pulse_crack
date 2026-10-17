/* Navigation and soundtrack state */
const factionNames={world:'세계관',citadel:'시타델',omen:'오멘',abyss:'심연재림교',lumen:'루멘',honghwa:'홍화'};
let entered=false, entering=false, audioWanted=false, audioContextKey='world', guildView=null;
let navigationTimer, audioTimer, targetVolume=.1, activeSource='', activeTrack=null;
const localTracks={};
const reducedMotion=()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const baseGuild=renderGuild, baseLumen=openLumen, baseHonghwa=openHonghwa;
function applyTheme(key){document.body.dataset.theme=key;}
function enhancePage(page,key){
  if(!page)return;
  page.querySelector('.section-jump')?.remove();
  const sections=[...page.querySelectorAll('section')];
  if(page.querySelector('.faction-hero') && sections.length>1){
    const nav=document.createElement('nav');nav.className='section-jump';nav.setAttribute('aria-label','페이지 목차');
    sections.forEach((section,i)=>{const h=section.querySelector('h2');if(!h)return;section.id=key+'-section-'+i;const a=document.createElement('a');a.href='#'+section.id;a.textContent=h.textContent;a.onclick=e=>{e.preventDefault();section.scrollIntoView({behavior:reducedMotion()?'instant':'smooth'});nav.querySelectorAll('a').forEach(x=>x.classList.remove('active'));a.classList.add('active');};nav.append(a);});
    nav.firstElementChild?.classList.add('active');page.querySelector('.faction-hero').after(nav);
  }
  page.querySelectorAll('img').forEach(img=>{if(!img.closest('.faction-hero,.hero'))img.loading='lazy';if(!img.hasAttribute('alt'))img.alt=img.closest('.person-card')?.querySelector('.name')?.textContent||'';});
  if(!page.querySelector('.page-footer')){const footer=document.createElement('footer');footer.className='page-footer';footer.innerHTML='<img src="pulse-logo.png" alt="PULSE">SENTINEL × GUIDE · WORLD ARCHIVE';page.append(footer);}
}
renderGuild=function(){baseGuild();guildView=null;enhancePage($('page-guild'),'guild');if(currentPage==='guild'){applyTheme('world');selectTrack('world');initReveal();}};
openLumen=function(){baseLumen();guildView='lumen';applyTheme('lumen');enhancePage($('page-guild'),'lumen');selectTrack('lumen');initReveal();};
openHonghwa=function(){baseHonghwa();guildView='honghwa';applyTheme('honghwa');enhancePage($('page-guild'),'honghwa');selectTrack('honghwa');initReveal();};
showPage=function(id,fromBack=false){
  if(!$('page-'+id))return;
  if(currentPage&&currentPage!==id&&!fromBack)pageHistory.push(currentPage);
  currentPage=id;closeMenu();clearTimeout(navigationTimer);
  const theme=id==='guild'?(guildView||'world'):id;
  applyTheme(theme);selectTrack(factionNames[theme]?theme:'world');
  $('app').classList.add('switching');
  navigationTimer=setTimeout(()=>{
    document.querySelectorAll('.page').forEach(p=>p.style.display=p.id==='page-'+id?'block':'none');
    document.querySelectorAll('.navgrid button').forEach(b=>{b.classList.toggle('active',b.dataset.id===id);if(b.dataset.id===id)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
    document.querySelector('.navgrid button.active')?.scrollIntoView({block:'nearest',inline:'nearest'});
    window.scrollTo({top:0,behavior:'instant'});$('app').classList.remove('switching');initReveal();
  },reducedMotion()?0:140);
};
goBack=function(){if(currentPage==='guild'&&guildView){renderGuild();window.scrollTo({top:0,behavior:'instant'});return;}if(currentPage==='keywords'&&$('keyword-detail-section').style.display!=='none'){hideKeyword();return;}const prev=pageHistory.pop();if(prev)showPage(prev,true);else showPage('world',true);};
enterSite=function(skip=false){
  if(entered||entering)return;entering=true;audioWanted=true;playCurrent();
  $('intro').classList.add('entering');$('intro').querySelector('.enter-btn').disabled=true;
  setTimeout(()=>{entered=true;entering=false;$('intro').classList.add('hidden');$('intro').inert=true;$('app').inert=false;$('player').inert=false;document.body.style.overflow='';$('app').querySelector('.brand').focus({preventScroll:true});},skip||reducedMotion()?0:1350);
};
function safeText(value){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function trackFor(key){const t=localTracks[key]||window.PULSE_MUSIC[key];if(t?.src)return {...t,fallback:false};return {...(localTracks.world||window.PULSE_MUSIC.world),fallback:true};}
function updateTrackLabel(track){$('track-context').textContent=factionNames[audioContextKey]+' · '+(track.fallback?'공통 BGM':'BGM');}
function playCurrent(){if(!audioWanted)return;bgm.play().catch(()=>{$('track-context').textContent='재생 버튼을 눌러 음악을 시작하세요';syncPlayButton();});}
function selectTrack(key,force=false){
  audioContextKey=key;const track=trackFor(key);activeTrack=track;updateTrackLabel(track);
  clearInterval(audioTimer);
  if(track.src===activeSource&&!force){bgm.volume=targetVolume;return;}
  const change=()=>{bgm.pause();bgm.src=track.src;activeSource=track.src;seek.value='0';bgm.load();bgm.volume=targetVolume;if(audioWanted)playCurrent();syncPlayButton();};
  if(!bgm.paused&&entered&&!reducedMotion()){const start=bgm.volume;let step=0;audioTimer=setInterval(()=>{bgm.volume=Math.max(0,start*(1-(++step/8)));if(step>=8){clearInterval(audioTimer);change();}},30);}else change();
}
syncPlayButton=function(){playbtn.textContent=bgm.paused?'▶':'Ⅱ';playbtn.setAttribute('aria-label',bgm.paused?'배경음악 재생':'배경음악 일시정지');playbtn.setAttribute('aria-pressed',String(!bgm.paused));};
toggleAudio=function(){audioWanted=bgm.paused;if(audioWanted){bgm.volume=targetVolume;playCurrent();}else bgm.pause();syncPlayButton();};
setVolume=function(value){targetVolume=Math.max(0,Math.min(1,Number(value)));bgm.volume=targetVolume;try{localStorage.setItem('pulse-volume',String(targetVolume));}catch{}};
tryAutoPlayBgm=function(){if(entered&&audioWanted)playCurrent();};
initAudio=function(){
  try{const saved=localStorage.getItem('pulse-volume');if(saved!==null&&Number.isFinite(+saved))targetVolume=Math.max(0,Math.min(1,+saved));}catch{}
  bgm.volume=targetVolume;volumeSlider.value=String(targetVolume);syncPlayButton();
  for(const event of ['play','pause','ended'])bgm.addEventListener(event,syncPlayButton);
  bgm.addEventListener('timeupdate',()=>{if(Number.isFinite(bgm.duration)&&bgm.duration>0)seek.value=String(bgm.currentTime/bgm.duration*100);});
  bgm.addEventListener('error',()=>{const fallback=window.PULSE_MUSIC.world;if(activeSource!==fallback.src){activeSource=fallback.src;bgm.src=fallback.src;bgm.load();$('track-context').textContent='음원을 불러올 수 없어 공통 BGM 재생';if(audioWanted)playCurrent();}else{$('track-context').textContent='음원 재생 실패 · 음악 설정을 확인하세요';}});
};
let musicDB;
function getDB(){if(!musicDB)musicDB=new Promise((resolve,reject)=>{const request=indexedDB.open('pulse-soundtracks-v36',1);request.onupgradeneeded=()=>request.result.createObjectStore('tracks',{keyPath:'key'});request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});return musicDB;}
async function dbWrite(key,record){const db=await getDB();await new Promise((resolve,reject)=>{const tx=db.transaction('tracks','readwrite');record?tx.objectStore('tracks').put({key,...record}):tx.objectStore('tracks').delete(key);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});}
async function restoreTracks(){try{const db=await getDB();const records=await new Promise((resolve,reject)=>{const r=db.transaction('tracks').objectStore('tracks').getAll();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});for(const r of records)localTracks[r.key]={src:URL.createObjectURL(r.file),title:r.title};selectTrack(audioContextKey);}catch{/* local files and restricted storage remain playable for this session */}}
function openMusicSettings(){closeMenu();openModal('세력별 배경음악',`<p>페이지를 이동하면 해당 세력의 음악으로 전환됩니다. 별도 음원이 없으면 공통 BGM을 재생합니다.</p><p>여기서 선택한 음악은 <strong>현재 브라우저에만 저장</strong>됩니다. 방문자에게 들려줄 음원은 사이트 파일에 추가해 주세요.</p><div id="music-message" role="status"></div>${Object.entries(factionNames).map(([key,name])=>`<div class="sound-slot"><label for="music-${key}">${name}</label><small id="music-name-${key}">${safeText(localTracks[key]?.title||(window.PULSE_MUSIC[key]?.src?window.PULSE_MUSIC[key].title:'공통 BGM 사용'))}</small><input id="music-${key}" type="file" accept="audio/*,.mp3,.wav,.ogg,.m4a" onchange="setLocalTrack('${key}',this)"><button class="sound-reset" onclick="resetLocalTrack('${key}')">기본 설정으로</button></div>`).join('')}`);}
async function setLocalTrack(key,input){const file=input.files[0];if(!file)return;if(!file.type.startsWith('audio/')&&!/\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(file.name)){$('music-message').textContent='오디오 파일을 선택해 주세요.';return;}if(file.size>80*1024*1024){$('music-message').textContent='80MB 이하의 음원을 선택해 주세요.';return;}
  const old=localTracks[key];localTracks[key]={src:URL.createObjectURL(file),title:file.name.replace(/\.[^.]+$/,'')};$('music-name-'+key).textContent=localTracks[key].title;
  try{await dbWrite(key,{file,title:localTracks[key].title});$('music-message').textContent='이 브라우저에 음악을 저장했어요.';}catch{$('music-message').textContent='저장 공간을 사용할 수 없어 이번 접속에서만 재생됩니다.';}
  if(audioContextKey===key||activeTrack?.fallback)selectTrack(audioContextKey,true);if(old)setTimeout(()=>URL.revokeObjectURL(old.src),1000);
}
async function resetLocalTrack(key){const old=localTracks[key];delete localTracks[key];try{await dbWrite(key,null);$('music-message').textContent='기본 음악 설정으로 돌아갔어요.';}catch{$('music-message').textContent='이번 접속의 설정만 초기화했습니다.';}$('music-name-'+key).textContent=window.PULSE_MUSIC[key]?.src?window.PULSE_MUSIC[key].title:'공통 BGM 사용';selectTrack(audioContextKey,true);if(old)setTimeout(()=>URL.revokeObjectURL(old.src),1000);}
// Dialog keyboard support and focus restoration.
let returnFocus;
const originalOpenModal=openModal,originalCloseModal=closeModal,originalOpenMenu=openMenu,originalCloseMenu=closeMenu;
openModal=function(...args){returnFocus=document.activeElement;originalOpenModal(...args);document.body.classList.add('modal-open');$('modal').querySelector('button').focus();};
closeModal=function(){originalCloseModal();document.body.classList.remove('modal-open');returnFocus?.focus?.({preventScroll:true});};
openMenu=function(){returnFocus=document.activeElement;originalOpenMenu();document.body.classList.add('modal-open');$('menu').querySelector('button').focus();};
closeMenu=function(){const wasOpen=$('menu').classList.contains('open');originalCloseMenu();document.body.classList.remove('modal-open');if(wasOpen)returnFocus?.focus?.({preventScroll:true});};
document.addEventListener('keydown',e=>{if(!entered&&e.key==='Tab'){const a=$('intro').querySelector('.intro-skip'),b=$('intro').querySelector('.enter-btn');if(e.shiftKey&&document.activeElement===a){e.preventDefault();b.focus();}else if(!e.shiftKey&&document.activeElement===b){e.preventDefault();a.focus();}return;}const dialog=$('modal').classList.contains('open')?$('modal'):$('menu').classList.contains('open')?$('menu'):null;if(!dialog)return;if(e.key==='Escape'){closeModal();closeMenu();}if(e.key==='Tab'){const focus=[...dialog.querySelectorAll('button,input,a[href]')].filter(x=>!x.disabled);const first=focus[0],last=focus[focus.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});
$('app').inert=true;$('player').inert=true;document.body.style.overflow='hidden';
render();initAudio();document.querySelectorAll('.page').forEach(p=>enhancePage(p,p.id.replace('page-','')));restoreTracks();
$('intro').querySelector('.enter-btn').focus({preventScroll:true});
