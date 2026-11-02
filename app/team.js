import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.58.0';
const $=id=>document.getElementById(id);
let client,user,member,projects=[],members=[],current=null,epoch=0;
const say=s=>$('status').textContent=s;
const check=r=>{if(r.error)throw r.error;return r.data};
const rpc=async(name,args)=>check(await client.rpc(name,args));
const roleName=r=>({office:'Kantoor',rigger:'Rigger',operator:'Machinist'}[r]||r);
const person=id=>members.find(m=>m.user_id===id)?.name||'Medewerker';
function message(e){return e?.message||'Verzoek niet gelukt. Controleer je verbinding en probeer opnieuw.'}
async function action(button,fn){button.disabled=true;try{await fn()}catch(e){say(message(e))}finally{button.disabled=false}}
function clearPrivate(){epoch++;user=null;member=null;current=null;projects=[];members=[];for(const id of ['lifts','assignments'])$(id).replaceChildren();for(const id of ['workspace','onboarding','office','logout'])$(id).hidden=true;$('identity').textContent='';$('newCode').value='';$('newCode').hidden=true}
async function session(){
  clearPrivate();user=check(await client.auth.getUser())?.user;
  if(!user){$('auth').hidden=false;return}
  $('auth').hidden=true;$('logout').hidden=false;
  member=check(await client.from('hlc_members').select('*').eq('user_id',user.id).maybeSingle());
  $('onboarding').hidden=!!member;
  if(!member){say('Maak een bedrijf aan of gebruik de uitnodigingscode van kantoor.');return}
  $('identity').textContent=member.name+' · '+roleName(member.role);
  $('workspace').hidden=false;$('office').hidden=member.role!=='office';
  await refresh();say('Verbonden. Projecten en foto’s worden online opgeslagen.');
}
async function refresh(){
  const selected=$('project').value;
  projects=check(await client.from('hlc_projects').select('*').order('created_at',{ascending:false}));
  members=check(await client.from('hlc_members').select('*').order('name'));
  $('project').replaceChildren();
  for(const p of projects){const o=document.createElement('option');o.value=p.id;o.textContent=p.name;$('project').append(o)}
  if(projects.some(p=>p.id===selected))$('project').value=selected;
  await loadProject();
}
async function loadProject(){
  const generation=++epoch;
  current=projects.find(p=>p.id===$('project').value)||null;
  $('projectLocation').textContent=current?.location||(!current?'Nog geen projecten toegewezen.':'');
  $('liftPanel').hidden=!current;$('assignPanel').hidden=!current||member.role!=='office';
  $('assignments').replaceChildren();$('lifts').replaceChildren();if(!current)return;
  const projectId=current.id;
  const assigned=check(await client.from('hlc_assignments').select('user_id').eq('project_id',projectId));
  if(generation!==epoch)return;
  if(member.role==='office')for(const m of members){
    const label=document.createElement('label');label.className='check';const c=document.createElement('input');c.type='checkbox';c.checked=assigned.some(a=>a.user_id===m.user_id);
    c.onchange=()=>action(c,async()=>{try{await rpc('hlc_assign',{project:projectId,member:m.user_id,assigned:c.checked});say('Toewijzing opgeslagen.')}catch(e){c.checked=!c.checked;throw e}});
    label.append(c,document.createTextNode(m.name+' · '+roleName(m.role)));$('assignments').append(label);
  }
  const lifts=check(await client.from('hlc_lifts').select('*').eq('project_id',projectId).order('created_at',{ascending:false}));
  if(generation!==epoch)return;
  if(!lifts.length)$('lifts').textContent='Nog geen hijsen geregistreerd.';
  for(const lift of lifts){
    const article=document.createElement('article'),h=document.createElement('h3'),p=document.createElement('p'),meta=document.createElement('small');
    h.textContent=lift.crane||'Hijs';p.textContent=lift.description;meta.textContent=person(lift.created_by)+' · '+new Date(lift.created_at).toLocaleString('nl-NL');article.append(h,meta,p);
    const gallery=document.createElement('div');article.append(gallery);
    const photos=check(await client.from('hlc_photos').select('*').eq('lift_id',lift.id).order('created_at'));
    for(const photo of photos){
      const signed=check(await client.storage.from('hlc-photos').createSignedUrl(photo.path,300));
      const figure=document.createElement('figure'),img=document.createElement('img'),caption=document.createElement('figcaption');img.src=signed.signedUrl;img.className='photo';img.alt='Foto bij deze hijs';img.loading='lazy';caption.textContent=person(photo.created_by)+' · '+new Date(photo.created_at).toLocaleString('nl-NL');figure.append(img,caption);gallery.append(figure);
    }
    const input=document.createElement('input');input.type='file';input.accept='image/jpeg,image/png,image/webp';input.setAttribute('aria-label','Foto toevoegen bij deze hijs');
    input.onchange=()=>action(input,async()=>{
      const f=input.files[0];input.value='';if(!f)return;
      if(!['image/jpeg','image/png','image/webp'].includes(f.type)||f.size>10*1024*1024)throw new Error('Kies een JPG-, PNG- of WebP-foto tot 10 MB.');
      const ext={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[f.type];
      const path=projectId+'/'+lift.id+'/'+user.id+'/'+crypto.randomUUID()+'.'+ext;
      check(await client.storage.from('hlc-photos').upload(path,f,{contentType:f.type,upsert:false}));
      try{await rpc('hlc_add_photo',{lift:lift.id,object_path:path})}catch(e){await client.storage.from('hlc-photos').remove([path]);throw e}
      if(projectId===current?.id){await loadProject();say('Foto opgeslagen bij de hijs, met jouw naam en tijdstip.');}
    });article.append(input);
    if(generation!==epoch)return;$('lifts').append(article);
  }
}
$('authForm').onsubmit=e=>{e.preventDefault();action(e.submitter,async()=>{check(await client.auth.signInWithPassword({email:$('email').value.trim(),password:$('password').value}));$('password').value='';await session()})};
$('signup').onclick=e=>{if(!$('authForm').reportValidity())return;action(e.target,async()=>{const r=check(await client.auth.signUp({email:$('email').value.trim(),password:$('password').value}));$('password').value='';if(r.session)await session();else say('Controleer je mailbox om je e-mailadres te bevestigen. Log daarna hier in.')})};
$('logout').onclick=e=>action(e.target,async()=>{check(await client.auth.signOut());clearPrivate();$('auth').hidden=false;say('Uitgelogd.')});
const displayName=()=>{const n=$('displayName').value.trim();if(!n)throw new Error('Vul je volledige naam in.');return n};
$('companyForm').onsubmit=e=>{e.preventDefault();action(e.submitter,async()=>{await rpc('hlc_create_company',{company_name:$('companyName').value.trim(),display_name:displayName()});await session()})};
$('joinForm').onsubmit=e=>{e.preventDefault();action(e.submitter,async()=>{await rpc('hlc_join',{invite_token:$('inviteCode').value.trim(),display_name:displayName()});$('inviteCode').value='';await session()})};
$('projectForm').onsubmit=e=>{e.preventDefault();action(e.submitter,async()=>{const id=await rpc('hlc_create_project',{project_name:$('projectName').value.trim(),project_location:$('location').value.trim()});await refresh();$('project').value=id;await loadProject();e.target.reset();say('Project aangemaakt. Wijs hieronder medewerkers toe.')})};
$('invite').onclick=e=>action(e.target,async()=>{$('newCode').value=await rpc('hlc_create_invite',{member_role:$('inviteRole').value});$('newCode').hidden=false;say('Uitnodigingscode aangemaakt. Deel deze met de bedoelde medewerker.')});
$('liftForm').onsubmit=e=>{e.preventDefault();action(e.submitter,async()=>{if(!current)throw new Error('Kies eerst een project.');await rpc('hlc_create_lift',{project:current.id,lift_description:$('description').value.trim(),crane_name:$('craneName').value.trim()});e.target.reset();await loadProject();say('Hijs opgeslagen. Voeg de foto toe bij de geregistreerde hijs.')})};
$('project').onchange=()=>loadProject().catch(e=>say(message(e)));
$('refresh').onclick=e=>action(e.target,async()=>{await refresh();say('Overzicht vernieuwd.')});
try{
  let response=await fetch('/api/team-config');if(response.status===503||response.status===404)response=await fetch('./team-config.json');if(!response.ok)throw new Error('De online teamomgeving is nog niet aangesloten. De beheerder moet eerst de databasekoppeling activeren.');
  const {url,key}=await response.json();client=createClient(url,key,{auth:{storage:sessionStorage,storageKey:'hlc-team-auth',autoRefreshToken:true,persistSession:true,detectSessionInUrl:false}});
  const data=check(await client.auth.getSession());
  if(data.session)await session();else{$('auth').hidden=false;say('Log in met je persoonlijke account.')}
  client.auth.onAuthStateChange(event=>{if(event==='SIGNED_OUT'){clearPrivate();$('auth').hidden=false;say('Je bent uitgelogd.')}});
}catch(e){say(message(e))}
