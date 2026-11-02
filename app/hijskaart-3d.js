/* Interactive conceptual rigging visualisation. Not a certified lift plan. */
(function(){
function init(){
const stage=document.getElementById('hkStage');if(!stage||document.getElementById('hk3d'))return;
const wrap=document.createElement('section');wrap.id='hk3d';wrap.innerHTML='<div class="hk3d-top"><strong>3D-aanzicht van de aanslag</strong><span>Schematische visualisatie — geen hijsberekening</span></div><canvas aria-label="Draaibare driedimensionale voorstelling van last, hijshaak en stroppen" width="900" height="480"></canvas><div class="hk3d-controls"><label>Rondom bekijken <input id="hk3dOrbit" type="range" min="-180" max="180" value="30"></label><label>Hoogte bekijken <input id="hk3dTilt" type="range" min="10" max="75" value="28"></label><button type="button" id="hk3dReset">Herstel aanzicht</button></div><p class="hk3d-note">Controleer aanslagpunten, zwaartepunt, hoeken en belastingen altijd afzonderlijk. De tekening is illustratief.</p>';
stage.insertAdjacentElement('afterend',wrap);
const canvas=wrap.querySelector('canvas'),ctx=canvas.getContext('2d'),orbit=wrap.querySelector('#hk3dOrbit'),tilt=wrap.querySelector('#hk3dTilt');
const points=[[-1,-.55,-.55],[1,-.55,-.55],[1,-.55,.55],[-1,-.55,.55],[-1,.45,-.55],[1,.45,-.55],[1,.45,.55],[-1,.45,.55]];
function render(){
const w=canvas.width,h=canvas.height,az=+orbit.value*Math.PI/180,el=+tilt.value*Math.PI/180;ctx.clearRect(0,0,w,h);ctx.fillStyle='#e8eef3';ctx.fillRect(0,0,w,h);
function proj(p){let x=p[0]*Math.cos(az)-p[2]*Math.sin(az),z=p[0]*Math.sin(az)+p[2]*Math.cos(az);return [w/2+x*155,h*.64-(p[1]*Math.cos(el)-z*Math.sin(el))*155,z];}
function line(a,b,color,width=4){let p=proj(a),q=proj(b);ctx.beginPath();ctx.moveTo(p[0],p[1]);ctx.lineTo(q[0],q[1]);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.stroke();}
const faces=[[0,1,5,4],[1,2,6,5],[2,3,7,6],[3,0,4,7],[4,5,6,7]];
faces.sort((a,b)=>a.reduce((v,i)=>v+proj(points[i])[2],0)-b.reduce((v,i)=>v+proj(points[i])[2],0));
faces.forEach((face,i)=>{ctx.beginPath();face.forEach((v,j)=>{const p=proj(points[v]);j?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]);});ctx.closePath();ctx.fillStyle=['#8195a6','#a5b4c1','#71899b','#91a5b5','#b8c5d0'][i];ctx.fill();ctx.strokeStyle='#30485a';ctx.lineWidth=2;ctx.stroke();});
const n=document.querySelector('#hkN button[aria-pressed="true"]')?.dataset.n||'1',hitch=document.querySelector('#hkHitch button[aria-pressed="true"]')?.dataset.h||'snoer';
const hook=[0,2.25,0],master=[0,1.88,0];
line(hook,master,'#344454',10);
// Hook block and master link are separate, to make the attachment legible.
const hookPoint=proj(hook),masterPoint=proj(master);
ctx.beginPath();ctx.ellipse(hookPoint[0],hookPoint[1]+9,17,25,0,Math.PI*.1,Math.PI*1.85);ctx.strokeStyle='#273b4a';ctx.lineWidth=9;ctx.stroke();
ctx.beginPath();ctx.ellipse(masterPoint[0],masterPoint[1],11,16,0,0,Math.PI*2);ctx.strokeStyle='#475b6c';ctx.lineWidth=5;ctx.stroke();
// Three distinct conceptual sling paths: direct, choker around the load, basket underneath.
const slingColor='#e46a16';
function path(vertices,width=8){for(let i=1;i<vertices.length;i++)line(vertices[i-1],vertices[i],slingColor,width);}
const positions=n==='2'?[-.65,.65]:[0];
positions.forEach(x=>{
  if(hitch==='recht'){
    path([master,[x,.61,0]],8);
    const p=proj([x,.61,0]);ctx.beginPath();ctx.ellipse(p[0],p[1],9,13,0,0,Math.PI*2);ctx.strokeStyle='#334b5c';ctx.lineWidth=4;ctx.stroke();
  }else if(hitch==='u'){
    // Both legs lead to the hook; the sling returns under the load.
    path([master,[x,.53,-.7],[x,-.65,-.7],[x,-.65,.7],[x,.53,.7],master],7);
  }else{
    // Choker loop goes down one side, under and around the load, then through the eye.
    const eye=[x,.69,-.67];
    path([master,eye,[x,.37,-.7],[x,-.66,-.7],[x,-.66,.7],[x,.36,.7],eye],7);
    const e=proj(eye);ctx.beginPath();ctx.arc(e[0],e[1],7,0,Math.PI*2);ctx.strokeStyle='#344454';ctx.lineWidth=4;ctx.stroke();
  }
});
// Angle indicator is derived from the illustrated leg geometry only.
const angleTarget=hitch==='recht'?[positions[0],.61,0]:[positions[0],.53,-.7];
const dx=angleTarget[0]-master[0],dz=angleTarget[2]-master[2],dy=master[1]-angleTarget[1];
const visualAngle=Math.atan2(Math.hypot(dx,dz),dy)*180/Math.PI;
ctx.font='600 17px sans-serif';ctx.fillStyle='#314b5d';ctx.fillText('Schematische spronghoek: '+visualAngle.toFixed(0)+'°',24,38);
ctx.fillStyle='#263c50';ctx.font='600 20px sans-serif';ctx.fillText('LAST',w/2-27,h*.85);
}
orbit.addEventListener('input',render);tilt.addEventListener('input',render);wrap.querySelector('#hk3dReset').addEventListener('click',()=>{orbit.value=30;tilt.value=28;render();});
document.getElementById('hkHitch')?.addEventListener('click',()=>setTimeout(render,0));document.getElementById('hkN')?.addEventListener('click',()=>setTimeout(render,0));
let start=null;canvas.addEventListener('pointerdown',e=>{start=[e.clientX,+orbit.value];canvas.setPointerCapture(e.pointerId)});canvas.addEventListener('pointermove',e=>{if(!start)return;orbit.value=Math.max(-180,Math.min(180,start[1]+(e.clientX-start[0])*.8));render()});canvas.addEventListener('pointerup',()=>start=null);canvas.addEventListener('pointercancel',()=>start=null);render();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();