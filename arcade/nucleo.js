/* Arcade do Código — núcleo compartilhado: telas, HUD, sons, desenhos, placar. */
(function(){
  'use strict';
  var $ = function(id){ return document.getElementById(id); };
  var PLACAR = 'https://ntfy.sh/arcade-codigo-es-7b3e19c4a2';
  var INK = '#2f2a4a';
  var A = window.Arcade = { games:{}, order:[], INK:INK, COLORS:['#ff5f8f','#8c73ff','#4fd6a6','#ff8a3d','#3fb4ff'] };

  function wait(ms){ return new Promise(function(r){ setTimeout(r, ms); }); }
  A.wait = wait;

  // ---------- som ----------
  var ac = null, muted = false;
  function tone(f, d, type, vol, delay, slide){
    if(muted) return;
    try{
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      var t = ac.currentTime + (delay || 0);
      var o = ac.createOscillator(), g = ac.createGain();
      o.type = type || 'sine';
      o.frequency.setValueAtTime(f, t);
      if(slide) o.frequency.exponentialRampToValueAtTime(slide, t + d);
      g.gain.setValueAtTime(vol || 0.08, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g); g.connect(ac.destination);
      o.start(t); o.stop(t + d + 0.03);
    }catch(e){}
  }
  A.sfx = {
    click: function(){ tone(660, 0.06, 'triangle', 0.06); },
    pop: function(){ tone(500, 0.12, 'sine', 0.12, 0, 1200); },
    slice: function(){ tone(1500, 0.08, 'sawtooth', 0.025, 0, 400); tone(700, 0.12, 'triangle', 0.07, 0, 1700); },
    good: function(){ tone(880, 0.1, 'triangle', 0.08); tone(1320, 0.12, 'triangle', 0.07, 0.07); },
    bad: function(){ tone(320, 0.35, 'sawtooth', 0.06, 0, 90); },
    gold: function(){ [880, 1175, 1568].forEach(function(f, i){ tone(f, 0.12, 'triangle', 0.08, i * 0.06); }); },
    power: function(){ [523, 784, 1047, 1568].forEach(function(f, i){ tone(f, 0.1, 'square', 0.04, i * 0.05); }); },
    whoosh: function(){ tone(260, 0.16, 'sine', 0.025, 0, 700); },
    tick: function(){ tone(1000, 0.05, 'square', 0.03); },
    beep: function(){ tone(520, 0.12, 'triangle', 0.08); },
    go: function(){ tone(660, 0.15, 'triangle', 0.1); tone(990, 0.25, 'triangle', 0.1, 0.12); },
    win: function(){ [523, 659, 784, 1047, 1319].forEach(function(f, i){ tone(f, 0.2, 'triangle', 0.08, i * 0.11); }); }
  };
  A.vibrate = function(p){ try{ navigator.vibrate && navigator.vibrate(p); }catch(e){} };
  function setMuted(m){
    muted = m;
    $('mute').textContent = m ? '🔇' : '🔊';
    $('mute-menu').textContent = m ? '🔇 Som desligado' : '🔊 Som ligado';
  }

  // ---------- desenhos ----------
  function rr(ctx, x, y, w, h, r){
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function circle(ctx, x, y, r){ ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); }
  A.rr = rr;
  A.circle = circle;

  A.emoji = function(ctx, ch, x, y, size){
    ctx.font = Math.round(size) + 'px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(ch, x, y);
  };

  A.drawMonster = function(ctx, x, y, r, color, t, o){
    o = o || {};
    ctx.save();
    ctx.translate(x + (o.calm ? 0 : Math.sin(t * 0.05) * r * 0.04), y);
    if(o.rot) ctx.rotate(o.rot);
    var lw = Math.max(1.5, r * 0.11);
    if(!o.calm){
      ctx.fillStyle = color; ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1, r * 0.05);
      for(var i = 0; i < 3; i++){
        var a = t * 0.003 + i * 2.1, s = r * 0.24;
        var px = Math.cos(a) * r * 1.28, py = Math.sin(a) * r * 1.28;
        ctx.fillRect(px - s / 2, py - s / 2, s, s); ctx.strokeRect(px - s / 2, py - s / 2, s, s);
      }
    }
    var n = 12, pts = [];
    for(var k = 0; k < n; k++){
      var ang = k / n * Math.PI * 2, f = 1 + 0.06 * Math.sin(ang * 3 + t * 0.008);
      pts.push([Math.cos(ang) * r * f, Math.sin(ang) * r * f * 0.95]);
    }
    ctx.beginPath();
    ctx.moveTo((pts[n - 1][0] + pts[0][0]) / 2, (pts[n - 1][1] + pts[0][1]) / 2);
    for(var j = 0; j < n; j++){
      var p = pts[j], q = pts[(j + 1) % n];
      ctx.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2);
    }
    ctx.closePath();
    ctx.fillStyle = color; ctx.fill();
    ctx.save(); ctx.clip();
    ctx.fillStyle = 'rgba(255,255,255,0.32)';
    ctx.fillRect(-r * 1.3, ((t * 0.0012) % 1 * 2.4 - 1.2) * r, r * 2.6, r * 0.2);
    ctx.beginPath(); ctx.ellipse(-r * 0.4, -r * 0.55, r * 0.28, r * 0.15, -0.5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.lineWidth = lw; ctx.strokeStyle = INK; ctx.stroke();

    if(o.gold){
      ctx.fillStyle = '#fff';
      for(var g = 0; g < 3; g++){
        var ga = t * 0.004 + g * 2.1, gx = Math.cos(ga) * r * 1.5, gy = Math.sin(ga) * r * 1.5, gs = r * 0.16;
        ctx.beginPath(); ctx.moveTo(gx, gy - gs); ctx.lineTo(gx + gs * 0.3, gy); ctx.lineTo(gx, gy + gs); ctx.lineTo(gx - gs * 0.3, gy); ctx.closePath(); ctx.fill();
      }
    }
    if(o.dizzy){
      ctx.strokeStyle = INK; ctx.lineWidth = lw * 0.9; ctx.lineCap = 'round';
      [[-r * 0.33, -r * 0.14], [r * 0.32, -r * 0.18]].forEach(function(e){
        var s2 = r * 0.15;
        ctx.beginPath(); ctx.moveTo(e[0] - s2, e[1] - s2); ctx.lineTo(e[0] + s2, e[1] + s2);
        ctx.moveTo(e[0] + s2, e[1] - s2); ctx.lineTo(e[0] - s2, e[1] + s2); ctx.stroke();
      });
    } else {
      var look = Math.sin(t * 0.002 + x * 0.01) * r * 0.06;
      ctx.fillStyle = '#fff';
      circle(ctx, -r * 0.33, -r * 0.12, r * 0.27); ctx.fill();
      circle(ctx, r * 0.32, -r * 0.18, r * 0.22); ctx.fill();
      ctx.fillStyle = INK;
      circle(ctx, -r * 0.3 + look, -r * 0.08, r * 0.13); ctx.fill();
      circle(ctx, r * 0.34 + look, -r * 0.14, r * 0.11); ctx.fill();
      if(o.angry){
        ctx.strokeStyle = INK; ctx.lineWidth = lw; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(-r * 0.55, -r * 0.48); ctx.lineTo(-r * 0.15, -r * 0.36);
        ctx.moveTo(r * 0.55, -r * 0.5); ctx.lineTo(r * 0.15, -r * 0.4); ctx.stroke();
      }
    }
    ctx.strokeStyle = INK; ctx.lineWidth = lw * 0.8; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(-r * 0.36, r * 0.36); ctx.lineTo(-r * 0.18, r * 0.24); ctx.lineTo(0, r * 0.38);
    ctx.lineTo(r * 0.18, r * 0.24); ctx.lineTo(r * 0.36, r * 0.36);
    ctx.stroke();
    ctx.restore();
  };

  A.drawRobot = function(ctx, x, y, s, mood, t, lean){
    ctx.save();
    ctx.translate(x, y + Math.sin(t * 0.006) * s * 0.03);
    if(lean) ctx.rotate(lean);
    var lw = Math.max(2, s * 0.055);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.strokeStyle = INK;

    ctx.fillStyle = INK;
    circle(ctx, -s * 0.24, s * 0.62, s * 0.11); ctx.fill();
    circle(ctx, s * 0.24, s * 0.62, s * 0.11); ctx.fill();

    var armY = mood === 'happy' ? -s * 0.18 : s * 0.38;
    ctx.lineWidth = s * 0.09;
    ctx.beginPath(); ctx.moveTo(-s * 0.34, s * 0.26); ctx.lineTo(-s * 0.6, armY);
    ctx.moveTo(s * 0.34, s * 0.26); ctx.lineTo(s * 0.6, armY); ctx.stroke();
    ctx.fillStyle = '#8c73ff'; ctx.lineWidth = lw;
    circle(ctx, -s * 0.6, armY, s * 0.09); ctx.fill(); ctx.stroke();
    circle(ctx, s * 0.6, armY, s * 0.09); ctx.fill(); ctx.stroke();

    rr(ctx, -s * 0.38, s * 0.1, s * 0.76, s * 0.5, s * 0.14);
    ctx.fillStyle = '#ffd23f'; ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ff5f8f';
    circle(ctx, 0, s * 0.34, s * 0.08); ctx.fill();

    ctx.beginPath(); ctx.moveTo(0, -s * 0.5); ctx.lineTo(0, -s * 0.72); ctx.stroke();
    ctx.fillStyle = (Math.floor(t / 400) % 2) ? '#ffd23f' : '#ff8a3d';
    circle(ctx, 0, -s * 0.77, s * 0.08); ctx.fill(); ctx.stroke();

    rr(ctx, -s * 0.5, -s * 0.52, s, s * 0.66, s * 0.2);
    ctx.fillStyle = '#8c73ff'; ctx.fill(); ctx.stroke();
    rr(ctx, -s * 0.38, -s * 0.42, s * 0.76, s * 0.46, s * 0.13);
    ctx.fillStyle = INK; ctx.fill();

    var eye = mood === 'sad' ? '#ff5f8f' : '#4fd6a6';
    ctx.fillStyle = eye; ctx.strokeStyle = eye; ctx.lineWidth = s * 0.065;
    if(mood === 'happy'){
      ctx.beginPath(); ctx.arc(-s * 0.16, -s * 0.17, s * 0.08, Math.PI, 0); ctx.stroke();
      ctx.beginPath(); ctx.arc(s * 0.16, -s * 0.17, s * 0.08, Math.PI, 0); ctx.stroke();
    } else if(mood === 'sad'){
      ctx.beginPath();
      ctx.moveTo(-s * 0.24, -s * 0.28); ctx.lineTo(-s * 0.1, -s * 0.2); ctx.lineTo(-s * 0.24, -s * 0.12);
      ctx.moveTo(s * 0.24, -s * 0.28); ctx.lineTo(s * 0.1, -s * 0.2); ctx.lineTo(s * 0.24, -s * 0.12);
      ctx.stroke();
    } else {
      var blink = (t % 3200) < 140;
      var eh = blink ? s * 0.03 : s * 0.15;
      rr(ctx, -s * 0.22, -s * 0.2 - eh / 2, s * 0.12, eh, s * 0.04); ctx.fill();
      rr(ctx, s * 0.1, -s * 0.2 - eh / 2, s * 0.12, eh, s * 0.04); ctx.fill();
    }
    ctx.beginPath();
    if(mood === 'sad') ctx.arc(0, -s * 0.02, s * 0.08, Math.PI * 1.15, Math.PI * 1.85);
    else ctx.arc(0, -s * 0.1, s * 0.08, Math.PI * 0.15, Math.PI * 0.85);
    ctx.stroke();
    ctx.restore();
  };

  A.drawPiece = function(ctx, x, y, s, color, rot){
    ctx.save();
    ctx.translate(x, y);
    if(rot) ctx.rotate(rot);
    ctx.lineWidth = Math.max(2, s * 0.07); ctx.strokeStyle = INK; ctx.fillStyle = color;
    circle(ctx, 0, -s * 0.46, s * 0.15); ctx.fill(); ctx.stroke();
    rr(ctx, -s * 0.45, -s * 0.42, s * 0.9, s * 0.88, s * 0.18); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = '700 ' + Math.round(s * 0.36) + 'px Fredoka, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('</>', 0, s * 0.04);
    ctx.restore();
  };

  A.monsterSVG = function(c){
    return '<svg viewBox="0 0 100 100" aria-hidden="true">' +
      '<rect x="4" y="18" width="13" height="13" fill="' + c + '" stroke="#2f2a4a" stroke-width="3"/>' +
      '<rect x="83" y="64" width="11" height="11" fill="' + c + '" stroke="#2f2a4a" stroke-width="3"/>' +
      '<path d="M50 12c22 0 38 14 38 36S74 88 50 88 12 72 12 48 28 12 50 12z" fill="' + c + '" stroke="#2f2a4a" stroke-width="6"/>' +
      '<circle cx="37" cy="44" r="11" fill="#fff"/><circle cx="64" cy="41" r="9" fill="#fff"/>' +
      '<circle cx="39" cy="46" r="5" fill="#2f2a4a"/><circle cx="66" cy="43" r="4.5" fill="#2f2a4a"/>' +
      '<path d="M33 66l8-6 9 7 9-7 8 6" stroke="#2f2a4a" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  };

  A.canvas = function(stage){
    var cv = document.createElement('canvas');
    cv.className = 'stage-canvas';
    stage.appendChild(cv);
    var ctx = cv.getContext('2d');
    var o = { cv:cv, ctx:ctx, W:0, H:0 };
    o.resize = function(){
      var dpr = Math.min(2, window.devicePixelRatio || 1);
      o.W = stage.clientWidth; o.H = stage.clientHeight;
      cv.width = Math.round(o.W * dpr); cv.height = Math.round(o.H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    o.resize();
    return o;
  };

  A.pos = function(stage, e){
    var r = stage.getBoundingClientRect();
    return { x:e.clientX - r.left, y:e.clientY - r.top };
  };

  // ---------- fluxo do jogo ----------
  A.register = function(g){ A.games[g.id] = g; A.order.push(g.id); };

  var current = null, run = null;

  function show(id){
    ['scr-menu', 'scr-game', 'scr-end'].forEach(function(s){ $(s).hidden = s !== id; });
    if(id === 'scr-menu') startMenuLoop();
  }

  function renderScore(){ $('score').textContent = run ? run.score : 0; }
  function renderHearts(){
    var h = '';
    for(var i = 0; i < run.maxLives; i++) h += '<span class="' + (i < run.lives ? '' : 'lost') + '">❤️</span>';
    $('hearts').innerHTML = h;
  }

  function floatText(label, x, y){
    var e = document.createElement('div');
    e.className = 'float'; e.textContent = label;
    e.style.left = x + 'px'; e.style.top = y + 'px';
    $('stage').appendChild(e);
    setTimeout(function(){ e.remove(); }, 800);
  }
  var toastT = 0;
  function toast(text, kind){
    var stage = $('stage');
    stage.querySelectorAll('.toast').forEach(function(e){ e.remove(); });
    var e = document.createElement('div');
    e.className = 'toast' + (kind ? ' ' + kind : ''); e.textContent = text;
    stage.appendChild(e);
    clearTimeout(toastT);
    toastT = setTimeout(function(){ e.remove(); }, 1700);
  }
  function banner(text){
    var stage = $('stage');
    stage.querySelectorAll('.banner').forEach(function(e){ e.remove(); });
    var e = document.createElement('div');
    e.className = 'banner'; e.textContent = text;
    stage.appendChild(e);
    setTimeout(function(){ e.remove(); }, 1150);
  }

  var api = {
    get running(){ return !!(run && run.running); },
    progress: function(){ return api.running ? Math.min(1, (performance.now() - run.t0) / current.duration) : 0; },
    add: function(n, x, y, label){
      if(!api.running) return;
      run.score += n; renderScore();
      if(x != null) floatText(label || ('+' + n), x, y);
      var s = $('score'); s.classList.remove('bump'); void s.offsetWidth; s.classList.add('bump');
    },
    loseLife: function(msg){
      if(!api.running) return;
      run.lives--; renderHearts();
      if(msg) toast(msg, 'bad');
      var st = $('stage'); st.classList.remove('hurt'); void st.offsetWidth; st.classList.add('hurt');
      A.sfx.bad(); A.vibrate([40, 40, 40]);
      if(run.lives <= 0) finish('lives');
    },
    toast: toast,
    banner: banner,
    float: floatText
  };

  function openHowto(id){
    current = A.games[id];
    var card = $('ht-card');
    card.style.setProperty('--c', current.color);
    card.style.setProperty('--cd', current.colorDark);
    $('ht-title').textContent = current.emoji + ' ' + current.title;
    $('ht-concept').textContent = current.concept;
    $('ht-steps').innerHTML = '';
    current.howto.forEach(function(s){
      var li = document.createElement('li');
      var a = document.createElement('span'); a.textContent = s[0];
      var b = document.createElement('span'); b.textContent = s[1];
      li.appendChild(a); li.appendChild(b);
      $('ht-steps').appendChild(li);
    });
    $('ht-demo').className = 'ht-demo hint-' + current.hint;
    $('ht-target').textContent = current.demoTarget;
    $('howto').hidden = false;
    A.sfx.click();
    $('ht-go').focus();
  }

  function destroyCurrent(){
    if(current && current.destroy) current.destroy();
  }

  async function startGame(){
    $('howto').hidden = true;
    destroyCurrent();
    show('scr-game');
    stopMenuLoop();
    document.body.style.setProperty('--theme', current.color);
    var stage = $('stage');
    stage.innerHTML = '';
    stage.className = 'stage stage-' + current.id;
    var token = {};
    run = { token:token, running:false, score:0, lives:current.lives, maxLives:current.lives, t0:0, raf:0, lastTick:-1 };
    renderScore(); renderHearts();
    $('timefill').style.transform = 'scaleX(1)';
    $('time').classList.remove('low');
    current.setup(api, stage);

    var cd = document.createElement('div');
    cd.className = 'countdown';
    var n = document.createElement('span');
    cd.appendChild(n);
    stage.appendChild(cd);
    var seq = ['3', '2', '1', 'Já!'];
    for(var i = 0; i < seq.length; i++){
      if(!run || run.token !== token) return;
      n.textContent = seq[i];
      n.style.animation = 'none'; void n.offsetWidth; n.style.animation = '';
      if(i < 3) A.sfx.beep(); else A.sfx.go();
      await wait(i < 3 ? 600 : 420);
    }
    if(!run || run.token !== token) return;
    cd.remove();
    run.running = true;
    run.t0 = performance.now();
    current.start();
    run.raf = requestAnimationFrame(clock);
  }

  function clock(){
    if(!api.running) return;
    var p = api.progress();
    $('timefill').style.transform = 'scaleX(' + (1 - p) + ')';
    var left = Math.ceil((1 - p) * current.duration / 1000);
    if(left <= 5){
      $('time').classList.add('low');
      if(left !== run.lastTick && left > 0){ run.lastTick = left; A.sfx.tick(); }
    }
    if(p >= 1){ finish('time'); return; }
    run.raf = requestAnimationFrame(clock);
  }

  async function finish(reason){
    if(!api.running) return;
    run.running = false;
    cancelAnimationFrame(run.raf);
    current.stop();
    banner(reason === 'lives' ? current.failText : 'Tempo! ⏱️');
    var mine = run;
    await wait(1300);
    if(run !== mine) return;
    showEnd(reason);
  }
  api.finish = finish;

  function goMenu(){
    if(run){ run.running = false; cancelAnimationFrame(run.raf); }
    if(current && current.stop) current.stop();
    destroyCurrent();
    run = null;
    $('stage').innerHTML = '';
    $('howto').hidden = true;
    renderMenuBest();
    show('scr-menu');
  }

  // ---------- tela final ----------
  var lastRound = null, sentKey = null;

  function readBest(id){ try{ return parseInt(localStorage.getItem('arcade-best-' + id) || '0', 10) || 0; }catch(e){ return 0; } }
  function saveBest(id, v){ try{ localStorage.setItem('arcade-best-' + id, String(v)); }catch(e){} }

  function showEnd(reason){
    destroyCurrent();
    var g = current, score = run.score;
    var best = readBest(g.id), isRecord = score > best;
    if(isRecord) saveBest(g.id, score);
    var rank = g.ranks.filter(function(r){ return score >= r[0]; })[0];
    $('end-card').style.setProperty('--c', g.color);
    $('end-head').textContent = reason === 'lives' ? g.failText : 'Tempo esgotado! ⏱️';
    $('end-game').textContent = g.emoji + ' ' + g.title;
    $('medal').textContent = rank[1];
    $('final').textContent = score + ' pts';
    $('rank').textContent = rank[2];
    $('stats').innerHTML = '';
    g.stats().forEach(function(s){
      var sp = document.createElement('span'); sp.textContent = s; $('stats').appendChild(sp);
    });
    $('record').textContent = isRecord ? '🎉 Novo recorde neste celular!' : 'Recorde neste celular: ' + best + ' pts';
    $('learn-title').textContent = 'Você praticou: ' + g.concept;
    $('learn').textContent = g.learn;
    lastRound = { g:g.id, score:score };
    resetSendCard();
    $('send-card').hidden = score <= 0;
    show('scr-end');
    A.sfx.win();
    A.confetti();
  }

  // ---------- placar ----------
  var BLOCK_PARTS = ['porra','caralh','merda','bosta','viad','bucet','foda','fuder','cacet','piroc','xoxot','vagabund','arromb','otari','corno','penis','vadia','cuzao','boquet','putinh','putaria'];
  var BLOCK_WORDS = ['cu','pau','fdp','pqp','vsf','tnc','krl','crl','pnc','vtnc','kct','buct','puta','puto','rola','pinto','bicha','xana','xota','pica'];
  function cleanNick(v){ return v.replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 12); }
  function isRude(v){
    var n = v.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/0/g,'o').replace(/1/g,'i').replace(/3/g,'e').replace(/4/g,'a').replace(/5/g,'s').replace(/@/g,'a');
    var flat = n.replace(/[^a-z]/g, '');
    if(BLOCK_PARTS.some(function(w){ return flat.indexOf(w) >= 0; })) return true;
    return n.split(/[^a-z]+/).some(function(t){ return BLOCK_WORDS.indexOf(t) >= 0; });
  }

  function resetSendCard(){
    var card = $('send-card');
    card.classList.remove('done');
    $('send-title').textContent = '🏆 Coloque seu nome no placar!';
    $('send-form').hidden = false;
    $('send-btn').disabled = false;
    $('send-btn').textContent = 'Enviar';
    $('send-note').textContent = 'Use um apelido, não o nome completo.';
    try{ $('nick').value = localStorage.getItem('arcade-nick') || ''; }catch(e){ $('nick').value = ''; }
    sentKey = null;
  }

  async function myPosition(key, game){
    var res = await fetch(PLACAR + '/json?poll=1&since=all', { cache:'no-store' });
    var text = await res.text();
    var list = [];
    text.split('\n').forEach(function(line){
      if(!line) return;
      try{
        var m = JSON.parse(line);
        if(m.event !== 'message') return;
        var d = JSON.parse(m.message);
        if(d.g === game && typeof d.s === 'number' && d.k) list.push(d);
      }catch(e){}
    });
    list.sort(function(a, b){ return b.s - a.s; });
    for(var i = 0; i < list.length; i++) if(list[i].k === key) return { pos:i + 1, total:list.length };
    return null;
  }

  async function sendScore(e){
    e.preventDefault();
    if(!lastRound || sentKey) return;
    var nick = cleanNick($('nick').value), note = $('send-note');
    if(nick.length < 2){ note.textContent = 'Escreva um apelido com pelo menos 2 letras.'; $('nick').focus(); return; }
    if(isRude(nick)){ note.textContent = 'Opa! Escolha outro apelido, por favor 🙂'; $('nick').value = ''; $('nick').focus(); return; }
    var btn = $('send-btn');
    btn.disabled = true; btn.textContent = '...';
    var key = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    try{
      var res = await fetch(PLACAR, { method:'POST', body:JSON.stringify({ g:lastRound.g, n:nick, s:lastRound.score, k:key }) });
      if(!res.ok) throw new Error('status ' + res.status);
      sentKey = key;
      try{ localStorage.setItem('arcade-nick', nick); }catch(e2){}
      $('send-card').classList.add('done');
      $('send-form').hidden = true;
      $('send-title').textContent = '✅ ' + nick + ', você está no placar!';
      note.textContent = 'Olhe o telão do estande 👀';
      A.sfx.gold();
      var p = null;
      for(var tries = 0; tries < 5 && !p; tries++){
        await wait(900);
        try{ p = await myPosition(key, lastRound.g); }catch(e3){}
      }
      if(p){
        $('send-title').textContent = (p.pos <= 3 ? ['🥇', '🥈', '🥉'][p.pos - 1] + ' ' : '✅ ') + nick + ', você ficou em ' + p.pos + 'º lugar!';
        note.textContent = p.total + (p.total === 1 ? ' jogada' : ' jogadas') + ' neste jogo hoje. Olhe o telão do estande 👀';
      }
    }catch(err){
      btn.disabled = false; btn.textContent = 'Enviar';
      note.textContent = 'Não deu para enviar. Confira a internet e toque em Enviar de novo.';
    }
  }

  // ---------- menu ----------
  var menuRaf = 0, menuCtxs = [];
  function buildMenu(){
    var wrap = $('cards');
    wrap.innerHTML = '';
    menuCtxs = [];
    A.order.forEach(function(id){
      var g = A.games[id];
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'gcard';
      b.style.setProperty('--c', g.color);
      b.style.setProperty('--cd', g.colorDark);
      var cv = document.createElement('canvas');
      cv.width = 176; cv.height = 176;
      var info = document.createElement('div');
      var h = document.createElement('h3'); h.textContent = g.title;
      var p = document.createElement('p'); p.textContent = g.tagline;
      var chips = document.createElement('div'); chips.className = 'chips';
      var c1 = document.createElement('span'); c1.className = 'chip'; c1.textContent = g.gesture;
      var c2 = document.createElement('span'); c2.className = 'chip best'; c2.dataset.id = g.id;
      chips.appendChild(c1); chips.appendChild(c2);
      info.appendChild(h); info.appendChild(p); info.appendChild(chips);
      b.appendChild(cv); b.appendChild(info);
      b.addEventListener('click', function(){ openHowto(id); });
      wrap.appendChild(b);
      var ctx = cv.getContext('2d');
      ctx.setTransform(2, 0, 0, 2, 0, 0);
      menuCtxs.push({ ctx:ctx, g:g });
    });
    renderMenuBest();
  }
  function renderMenuBest(){
    document.querySelectorAll('.chip.best').forEach(function(c){
      var b = readBest(c.dataset.id);
      c.textContent = b ? '🏅 Recorde: ' + b : '✨ Novo!';
    });
  }
  function menuFrame(t){
    if($('scr-menu').hidden){ menuRaf = 0; return; }
    menuCtxs.forEach(function(m){
      m.ctx.clearRect(0, 0, 88, 88);
      m.g.drawIcon(m.ctx, 88, 88, t);
    });
    var mc = $('mascot').getContext('2d');
    mc.setTransform(2, 0, 0, 2, 0, 0);
    mc.clearRect(0, 0, 96, 96);
    A.drawMonster(mc, 74, 68 + Math.sin(t * 0.004) * 4, 13, '#ff5f8f', t);
    A.drawRobot(mc, 40, 46, 44, (t % 2400) < 1200 ? 'happy' : 'normal', t);
    menuRaf = requestAnimationFrame(menuFrame);
  }
  function startMenuLoop(){ if(!menuRaf) menuRaf = requestAnimationFrame(menuFrame); }
  function stopMenuLoop(){ cancelAnimationFrame(menuRaf); menuRaf = 0; }

  // ---------- confete ----------
  var cv, cx, parts = [], craf = 0;
  A.confetti = function(){
    if(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var dpr = window.devicePixelRatio || 1;
    cv.width = innerWidth * dpr; cv.height = innerHeight * dpr;
    var cols = ['#ff5f8f', '#ffd23f', '#4fd6a6', '#8c73ff', '#ff8a3d', '#3fb4ff'];
    for(var i = 0; i < 150; i++){
      parts.push({ x:cv.width * (0.2 + Math.random() * 0.6), y:-20 * dpr - Math.random() * cv.height * 0.3,
        vx:(Math.random() - 0.5) * 4 * dpr, vy:(2 + Math.random() * 4) * dpr, s:(6 + Math.random() * 8) * dpr,
        c:cols[i % cols.length], a:Math.random() * 6, va:(Math.random() - 0.5) * 0.3, round:Math.random() < 0.4 });
    }
    if(!craf) craf = requestAnimationFrame(confTick);
  };
  function confTick(){
    cx.clearRect(0, 0, cv.width, cv.height);
    parts.forEach(function(p){
      p.vy += 0.05; p.x += p.vx + Math.sin(p.a) * 0.8; p.y += p.vy; p.a += p.va;
      cx.save(); cx.translate(p.x, p.y); cx.rotate(p.a); cx.fillStyle = p.c;
      if(p.round){ cx.beginPath(); cx.arc(0, 0, p.s / 2.5, 0, 6.3); cx.fill(); }
      else cx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
      cx.restore();
    });
    parts = parts.filter(function(p){ return p.y < cv.height + 30; });
    craf = parts.length ? requestAnimationFrame(confTick) : 0;
    if(!craf) cx.clearRect(0, 0, cv.width, cv.height);
  }

  // ---------- início ----------
  A.boot = function(){
    cv = $('confetti'); cx = cv.getContext('2d');
    var mc = $('mascot'); mc.width = 192; mc.height = 192;
    buildMenu();
    $('ht-go').addEventListener('click', startGame);
    $('ht-back').addEventListener('click', function(){ $('howto').hidden = true; A.sfx.click(); });
    $('btn-home').addEventListener('click', function(){ A.sfx.click(); goMenu(); });
    $('btn-again').addEventListener('click', function(){ startGame(); });
    $('btn-menu').addEventListener('click', function(){ A.sfx.click(); goMenu(); });
    $('mute').addEventListener('click', function(){ setMuted(!muted); });
    $('mute-menu').addEventListener('click', function(){ setMuted(!muted); });
    $('send-form').addEventListener('submit', sendScore);
    document.addEventListener('visibilitychange', function(){ if(document.hidden && api.running) finish('time'); });
    window.addEventListener('resize', function(){ if(current && current.resize && !$('scr-game').hidden) current.resize(); });
    show('scr-menu');
  };
})();
