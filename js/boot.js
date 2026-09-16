/* KJV Terminal boot */
(async () => {
  const load = (src) => new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = src;
    s.onload = res;
    s.onerror = rej;
    document.body.appendChild(s);
  });
  try {
    await load("./js/canon.js?v=4");
    return;
  } catch (_) {}
  try {
    const b64 = await (await fetch("./js/kernel.b64")).text();
    const bin = Uint8Array.from(atob(b64.trim()), c => c.charCodeAt(0));
    const stream = new Blob([bin]).stream().pipeThrough(new DecompressionStream("gzip"));
    const text = await new Response(stream).text();
    const s = document.createElement("script");
    s.textContent = text;
    document.body.appendChild(s);
    return;
  } catch (_) {}
  const reader = document.getElementById("reader");
  const out = document.getElementById("out");
  const cmd = document.getElementById("cmd");
  const stV = document.getElementById("stV");
  const stCur = document.getElementById("stCur");
  const stLink = document.getElementById("stLink");
  let book = "John", ch = 3;
  function esc(s){return String(s).replace(/[&<>]/g,c=>({"&":"&","<":"<",">":">"}[c]));}
  async function open(b,c){
    book=b; ch=c;
    stLink.textContent="LIVE";
    stCur.textContent=b+" "+c;
    reader.innerHTML="<p class=dim>loading "+esc(b)+" "+c+"…</p>";
    try{
      const r=await fetch("https://bible-api.com/"+encodeURIComponent(b+" "+c)+"?translation=kjv");
      const j=await r.json();
      const vs=j.verses||[];
      stV.textContent=String(vs.length);
      reader.innerHTML="<div class=ch-head><h2>"+esc((j.reference||(b+" "+c)).toUpperCase())+"</h2><div class=dim>KJV live</div></div>"+
        vs.map(v=>"<div class=verse data-v=\""+v.verse+"\"><span class=vnum>"+v.verse+"</span><span>"+esc((v.text||"").trim())+"</span></div>").join("");
      out.insertAdjacentHTML("beforeend","<div class=term-line><span class=ok>"+esc(j.reference||b)+"</span></div>");
    }catch(e){
      reader.innerHTML="<p class=err>live fetch missed: "+esc(e.message)+"</p>";
    }
  }
  document.getElementById("f").addEventListener("submit",e=>{
    e.preventDefault();
    const raw=(cmd.value||"").trim(); cmd.value="";
    const m=raw.match(/^((?:[1-3]\s*)?[a-zA-Z][a-zA-Z\s]+?)\s+(\d+)/);
    if(m) open(m[1].trim(), +m[2]);
    else if(raw.toLowerCase()==="next") open(book, ch+1);
    else if(raw.toLowerCase()==="prev") open(book, Math.max(1,ch-1));
    else open("John",3);
  });
  document.addEventListener("click",e=>{
    const a=e.target.closest("[data-act]");
    if(!a) return;
    const k=a.getAttribute("data-act");
    if(k==="next") open(book, ch+1);
    if(k==="prev") open(book, Math.max(1,ch-1));
  });
  await open("John",3);
})().catch(e=>{
  document.body.insertAdjacentHTML("beforeend","<pre style=\"color:#ff0080\">boot fail "+e+"</pre>");
});
