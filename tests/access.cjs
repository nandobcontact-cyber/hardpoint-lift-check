const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'../app/access.js'),'utf8').replace(/^import .*;\n/,'');
async function run({session=null,verified=null,error=null}={}){
 const nodes=new Map(),classes=new Set();
 const node=()=>({children:[],textContent:'',replaceChildren(){this.children=[]},append(c){this.children.push(c)}});
 const document={getElementById(id){if(!nodes.has(id))nodes.set(id,node());return nodes.get(id)},createElement:node,body:{classList:{toggle(c,on){if(on)classes.add(c);else classes.delete(c)}}}};
 let callback,reloads=0;
 const client={auth:{getSession:async()=>({data:{session}}),getUser:async()=>({data:{user:verified},error}),onAuthStateChange(fn){callback=fn},signOut:async()=>({})}};
 const context={document,window:{},sessionStorage:{},location:{reload(){reloads++}},fetch:async()=>({ok:true,status:200,json:async()=>({url:'https://example.supabase.co',key:'sb_publishable_test'})}),createClient:()=>client};
 await vm.runInNewContext('(async()=>{'+source+'})()',context);
 return {nodes,classes,signout:()=>callback('SIGNED_OUT'),reloads:()=>reloads};
}
test('visitor gets login, never logout or app access',async()=>{const r=await run();assert.equal(r.classes.has('account-ready'),false);assert.deepEqual(r.nodes.get('acctBox').children.map(x=>x.textContent),['Inloggen'])});
test('cached session alone cannot open app',async()=>{const r=await run({session:{},error:new Error('Expired')});assert.equal(r.classes.has('account-ready'),false)});
test('verified account opens app with its own identity',async()=>{const r=await run({session:{},verified:{email:'tester@example.com'}});assert.equal(r.classes.has('account-ready'),true);assert.deepEqual(r.nodes.get('acctBox').children.map(x=>x.textContent),['Mijn account','tester@example.com','Uitloggen'])});
test('signout hides app and restores login',async()=>{const r=await run({session:{},verified:{email:'tester@example.com'}});r.signout();assert.equal(r.classes.has('account-ready'),false);assert.equal(r.nodes.get('acctBox').children[0].textContent,'Inloggen')});
