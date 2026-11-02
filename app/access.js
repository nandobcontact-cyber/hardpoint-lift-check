import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.58.0';
const $=id=>document.getElementById(id);
let client,user=null;
function render(){
  const box=$('acctBox');box.replaceChildren();
  const link=document.createElement('a');link.className='navbtn';link.href='team.html';
  link.textContent=user?'Mijn account':'Inloggen';box.append(link);
  $('menuAcct').textContent=user?'Mijn account':'Inloggen';
  $('menuAcct').onclick=e=>{e.preventDefault();location.href='team.html'};
  if(user){
    const identity=document.createElement('span');identity.textContent=user.email||'Persoonlijk account';box.append(identity);
    const button=document.createElement('button');button.type='button';button.className='navbtn';button.textContent='Uitloggen';button.id='logoutBtn';
    button.onclick=async()=>{button.disabled=true;try{const {error}=await client.auth.signOut();if(error)throw error;location.reload()}catch(e){$('accessStatus').textContent='Uitloggen is niet gelukt. Probeer opnieuw.';button.disabled=false}};
    box.append(button);
  }
  document.body.classList.toggle('account-ready',!!user);
}
window.hlcRenderAccount=render;render();
try{
  let response=await fetch('/api/team-config',{cache:'no-store'});
  if(response.status===404||response.status===503)response=await fetch('./team-config.json',{cache:'no-store'});
  if(!response.ok)throw new Error('Accountverbinding is nog niet beschikbaar. Probeer later opnieuw.');
  const {url,key}=await response.json();
  client=createClient(url,key,{auth:{storage:sessionStorage,storageKey:'hlc-team-auth',autoRefreshToken:true,persistSession:true,detectSessionInUrl:false}});
  const result=await client.auth.getSession();if(result.error)throw result.error;
  if(result.data.session){const checked=await client.auth.getUser();if(checked.error)throw checked.error;user=checked.data.user;}
  $('accessStatus').textContent=user?'':'Maak een account aan of log in om verder te gaan.';render();
  client.auth.onAuthStateChange(event=>{if(event==='SIGNED_OUT'){user=null;render();$('accessStatus').textContent='Je bent uitgelogd.'}});
}catch(e){user=null;render();$('accessStatus').textContent=e.message||'Account controleren is niet gelukt. Probeer opnieuw.';}
