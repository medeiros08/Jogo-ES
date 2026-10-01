/* Ninja dos Glitches — deslize para cortar os monstrinhos de erro. */
(function(){
  'use strict';
  var A = window.Arcade;
  var GRAV = 1.5;
  var BITS = ['{ }', '</>', '01', '( )', ';', 'if', '#', '[ ]', '=>'];
  var api, stage, C, objs, halves, parts, trail, bits, raf = 0, spawnT = 0, last, down = false, stroke, st, alive = false;

  function setup(_api, _stage){
    api = _api; stage = _stage;
    C = A.canvas(stage);
    objs = []; halves = []; parts = []; trail = [];
    stroke = { hits:0, x:0, y:0 };
    st = { cut:0, files:0, best:0 };
    bits = [];
    for(var i = 0; i < 14; i++){
      bits.push({ x:Math.random(), y:Math.random(), s:14 + Math.random() * 14, ch:BITS[i % BITS.length], v:0.02 + Math.random() * 0.03 });
    }
    stage.addEventListener('pointerdown', onDown);
    stage.addEventListener('pointermove', onMove);
    stage.addEventListener('pointerup', onUp);
    stage.addEventListener('pointercancel', onUp);
    alive = true;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }

  function start(){ spawnT = setTimeout(wave, 300); }

  function stop(){
    clearTimeout(spawnT);
    down = false;
  }

  function destroy(){
    if(!alive) return;
    alive = false;
    clearTimeout(spawnT);
    cancelAnimationFrame(raf);
    stage.removeEventListener('pointerdown', onDown);
    stage.removeEventListener('pointermove', onMove);
    stage.removeEventListener('pointerup', onUp);
    stage.removeEventListener('pointercancel', onUp);
  }

  function wave(){
    if(!api.running) return;
    var p = api.progress();
    var n = 1 + (Math.random() < 0.3 + p * 0.5 ? 1 : 0) + (p > 0.5 && Math.random() < 0.4 ? 1 : 0);
    for(var i = 0; i < n; i++) setTimeout(launch, i * 150);
    spawnT = setTimeout(wave, 1150 - 550 * p + Math.random() * 250);
  }

  function launch(){
    if(!api.running) return;
    var W = C.W, H = C.H, p = api.progress();
    var base = Math.min(W, H) * 0.085 + 8;
    var roll = Math.random(), type;
    if(p > 0.3 && roll < 0.07 && !objs.some(function(o){ return o.type === 'mega'; })) type = 'mega';
    else if(roll < 0.15) type = 'gold';
    else if(roll < 0.31 + p * 0.12) type = 'file';
    else type = 'm';
    var r = type === 'mega' ? base * 1.6 : type === 'gold' ? base * 0.9 : base;
    var gf = type === 'mega' ? 0.55 : 1;
    var g = GRAV * H * gf;
    var x0 = W * (0.15 + Math.random() * 0.7), tx = W * (0.2 + Math.random() * 0.6);
    var h = H * (0.5 + Math.random() * 0.3);
    var vy = -Math.sqrt(2 * g * h), tUp = -vy / g;
    objs.push({
      type:type, x:x0, y:H + r, vx:(tx - x0) / (tUp * 1.7), vy:vy, gf:gf, r:r,
      rot:0, vr:(Math.random() - 0.5) * 3, hp:type === 'mega' ? 3 : 1, lastHit:0, dead:false,
      color:type === 'gold' ? '#ffd23f' : type === 'mega' ? '#ff5f8f' : A.COLORS[Math.floor(Math.random() * A.COLORS.length)]
    });
    A.sfx.whoosh();
  }

  function onDown(e){
    if(!api.running) return;
    down = true;
    stroke.hits = 0;
    var p = A.pos(stage, e);
    trail = [{ x:p.x, y:p.y, t:performance.now() }];
    try{ stage.setPointerCapture(e.pointerId); }catch(err){}
  }
  function onMove(e){
    if(!down || !api.running) return;
    var p = A.pos(stage, e), now = performance.now();
    var prev = trail[trail.length - 1];
    trail.push({ x:p.x, y:p.y, t:now });
    if(prev){
      var dx = p.x - prev.x, dy = p.y - prev.y;
      if(dx * dx + dy * dy > 9) cut(prev, p, now);
    }
  }
  function onUp(){
    if(!down) return;
    down = false;
    if(stroke.hits >= 3 && api.running){
      var bonus = stroke.hits * 5;
      api.add(bonus, stroke.x, stroke.y - 40, 'COMBO x' + stroke.hits + '! +' + bonus);
      api.banner('🔥 Combo x' + stroke.hits + '!');
      A.sfx.gold();
    }
    if(stroke.hits > st.best) st.best = stroke.hits;
    stroke.hits = 0;
  }

  function distSeg(px, py, a, b){
    var dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy;
    var t = l2 ? Math.max(0, Math.min(1, ((px - a.x) * dx + (py - a.y) * dy) / l2)) : 0;
    var x = a.x + t * dx - px, y = a.y + t * dy - py;
    return Math.sqrt(x * x + y * y);
  }

  function cut(a, b, now){
    var ang = Math.atan2(b.y - a.y, b.x - a.x);
    objs.forEach(function(o){
      if(o.dead || now - o.lastHit < 170) return;
      if(distSeg(o.x, o.y, a, b) > o.r * 0.95) return;
      o.lastHit = now;
      hit(o, ang);
    });
  }

  function hit(o, ang){
    if(o.type === 'file'){
      o.dead = true; st.files++;
      split(o, ang);
      burst(o.x, o.y, '#ff5f8f', 16);
      api.loseLife('Você cortou um arquivo importante! 💾');
      return;
    }
    if(o.type === 'mega' && o.hp > 1){
      o.hp--;
      o.r *= 0.85;
      o.vy = Math.min(o.vy, -GRAV * C.H * 0.3);
      burst(o.x, o.y, o.color, 10);
      api.add(5, o.x, o.y - o.r, '+5');
      A.sfx.slice(); A.vibrate(15);
      return;
    }
    o.dead = true; st.cut++;
    stroke.hits++; stroke.x = o.x; stroke.y = o.y;
    var pts = o.type === 'gold' ? 30 : o.type === 'mega' ? 50 : 10;
    api.add(pts, o.x, o.y - o.r, '+' + pts);
    split(o, ang);
    burst(o.x, o.y, o.color, 14);
    if(o.type === 'm') A.sfx.slice(); else A.sfx.gold();
    A.vibrate(12);
  }

  function split(o, ang){
    var nx = -Math.sin(ang), ny = Math.cos(ang), sp = 140;
    [-1, 1].forEach(function(s){
      halves.push({ x:o.x, y:o.y, vx:o.vx * 0.4 + nx * sp * s, vy:o.vy * 0.25 + ny * sp * s - 80,
        rot:0, vr:s * 4, ang:ang, side:s, r:o.r, color:o.color, kind:o.type, life:1.3 });
    });
  }

  function burst(x, y, color, n){
    for(var i = 0; i < n; i++){
      var a = Math.random() * Math.PI * 2, v = 120 + Math.random() * 260;
      parts.push({ x:x, y:y, vx:Math.cos(a) * v, vy:Math.sin(a) * v, s:5 + Math.random() * 7,
        color:i % 3 ? color : '#ffffff', life:0.6 + Math.random() * 0.3 });
    }
  }

  function frame(now){
    if(!alive) return;
    var dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    update(dt, now);
    draw(now);
    raf = requestAnimationFrame(frame);
  }

  function update(dt, now){
    var H = C.H, g = GRAV * H;
    objs.forEach(function(o){
      o.vy += g * o.gf * dt; o.x += o.vx * dt; o.y += o.vy * dt; o.rot += o.vr * dt;
      if(o.vy > 0 && o.y > H + o.r * 2) o.dead = true;
    });
    objs = objs.filter(function(o){ return !o.dead; });
    halves.forEach(function(h){ h.vy += g * dt; h.x += h.vx * dt; h.y += h.vy * dt; h.rot += h.vr * dt; h.life -= dt; });
    halves = halves.filter(function(h){ return h.life > 0 && h.y < H + h.r * 3; });
    parts.forEach(function(p){ p.vy += g * 0.5 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; });
    parts = parts.filter(function(p){ return p.life > 0; });
    trail = trail.filter(function(p){ return now - p.t < 150; });
    bits.forEach(function(b){ b.y -= b.v * dt; if(b.y < -0.05){ b.y = 1.05; b.x = Math.random(); } });
  }

  function draw(now){
    var ctx = C.ctx, W = C.W, H = C.H;
    var bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#d9ccff'); bg.addColorStop(1, '#c4ecff');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = 'rgba(47,42,74,0.10)';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    bits.forEach(function(b){ ctx.font = '700 ' + b.s + 'px Fredoka, sans-serif'; ctx.fillText(b.ch, b.x * W, b.y * H); });

    objs.forEach(function(o){
      if(o.type === 'file'){
        var pulse = 1 + Math.sin(now * 0.012) * 0.06;
        ctx.save();
        ctx.strokeStyle = 'rgba(255,95,143,0.9)'; ctx.lineWidth = 3; ctx.setLineDash([7, 6]);
        A.circle(ctx, o.x, o.y, o.r * 1.05 * pulse); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(255,255,255,0.75)'; A.circle(ctx, o.x, o.y, o.r * 0.95); ctx.fill();
        ctx.translate(o.x, o.y); ctx.rotate(o.rot * 0.3);
        A.emoji(ctx, '💾', 0, 2, o.r * 1.25);
        ctx.restore();
      } else {
        A.drawMonster(ctx, o.x, o.y, o.r, o.color, now, { rot:o.rot * 0.25, gold:o.type === 'gold', angry:o.type === 'mega' });
        if(o.type === 'mega'){
          for(var i = 0; i < 3; i++){
            ctx.fillStyle = i < o.hp ? '#ff5f8f' : 'rgba(47,42,74,0.25)';
            A.circle(ctx, o.x + (i - 1) * 14, o.y - o.r - 16, 5); ctx.fill();
          }
        }
      }
    });

    halves.forEach(function(h){
      ctx.save();
      ctx.globalAlpha = Math.min(1, h.life * 1.5);
      ctx.translate(h.x, h.y); ctx.rotate(h.rot); ctx.rotate(h.ang);
      ctx.beginPath();
      if(h.side > 0) ctx.rect(-h.r * 2, 0, h.r * 4, h.r * 2); else ctx.rect(-h.r * 2, -h.r * 2, h.r * 4, h.r * 2);
      ctx.clip();
      ctx.rotate(-h.ang);
      if(h.kind === 'file') A.emoji(ctx, '💾', 0, 2, h.r * 1.25);
      else A.drawMonster(ctx, 0, 0, h.r, h.color, now, { calm:true, dizzy:true });
      ctx.restore();
    });

    parts.forEach(function(p){
      ctx.globalAlpha = Math.min(1, p.life * 2);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.s / 2, p.y - p.s / 2, p.s, p.s);
    });
    ctx.globalAlpha = 1;

    if(trail.length > 1){
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      for(var pass = 0; pass < 2; pass++){
        for(var k = 1; k < trail.length; k++){
          var a = trail[k - 1], b = trail[k];
          var fade = 1 - (now - b.t) / 150, w = (k / trail.length) * 14 * fade + 2;
          ctx.strokeStyle = pass === 0 ? 'rgba(255,95,143,' + fade * 0.8 + ')' : 'rgba(255,255,255,' + fade + ')';
          ctx.lineWidth = pass === 0 ? w + 8 : w;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
      }
    }
  }

  function drawIcon(ctx, w, h, t){
    A.drawMonster(ctx, w / 2, h / 2 + Math.sin(t * 0.005) * 4, w * 0.24, '#ffd23f', t);
    var ph = (t % 1800) / 1800;
    if(ph < 0.3){
      var k = ph / 0.3;
      ctx.strokeStyle = 'rgba(255,255,255,0.95)'; ctx.lineWidth = 5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(w * 0.1, h * 0.85); ctx.lineTo(w * (0.1 + 0.8 * k), h * (0.85 - 0.7 * k)); ctx.stroke();
    }
  }

  A.register({
    id:'ninja', title:'Ninja dos Glitches', emoji:'⚔️', color:'#8c73ff', colorDark:'#6a52e0',
    tagline:'Corte os erros que voam pela tela!', gesture:'👉 Deslizar o dedo',
    concept:'DEBUG', hint:'swipe', demoTarget:'👾',
    howto:[
      ['👉', 'Deslize o dedo pela tela para cortar os glitches 👾'],
      ['💾', 'Não corte os disquetes: são arquivos importantes!'],
      ['🔥', 'Corte 3 ou mais de uma vez só para fazer combo']
    ],
    duration:30000, lives:3, failText:'Arquivos demais apagados! 💾',
    learn:'Debugar é encontrar e eliminar erros, tomando cuidado para não apagar o que já funciona. Quem programa faz isso todos os dias!',
    ranks:[[450, '🏆', 'Ninja Lendário(a) do Debug'], [280, '🥇', 'Mestre(a) do Debug'], [140, '⚔️', 'Caçador(a) de Glitches'], [0, '🌱', 'Aprendiz de Ninja']],
    setup:setup, start:start, stop:stop, destroy:destroy,
    resize:function(){ if(C) C.resize(); },
    drawIcon:drawIcon,
    stats:function(){
      return [
        '👾 ' + st.cut + (st.cut === 1 ? ' glitch cortado' : ' glitches cortados'),
        '🔥 Maior combo: ' + st.best,
        '💾 ' + st.files + (st.files === 1 ? ' arquivo cortado' : ' arquivos cortados')
      ];
    }
  });
})();
