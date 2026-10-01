/* Robô Construtor — arraste o robô, pegue peças de código e fuja dos bugs. */
(function(){
  'use strict';
  var A = window.Arcade;
  var PER_VERSION = 8;
  var POWERS = {
    coffee:{ e:'☕', msg:'☕ Café do dev: tudo mais devagar!' },
    shield:{ e:'🛡️', msg:'🛡️ Revisão de código: o próximo bug não passa!' },
    test:{ e:'🧪', msg:'🧪 Teste automático: bugs eliminados!' }
  };
  var PIECE_COLORS = ['#3fb4ff', '#4fd6a6', '#8c73ff', '#ff8a3d'];

  var api, stage, C, raf = 0, last, spawnT = 0, items, parts, rob, st, alive = false;
  var slowUntil = 0, shield = false, hurtUntil = 0, happyUntil = 0, version = 1, pieces = 0, verEl, fillEl, keys = {};

  function size(){ return Math.min(C.W, C.H) * 0.15 + 18; }
  function robY(){ return C.H - size() * 0.8; }

  function setup(_api, _stage){
    api = _api; stage = _stage;
    C = A.canvas(stage);
    stage.insertAdjacentHTML('beforeend',
      '<div class="rb-hud"><b id="rb-ver">App v1.0</b><div class="rb-bar"><div id="rb-fill"></div></div><span id="rb-pow"></span></div>');
    verEl = stage.querySelector('#rb-ver');
    fillEl = stage.querySelector('#rb-fill');
    items = []; parts = [];
    rob = { x:C.W / 2, tx:C.W / 2 };
    st = { pieces:0, hits:0, powers:0 };
    slowUntil = 0; shield = false; hurtUntil = 0; happyUntil = 0; version = 1; pieces = 0; keys = {};
    updateHud();
    stage.addEventListener('pointerdown', onPoint);
    stage.addEventListener('pointermove', onPoint);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    alive = true;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }

  function start(){ spawnT = setTimeout(spawn, 400); }

  function stop(){ clearTimeout(spawnT); }

  function destroy(){
    if(!alive) return;
    alive = false;
    clearTimeout(spawnT);
    cancelAnimationFrame(raf);
    stage.removeEventListener('pointerdown', onPoint);
    stage.removeEventListener('pointermove', onPoint);
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
  }

  function onPoint(e){
    if(e.type === 'pointermove' && e.pointerType === 'mouse' && !e.buttons) return;
    rob.tx = Math.max(size() * 0.6, Math.min(C.W - size() * 0.6, A.pos(stage, e).x));
  }
  function onKeyDown(e){ if(e.key === 'ArrowLeft' || e.key === 'ArrowRight'){ keys[e.key] = true; e.preventDefault(); } }
  function onKeyUp(e){ keys[e.key] = false; }

  function spawn(){
    if(!api.running) return;
    var p = api.progress(), now = performance.now(), roll = Math.random(), type;
    var powerOnScreen = items.some(function(i){ return i.type === 'power'; });
    if(roll < 0.07 && !powerOnScreen && now > slowUntil && !shield) type = 'power';
    else if(roll < 0.12) type = 'gold';
    else if(roll < 0.12 + 0.3 + p * 0.18) type = 'bug';
    else type = 'piece';
    var s = Math.min(C.W, C.H) * 0.075 + 12;
    var it = {
      type:type, s:type === 'bug' ? s * 0.62 : s, x:s + Math.random() * (C.W - 2 * s), y:-s,
      vy:C.H * (0.3 + 0.38 * p) * (type === 'bug' ? 0.9 + Math.random() * 0.4 : 1),
      ph:Math.random() * 6, rot:(Math.random() - 0.5) * 0.6, done:false,
      color:type === 'gold' ? '#ffd23f' : type === 'bug' ? A.COLORS[Math.floor(Math.random() * 2)] : PIECE_COLORS[Math.floor(Math.random() * PIECE_COLORS.length)]
    };
    if(type === 'power'){ var ks = Object.keys(POWERS); it.power = ks[Math.floor(Math.random() * ks.length)]; }
    items.push(it);
    spawnT = setTimeout(spawn, 720 - 330 * p + Math.random() * 150);
  }

  function burst(x, y, color, n){
    for(var i = 0; i < n; i++){
      var a = Math.random() * Math.PI * 2, v = 80 + Math.random() * 200;
      parts.push({ x:x, y:y, vx:Math.cos(a) * v, vy:Math.sin(a) * v - 60, s:4 + Math.random() * 6, color:i % 3 ? color : '#fff', life:0.5 + Math.random() * 0.3 });
    }
  }

  function updateHud(){
    verEl.textContent = 'App v' + version + '.0';
    fillEl.style.width = ((pieces % PER_VERSION) / PER_VERSION * 100) + '%';
    var pw = stage.querySelector('#rb-pow');
    var now = performance.now();
    pw.textContent = (now < slowUntil ? '☕' : '') + (shield ? '🛡️' : '');
  }

  function catchItem(it, now){
    it.done = true;
    var y = robY() - size() * 0.6;
    if(it.type === 'piece' || it.type === 'gold'){
      pieces++; st.pieces++;
      var pts = it.type === 'gold' ? 30 : 10;
      api.add(pts, it.x, y - 10, '+' + pts);
      burst(it.x, it.y, it.color, 10);
      happyUntil = now + 450;
      if(it.type === 'gold') A.sfx.gold(); else A.sfx.pop();
      A.vibrate(10);
      if(pieces % PER_VERSION === 0){
        version++;
        api.add(50, rob.x, y - 50, '🚀 +50');
        api.banner('🚀 App v' + version + '.0 lançado!');
        A.sfx.win();
        burst(rob.x, y, '#ffd23f', 24);
      }
    } else if(it.type === 'bug'){
      if(shield){
        shield = false;
        burst(it.x, it.y, '#4fd6a6', 14);
        api.toast('🛡️ A revisão de código bloqueou o bug!', 'good');
        A.sfx.power();
      } else {
        st.hits++;
        hurtUntil = now + 700;
        burst(it.x, it.y, it.color, 12);
        api.loseLife('Um bug entrou no app! 👾');
      }
    } else if(it.type === 'power'){
      st.powers++;
      A.sfx.power();
      if(it.power === 'coffee') slowUntil = now + 4500;
      if(it.power === 'shield') shield = true;
      if(it.power === 'test'){
        var n = 0;
        items.forEach(function(o){ if(o.type === 'bug' && !o.done){ o.done = true; n++; burst(o.x, o.y, o.color, 10); } });
        if(n) api.add(n * 5, C.W / 2, C.H * 0.35, '🧪 +' + (n * 5));
      }
      api.toast(POWERS[it.power].msg, 'good');
    }
    updateHud();
  }

  function frame(now){
    if(!alive) return;
    var dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    var slow = now < slowUntil ? 0.45 : 1;
    var s = size(), ry = robY();

    if(keys.ArrowLeft) rob.tx = Math.max(s * 0.6, rob.tx - C.W * 1.4 * dt);
    if(keys.ArrowRight) rob.tx = Math.min(C.W - s * 0.6, rob.tx + C.W * 1.4 * dt);
    var prevX = rob.x;
    rob.x += (rob.tx - rob.x) * Math.min(1, dt * 14);
    var lean = Math.max(-0.25, Math.min(0.25, (rob.x - prevX) * 0.02));

    if(api.running){
      var top = ry - s * 0.85, bottom = ry + s * 0.3;
      items.forEach(function(it){
        if(it.done) return;
        it.y += it.vy * dt * slow;
        if(it.type === 'bug') it.x += Math.sin(now * 0.004 + it.ph) * 40 * dt;
        var reach = (it.type === 'bug' ? s * 0.42 : s * 0.62) + it.s * 0.3;
        if(it.y + it.s * 0.4 >= top && it.y - it.s * 0.4 <= bottom && Math.abs(it.x - rob.x) < reach) catchItem(it, now);
        if(it.y > C.H + it.s) it.done = true;
      });
      if(Math.random() < 0.1) updateHud();
    }
    items = items.filter(function(it){ return !it.done; });
    parts.forEach(function(p){ p.vy += C.H * 0.8 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; });
    parts = parts.filter(function(p){ return p.life > 0; });

    draw(now, s, ry, lean, slow < 1);
    raf = requestAnimationFrame(frame);
  }

  function draw(now, s, ry, lean, slowed){
    var ctx = C.ctx, W = C.W, H = C.H;
    var bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, slowed ? '#cfe0ff' : '#c4ecff'); bg.addColorStop(1, '#eadfff');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    for(var i = 0; i < 6; i++){
      var y = ((now * 0.02 + i * 97) % (H + 40)) - 20;
      ctx.fillRect((i * 67) % W, y, 3, 18);
    }
    ctx.fillStyle = '#8ddf6a';
    ctx.fillRect(0, H - s * 0.12, W, s * 0.12);

    items.forEach(function(it){
      if(it.type === 'bug'){
        A.drawMonster(ctx, it.x, it.y, it.s * 0.75, it.color, now, { angry:true });
      } else if(it.type === 'power'){
        ctx.save();
        ctx.fillStyle = '#fff'; ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 4;
        A.circle(ctx, it.x, it.y, it.s * 0.55 + Math.sin(now * 0.01) * 2); ctx.fill(); ctx.stroke();
        A.emoji(ctx, POWERS[it.power].e, it.x, it.y + 2, it.s * 0.6);
        ctx.restore();
      } else {
        A.drawPiece(ctx, it.x, it.y, it.s, it.color, it.rot + Math.sin(now * 0.003 + it.ph) * 0.15);
        if(it.type === 'gold'){
          ctx.fillStyle = '#fff';
          A.circle(ctx, it.x + it.s * 0.5, it.y - it.s * 0.5, 3 + Math.sin(now * 0.02) * 2); ctx.fill();
        }
      }
    });

    parts.forEach(function(p){
      ctx.globalAlpha = Math.min(1, p.life * 2);
      ctx.fillStyle = p.color; ctx.fillRect(p.x - p.s / 2, p.y - p.s / 2, p.s, p.s);
    });
    ctx.globalAlpha = 1;

    var mood = now < hurtUntil ? 'sad' : now < happyUntil ? 'happy' : 'normal';
    if(!(now < hurtUntil && Math.floor(now / 90) % 2)){
      A.drawRobot(ctx, rob.x, ry, s, mood, now, lean);
    }
    if(shield){
      ctx.strokeStyle = 'rgba(79,214,166,0.9)'; ctx.fillStyle = 'rgba(79,214,166,0.15)'; ctx.lineWidth = 4;
      A.circle(ctx, rob.x, ry - s * 0.05, s * 0.95 + Math.sin(now * 0.008) * 3); ctx.fill(); ctx.stroke();
    }
  }

  function drawIcon(ctx, w, h, t){
    var x = w / 2 + Math.sin(t * 0.002) * w * 0.18;
    var py = ((t * 0.06) % (h * 0.7)) - h * 0.1;
    A.drawPiece(ctx, w / 2, py, w * 0.22, '#3fb4ff', 0);
    A.drawRobot(ctx, x, h * 0.66, w * 0.34, 'happy', t, 0);
  }

  function drawPreview(ctx, w, h, t){
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    for(var i = 0; i < 5; i++) ctx.fillRect((i * 73 + 20) % w, ((t * 0.05 + i * 50) % (h + 20)) - 20, 3, 14);
    ctx.fillStyle = '#8ddf6a'; ctx.fillRect(0, h * 0.92, w, h * 0.08);
    var s = Math.min(w, h) * 0.3;
    var rx = w / 2 + Math.sin(t * 0.0016) * w * 0.3;
    var cols = ['#3fb4ff', '#ff8a3d', '#8c73ff', '#ffd23f'];
    for(var k = 0; k < 4; k++){
      var px = w * (0.14 + 0.24 * k), cyc = (t * 0.07 + k * 70) % (h * 1.1);
      var py = cyc - h * 0.12;
      if(k === 2) A.drawMonster(ctx, px, py, s * 0.2, '#ff5f8f', t, { angry:true });
      else A.drawPiece(ctx, px, py, s * 0.36, cols[k], Math.sin(t * 0.003 + k) * 0.2);
    }
    A.drawRobot(ctx, rx, h * 0.92 - s * 0.72, s, (t % 1600) < 500 ? 'happy' : 'normal', t, Math.cos(t * 0.0016) * 0.12);
    var hh = Math.min(34, h * 0.13), hw = Math.min(170, w * 0.56), hx = (w - hw) / 2, hy = Math.max(64, h * 0.22), my = hy + hh / 2;
    A.rr(ctx, hx, hy, hw, hh, 10);
    ctx.fillStyle = 'rgba(255,255,255,0.92)'; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = A.INK; ctx.stroke();
    ctx.fillStyle = A.INK; ctx.font = '700 ' + Math.round(hh * 0.55) + 'px Fredoka, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText('App v2.0', hx + 10, my);
    var barX = hx + 18 + ctx.measureText('App v2.0').width, barW = hx + hw - 10 - barX, fill = (t % 4000) / 4000;
    A.rr(ctx, barX, my - hh * 0.18, barW, hh * 0.36, 4); ctx.fillStyle = 'rgba(47,42,74,0.15)'; ctx.fill();
    A.rr(ctx, barX, my - hh * 0.18, Math.max(8, barW * fill), hh * 0.36, 4); ctx.fillStyle = '#ff5f8f'; ctx.fill();
  }

  A.register({
    id:'robo', drawPreview:drawPreview, title:'Robô Construtor', emoji:'🤖', color:'#2fbf8a', colorDark:'#229268',
    tagline:'Pegue peças de código e monte o app!', gesture:'👆 Arrastar o robô',
    concept:'CONSTRUÇÃO EM VERSÕES', hint:'drag', demoTarget:'🤖',
    howto:[
      ['👆', 'Arraste o dedo para os lados para mover o robô'],
      ['🧩', 'Pegue as peças de código para lançar versões do app 🚀'],
      ['👾', 'Fuja dos bugs! Os poderes ☕ 🛡️ 🧪 ajudam']
    ],
    duration:40000, lives:3, failText:'Bugs demais no app! 👾',
    learn:'Software é construído peça por peça e lançado em versões (1.0, 2.0, 3.0...). Cada versão nova traz melhorias, e o time precisa manter os bugs longe!',
    ranks:[[520, '🏆', 'Arquiteto(a) de Software'], [340, '🥇', 'Engenheiro(a) Sênior'], [170, '💻', 'Engenheiro(a) Júnior'], [0, '🌱', 'Aprendiz de Robótica']],
    setup:setup, start:start, stop:stop, destroy:destroy,
    resize:function(){ if(C) C.resize(); },
    drawIcon:drawIcon,
    stats:function(){
      return [
        '🧩 ' + st.pieces + (st.pieces === 1 ? ' peça de código' : ' peças de código'),
        '🚀 Chegou na versão ' + version + '.0',
        '👾 ' + st.hits + (st.hits === 1 ? ' bug bateu' : ' bugs bateram')
      ];
    }
  });
})();
