/* KJV Terminal engine */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reader = $("#reader"), outEl = $("#out"), cmdEl = $("#cmd");
  const modal = $("#modal"), sheet = $("#sheet"), rail = $("#rail");
  const BOOKS = ["Genesis","Exodus","Leviticus","Numbers","Deuteronomy","Joshua","Judges","Ruth","1 Samuel","2 Samuel","1 Kings","2 Kings","1 Chronicles","2 Chronicles","Ezra","Nehemiah","Esther","Job","Psalms","Proverbs","Ecclesiastes","Song of Solomon","Isaiah","Jeremiah","Lamentations","Ezekiel","Daniel","Hosea","Joel","Amos","Obadiah","Jonah","Micah","Nahum","Habakkuk","Zephaniah","Haggai","Zechariah","Malachi","Matthew","Mark","Luke","John","Acts","Romans","1 Corinthians","2 Corinthians","Galatians","Ephesians","Philippians","Colossians","1 Thessalonians","2 Thessalonians","1 Timothy","2 Timothy","Titus","Philemon","Hebrews","James","1 Peter","2 Peter","1 John","2 John","3 John","Jude","Revelation"];
  const ALIAS = {};
  BOOKS.forEach((n, i) => { ALIAS[n.toLowerCase()] = i; ALIAS[n.toLowerCase().replace(/\s+/g,"")] = i; });
  Object.assign(ALIAS, {gen:0,gn:0,exo:1,ex:1,lev:2,lv:2,num:3,nm:3,deut:4,dt:4,josh:5,judg:6,ru:7,rt:7,"1sam":8,"2sam":9,"1kgs":10,"1ki":10,"2kgs":11,"2ki":11,"1chr":12,"1ch":12,"2chr":13,"2ch":13,ezr:14,neh:15,est:16,job:17,ps:18,psa:18,psalm:18,psalms:18,prov:19,prv:19,ecc:20,song:21,sos:21,isa:22,is:22,jer:23,lam:24,eze:25,dan:26,hos:27,joe:28,jl:28,am:29,oba:30,jon:31,mic:32,nah:33,hab:34,zep:35,hag:36,zec:37,mal:38,matt:39,mt:39,mk:40,lk:41,jn:42,jhn:42,jh:42,jo:42,act:43,rom:44,rm:44,"1cor":45,"1co":45,"2cor":46,"2co":46,gal:47,eph:48,phil:49,php:49,col:50,"1th":51,"2th":52,"1tim":53,"1tm":53,"2tim":54,"2tm":54,tit:55,phm:56,heb:57,jas:58,jm:58,"1pet":59,"1pe":59,"2pet":60,"2pe":60,"1jn":61,"1jo":61,"2jn":62,"3jn":63,jud:64,rev:65,re:65});
  const cache = {};
  let cursor = { book: "John", ch: 3, vs: 1 };
  let speaking = false;
  const notes = JSON.parse(localStorage.getItem("kjv.notes") || "{}");
  const marks = JSON.parse(localStorage.getItem("kjv.marks") || "[]");
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  function print(html) {
    const d = document.createElement("div");
    d.className = "term-line";
    d.innerHTML = html;
    outEl.appendChild(d);
    outEl.scrollTop = outEl.scrollHeight;
    while (outEl.children.length > 200) outEl.removeChild(outEl.firstChild);
  }
  function sys(msg, cls) { print('<span class="' + (cls || "ok") + '">▹ ' + esc(msg) + "</span>"); }
  function save() {
    localStorage.setItem("kjv.notes", JSON.stringify(notes));
    localStorage.setItem("kjv.marks", JSON.stringify(marks));
  }
  function recount() {
    const ch = cache[cursor.book + ":" + cursor.ch] || [];
    $("#stV").textContent = String(ch.length);
    $("#stCur").textContent = cursor.book + " " + cursor.ch + ":" + cursor.vs;
    $("#stMk").textContent = String(marks.length);
    $("#stNo").textContent = String(Object.keys(notes).length);
    $("#stLink").textContent = "LIVE";
    $("#mFc").textContent = cursor.book + " " + cursor.ch;
    $("#mCa").textContent = Object.keys(cache).length + " ch";
  }
  function bookName(token) {
    const t = String(token || "").toLowerCase().replace(/\./g, "").replace(/\s+/g, " ").trim();
    if (ALIAS[t] != null) return BOOKS[ALIAS[t]];
    if (ALIAS[t.replace(/\s+/g, "")] != null) return BOOKS[ALIAS[t.replace(/\s+/g, "")]];
    const hits = BOOKS.filter((n) => n.toLowerCase().startsWith(t));
    return hits.length === 1 ? hits[0] : null;
  }
  function parseRef(raw) {
    const s = String(raw || "").trim().replace(/\s+/g, " ").replace(/(\d)\s*:\s*(\d)/, "$1:$2");
    const m = s.match(/^((?:[1-3]\s*)?[a-zA-Z][a-zA-Z\s]*?[a-zA-Z])\s+(\d+)(?:\s*:\s*(\d+)(?:\s*[-–]\s*(\d+))?)?$/);
    if (!m) return null;
    const name = bookName(m[1]);
    if (!name) return null;
    return { book: name, ch: +m[2], vs: m[3] ? +m[3] : 1 };
  }
  async function fetchChapter(book, ch) {
    const k = book + ":" + ch;
    if (cache[k] && cache[k].length) return cache[k];
    const r = await fetch("https://bible-api.com/" + encodeURIComponent(book + " " + ch) + "?translation=kjv");
    if (!r.ok) throw new Error("api " + r.status);
    const j = await r.json();
    if (!j.verses || !j.verses.length) throw new Error("empty chapter");
    const arr = [];
    j.verses.forEach((v) => { arr[v.verse - 1] = String(v.text || "").replace(/\s+/g, " ").trim(); });
    cache[k] = arr;
    return arr;
  }
  function paint(verses) {
    const bits = ['<div class="ch-head"><h2>' + esc(cursor.book.toUpperCase()) + " " + cursor.ch + '</h2><div class="dim">' + verses.filter(Boolean).length + " verses · KJV</div></div>"];
    verses.forEach((t, i) => {
      if (!t) return;
      const n = i + 1;
      const on = n === cursor.vs ? " on" : "";
      const nk = cursor.book + ":" + cursor.ch + ":" + n;
      const note = notes[nk] ? '<div class="note-card dim">' + esc(notes[nk]) + "</div>" : "";
      bits.push('<div class="verse' + on + '" data-v="' + n + '"><span class="vnum">' + n + "</span><span>" + esc(t) + "</span>" + note + "</div>");
    });
    reader.innerHTML = bits.join("");
    const on = reader.querySelector(".verse.on");
    if (on) on.scrollIntoView({ block: "center", behavior: "smooth" });
    recount();
  }
  async function openRef(raw) {
    const ref = typeof raw === "string" ? parseRef(raw) : raw;
    if (!ref) { sys("unparsed ref — try john 3:16", "warn"); return false; }
    try {
      const verses = await fetchChapter(ref.book, ref.ch);
      if (ref.vs > verses.length) { sys("verse overflow — chapter has " + verses.length, "warn"); return false; }
      cursor = { book: ref.book, ch: ref.ch, vs: ref.vs || 1 };
      paint(verses);
      print('<span class="ok">' + esc(ref.book) + " " + ref.ch + ":" + cursor.vs + '</span>  <span class="dim">' + esc(verses[cursor.vs - 1] || "") + "</span>");
      return true;
    } catch (e) {
      sys("fetch missed: " + e.message, "err");
      return false;
    }
  }
  async function step(dir) {
    const nextCh = cursor.ch + dir;
    if (nextCh >= 1) {
      const ok = await openRef({ book: cursor.book, ch: nextCh, vs: 1 });
      if (ok) return;
    }
    const i = BOOKS.indexOf(cursor.book);
    const nb = BOOKS[i + dir];
    if (!nb) { sys("end of canon rail", "warn"); return; }
    await openRef({ book: nb, ch: 1, vs: 1 });
  }
  function showSheet(html) { sheet.innerHTML = html; modal.classList.add("show"); }
  function hideSheet() { modal.classList.remove("show"); }
  function cmdHelp() {
    showSheet('<h3 class="ok">COMMANDS</h3><pre class="dim" style="font-size:12px;line-height:1.55">john 3:16     open a verse\nps 23          chapter\nnext / prev    chapter step\nsearch love    scan current chapter\nbooks          66-book list\ndaily          date-seeded verse\nplan           reading plan\nmark / note    bookmark / annotate\nspeak / mute   read the chapter</pre><p class="dim">Header buttons run the same ops.</p>');
    sys("help");
  }
  function cmdBooks() {
    rail.classList.toggle("open");
    showSheet('<h3 class="ok">66 BOOKS</h3><p class="dim">Tap a name.</p><div>' + BOOKS.map((n, i) => '<span class="ref" data-ref="' + n + ' 1" style="display:inline-block;margin:.2rem .35rem 0 0">' + n + "</span>" + (i === 38 ? "<hr/>" : "")).join("") + "</div>");
    sys("books");
  }
  async function cmdDaily() {
    const d = new Date();
    const seed = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
    sys("daily lock " + d.toISOString().slice(0, 10));
    await openRef({ book: BOOKS[seed % BOOKS.length], ch: (seed % 20) + 1, vs: (seed % 8) + 1 });
  }
  function cmdPlan() {
    const days = [["Matthew 1","Matthew 2","Matthew 3"],["Matthew 4","Matthew 5","Matthew 6"],["John 1","John 2","John 3"],["John 14","John 15","John 16"],["Psalms 23","Psalms 91","Psalms 121"],["Romans 8","1 Corinthians 13","John 3"]];
    showSheet('<h3 class="ok">READING PLAN</h3>' + days.map((chs, i) => '<div class="plan-day"><b>D' + (i + 1) + "</b> " + chs.map((c) => '<span class="ref" data-ref="' + c + '">' + c + "</span>").join(" · ") + "</div>").join(""));
    $("#stPl").textContent = "gospels";
    sys("plan");
  }
  function cmdSpeak() {
    if (!("speechSynthesis" in window)) return sys("no speech engine", "warn");
    if (speaking) { speechSynthesis.cancel(); speaking = false; $("#stPwr").textContent = "idle"; return sys("muted"); }
    const verses = cache[cursor.book + ":" + cursor.ch] || [];
    const u = new SpeechSynthesisUtterance(verses.filter(Boolean).join(". "));
    u.rate = 0.92;
    speaking = true;
    $("#stPwr").textContent = "lectio";
    u.onend = () => { speaking = false; $("#stPwr").textContent = "idle"; };
    speechSynthesis.speak(u);
    sys("lectio " + cursor.book + " " + cursor.ch);
  }
  async function exec(raw) {
    const line = String(raw || "").trim();
    if (!line) return;
    print('<span class="dim">KJV://$</span> ' + esc(line));
    const [verb, ...rest] = line.split(/\s+/);
    const arg = rest.join(" ");
    const v = verb.toLowerCase();
    if (v === "help" || v === "?") return cmdHelp();
    if (v === "clear") { outEl.innerHTML = ""; return; }
    if (v === "books") return cmdBooks();
    if (v === "daily") return cmdDaily();
    if (v === "plan") return cmdPlan();
    if (v === "mark") { marks.push({ ref: cursor.book + " " + cursor.ch + ":" + cursor.vs, t: Date.now() }); save(); recount(); return sys("marked"); }
    if (v === "marks") { marks.forEach((m) => print('<span class="ref" data-ref="' + esc(m.ref) + '">' + esc(m.ref) + "</span>")); return; }
    if (v === "note") {
      const t = prompt("Note for " + cursor.book + " " + cursor.ch + ":" + cursor.vs);
      if (!t) return;
      notes[cursor.book + ":" + cursor.ch + ":" + cursor.vs] = t;
      save(); paint(cache[cursor.book + ":" + cursor.ch] || []); return sys("note locked");
    }
    if (v === "speak" || v === "lectio") return cmdSpeak();
    if (v === "mute" || v === "stop") { speechSynthesis.cancel(); speaking = false; $("#stPwr").textContent = "idle"; return; }
    if (v === "kernel") {
      showSheet('<h3 class="ok">KERNEL</h3><p class="dim">Filter painted verses.</p><textarea id="kbox" class="kernel">function verseKernel(v){ return { keep: true }; }</textarea><p><button class="nx y" type="button" id="kgo">RELOAD</button></p>');
      $("#kgo").onclick = () => {
        try {
          const fn = new Function($("#kbox").value + ";return typeof verseKernel==='function'?verseKernel:null;")();
          const verses = (cache[cursor.book + ":" + cursor.ch] || []).map((t, i) => {
            if (!t) return "";
            try { const r = fn({ book: cursor.book, ch: cursor.ch, n: i + 1, text: t }); return r && r.keep === false ? "" : t; } catch (e) { return t; }
          });
          paint(verses); hideSheet(); sys("kernel hot");
        } catch (e) { sys("kernel fail " + e.message, "err"); }
      };
      return;
    }
    if (v === "map") { sys("map · " + (BOOKS.indexOf(cursor.book) + 1) + " / 66 · " + cursor.book); $("#sidebody").innerHTML = '<div class="ok">MAP</div><div class="dim">' + esc(cursor.book) + "</div>"; return; }
    if (v === "search" || v === "find") {
      const q = arg.trim().toLowerCase();
      if (q.length < 2) return sys("search needs 2+ chars", "warn");
      const hits = [];
      (cache[cursor.book + ":" + cursor.ch] || []).forEach((t, i) => { if (t && t.toLowerCase().includes(q)) hits.push({ n: i + 1, t }); });
      sys(hits.length + ' hit(s) for "' + q + '"');
      hits.forEach((h) => print('<span class="ref" data-ref="' + cursor.book + " " + cursor.ch + ":" + h.n + '">' + cursor.book + " " + cursor.ch + ":" + h.n + '</span>  <span class="dim">' + esc(h.t) + "</span>"));
      return;
    }
    if (v === "next") return step(1);
    if (v === "prev" || v === "back") return step(-1);
    if (v === "who" || v === "about") return sys("KJV Terminal · public-domain King James Version");
    if (parseRef(line)) return openRef(line);
    if (v === "read" || v === "open" || v === "go") return openRef(arg);
    sys('unknown op "' + verb + '" — help', "warn");
  }
  $("#f").addEventListener("submit", (e) => { e.preventDefault(); const v = cmdEl.value; cmdEl.value = ""; exec(v); });
  document.addEventListener("keydown", (e) => {
    if (e.target === cmdEl || e.target.tagName === "TEXTAREA") {
      if (e.key === "Escape") hideSheet();
      return;
    }
    if (e.key === "/") { e.preventDefault(); cmdEl.focus(); }
    if (e.key === "ArrowRight") exec("next");
    if (e.key === "ArrowLeft") exec("prev");
    if (e.key === "Escape") hideSheet();
  });
  document.addEventListener("click", (e) => {
    const act = e.target.closest("[data-act]");
    if (act) {
      const a = act.getAttribute("data-act");
      if (a === "prev") exec("prev");
      else if (a === "next") exec("next");
      else if (a === "books") exec("books");
      else if (a === "daily") exec("daily");
      else if (a === "plan") exec("plan");
      else if (a === "map") exec("map");
      else if (a === "speak") exec(speaking ? "mute" : "speak");
      else if (a === "kernel") exec("kernel");
      else if (a === "help") exec("help");
      return;
    }
    const ref = e.target.closest("[data-ref]");
    if (ref) { e.preventDefault(); hideSheet(); exec(ref.getAttribute("data-ref")); return; }
    const verse = e.target.closest(".verse");
    if (verse) {
      cursor.vs = +verse.getAttribute("data-v");
      $$(".verse", reader).forEach((n) => n.classList.toggle("on", n === verse));
      recount();
    }
    if (e.target === modal) hideSheet();
  });
  let tx = 0;
  reader.addEventListener("touchstart", (e) => { tx = e.changedTouches[0].clientX; }, { passive: true });
  reader.addEventListener("touchend", (e) => {
    const dx = e.changedTouches[0].clientX - tx;
    if (dx > 60) exec("prev");
    if (dx < -60) exec("next");
  }, { passive: true });
  $("#bookrail").innerHTML = BOOKS.map((n, i) => '<div style="margin:0 0 .28rem"><a href="#" class="ref" data-ref="' + n + ' 1" style="color:' + (i < 39 ? "#60efff" : "#00ff87") + '">' + n + "</a></div>").join("");
  sys("KJV Terminal · public domain");
  sys("tap a header button or type a ref");
  exec("John 3:16");
  cmdEl.focus();
})();
