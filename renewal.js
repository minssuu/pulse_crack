/* Navigation and soundtrack state */
const factionNames={world:'세계관',citadel:'시타델',omen:'오멘',abyss:'심연재림교',lumen:'루멘',honghwa:'홍화'};
let entered=false, entering=false, audioWanted=false, audioContextKey='world', guildView=null;
let navigationTimer, audioTimer, targetVolume=.1, activeSource='', activeTrack=null;
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
  if(!page.querySelector('.page-footer')){const footer=document.createElement('footer');footer.className='page-footer';footer.innerHTML='<img src="pulse-logo.png" alt="PULSE">';page.append(footer);}
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
function trackFor(key){const t=window.PULSE_MUSIC[key];if(t?.src)return {...t,fallback:false};return {...window.PULSE_MUSIC.world,fallback:true};}
function playCurrent(){if(!audioWanted)return;ensureSpectrumAudio();bgm.play().catch(()=>{$('audio-status').textContent='재생 버튼을 눌러 음악을 시작하세요';syncPlayButton();});}
function selectTrack(key,force=false){
  audioContextKey=key;const track=trackFor(key);activeTrack=track;$('audio-status').textContent='';
  clearInterval(audioTimer);
  if(track.src===activeSource&&!force){bgm.volume=targetVolume;return;}
  const change=()=>{bgm.pause();bgm.src=track.src;activeSource=track.src;bgm.load();bgm.volume=targetVolume;if(audioWanted)playCurrent();syncPlayButton();};
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
  initSpectrum();
  bgm.addEventListener('error',()=>{const fallback=window.PULSE_MUSIC.world;if(activeSource!==fallback.src){activeSource=fallback.src;bgm.src=fallback.src;bgm.load();$('audio-status').textContent='음원을 불러올 수 없어 공통 BGM 재생';if(audioWanted)playCurrent();}else{$('audio-status').textContent='음원을 재생할 수 없습니다.';}});
};
// One audio graph per media element; frequency bars are purely decorative.
let spectrumContext, spectrumSource, spectrumAnalyser, spectrumBins;
let spectrumFrame=0, spectrumCanvas, spectrumPaint, spectrumWidth=0, spectrumHeight=0;
let spectrumColor='136,220,225';
const spectrumLevels=new Float32Array(40);
function ensureSpectrumAudio(){
  const AudioContext=window.AudioContext||window.webkitAudioContext;
  if(!AudioContext)return;
  try{
    if(!spectrumContext){
      spectrumContext=new AudioContext();
      spectrumAnalyser=spectrumContext.createAnalyser();
      spectrumAnalyser.fftSize=2048;
      spectrumAnalyser.smoothingTimeConstant=.8;
      spectrumAnalyser.minDecibels=-90;
      spectrumAnalyser.maxDecibels=-30;
      spectrumBins=new Uint8Array(spectrumAnalyser.frequencyBinCount);
      spectrumSource=spectrumContext.createMediaElementSource(bgm);
      spectrumSource.connect(spectrumAnalyser);
      spectrumAnalyser.connect(spectrumContext.destination);
    }
    if(spectrumContext.state==='suspended')spectrumContext.resume().catch(()=>{});
  }catch{
    // Preserve playback if this browser cannot supply an analyser.
    if(spectrumSource){try{spectrumSource.disconnect();spectrumSource.connect(spectrumContext.destination);}catch{}}
    spectrumAnalyser=null;
  }
}
function drawSpectrum(){
  if(!spectrumPaint)return;
  const w=spectrumWidth,h=spectrumHeight,mid=h/2;
  spectrumPaint.clearRect(0,0,w,h);
  const active=!bgm.paused&&!bgm.ended&&!bgm.muted&&bgm.volume>0&&spectrumAnalyser&&spectrumContext?.state==='running'&&!reducedMotion();
  if(active)spectrumAnalyser.getByteFrequencyData(spectrumBins);
  const step=w/spectrumLevels.length,barWidth=Math.max(1.5,Math.min(3,step*.48));
  const glow=spectrumPaint.createLinearGradient(0,0,0,h);
  glow.addColorStop(0,`rgba(${spectrumColor},.18)`);
  glow.addColorStop(.5,`rgba(${spectrumColor},.95)`);
  glow.addColorStop(1,`rgba(${spectrumColor},.18)`);
  spectrumPaint.fillStyle=glow;
  spectrumPaint.shadowColor=`rgba(${spectrumColor},.5)`;
  spectrumPaint.shadowBlur=5;
  for(let i=0;i<spectrumLevels.length;i++){
    let level=0;
    if(active){
      // Logarithmic bands, low frequencies at left, highs at right.
      const binHz=spectrumContext.sampleRate/spectrumAnalyser.fftSize;
      const high=Math.min(16000,spectrumContext.sampleRate/2);
      const lo=Math.max(1,Math.floor(45*Math.pow(high/45,i/40)/binHz));
      const hi=Math.min(spectrumBins.length-1,Math.max(lo,Math.ceil(45*Math.pow(high/45,(i+1)/40)/binHz)));
      let total=0;for(let b=lo;b<=hi;b++)total+=spectrumBins[b];
      level=total/Math.max(1,hi-lo+1)/255;
    }
    spectrumLevels[i]=active?spectrumLevels[i]+(level-spectrumLevels[i])*.42:0;
    const height=2+spectrumLevels[i]*(h-8);
    spectrumPaint.globalAlpha=active?.95:.32;
    spectrumPaint.fillRect(i*step+(step-barWidth)/2,mid-height/2,barWidth,height);
  }
  spectrumPaint.shadowBlur=0;spectrumPaint.globalAlpha=1;
}
function tickSpectrum(){spectrumFrame=0;drawSpectrum();if(!document.hidden&&!bgm.paused&&!bgm.ended&&!reducedMotion()&&spectrumAnalyser)spectrumFrame=requestAnimationFrame(tickSpectrum);}
function refreshSpectrum(){cancelAnimationFrame(spectrumFrame);spectrumFrame=0;if(!document.hidden)tickSpectrum();}
function initSpectrum(){
  spectrumCanvas=$('audio-spectrum');spectrumPaint=spectrumCanvas?.getContext('2d');if(!spectrumPaint)return;
  const resize=()=>{
    const bounds=spectrumCanvas.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,2);
    spectrumWidth=bounds.width;spectrumHeight=bounds.height;
    spectrumCanvas.width=Math.round(bounds.width*dpr);spectrumCanvas.height=Math.round(bounds.height*dpr);
    spectrumPaint.setTransform(dpr,0,0,dpr,0,0);drawSpectrum();
  };
  if(window.ResizeObserver)new ResizeObserver(resize).observe(spectrumCanvas);else window.addEventListener('resize',resize);
  const theme=()=>{spectrumColor=getComputedStyle(document.body).getPropertyValue('--accent-rgb').trim()||'136,220,225';drawSpectrum();};
  new MutationObserver(theme).observe(document.body,{attributes:true,attributeFilter:['data-theme']});
  for(const event of ['play','pause','ended','emptied','volumechange'])bgm.addEventListener(event,refreshSpectrum);
  document.addEventListener('visibilitychange',refreshSpectrum);
  window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',refreshSpectrum);
  theme();resize();
}

// Dialog keyboard support and focus restoration.
let returnFocus;
const originalOpenModal=openModal,originalCloseModal=closeModal,originalOpenMenu=openMenu,originalCloseMenu=closeMenu;
openModal=function(...args){returnFocus=document.activeElement;originalOpenModal(...args);document.body.classList.add('modal-open');$('modal').querySelector('button').focus();};
closeModal=function(){originalCloseModal();document.body.classList.remove('modal-open');returnFocus?.focus?.({preventScroll:true});};
openMenu=function(){returnFocus=document.activeElement;originalOpenMenu();document.body.classList.add('modal-open');$('menu').querySelector('button').focus();};
closeMenu=function(){const wasOpen=$('menu').classList.contains('open');originalCloseMenu();document.body.classList.remove('modal-open');if(wasOpen)returnFocus?.focus?.({preventScroll:true});};
document.addEventListener('keydown',e=>{if(!entered&&e.key==='Tab'){const a=$('intro').querySelector('.intro-skip'),b=$('intro').querySelector('.enter-btn');if(e.shiftKey&&document.activeElement===a){e.preventDefault();b.focus();}else if(!e.shiftKey&&document.activeElement===b){e.preventDefault();a.focus();}return;}const dialog=$('modal').classList.contains('open')?$('modal'):$('menu').classList.contains('open')?$('menu'):null;if(!dialog)return;if(e.key==='Escape'){closeModal();closeMenu();}if(e.key==='Tab'){const focus=[...dialog.querySelectorAll('button,input,a[href]')].filter(x=>!x.disabled);const first=focus[0],last=focus[focus.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});
$('app').inert=true;$('player').inert=true;document.body.style.overflow='hidden';
render();initAudio();document.querySelectorAll('.page').forEach(p=>enhancePage(p,p.id.replace('page-','')));
$('intro').querySelector('.enter-btn').focus({preventScroll:true});
