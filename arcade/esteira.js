/* Esteira de Testes — aprove só os apps que batem com o pedido do cliente. */
(function(){
  'use strict';
  var A = window.Arcade;
  var COLORS = [
    { c:'#3fb4ff', n:'azul' }, { c:'#ff5f8f', n:'rosa' }, { c:'#4fd6a6', n:'verde' },
    { c:'#ffd23f', n:'amarelo' }, { c:'#8c73ff', n:'roxo' }
  ];
  var PETS = ['🐱', '🐶', '🐸', '🦊', '🐼', '🐙'];
  var BTNS = [{ i:'▶', n:'Jogar' }, { i:'♥', n:'Curtir' }, { i:'★', n:'Favoritar' }, { i:'♪', n:'Música' }];
  var CLIENTS = ['👧', '👦', '🧑‍🚀', '👵', '🧑‍🍳', '🧙'];
  var PER_CLIENT = 6;

  var api, stage, el = {}, order, cur, curEl, decided = true, cardT = 0, nextT = 0, shownAt = 0, windowMs = 4000;
  var count, streak, st, drag = null, alive = false, client = 0;

  function $(sel){ return stage.querySelector(sel); }
  function pick(n, not){ var v; do { v = Math.floor(Math.random() * n); } while(v === not); return v; }

  function tint(hex, k){
    var n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    r = Math.round(r + (255 - r) * k); g = Math.round(g + (255 - g) * k); b = Math.round(b + (255 - b) * k);
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  }

  function setup(_api, _stage){
    api = _api; stage = _stage;
    stage.insertAdjacentHTML('beforeend',
      '<div class="es">' +
        '<div class="es-order">' +
          '<div class="es-client" id="es-client">👧</div>' +
          '<div class="es-bubble"><small>PEDIDO DO CLIENTE</small><div class="es-req" id="es-req"></div></div>' +
        '</div>' +
        '<div class="es-lane" id="es-lane">' +
          '<div class="es-bin left">🔧<span>Consertar</span></div>' +
          '<div class="es-bin right">🏪<span>Loja</span></div>' +
          '<div class="es-belt" id="es-belt"></div>' +
          '<div class="es-slot" id="es-slot"></div>' +
        '</div>' +
        '<div class="es-timer"><div id="es-timefill"></div></div>' +
        '<div class="es-actions">' +
          '<button type="button" id="es-fix">⬅ 🔧 Consertar</button>' +
          '<button type="button" id="es-ok">Aprovar ✅ ➡</button>' +
        '</div>' +
      '</div>');
    el.req = $('#es-req'); el.client = $('#es-client'); el.slot = $('#es-slot');
    el.belt = $('#es-belt'); el.fill = $('#es-timefill');
    $('#es-fix').addEventListener('click', function(){ decide('fix'); });
    $('#es-ok').addEventListener('click', function(){ decide('ok'); });
    window.addEventListener('keydown', onKey);
    count = 0; streak = 0; st = { right:0, wrong:0, bugs:0 };
    decided = true;
    newOrder(false);
    alive = true;
  }

  function start(){ nextCard(); }

  function stop(){
    decided = true;
    clearTimeout(cardT); clearTimeout(nextT);
    if(el.fill){ el.fill.style.transition = 'none'; }
    if(el.belt) el.belt.style.animationPlayState = 'paused';
  }

  function destroy(){
    if(!alive) return;
    alive = false;
    stop();
    window.removeEventListener('keydown', onKey);
  }

  function onKey(e){
    if(e.key === 'ArrowRight'){ e.preventDefault(); decide('ok'); }
    else if(e.key === 'ArrowLeft'){ e.preventDefault(); decide('fix'); }
  }

  function newOrder(announce){
    var prev = order;
    order = {
      color:pick(COLORS.length, prev ? prev.color : -1),
      pet:pick(PETS.length, prev ? prev.pet : -1),
      btn:pick(BTNS.length, prev ? prev.btn : -1)
    };
    client = pick(CLIENTS.length, client);
    el.client.textContent = CLIENTS[client];
    el.client.classList.remove('pop'); void el.client.offsetWidth; el.client.classList.add('pop');
    var c = COLORS[order.color];
    el.req.innerHTML =
      '<span class="es-sw" style="--sw:' + c.c + '"><i></i>' + c.n + '</span>' +
      '<span class="pet">' + PETS[order.pet] + '</span>' +
      '<span class="bt">' + BTNS[order.btn].i + ' ' + BTNS[order.btn].n + '</span>';
    if(announce){ api.banner('👋 Novo cliente!'); A.sfx.power(); }
  }

  function makeApp(){
    var app = { color:order.color, pet:order.pet, btn:order.btn, bug:false };
    if(Math.random() < 0.5) return app;
    if(Math.random() < 0.22){ app.bug = true; return app; }
    var keys = ['color', 'pet', 'btn'], sizes = { color:COLORS.length, pet:PETS.length, btn:BTNS.length };
    var k = keys[Math.floor(Math.random() * 3)];
    app[k] = pick(sizes[k], order[k]);
    return app;
  }
  function isGood(a){ return !a.bug && a.color === order.color && a.pet === order.pet && a.btn === order.btn; }

  function nextCard(){
    if(!api.running) return;
    count++;
    if(count > 1 && (count - 1) % PER_CLIENT === 0) newOrder(true);
    cur = makeApp();
    var col = COLORS[cur.color].c;
    var card = document.createElement('div');
    card.className = 'es-card';
    card.style.setProperty('--app', col);
    card.innerHTML =
      '<div class="es-phone" style="background:' + tint(col, 0.78) + '">' +
        '<div class="es-bar"></div>' +
        '<div class="es-pet">' + PETS[cur.pet] + '</div>' +
        '<div class="es-btn">' + BTNS[cur.btn].i + ' ' + BTNS[cur.btn].n + '</div>' +
        (cur.bug ? '<div class="es-bug ' + (Math.random() < 0.5 ? 'l' : 'r') + '">' + A.monsterSVG('#ff8a3d') + '</div>' : '') +
      '</div>' +
      '<div class="es-stamp ok">✅</div><div class="es-stamp fix">🔧</div>';
    el.slot.innerHTML = '';
    el.slot.appendChild(card);
    curEl = card;
    bindDrag(card);
    decided = false;

    var p = api.progress();
    windowMs = Math.max(1700, 4300 - 2600 * p);
    el.belt.style.animationDuration = (1.3 - 0.8 * p) + 's';
    shownAt = performance.now() + 350;
    el.fill.style.transition = 'none';
    el.fill.style.transform = 'scaleX(1)';
    void el.fill.offsetWidth;
    el.fill.style.transition = 'transform ' + windowMs + 'ms linear 350ms';
    el.fill.style.transform = 'scaleX(0)';
    clearTimeout(cardT);
    cardT = setTimeout(function(){ decide('timeout'); }, windowMs + 350);
    A.sfx.whoosh();
  }

  function bindDrag(card){
    card.addEventListener('pointerdown', function(e){
      if(decided || !api.running) return;
      drag = { x0:e.clientX, id:e.pointerId };
      try{ card.setPointerCapture(e.pointerId); }catch(err){}
      card.classList.add('dragging');
    });
    card.addEventListener('pointermove', function(e){
      if(!drag || decided) return;
      var dx = e.clientX - drag.x0;
      card.style.transform = 'translateX(' + dx + 'px) rotate(' + (dx * 0.06) + 'deg)';
      card.classList.toggle('show-ok', dx > 30);
      card.classList.toggle('show-fix', dx < -30);
    });
    var end = function(e){
      if(!drag) return;
      var dx = e.clientX - drag.x0;
      drag = null;
      card.classList.remove('dragging');
      if(decided) return;
      var th = Math.min(90, stage.clientWidth * 0.18);
      if(dx > th) decide('ok');
      else if(dx < -th) decide('fix');
      else { card.style.transform = ''; card.classList.remove('show-ok', 'show-fix'); }
    };
    card.addEventListener('pointerup', end);
    card.addEventListener('pointercancel', end);
  }

  function explain(choice){
    if(choice === 'timeout') return '⏰ O app passou sem ser testado!';
    if(choice === 'fix') return 'Esse app estava certinho! Era só aprovar ✅';
    if(cur.bug) return 'Tinha um bug escondido no app! 👾';
    if(cur.pet !== order.pet) return 'O cliente pediu ' + PETS[order.pet] + ', mas o app tinha ' + PETS[cur.pet] + '!';
    if(cur.color !== order.color) return 'O cliente pediu app ' + COLORS[order.color].n + ', não ' + COLORS[cur.color].n + '!';
    return 'O botão devia ser "' + BTNS[order.btn].n + '"!';
  }

  function decide(choice){
    if(decided || !api.running) return;
    decided = true;
    clearTimeout(cardT);
    var good = isGood(cur);
    var correct = (choice === 'ok' && good) || (choice === 'fix' && !good);
    var card = curEl;
    var rect = el.slot.getBoundingClientRect(), sr = stage.getBoundingClientRect();
    var cx = rect.left - sr.left + rect.width / 2, cy = rect.top - sr.top + rect.height * 0.3;
    el.fill.style.transition = 'none';

    var dir = choice === 'fix' ? -1 : 1;
    card.classList.add(choice === 'fix' ? 'show-fix' : 'show-ok');
    card.style.transition = 'transform .38s ease-in, opacity .38s ease-in';
    card.style.transform = 'translateX(' + (dir * 160) + '%) rotate(' + (dir * 18) + 'deg)';
    card.style.opacity = '0';

    if(correct){
      streak++; st.right++;
      if(cur.bug) st.bugs++;
      var fast = performance.now() - shownAt < windowMs * 0.45;
      var pts = 10 + (fast ? 5 : 0) + (streak >= 5 ? 5 : 0);
      api.add(pts, cx, cy, '+' + pts + (fast ? ' ⚡' : ''));
      if(cur.bug) api.toast('Bug encontrado! Muito bem, testador(a)! 👾', 'good');
      A.sfx.good(); A.vibrate(15);
      if(streak === 5 || streak === 10 || streak === 15) api.banner('🔥 ' + streak + ' seguidos!');
      nextT = setTimeout(nextCard, 420);
    } else {
      streak = 0; st.wrong++;
      api.loseLife(explain(choice));
      nextT = setTimeout(nextCard, 1100);
    }
  }

  function drawIcon(ctx, w, h, t){
    var off = (t * 0.05) % 16;
    ctx.fillStyle = '#5b5480'; ctx.fillRect(0, h * 0.74, w, h * 0.16);
    ctx.fillStyle = '#6d6694';
    for(var x = -16 + off; x < w; x += 16) ctx.fillRect(x, h * 0.74, 8, h * 0.16);
    var bob = Math.sin(t * 0.004) * 6;
    ctx.save();
    ctx.translate(w / 2 + bob, h * 0.42);
    ctx.rotate(bob * 0.02);
    A.rr(ctx, -w * 0.2, -h * 0.32, w * 0.4, h * 0.62, 8);
    ctx.fillStyle = '#d4efff'; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = A.INK; ctx.stroke();
    ctx.fillStyle = '#3fb4ff'; A.rr(ctx, -w * 0.14, -h * 0.26, w * 0.28, h * 0.07, 3); ctx.fill();
    A.emoji(ctx, '🐱', 0, 0, w * 0.22);
    ctx.restore();
    A.emoji(ctx, '✅', w * 0.82, h * 0.2 + Math.sin(t * 0.006) * 3, w * 0.2);
  }

  A.register({
    id:'esteira', title:'Esteira de Testes', emoji:'🏭', color:'#ff8a3d', colorDark:'#e0661c',
    tagline:'Aprove só os apps que o cliente pediu!', gesture:'↔️ Arrastar pro lado',
    concept:'REQUISITOS E TESTES', hint:'lr', demoTarget:'📱',
    howto:[
      ['📋', 'Veja o pedido do cliente: cor, bichinho e botão'],
      ['➡️', 'Arraste o app para a DIREITA se ele estiver certinho'],
      ['⬅️', 'Arraste para a ESQUERDA se estiver diferente ou com bug 👾']
    ],
    duration:40000, lives:3, failText:'O cliente ficou bravo! 😤',
    learn:'Antes de entregar um app, engenheiros de software conferem se ele faz exatamente o que o cliente pediu. O pedido se chama requisito, e conferir se chama testar!',
    ranks:[[380, '🏆', 'Chefe de Qualidade'], [240, '🥇', 'Testador(a) Expert'], [120, '🔍', 'Testador(a)'], [0, '🌱', 'Estagiário(a) de Testes']],
    setup:setup, start:start, stop:stop, destroy:destroy,
    drawIcon:drawIcon,
    stats:function(){
      return [
        '✅ ' + st.right + (st.right === 1 ? ' acerto' : ' acertos'),
        '❌ ' + st.wrong + (st.wrong === 1 ? ' erro' : ' erros'),
        '👾 ' + st.bugs + (st.bugs === 1 ? ' bug escondido achado' : ' bugs escondidos achados')
      ];
    }
  });
})();
