// Only public client configuration is returned. Never use a service/secret key here.
module.exports = function(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='GET')return res.status(405).json({error:'method_not_allowed'});
  const url=process.env.SUPABASE_URL||'',key=process.env.SUPABASE_PUBLISHABLE_KEY||'';
  let valid=key.startsWith('sb_publishable_');
  if(!valid){try{valid=JSON.parse(Buffer.from(key.split('.')[1],'base64url').toString()).role==='anon'}catch{}}
  if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url)||!valid)return res.status(503).json({error:'not_configured'});
  return res.status(200).json({url,key});
};
