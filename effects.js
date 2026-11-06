const TAU=Math.PI*2;
const rand=(a,b)=>a+Math.random()*(b-a);
const palette=['#e9b5ec','#b7dca7','#f1d28e','#f0a5bd','#9db9e6','#d1c2ff'];
export class EffectsEngine{
  constructor(canvas){
    this.canvas=canvas;this.ctx=canvas.getContext('2d');this.items=[];this.events=[];this.width=1;this.height=1;this.last=0;this.current=null;this.started=0;
    this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.tick=this.tick.bind(this);requestAnimationFrame(this.tick);
  }
  resize(w,h){this.width=w;this.height=h;this.dpr=Math.min(devicePixelRatio||1,2);this.canvas.width=w*this.dpr;this.canvas.height=h*this.dpr;this.ctx.setTransform(this.dpr,0,0,this.dpr,0,0)}
  add(p){this.items.push({age:0,life:4,x:this.width/2,y:this.height/2,vx:0,vy:0,size:10,color:'#fff',rotation:0,spin:0,...p})}
  schedule(delay,fn){this.events.push({at:performance.now()+delay,fn})}
  trigger(kind){
    this.current=kind;this.started=performance.now();const w=this.width,h=this.height,n=this.reduced?.4:1;
    if(kind==='hearts'){
      for(let i=0;i<28*n;i++)this.add({type:'heart',x:rand(.1,.9)*w,y:h+rand(0,h*.3),vx:rand(-16,16),vy:rand(-115,-65),size:rand(12,39),life:rand(4,7),color:['#f49bbc','#e66a9b','#ffc1d9'][i%3],rotation:rand(-.3,.3),spin:rand(-.15,.15),wobble:rand(0,TAU)});
      this.add({type:'heart',x:w*.5,y:h*.55,vx:0,vy:-23,size:Math.min(w*.13,70),life:4.5,color:'#f391b9',rotation:-.1});
    }else if(kind==='balloons'){
      for(let i=0;i<12*n;i++)this.add({type:'balloon',x:rand(.08,.92)*w,y:h+rand(65,h*.6),vx:rand(-8,8),vy:rand(-125,-75),size:rand(23,42),life:9,color:palette[i%palette.length],wobble:rand(0,TAU)});
    }else if(kind==='confetti'){
      for(let i=0;i<160*n;i++)this.add({type:'confetti',x:i%2?0:w,y:rand(.4,.85)*h,vx:(i%2?1:-1)*rand(70,310),vy:rand(-390,-100),gravity:180,life:rand(3.5,6),size:rand(4,8),color:palette[i%6],rotation:rand(0,TAU),spin:rand(-7,7)});
    }else if(kind==='fireworks'){
      for(let i=0;i<7*n;i++)this.schedule(i*580,()=>this.firework(rand(.15,.85)*this.width,rand(.18,.55)*this.height,palette[i%6]));
    }else if(kind==='like'){
      this.add({type:'emoji',emoji:'👍',x:w*.5,y:h*.56,vy:-18,size:Math.min(w*.2,105),life:3.8,rotation:-.12});
      for(let i=0;i<30*n;i++){const angle=rand(0,TAU);this.add({type:'star',x:w*.5,y:h*.5,vx:Math.cos(angle)*rand(30,140),vy:Math.sin(angle)*rand(30,120)-35,gravity:15,size:rand(5,12),color:['#dcecaf','#f6d896','#fff3b3'][i%3],life:rand(2,4),spin:rand(-1,1)})}
    }else if(kind==='rain'){
      this.add({type:'cloud',x:w*.5,y:h*.19,size:Math.min(w*.2,110),life:5.5,color:'#a9bbce'});
      for(let i=0;i<110*n;i++)this.add({type:'rain',x:rand(.1,.9)*w,y:rand(-h,0),vx:-25,vy:rand(300,500),size:rand(8,18),life:5,color:'#b4cde8'});
    }else if(kind==='lasers'){
      for(let i=0;i<8*n;i++)this.add({type:'laser',x:i%2?w:0,y:h*.92,angle:-Math.PI*.5+rand(-.65,.65),size:rand(1.5,3),life:4.8,color:['#de9bfa','#88e5c8','#a8b9ff','#ff9ac6'][i%4],phase:rand(0,TAU)});
      for(let i=0;i<30*n;i++)this.add({type:'star',x:rand(0,w),y:rand(0,h),size:rand(2,5),life:4.5,color:palette[i%6],spin:rand(-1,1)});
    }else if(kind==='stars'){
      for(let i=0;i<60*n;i++)this.add({type:'star',x:rand(.05,.95)*w,y:rand(.08,.9)*h,vx:rand(-12,12),vy:rand(-25,-5),size:rand(3,14),life:rand(2.5,5.5),color:['#e7efb7','#f4dc9a','#f1efff'][i%3],rotation:rand(0,TAU),spin:rand(-.6,.6)});
    }
    if(this.items.length>500)this.items.splice(0,this.items.length-500);
  }
  firework(x,y,color){
    const count=this.reduced?28:75;
    this.add({type:'flash',x,y,size:50,life:.45,color});
    for(let i=0;i<count;i++){const a=TAU*i/count,s=rand(50,180);this.add({type:'spark',x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,gravity:42,drag:.45,size:rand(1,2.5),life:rand(1.4,2.9),color})}
  }
  heart(c,s,color){
    const grad=c.createLinearGradient(-s,-s,s,s);grad.addColorStop(0,'#ffe2ee');grad.addColorStop(.25,color);grad.addColorStop(1,'#bc4679');c.fillStyle=grad;
    c.beginPath();c.moveTo(0,s*.87);c.bezierCurveTo(-s*1.5,-s*.1,-s*.78,-s*1.32,0,-s*.45);c.bezierCurveTo(s*.78,-s*1.32,s*1.5,-s*.1,0,s*.87);c.fill();
    c.strokeStyle='#ffffff75';c.lineWidth=Math.max(1,s*.06);c.beginPath();c.ellipse(-s*.43,-s*.38,s*.19,s*.11,-.65,Math.PI,TAU);c.stroke();
  }
  tick(now){
    const dt=Math.min((now-(this.last||now))/1000,.04);this.last=now;
    if(document.hidden){requestAnimationFrame(this.tick);return}
    for(const e of this.events.filter(e=>now>=e.at))e.fn();this.events=this.events.filter(e=>now<e.at);
    const c=this.ctx,w=this.width,h=this.height;c.clearRect(0,0,w,h);
    const time=(now-this.started)/1000;
    if(this.current==='lasers'&&time<5){c.fillStyle=`rgba(30,9,50,${.14*Math.min(1,time)})`;c.fillRect(0,0,w,h)}
    if(this.current==='rain'&&time<5.5){c.fillStyle=`rgba(30,48,68,${.2*Math.min(1,time)*Math.min(1,5.5-time)})`;c.fillRect(0,0,w,h)}
    for(const p of this.items){
      p.age+=dt;if(p.age>=p.life)continue;
      p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=(p.gravity||0)*dt;
      if(p.drag){p.vx*=1-p.drag*dt;p.vy*=1-p.drag*dt}
      p.rotation+=p.spin*dt;
      const fade=Math.min(1,p.age*5,(p.life-p.age)*1.5),s=p.size;c.save();c.globalAlpha=Math.max(0,fade);
      c.translate(p.x+(p.wobble?Math.sin(p.age*1.6+p.wobble)*12:0),p.y);c.rotate(p.rotation);c.fillStyle=p.color;
      if(p.type==='heart'){c.shadowColor=p.color;c.shadowBlur=s*.35;this.heart(c,s,p.color)}
      else if(p.type==='balloon'){
        const g=c.createRadialGradient(-s*.3,-s*.4,1,0,0,s*1.2);g.addColorStop(0,'#fff3');g.addColorStop(.1,p.color);g.addColorStop(.75,p.color);g.addColorStop(1,'#7f689a');c.fillStyle=g;c.beginPath();c.ellipse(0,0,s*.8,s,0,0,TAU);c.fill();c.beginPath();c.moveTo(0,s-1);c.lineTo(-4,s+6);c.lineTo(4,s+6);c.fill();c.strokeStyle='#ffffff45';c.lineWidth=1;c.beginPath();c.moveTo(0,s+6);c.bezierCurveTo(16,s+40,-17,s+75,3,s+110);c.stroke();c.strokeStyle='#ffffff70';c.lineWidth=3;c.beginPath();c.ellipse(-s*.25,-s*.38,s*.18,s*.3,.4,Math.PI,TAU);c.stroke();
      }else if(p.type==='confetti'){c.scale(1,Math.cos(p.age*6));c.fillRect(-s/2,-s,s,s*1.6)}
      else if(p.type==='star'){
        c.globalAlpha*=.65+.35*Math.sin(p.age*4);c.shadowColor=p.color;c.shadowBlur=s;c.beginPath();for(let j=0;j<8;j++){const a=j*Math.PI/4,r=j%2?s*.27:s;j?c.lineTo(Math.cos(a)*r,Math.sin(a)*r):c.moveTo(r,0)}c.closePath();c.fill();
      }else if(p.type==='spark'){
        c.shadowColor=p.color;c.shadowBlur=7;c.fillStyle=p.color;c.beginPath();c.arc(0,0,s,0,TAU);c.fill();c.strokeStyle=p.color;c.lineWidth=s*.6;c.beginPath();c.moveTo(0,0);c.lineTo(-p.vx*.07,-p.vy*.07);c.stroke();
      }else if(p.type==='flash'){
        const g=c.createRadialGradient(0,0,0,0,0,s);g.addColorStop(0,'#ffffffcc');g.addColorStop(.1,p.color);g.addColorStop(1,'#ffffff00');c.fillStyle=g;c.fillRect(-s,-s,s*2,s*2);
      }else if(p.type==='emoji'){c.scale(Math.min(1,p.age*4),Math.min(1,p.age*4));c.font=`${s}px "Apple Color Emoji","Segoe UI Emoji",sans-serif`;c.textAlign='center';c.textBaseline='middle';c.shadowColor='#f4d7a155';c.shadowBlur=35;c.fillText(p.emoji,0,0)}
      else if(p.type==='cloud'){
        c.fillStyle=p.color;c.shadowColor='#7890ad';c.shadowBlur=25;for(const [x,y,r] of [[-.62,.1,.38],[-.3,-.1,.46],[.1,-.28,.55],[.62,.04,.4],[0,.1,.65]]){c.beginPath();c.arc(x*s,y*s,r*s,0,TAU);c.fill()}
      }else if(p.type==='rain'){
        if(p.y>h+30){p.y=-30;p.x=rand(.1,.9)*w}c.strokeStyle=p.color;c.lineWidth=1.5;c.globalAlpha*=.55;c.beginPath();c.moveTo(0,0);c.lineTo(-s*.15,s);c.stroke();
      }else if(p.type==='laser'){
        const angle=p.angle+Math.sin(p.age*.8+p.phase)*.45,l=Math.hypot(w,h)*1.4;
        c.rotate(angle);c.shadowColor=p.color;c.shadowBlur=20;c.strokeStyle=p.color;c.lineWidth=s;c.globalCompositeOperation='screen';c.beginPath();c.moveTo(0,0);c.lineTo(l,0);c.stroke();const g=c.createLinearGradient(0,-22,0,22);g.addColorStop(0,'#0000');g.addColorStop(.5,p.color+'35');g.addColorStop(1,'#0000');c.fillStyle=g;c.beginPath();c.moveTo(0,0);c.lineTo(l,25);c.lineTo(l,-25);c.closePath();c.fill();
      }
      c.restore();
    }
    this.items=this.items.filter(p=>p.age<p.life);requestAnimationFrame(this.tick);
  }
}
