/*! Lagom Clinic chat widget. Embed: <script src=".../widget.js" defer></script>
 *  Optional attributes on the script tag: data-endpoint, data-position="left|right", data-open="1"
 *  Self-contained (shadow DOM): it cannot restyle, or be restyled by, the host page. */
(function () {
  if (window.__lagomChat) return;
  window.__lagomChat = true;

  var script = document.currentScript || document.querySelector('script[src*="widget.js"]');
  var ATTR = function (n, d) { return (script && script.getAttribute("data-" + n)) || d; };
  var ENDPOINT = ATTR("endpoint", "https://euguiuqdjtpwdztifrlc.supabase.co/functions/v1/chat");
  var POSITION = ATTR("position", "auto");
  var PHONE = "0117 987 2075";
  var STORE = "lagomChat.v1";
  var MAX_LEN = 600;

  var LAVENDER = "#363662", OCRE = "#C9762A", TITANIUM = "#E6E4E3", MUTED = "#68677E", BORDER = "#DEDCE0";

  var GREETING = "Hello, I'm the Lagom Clinic's virtual assistant. I can help with appointments, prices and when we have availability. " +
    "I'm an AI, so I can't give medical advice. In an emergency call 999.";
  var CHIPS = [
    "When is your next available appointment?",
    "How much is a GP appointment?",
    "Do you offer video appointments?",
    "Where are you based?"
  ];

  // ---- state -----------------------------------------------------------------
  var state = { sid: rand(), msgs: [], open: false };
  try {
    var saved = JSON.parse(sessionStorage.getItem(STORE) || "null");
    if (saved && saved.sid && Array.isArray(saved.msgs)) state = { sid: saved.sid, msgs: saved.msgs.slice(-30), open: !!saved.open };
  } catch (e) { /* storage blocked: run without persistence */ }
  function save() { try { sessionStorage.setItem(STORE, JSON.stringify(state)); } catch (e) {} }
  function rand() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }

  // ---- fonts (document-level so the shadow tree can use them) -------------------
  if (!document.querySelector('link[data-lagom-chat-font]')) {
    var l = document.createElement("link");
    l.rel = "stylesheet"; l.setAttribute("data-lagom-chat-font", "1");
    l.href = "https://fonts.googleapis.com/css2?family=Raleway:wght@300;400;500;600;700&display=swap";
    document.head.appendChild(l);
  }

  // ---- DOM ----------------------------------------------------------------------
  var host = document.createElement("div");
  host.id = "lagom-chat-host";
  host.style.cssText = "all:initial;position:fixed;z-index:2147483000;bottom:0;right:0;left:auto;";
  var root = host.attachShadow({ mode: "open" });

  root.innerHTML =
    '<style>' +
    ':host{all:initial}' +
    '*{box-sizing:border-box;font-family:Raleway,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}' +
    '.wrap{position:fixed;bottom:20px;right:20px;display:flex;flex-direction:column;align-items:flex-end;gap:12px}' +
    '.wrap.left{right:auto;left:20px;align-items:flex-start}' +
    '.fab{width:60px;height:60px;border-radius:50%;border:0;cursor:pointer;background:' + LAVENDER + ';color:#fff;display:flex;align-items:center;justify-content:center;' +
    'box-shadow:0 6px 18px rgba(54,54,98,.35);transition:transform .15s ease;position:relative}' +
    '.fab:hover{transform:scale(1.06)}.fab:focus-visible,.btn:focus-visible,.chip:focus-visible,textarea:focus-visible{outline:3px solid ' + OCRE + ';outline-offset:2px}' +
    '.fab svg{width:28px;height:28px}.fab .dot{position:absolute;top:2px;right:2px;width:14px;height:14px;border-radius:50%;background:' + OCRE + ';border:2px solid #fff}' +
    '.panel{display:none;width:380px;max-width:calc(100vw - 24px);height:600px;max-height:calc(100vh - 110px);background:#fff;border-radius:14px 14px 14px 14px;' +
    'box-shadow:0 14px 44px rgba(0,0,0,.28);overflow:hidden;flex-direction:column;border:1px solid ' + BORDER + '}' +
    '.panel.open{display:flex}' +
    '.head{background:' + LAVENDER + ';color:#fff;padding:14px 16px;display:flex;align-items:center;gap:12px;border-bottom:3px solid ' + OCRE + '}' +
    '.head .t{flex:1;min-width:0}.head .n{font-family:"Nanum Myeongjo",Georgia,serif;font-size:17px;letter-spacing:.2px}' +
    '.head .s{font-size:11.5px;opacity:.85;margin-top:2px}' +
    '.x{background:transparent;border:0;color:#fff;cursor:pointer;font-size:24px;line-height:1;padding:4px 8px;border-radius:6px}.x:hover{background:rgba(255,255,255,.14)}' +
    '.log{flex:1;overflow-y:auto;padding:14px;background:' + TITANIUM + ';display:flex;flex-direction:column;gap:10px;scroll-behavior:smooth}' +
    '.m{max-width:88%;padding:10px 13px;border-radius:14px;font-size:14px;line-height:1.5;color:' + LAVENDER + ';word-wrap:break-word;overflow-wrap:anywhere}' +
    '.m.bot{background:#fff;border:1px solid ' + BORDER + ';border-bottom-left-radius:4px;align-self:flex-start}' +
    '.m.me{background:' + LAVENDER + ';color:#fff;border-bottom-right-radius:4px;align-self:flex-end}' +
    '.m a{color:' + OCRE + ';font-weight:600;word-break:break-all}.m.me a{color:#fff}' +
    '.m ul{margin:6px 0 6px 18px;padding:0}.m li{margin:2px 0}.m p{margin:0 0 6px}.m p:last-child{margin:0}' +
    '.chips{display:flex;flex-wrap:wrap;gap:8px;align-self:flex-start}' +
    '.chip{border:1px solid ' + OCRE + ';background:#fff;color:' + LAVENDER + ';border-radius:18px;padding:7px 12px;font-size:13px;cursor:pointer}.chip:hover{background:' + OCRE + ';color:#fff}' +
    '.typing{display:flex;gap:4px;padding:12px 14px}.typing i{width:7px;height:7px;border-radius:50%;background:' + MUTED + ';animation:b 1.2s infinite ease-in-out}' +
    '.typing i:nth-child(2){animation-delay:.15s}.typing i:nth-child(3){animation-delay:.3s}' +
    '@keyframes b{0%,60%,100%{opacity:.3;transform:translateY(0)}30%{opacity:1;transform:translateY(-3px)}}' +
    '.note{font-size:11px;color:' + MUTED + ';padding:7px 14px;background:#fff;border-top:1px solid ' + BORDER + ';line-height:1.4}' +
    '.form{display:flex;gap:8px;padding:10px 12px;background:#fff;border-top:1px solid ' + BORDER + ';align-items:flex-end}' +
    'textarea{flex:1;resize:none;border:1px solid ' + BORDER + ';border-radius:10px;padding:9px 11px;font-size:14px;line-height:1.4;max-height:96px;color:' + LAVENDER + '}' +
    '.btn{background:' + OCRE + ';color:#fff;border:0;border-radius:10px;padding:0 14px;height:38px;font-weight:600;cursor:pointer;font-size:14px}' +
    '.btn:disabled{opacity:.5;cursor:default}' +
    '@media(max-width:480px){.wrap{bottom:12px;right:12px}.wrap.left{left:12px}.panel{position:fixed;inset:0;width:100vw;max-width:none;height:100%;max-height:none;border-radius:0;border:0}' +
    '.fab{width:56px;height:56px}}' +
    '@media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important;scroll-behavior:auto!important}}' +
    '</style>' +
    '<div class="wrap" id="wrap">' +
    '<section class="panel" id="panel" role="dialog" aria-label="Lagom Clinic assistant" aria-modal="false">' +
    '<div class="head"><div class="t"><div class="n">The Lagom Clinic</div><div class="s">Virtual assistant · AI, not a clinician</div></div>' +
    '<button class="x" id="close" aria-label="Close chat">&times;</button></div>' +
    '<div class="log" id="log" role="log" aria-live="polite"></div>' +
    '<div class="note">Please don\'t share health details here. Emergency? Call 999. If you ask the team to contact you, we pass on only the name, email and phone you give us, plus a summary, to our clinic inbox (<a href="https://thelagom.co.uk/privacy-policy-2/" target="_blank" rel="noopener" style="color:inherit">privacy</a>). Or phone ' + PHONE + '.</div>' +
    '<form class="form" id="form"><textarea id="q" rows="1" maxlength="' + MAX_LEN + '" placeholder="Ask about appointments, prices…" aria-label="Your message"></textarea>' +
    '<button class="btn" id="send" type="submit">Send</button></form>' +
    '</section>' +
    '<button class="fab" id="fab" aria-label="Open chat with The Lagom Clinic assistant" aria-expanded="false">' +
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.4A8 8 0 1 1 21 12z"/></svg>' +
    '<span class="dot" id="dot"></span></button>' +
    '</div>';

  var $ = function (id) { return root.getElementById(id); };
  var wrap = $("wrap"), panel = $("panel"), fab = $("fab"), log = $("log"), form = $("form"), q = $("q"), send = $("send"), dot = $("dot");
  var busy = false;

  // ---- rendering -----------------------------------------------------------------
  function esc(s) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  function inline(s) {
    s = esc(s);
    s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    s = s.replace(/(https?:\/\/[^\s<)]+[^\s<).,;:!?])/g, function (u) {
      return '<a href="' + u + '" target="_blank" rel="noopener noreferrer">' + shorten(u) + "</a>";
    });
    s = s.replace(/\b(0117 ?987 ?2075)\b/g, '<a href="tel:01179872075">$1</a>');
    s = s.replace(/\b([a-z0-9._-]+@thelagom\.co\.uk)\b/gi, '<a href="mailto:$1">$1</a>');
    return s;
  }
  function shorten(u) {
    if (/online-booking\.semble\.io/.test(u)) return "Open the booking page";
    if (/thelagom\.co\.uk\/book\/?$/.test(u)) return "thelagom.co.uk/book";
    return u.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
  }
  // render(): every character of the message is HTML-escaped by esc() BEFORE any markup is added, and only
  // our own fixed tags (strong, a, ul/li, p, br) are ever produced, so model output cannot inject HTML.
  function render(text) {
    var lines = String(text).split("\n"), out = [], list = false, para = [];
    function flush() { if (para.length) { out.push("<p>" + para.join("<br>") + "</p>"); para = []; } }
    lines.forEach(function (ln) {
      var m = ln.match(/^\s*[-*•]\s+(.*)$/);
      if (m) { flush(); if (!list) { out.push("<ul>"); list = true; } out.push("<li>" + inline(m[1]) + "</li>"); }
      else {
        if (list) { out.push("</ul>"); list = false; }
        if (!ln.trim()) flush(); else para.push(inline(ln));
      }
    });
    if (list) out.push("</ul>");
    flush();
    return out.join("");
  }
  function add(role, text) {
    var d = document.createElement("div");
    d.className = "m " + (role === "user" ? "me" : "bot");
    d.innerHTML = render(text);
    log.appendChild(d);
    scroll();
    return d;
  }
  function scroll() { log.scrollTop = log.scrollHeight; }

  function drawAll() {
    log.innerHTML = "";
    add("assistant", GREETING);
    state.msgs.forEach(function (m) { add(m.role, m.content); });
    if (!state.msgs.length) chips();
  }
  function chips() {
    var c = document.createElement("div");
    c.className = "chips"; c.id = "chips";
    CHIPS.forEach(function (t) {
      var b = document.createElement("button");
      b.className = "chip"; b.type = "button"; b.textContent = t;
      b.addEventListener("click", function () { ask(t); });
      c.appendChild(b);
    });
    log.appendChild(c);
  }

  // ---- chat ------------------------------------------------------------------------
  function ask(text) {
    text = (text || "").trim().slice(0, MAX_LEN);
    if (!text || busy) return;
    var c = $("chips"); if (c) c.remove();
    state.msgs.push({ role: "user", content: text });
    add("user", text);
    save();
    q.value = ""; grow();
    setBusy(true);
    var typing = document.createElement("div");
    typing.className = "m bot typing"; typing.setAttribute("aria-label", "Assistant is typing");
    typing.innerHTML = "<i></i><i></i><i></i>";
    log.appendChild(typing); scroll();

    var ctl = new AbortController();
    var timer = setTimeout(function () { ctl.abort(); }, 60000);
    fetch(ENDPOINT, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sid: state.sid, messages: state.msgs.slice(-14) }), signal: ctl.signal
    }).then(function (r) { return r.json().catch(function () { return {}; }); })
      .then(function (b) { done(typing, b && b.reply); })
      .catch(function () { done(typing, null); })
      .then(function () { clearTimeout(timer); });
  }
  function done(typing, reply) {
    typing.remove();
    var text = reply || "Sorry, I couldn't connect just now. Please phone the clinic on " + PHONE + " or email info@thelagom.co.uk.";
    state.msgs.push({ role: "assistant", content: text });
    add("assistant", text);
    save(); setBusy(false);
    q.focus();
  }
  function setBusy(b) { busy = b; send.disabled = b; }

  // ---- open / close -----------------------------------------------------------------------
  function setOpen(o) {
    state.open = o; save();
    panel.classList.toggle("open", o);
    fab.setAttribute("aria-expanded", String(o));
    fab.style.display = (o && window.matchMedia("(max-width:480px)").matches) ? "none" : "flex";
    if (o) { dot.style.display = "none"; if (!log.childNodes.length) drawAll(); scroll(); setTimeout(function () { q.focus(); }, 50); }
  }
  fab.addEventListener("click", function () { setOpen(!state.open); });
  $("close").addEventListener("click", function () { setOpen(false); fab.focus(); });
  root.addEventListener("keydown", function (e) { if (e.key === "Escape" && state.open) { setOpen(false); fab.focus(); } });
  form.addEventListener("submit", function (e) { e.preventDefault(); ask(q.value); });
  q.addEventListener("keydown", function (e) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(q.value); } });
  function grow() { q.style.height = "auto"; q.style.height = Math.min(q.scrollHeight, 96) + "px"; }
  q.addEventListener("input", grow);

  // ---- placement: keep clear of another chat launcher (e.g. Intercom) --------------------------
  function place() {
    var other = document.querySelector("#intercom-container, .intercom-lightweight-app, .intercom-launcher, iframe[name='intercom-launcher-frame']");
    var left = POSITION === "left" || (POSITION === "auto" && !!other);
    wrap.classList.toggle("left", left);
  }

  function mount() {
    document.body.appendChild(host);
    place(); setTimeout(place, 2500);
    if (state.open || ATTR("open", "") === "1") setOpen(true);
  }
  if (document.body) mount(); else document.addEventListener("DOMContentLoaded", mount);
})();
