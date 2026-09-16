/* KJV Terminal boot — plain canon.js, gzip kernel as fallback */
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
  } catch {
    const b64 = await (await fetch("./js/kernel.b64")).text();
    const bin = Uint8Array.from(atob(b64.trim()), c => c.charCodeAt(0));
    const stream = new Blob([bin]).stream().pipeThrough(new DecompressionStream("gzip"));
    const text = await new Response(stream).text();
    const s = document.createElement("script");
    s.textContent = text;
    document.body.appendChild(s);
  }
})().catch((e) => {
  document.body.insertAdjacentHTML("beforeend", "<pre style=\"color:#ff0080\">boot fail "+e+"</pre>");
});
