const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
test('configuration refuses missing and privileged keys',()=>{
 const handler=require('../api/team-config.js');const old={...process.env};
 function call(method='GET'){const r={setHeader(){},status(n){this.code=n;return this},json(v){this.body=v;return this}};handler({method},r);return r}
 try{
 delete process.env.SUPABASE_URL;delete process.env.SUPABASE_PUBLISHABLE_KEY;assert.equal(call().code,503);
 process.env.SUPABASE_URL='https://example.supabase.co';process.env.SUPABASE_PUBLISHABLE_KEY='sb_secret_hidden';assert.equal(call().code,503);
 process.env.SUPABASE_PUBLISHABLE_KEY='x.'+Buffer.from(JSON.stringify({role:'service_role'})).toString('base64url')+'.x';assert.equal(call().code,503);
 process.env.SUPABASE_PUBLISHABLE_KEY='sb_publishable_example';assert.equal(call().code,200);assert.equal(call('POST').code,405);
 }finally{process.env=old}
});
test('browser: disconnected state, office and rigger views, upload attribution',{skip:!fs.existsSync(require('playwright').chromium.executablePath())},async()=>{
 const {chromium}=require('playwright');const browser=await chromium.launch({headless:true,executablePath:chromium.executablePath(),args:['--no-sandbox']});
 try{for(const role of ['disconnected','office','rigger']){
  const page=await browser.newPage({viewport:{width:390,height:844}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const mock=`export function createClient(){
    const rows={hlc_members:[{user_id:'user-1',company_id:'company-1',name:'Nando',role:${JSON.stringify(role)}}],hlc_projects:[{id:'project-1',name:'Project A',location:'<script>bad()</script>'}],hlc_assignments:[{user_id:'user-1'}],hlc_lifts:[{id:'lift-1',project_id:'project-1',created_by:'user-1',description:'Testhijs',crane:'LTM',created_at:'2026-11-02T10:00:00Z'}],hlc_photos:[]};
    return {auth:{getSession:async()=>({data:{session:{}}}),getUser:async()=>({data:{user:{id:'user-1'}}}),onAuthStateChange(){},signOut:async()=>({data:{}})},
    from(table){return {select(){return this},eq(){return this},order(){return Promise.resolve({data:rows[table]})},maybeSingle(){return Promise.resolve({data:rows[table][0]})}}},
    rpc:async(name,args)=>{window.calls=(window.calls||[]).concat([{name,args}]);return {data:'new-id'}},
    storage:{from(){return {upload:async(path)=>{window.uploadPath=path;return {data:{}}},remove:async()=>({data:{}})}}}};}`;
  await page.route('**/*',async route=>{const url=new URL(route.request().url());
   if(url.hostname==='esm.sh')return route.fulfill({contentType:'text/javascript',body:mock});
   if(url.pathname==='/api/team-config')return route.fulfill({status:role==='disconnected'?503:200,contentType:'application/json',body:JSON.stringify({url:'https://example.supabase.co',key:'sb_publishable_test'})});
   const file=url.pathname.endsWith('team.js')?'app/team.js':'app/team.html';return route.fulfill({contentType:file.endsWith('.js')?'text/javascript':'text/html',body:fs.readFileSync(path.join(root,file),'utf8')});
  });
  await page.goto('https://hlc.test/app/team.html');
  if(role==='disconnected'){await page.getByText('De online teamomgeving is nog niet aangesloten.',{exact:false}).waitFor();assert.equal(await page.locator('#workspace').isVisible(),false)}
  else{
   await page.getByText('Testhijs',{exact:true}).waitFor();assert.equal(await page.locator('#office').isVisible(),role==='office');assert.equal(await page.locator('#assignPanel').isVisible(),role==='office');
   assert.equal(await page.locator('#projectLocation').textContent(),'<script>bad()</script>');
   await page.locator('#lifts input[type=file]').setInputFiles({name:'photo.png',mimeType:'image/png',buffer:Buffer.from('image')});
   await page.waitForFunction(()=>window.calls?.some(c=>c.name==='hlc_add_photo'));
   const call=await page.evaluate(()=>window.calls.find(c=>c.name==='hlc_add_photo'));
   assert.equal(call.args.lift,'lift-1');assert.match(call.args.object_path,/^project-1\/lift-1\/user-1\//);assert.equal('created_by' in call.args,false);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  }
  assert.deepEqual(errors,[]);await page.close();
 }}finally{await browser.close()}
});
