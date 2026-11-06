import {REACTIONS,classifyGesture,GestureGate} from './gestures.js';
import {EffectsEngine} from './effects.js';
const $=id=>document.getElementById(id);
const stage=$('stage'),video=$('video'),landmarks=$('landmarks'),lctx=landmarks.getContext('2d');
const fx=new EffectsEngine($('effects')),gate=new GestureGate();
let mirror=true,skeleton=false,sound=false,stream=null,recognizer=null,modelPromise=null,running=false,starting=false,session=0,raf=0,lastVideoTime=-1,lastInference=0,labelTimer,toastTimer,highlightTimer,audioCtx;
let stageW=0,stageH=0,pseudoFullscreen=false;
const connections=[[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],[9,13],[13,14],[14,15],[15,16],[13,17],[17,18],[18,19],[19,20],[0,17]];
function toast(message){$('toast').textContent=message;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),4200)}
function resize(){const r=stage.getBoundingClientRect();stageW=r.width;stageH=r.height;fx.resize(r.width,r.height);const dpr=Math.min(devicePixelRatio||1,2);landmarks.width=r.width*dpr;landmarks.height=r.height*dpr;lctx.setTransform(dpr,0,0,dpr,0,0)}
new ResizeObserver(resize).observe(stage);
function playSound(kind){
  if(!sound)return;
  try{audioCtx??=new (window.AudioContext||window.webkitAudioContext)();audioCtx.resume();const notes=kind==='rain'?[220,196,165]:[523.25,659.25,783.99,1046.5];notes.forEach((f,i)=>{const t=audioCtx.currentTime+i*.095,o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type='sine';o.frequency.value=f;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.055,t+.015);g.gain.exponentialRampToValueAtTime(.001,t+.45);o.connect(g);g.connect(audioCtx.destination);o.start(t);o.stop(t+.5)})}catch{sound=false;$('soundButton').classList.remove('active');$('soundButton').setAttribute('aria-pressed','false');toast('当前浏览器暂不支持音效')}
}
function triggerEffect(kind,manual=false){
  fx.trigger(kind);playSound(kind);
  const info=REACTIONS[kind];$('reactionLabel').textContent=`${info.emoji}  ${info.label}${manual?' · 预览':''}`;$('reactionLabel').classList.add('show');
  clearTimeout(labelTimer);labelTimer=setTimeout(()=>$('reactionLabel').classList.remove('show'),2800);
  document.querySelectorAll('.reaction-card').forEach(el=>el.classList.toggle('selected',el.dataset.effect===kind));
  clearTimeout(highlightTimer);highlightTimer=setTimeout(()=>document.querySelectorAll('.reaction-card').forEach(el=>el.classList.remove('selected')),4000);
  if(manual && innerWidth<850 && stage.getBoundingClientRect().bottom<100)stage.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'center'});
}
document.querySelectorAll('.reaction-card').forEach(el=>el.addEventListener('click',()=>triggerEffect(el.dataset.effect,true)));
$('demoButton').addEventListener('click',()=>triggerEffect(['hearts','balloons','confetti','fireworks','stars'][Math.floor(Math.random()*5)],true));

function withTimeout(promise,ms,message){let timer;return Promise.race([promise,new Promise((_,reject)=>timer=setTimeout(()=>reject(new Error(message)),ms))]).finally(()=>clearTimeout(timer))}
async function loadModel(){
  if(recognizer)return recognizer;
  if(!modelPromise)modelPromise=(async()=>{
    const {FilesetResolver,GestureRecognizer}=await import('./assets/vision_bundle.mjs');
    const files=await FilesetResolver.forVisionTasks(new URL('./assets/wasm',location.href).href);
    const base={modelAssetPath:new URL('./assets/gesture_recognizer.task',location.href).href};
    const options={baseOptions:{...base,delegate:'GPU'},runningMode:'VIDEO',numHands:2,minHandDetectionConfidence:.55,minHandPresenceConfidence:.55,minTrackingConfidence:.5};
    try{recognizer=await GestureRecognizer.createFromOptions(files,options)}catch{recognizer=await GestureRecognizer.createFromOptions(files,{...options,baseOptions:{...base,delegate:'CPU'}})}
    return recognizer;
  })().catch(e=>{modelPromise=null;throw e});
  return withTimeout(modelPromise,45000,'识别引擎加载超时，请检查网络后重试。');
}
function supportsGraphics(){
  try{const canvas=document.createElement('canvas'),gl=canvas.getContext('webgl2')||canvas.getContext('webgl');if(!gl)return false;gl.getExtension('WEBGL_lose_context')?.loseContext();return true}catch{return false}
}
function updateCameraUi(){
  $('startHero').disabled=starting;$('cameraButton').disabled=starting;
  $('cameraButtonText').textContent=starting?'正在准备…':running?'关闭摄像头':'开启摄像头';
  $('cameraButton').classList.toggle('running',running);
  $('idleContent').classList.toggle('hidden',running||starting);stage.classList.toggle('camera-on',running||starting);
  $('idleContent').inert=running||starting;
  $('recognition').hidden=!running;$('stageBottom').hidden=running||starting;
  $('cameraMessage').hidden=!starting;
  $('modeBadge').innerHTML=`<span></span> ${running?'实时识别中':starting?'正在连接':'你的魔法主场'}`;
}
async function startCamera(){
  if(starting)return;if(running){stopCamera();return}
  if(!window.isSecureContext){toast('摄像头需要安全连接，请通过网页的 HTTPS 链接打开。');return}
  if(!navigator.mediaDevices?.getUserMedia){toast('此浏览器无法使用摄像头，请用 Safari、Chrome 或 Edge 打开。');return}
  if(!supportsGraphics()){toast('此浏览器暂未提供识别所需的图形支持，请用系统 Chrome 或 Safari 打开。你仍可以点击卡片预览特效。');return}
  starting=true;const current=++session;updateCameraUi();$('cameraMessageText').textContent='请允许使用摄像头…';
  try{
    const media=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:{ideal:640},height:{ideal:480},frameRate:{ideal:24,max:30}},audio:false});
    if(current!==session){media.getTracks().forEach(t=>t.stop());return}
    stream=media;video.srcObject=media;
    await withTimeout(video.play(),15000,'摄像头画面未能播放，请重新开启。');
    video.classList.add('visible');$('cameraMessageText').textContent='首次开启，正在准备识别引擎…';
    await loadModel();
    if(current!==session)return;
    running=true;starting=false;gate.reset();lastVideoTime=-1;lastInference=0;updateCameraUi();
    $('recognitionTitle').textContent='等待你的手势';$('recognitionSubtitle').textContent='让双手完整进入画面';$('recognitionIcon').textContent='✧';$('holdProgress').style.height='0%';
    for(const track of media.getVideoTracks())track.addEventListener('ended',()=>{if(running){stopCamera();toast('摄像头已断开，点击即可重新开启。')}},{once:true});
    raf=requestAnimationFrame(detect);
  }catch(err){
    if(current!==session)return;
    stopCamera();
    const messages={NotAllowedError:'未获得摄像头权限。请在浏览器的网站权限中允许摄像头，再点击重试。',NotFoundError:'没有找到摄像头。你仍可以点击右侧卡片体验所有特效。',NotReadableError:'摄像头暂时不可用，可能正被其他应用使用。请关闭视频通话后重试。',OverconstrainedError:'摄像头不支持此模式，请使用系统浏览器打开。',SecurityError:'浏览器阻止了摄像头，请用系统浏览器打开网页。'};
    toast(messages[err.name]||err.message||'摄像头开启失败，请重试。');
  }
}
function stopCamera(){
  ++session;running=false;starting=false;cancelAnimationFrame(raf);
  if(stream)stream.getTracks().forEach(t=>t.stop());stream=null;video.srcObject=null;video.classList.remove('visible');lctx.clearRect(0,0,stageW,stageH);gate.reset();updateCameraUi();
}
function point(p){
  const vw=video.videoWidth,vh=video.videoHeight,scale=Math.max(stageW/vw,stageH/vh),ox=(stageW-vw*scale)/2,oy=(stageH-vh*scale)/2;
  const x=p.x*vw*scale+ox;return {x:mirror?stageW-x:x,y:p.y*vh*scale+oy};
}
function drawLandmarks(hands){
  lctx.clearRect(0,0,stageW,stageH);if(!skeleton)return;
  for(const hand of hands){const points=hand.map(point);lctx.strokeStyle='#d4efb3aa';lctx.lineWidth=2;lctx.shadowBlur=5;lctx.shadowColor='#ccf3a0';lctx.beginPath();for(const [a,b] of connections){lctx.moveTo(points[a].x,points[a].y);lctx.lineTo(points[b].x,points[b].y)}lctx.stroke();lctx.shadowBlur=0;
    for(let i=0;i<points.length;i++){const p=points[i];lctx.fillStyle=[4,8,12,16,20].includes(i)?'#fff6cf':'#d5efb5';lctx.beginPath();lctx.arc(p.x,p.y,[4,8,12,16,20].includes(i)?3.5:2,0,Math.PI*2);lctx.fill()}
  }
}
function detect(now){
  if(!running)return;
  if(!document.hidden && video.readyState>=2 && now-lastInference>=75 && video.currentTime!==lastVideoTime){
    lastVideoTime=video.currentTime;lastInference=now;
    try{
      const result=recognizer.recognizeForVideo(video,now);drawLandmarks(result.landmarks);
      const key=classifyGesture(result),state=gate.update(key,now);$('holdProgress').style.height=`${state.progress*100}%`;
      if(key){$('recognitionIcon').textContent=REACTIONS[key].emoji;$('recognitionTitle').textContent=REACTIONS[key].title;$('recognitionSubtitle').textContent=state.latched?'放下手，再来一次':state.cooling?'稍等一下，下个惊喜马上来':'保持手势，魔法即将发生'}
      else{$('recognitionIcon').textContent='✧';$('recognitionTitle').textContent=result.landmarks.length?'看到你的手啦':'等待你的手势';$('recognitionSubtitle').textContent=result.landmarks.length?'试试比耶、点赞，或双手比心':'让双手完整进入画面'}
      if(state.trigger)triggerEffect(state.trigger);
    }catch(e){stopCamera();toast('手势识别暂时中断。请重新开启摄像头，或用系统 Chrome、Safari 打开。');return}
  }
  raf=requestAnimationFrame(detect);
}
$('startHero').addEventListener('click',startCamera);$('cameraButton').addEventListener('click',startCamera);
$('mirrorButton').addEventListener('click',()=>{mirror=!mirror;video.style.transform=mirror?'scaleX(-1)':'none';$('mirrorButton').classList.toggle('active',mirror);$('mirrorButton').setAttribute('aria-pressed',String(mirror));if(!running)toast(mirror?'已开启镜像画面':'已关闭镜像画面')});
$('skeletonButton').addEventListener('click',()=>{skeleton=!skeleton;$('skeletonButton').classList.toggle('active',skeleton);$('skeletonButton').setAttribute('aria-pressed',String(skeleton));if(!skeleton)lctx.clearRect(0,0,stageW,stageH);if(!running)toast(skeleton?'摄像头开启后将显示手部骨架':'已关闭骨架显示')});
$('soundButton').addEventListener('click',()=>{sound=!sound;$('soundButton').classList.toggle('active',sound);$('soundButton').setAttribute('aria-pressed',String(sound));$('soundButton').title=sound?'关闭特效音效':'开启特效音效';if(sound)playSound('stars');toast(sound?'特效音效已开启':'特效音效已关闭')});
$('captureButton').addEventListener('click',()=>{
  const canvas=document.createElement('canvas'),scale=2;canvas.width=stageW*scale;canvas.height=stageH*scale;const c=canvas.getContext('2d');c.scale(scale,scale);
  if(running && video.videoWidth){const vw=video.videoWidth,vh=video.videoHeight,r=Math.max(stageW/vw,stageH/vh);c.save();if(mirror){c.translate(stageW,0);c.scale(-1,1)}c.drawImage(video,(stageW-vw*r)/2,(stageH-vh*r)/2,vw*r,vh*r);c.restore()}
  else{const g=c.createRadialGradient(stageW*.5,stageH*.35,0,stageW*.5,stageH*.4,stageW*.7);g.addColorStop(0,'#44404d');g.addColorStop(1,'#22252a');c.fillStyle=g;c.fillRect(0,0,stageW,stageH);c.fillStyle='#f2eef7';c.textAlign='center';c.font='500 22px sans-serif';c.fillText('让表达，多一点想象。',stageW/2,stageH*.46);c.font='11px sans-serif';c.fillStyle='#bbb5c7';c.fillText('GESTURE STUDIO',stageW/2,stageH*.46+28)}
  if(skeleton)c.drawImage(landmarks,0,0,stageW,stageH);c.drawImage($('effects'),0,0,stageW,stageH);c.textAlign='right';c.fillStyle='#ffffffaa';c.font='9px sans-serif';c.fillText('✧ GESTURE STUDIO',stageW-20,stageH-20);
  canvas.toBlob(blob=>{if(!blob){toast('画面保存失败，请重试');return}const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`gesture-studio-${Date.now()}.png`;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);toast('已生成 PNG 照片，请查看浏览器下载记录。')},'image/png');
});
$('fullscreenButton').addEventListener('click',async()=>{
  try{if(document.fullscreenElement){await document.exitFullscreen();return}if(pseudoFullscreen){pseudoFullscreen=false;stage.classList.remove('pseudo-fullscreen');document.body.style.overflow='';return}if(stage.requestFullscreen){await stage.requestFullscreen();return}throw new Error('fallback')}
  catch{pseudoFullscreen=!pseudoFullscreen;stage.classList.toggle('pseudo-fullscreen',pseudoFullscreen);document.body.style.overflow=pseudoFullscreen?'hidden':''}
});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&pseudoFullscreen){pseudoFullscreen=false;stage.classList.remove('pseudo-fullscreen');document.body.style.overflow=''}});
const dialog=$('helpDialog');$('helpButton').addEventListener('click',()=>dialog.showModal());$('closeHelp').addEventListener('click',()=>dialog.close());$('gotIt').addEventListener('click',()=>dialog.close());dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close()}});
document.addEventListener('visibilitychange',()=>{if(document.hidden){gate.reset();lctx.clearRect(0,0,stageW,stageH)}});
window.addEventListener('pagehide',stopCamera);
