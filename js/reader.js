const BOOKS = ["Genesis","Exodus","Leviticus","Numbers","Deuteronomy","Joshua","Judges","Ruth","1 Samuel","2 Samuel","1 Kings","2 Kings","1 Chronicles","2 Chronicles","Ezra","Nehemiah","Esther","Job","Psalms","Proverbs","Ecclesiastes","Song of Solomon","Isaiah","Jeremiah","Lamentations","Ezekiel","Daniel","Hosea","Joel","Amos","Obadiah","Jonah","Micah","Nahum","Habakkuk","Zephaniah","Haggai","Zechariah","Malachi","Matthew","Mark","Luke","John","Acts","Romans","1 Corinthians","2 Corinthians","Galatians","Ephesians","Philippians","Colossians","1 Thessalonians","2 Thessalonians","1 Timothy","2 Timothy","Titus","Philemon","Hebrews","James","1 Peter","2 Peter","1 John","2 John","3 John","Jude","Revelation"];
const CHS = [50,40,27,36,34,24,21,4,31,24,22,25,29,36,10,13,10,42,150,31,12,8,66,52,5,48,12,14,3,9,1,4,7,3,3,3,2,14,4,28,16,24,21,28,16,16,13,6,6,4,4,5,3,6,4,3,1,13,5,5,3,5,1,1,1,22];
const ALIAS = {};
BOOKS.forEach((n, i) => { ALIAS[n.toLowerCase()] = i; ALIAS[n.toLowerCase().replace(/\s+/g,"")] = i; });
Object.assign(ALIAS, {gen:0,exo:1,lev:2,num:3,deut:4,josh:5,judg:6,ru:7,"1sam":8,"2sam":9,"1kgs":10,"2kgs":11,"1chr":12,"2chr":13,ezr:14,neh:15,est:16,ps:18,psalm:18,psalms:18,prov:19,ecc:20,song:21,isa:22,jer:23,lam:24,eze:25,dan:26,hos:27,joel:28,am:29,oba:30,jon:31,mic:32,nah:33,hab:34,zep:35,hag:36,zec:37,mal:38,matt:39,mt:39,mk:40,lk:41,jn:42,john:42,act:43,rom:44,"1cor":45,"2cor":46,gal:47,eph:48,phil:49,col:50,"1th":51,"2th":52,"1tim":53,"2tim":54,tit:55,phm:56,heb:57,jas:58,"1pet":59,"2pet":60,"1jn":61,"2jn":62,"3jn":63,jude:64,rev:65});
const mem = {};
const log = [];
let notes = {};
try { notes = JSON.parse(localStorage.getItem("kjv.quiet.notes") || "{}") || {}; } catch (e) { notes = {}; }
let cur;
try { cur = JSON.parse(localStorage.getItem("kjv.quiet.place") || ""); } catch (e) { cur = null; }
if (!cur || !cur.book) cur = { book: "Matthew", ch: 1, vs: 1 };
let speaking = false, sitting = false, typeSize = +(localStorage.getItem("kjv.quiet.fs") || 19);
const $ = (id) => document.getElementById(id);
function esc(s){ return String(s).replace(/[&<>]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;"}[c])); }
function remember(msg){ log.push(msg); if (log.length > 40) log.shift(); }
function savePlace(){ localStorage.setItem("kjv.quiet.place", JSON.stringify(cur)); }
function saveNotes(){ localStorage.setItem("kjv.quiet.notes", JSON.stringify(notes)); }
function applyType(){ document.documentElement.style.setProperty("--fs", typeSize + "px"); localStorage.setItem("kjv.quiet.fs", String(typeSize)); }
function chapterCount(book){ const i = BOOKS.indexOf(book); return i >= 0 ? CHS[i] : 1; }
function keyOf(book, ch){ return book + ":" + ch; }
function verseKey(book, ch, vs){ return book + ":" + ch + ":" + vs; }
function storeGet(k){ try { const raw = localStorage.getItem("kjv.ch." + k); return raw ? JSON.parse(raw) : null; } catch (e) { return null; } }
function storeSet(k, arr){ try { localStorage.setItem("kjv.ch." + k, JSON.stringify(arr)); } catch (e) {} }
function bookName(t){
  t = String(t || "").toLowerCase().replace(/\./g,"").trim();
  if (ALIAS[t] != null) return BOOKS[ALIAS[t]];
  if (ALIAS[t.replace(/\s+/g,"")] != null) return BOOKS[ALIAS[t.replace(/\s+/g,"")]];
  const hits = BOOKS.filter(n => n.toLowerCase().startsWith(t));
  return hits.length === 1 ? hits[0] : null;
}
function parseRef(raw){
  const s = String(raw || "").trim().replace(/\s+/g, " ");
  const m = s.match(/^((?:[1-3]\s*)?[a-zA-Z][a-zA-Z\s]*?[a-zA-Z])\s+(\d+)(?:\s*:\s*(\d+))?$/);
  if (!m) return null;
  const name = bookName(m[1]);
  if (!name) return null;
  return { book: name, ch: +m[2], vs: m[3] ? +m[3] : 1 };
}
async function load(book, ch){
  const k = keyOf(book, ch);
  if (mem[k] && mem[k].length) return mem[k];
  const stored = storeGet(k);
  if (stored && stored.length) { mem[k] = stored; return stored; }
  if (typeof SEED !== "undefined" && SEED[k] && SEED[k].length) { mem[k] = SEED[k]; return SEED[k]; }
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8000);
  try {
    const r = await fetch("https://bible-api.com/" + encodeURIComponent(book + " " + ch) + "?translation=kjv", { signal: ctrl.signal });
    clearTimeout(t);
    if (!r.ok) throw new Error("Could not open that chapter.");
    const j = await r.json();
    if (!j.verses || !j.verses.length) throw new Error("That chapter is not in this book.");
    const arr = [];
    j.verses.forEach(v => { arr[v.verse - 1] = String(v.text || "").replace(/\s+/g, " ").trim(); });
    mem[k] = arr; storeSet(k, arr); return arr;
  } catch (e) {
    clearTimeout(t);
    throw new Error("Need a connection for " + book + " " + ch + ". Matthew 1 and Genesis 1 are already in this page.");
  }
}
function markHere(){
  const nt = BOOKS.indexOf(cur.book) >= 39;
  $("toOT").classList.toggle("here", !nt);
  $("toNT").classList.toggle("here", nt);
  $("toOT").innerHTML = !nt ? "<small>Old Testament · you are here</small>Genesis" : "<small>Old Testament</small>Go to Genesis";
  $("toNT").innerHTML = nt ? "<small>New Testament · you are here</small>Matthew" : "<small>New Testament</small>Go to Matthew";
}
function paint(verses){
  sitting = false;
  $("reader").classList.remove("sit");
  $("where").innerHTML = cur.book + "  ·  chapter " + cur.ch + " of " + chapterCount(cur.book) + "<small>Tap to pick a chapter</small>";
  $("hint").textContent = "Tap a verse, then Write a note. Tap the verse twice to sit with only that verse.";
  markHere(); savePlace();
  const bits = ["<div class='ch'>" + esc(cur.book.toUpperCase()) + "  " + cur.ch + "</div>"];
  verses.forEach((t, i) => {
    if (!t) return;
    const n = i + 1;
    const nk = verseKey(cur.book, cur.ch, n);
    const mine = notes[nk];
    const on = n === cur.vs ? " on" : "";
    let extra = "";
    if (mine) extra += "<div class='note-card'>" + esc(mine) + "</div>";
    if (n === cur.vs) extra += "<button class='note-btn' type='button' data-note='" + n + "'>" + (mine ? "Edit this note" : "Write a note on this verse") + "</button>";
    bits.push("<div class='verse" + on + "' data-v='" + n + "'><span class='vnum'>" + n + "</span>" + esc(t) + extra + "</div>");
  });
  $("reader").innerHTML = bits.join("");
  const onEl = $("reader").querySelector(".verse.on");
  if (onEl) onEl.scrollIntoView({ block: "center", behavior: "smooth" });
}
function paintFail(msg){
  $("where").textContent = msg;
  $("reader").classList.remove("sit");
  $("reader").innerHTML = "<div class='fail'><p>" + esc(msg) + "</p><div class='row'><button class='btn' type='button' data-ref='Matthew 1'>Open Matthew 1</button><button class='btn' type='button' data-ref='Genesis 1'>Open Genesis 1</button><button class='btn ghost' type='button' id='retry'>Try this chapter again</button></div></div>";
  const r = $("retry");
  if (r) r.onclick = () => openRef({ book: cur.book, ch: cur.ch, vs: cur.vs || 1 });
}
async function openRef(raw){
  const ref = typeof raw === "string" ? parseRef(raw) : raw;
  if (!ref) { remember("Did not understand that. Try Matthew 1"); $("where").textContent = "Did not understand that. Try Matthew 1"; return false; }
  cur = { book: ref.book, ch: ref.ch, vs: ref.vs || 1 };
  try {
    const verses = await load(ref.book, ref.ch);
    if (cur.vs > verses.length) cur.vs = 1;
    paint(verses); remember("Opened " + ref.book + " " + ref.ch); return true;
  } catch (e) { remember(e.message); paintFail(e.message); return false; }
}
async function step(dir){
  const nextCh = cur.ch + dir;
  if (nextCh >= 1 && nextCh <= chapterCount(cur.book)) return openRef({ book: cur.book, ch: nextCh, vs: 1 });
  const i = BOOKS.indexOf(cur.book) + dir;
  if (i < 0 || i >= BOOKS.length) { $("where").textContent = dir > 0 ? "That is the last book." : "That is the first book."; return; }
  const book = BOOKS[i];
  await openRef({ book: book, ch: dir > 0 ? 1 : chapterCount(book), vs: 1 });
}
function show(html){ $("sheet").innerHTML = html; $("overlay").classList.add("show"); }
function hide(){ $("overlay").classList.remove("show"); }
function showNoteEditor(n){
  if (n) cur.vs = +n;
  const nk = verseKey(cur.book, cur.ch, cur.vs);
  const existing = notes[nk] || "";
  show("<h2>Your note</h2><p style='color:#8aa396'>" + esc(cur.book) + " " + cur.ch + ":" + cur.vs + " · stays on this phone</p><textarea id='notebox' class='notebox' rows='6' placeholder='Write what you want to remember…'>" + existing.replace(/</g,"&lt;") + "</textarea><div class='row'><button class='btn' id='saveNote' type='button'>Save note</button><button class='btn ghost' id='delNote' type='button'>Delete note</button><button class='btn ghost' id='closeNote' type='button'>Close</button></div>");
  $("saveNote").onclick = () => {
    const text = ($("notebox").value || "").trim();
    if (text) notes[nk] = text; else delete notes[nk];
    saveNotes(); hide();
    paint(mem[keyOf(cur.book, cur.ch)] || []);
    $("hint").textContent = text ? "Note saved under " + cur.book + " " + cur.ch + ":" + cur.vs + "." : "Note removed.";
  };
  $("delNote").onclick = () => {
    delete notes[nk]; saveNotes(); hide();
    paint(mem[keyOf(cur.book, cur.ch)] || []);
    $("hint").textContent = "Note deleted.";
  };
  $("closeNote").onclick = hide;
  setTimeout(() => { const b = $("notebox"); if (b) b.focus(); }, 50);
}
function showChapters(){
  const n = chapterCount(cur.book);
  const size = n > 60 ? 20 : 10;
  let groups = "";
  for (let start = 1; start <= n; start += size) {
    const end = Math.min(n, start + size - 1);
    let buttons = "";
    for (let c = start; c <= end; c++) {
      const cls = c === cur.ch ? "on" : (Math.abs(c - cur.ch) <= 1 ? "near" : "");
      buttons += "<button type='button' class='"+cls+"' data-ref='"+cur.book+" "+c+"'>"+c+"</button>";
    }
    groups += "<div class='ch-group'><h3>Chapters "+start+"–"+end+"</h3><div class='ch-grid'>"+buttons+"</div></div>";
  }
  show("<div class='ch-head'><h2>"+esc(cur.book)+"</h2><div class='count'>"+n+" chapters</div></div><div class='ch-now'><b>Chapter "+cur.ch+"</b><span>You are here · tap another number to move</span></div>"+groups);
}
function showBooks(){
  const ot = BOOKS.slice(0,39).map(n => "<button class='book' data-ref='"+n+" 1'>"+n+"</button>").join("");
  const nt = BOOKS.slice(39).map(n => "<button class='book' data-ref='"+n+" 1'>"+n+"</button>").join("");
  show("<h2>Choose a book</h2><div class='row' style='margin:0 0 .8rem'><button class='btn' data-ref='Genesis 1' type='button'>Genesis</button><button class='btn' data-ref='Matthew 1' type='button'>Matthew</button></div><p style='color:#8aa396'>Old Testament begins at Genesis. New Testament begins at Matthew.</p>"+ot+"<hr style='border-color:#3d6b55'>"+nt);
}
function showMore(){
  const keys = Object.keys(notes);
  let list = "<p style='color:#8aa396'>No verse notes yet. Tap a verse, then Write a note.</p>";
  if (keys.length) {
    list = keys.map((k) => {
      const parts = k.split(":");
      const ref = parts[0] + " " + parts[1] + ":" + parts[2];
      return "<div class='note-list'><button class='book' data-ref='"+esc(parts[0]+" "+parts[1]+":"+parts[2])+"'>"+esc(ref)+"</button><div class='note-card'>"+esc(notes[k])+"</div></div>";
    }).join("");
  }
  show("<h2>A little more</h2><p>Your notes stay on this phone only.</p><div class='row'><button class='btn' id='smaller' type='button'>Smaller words</button><button class='btn' id='bigger' type='button'>Bigger words</button></div><h2 style='margin-top:1rem'>Your notes</h2>"+list+"<div class='row'><button class='btn ghost' id='closeMore' type='button'>Close</button></div>");
  $("closeMore").onclick = hide;
  $("smaller").onclick = () => { typeSize = Math.max(16, typeSize-2); applyType(); };
  $("bigger").onclick = () => { typeSize = Math.min(28, typeSize+2); applyType(); };
}
function speak(){
  if (!("speechSynthesis" in window)) { $("where").textContent = "This phone cannot read aloud."; return; }
  if (speaking) { speechSynthesis.cancel(); speaking = false; $("listen").textContent = "Read aloud"; return; }
  const verses = mem[keyOf(cur.book, cur.ch)] || [];
  const text = sitting ? (verses[cur.vs-1] || "") : verses.filter(Boolean).join(". ");
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 0.9; speaking = true; $("listen").textContent = "Stop reading";
  u.onend = () => { speaking = false; $("listen").textContent = "Read aloud"; };
  speechSynthesis.speak(u);
}
function sitToggle(n){
  if (sitting && cur.vs === n) {
    sitting = false; $("reader").classList.remove("sit");
    $("hint").textContent = "Whole chapter is back.";
    return;
  }
  cur.vs = n; sitting = true; savePlace();
  [...$("reader").querySelectorAll(".verse")].forEach(el => el.classList.toggle("on", +el.getAttribute("data-v") === n));
  $("reader").classList.add("sit");
  $("hint").textContent = "Sitting with " + cur.book + " " + cur.ch + ":" + n + ".";
}
$("prev").onclick = () => step(-1);
$("next").onclick = () => step(1);
$("toOT").onclick = () => openRef({book:"Genesis", ch:1, vs:1});
$("toNT").onclick = () => openRef({book:"Matthew", ch:1, vs:1});
$("where").onclick = showChapters;
$("books").onclick = showBooks;
$("listen").onclick = speak;
$("more").onclick = showMore;
$("form").onsubmit = (e) => { e.preventDefault(); openRef($("q").value); $("q").value = ""; };
$("overlay").onclick = (e) => {
  if (e.target === $("overlay")) hide();
  const ref = e.target.closest("[data-ref]");
  if (ref) { hide(); openRef(ref.getAttribute("data-ref")); }
};
$("reader").onclick = (e) => {
  const noteBtn = e.target.closest("[data-note]");
  if (noteBtn) { e.stopPropagation(); showNoteEditor(noteBtn.getAttribute("data-note")); return; }
  const go = e.target.closest("[data-ref]");
  if (go) { openRef(go.getAttribute("data-ref")); return; }
  const v = e.target.closest(".verse");
  if (!v) return;
  const n = +v.getAttribute("data-v");
  if (cur.vs === n) sitToggle(n);
  else {
    cur.vs = n; savePlace(); sitting = false; $("reader").classList.remove("sit");
    paint(mem[keyOf(cur.book, cur.ch)] || []);
  }
};
let x0 = 0;
$("reader").addEventListener("touchstart", e => { x0 = e.changedTouches[0].clientX; }, {passive:true});
$("reader").addEventListener("touchend", e => {
  const dx = e.changedTouches[0].clientX - x0;
  if (sitting) return;
  if (dx > 70) step(-1);
  if (dx < -70) step(1);
}, {passive:true});
applyType();
openRef({ book: cur.book, ch: cur.ch, vs: cur.vs || 1 });
