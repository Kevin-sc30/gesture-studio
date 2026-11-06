export const REACTIONS = {
  hearts: {title:'爱意满屏',emoji:'🫶',label:'把这一刻，比成心形'},
  balloons: {title:'快乐起飞',emoji:'✌️',label:'快乐正在缓缓升空'},
  like: {title:'给你点赞',emoji:'👍',label:'你值得一个大大的赞'},
  confetti: {title:'值得庆祝',emoji:'✌️✌️',label:'为这个瞬间，撒一场彩纸'},
  fireworks: {title:'为你放烟花',emoji:'👍👍',label:'你是今晚最亮的烟火'},
  rain: {title:'小小情绪雨',emoji:'👎',label:'偶尔下雨，也没关系'},
  lasers: {title:'闪耀时刻',emoji:'🤟',label:'这一刻，你自带光芒'},
  stars: {title:'星光问候',emoji:'🖐️',label:'嗨，送你一整片星光'}
};
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export function isHandHeart(hands){
  if(hands.length!==2 || hands.some(h=>h.length<21))return false;
  const [a,b]=hands,s=(dist(a[0],a[9])+dist(b[0],b[9]))/2;
  if(s<.025)return false;
  const indexGap=dist(a[8],b[8])/s,thumbGap=dist(a[4],b[4])/s;
  const topY=(a[8].y+b[8].y)/2,bottomY=(a[4].y+b[4].y)/2;
  // Two touching index tips above two touching thumbs; distinct, separated palms.
  return indexGap<.62 && thumbGap<.65 && bottomY-topY>s*.22 && bottomY-topY<s*1.9 && dist(a[0],b[0])>s*1.05 && Math.abs(a[8].y-b[8].y)<s*.45;
}
export function classifyGesture(result){
  if(isHandHeart(result.landmarks||[]))return 'hearts';
  const names=(result.gestures||[]).map(g=>g?.[0]?.score>=.62?g[0].categoryName:'None');
  if(names.filter(n=>n==='Victory').length===2)return 'confetti';
  if(names.filter(n=>n==='Thumb_Up').length===2)return 'fireworks';
  if(names.includes('ILoveYou'))return 'lasers';
  if(names.includes('Victory'))return 'balloons';
  if(names.includes('Thumb_Up'))return 'like';
  if(names.includes('Thumb_Down'))return 'rain';
  if(names.includes('Open_Palm'))return 'stars';
  return null;
}
export class GestureGate{
  constructor(){this.reset()}
  reset(){this.candidate=null;this.since=0;this.lastTrigger=-Infinity;this.latch=null;this.releaseSince=null}
  update(key,now){
    if(!key){
      if(this.releaseSince===null)this.releaseSince=now;
      if(now-this.releaseSince>=350)this.latch=null;
      this.candidate=null;return {progress:0,trigger:null};
    }
    this.releaseSince=null;
    if(key!==this.candidate){this.candidate=key;this.since=now}
    if(this.latch===key)return {progress:1,trigger:null,latched:true};
    const progress=Math.min(1,(now-this.since)/750);
    if(progress>=1 && now-this.lastTrigger>=3600){this.lastTrigger=now;this.latch=key;return {progress:1,trigger:key,latched:true}}
    return {progress,trigger:null,cooling:now-this.lastTrigger<3600};
  }
}
