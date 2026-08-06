
  // ===== CONFIG =====
  const PHONE = "96181363232";            // primary order line (yours)
  const PHONE_ALT = "96171002098";        // Ghsoub's line (spare)
  const IG = "#";                          // paste Instagram URL when ready
  const ORDER_MSG = "Hi L'Artisan Alcoolique! I'd like to order the Signature Smoker Kit ($85, cash on delivery).%0A%0AName:%0AAddress / Area:%0APhone:%0AQuantity: 1";
  const CLUB_MSG  = "Hi L'Artisan Alcoolique! I'd like to join the Oak Club (monthly wood flavours, cash on delivery).%0A%0AName:%0AAddress / Area:%0APhone:";
  const waURL = (msg) => "https://wa.me/" + PHONE + "?text=" + msg;

  document.getElementById('orderBtn').href = waURL(ORDER_MSG);
  document.getElementById('clubBtn').href  = waURL(ORDER_MSG.length?CLUB_MSG:CLUB_MSG);
  document.getElementById('clubBtn').href  = waURL(CLUB_MSG);
  document.getElementById('waLink').href   = waURL(ORDER_MSG);
  document.getElementById('igLink').href   = IG;
  // any nav/hero "Order" buttons that point to #order keep smooth-scroll (below);
  // all .wa buttons that are real links open WhatsApp in a new tab
  document.querySelectorAll('a.wa').forEach(a=>{
    if(a.getAttribute('href') !== '#order'){ a.target = "_blank"; a.rel = "noopener noreferrer"; }
  });

  // ===== nav scroll state =====
  const hdr = document.getElementById('hdr');
  addEventListener('scroll', ()=> hdr.classList.toggle('scrolled', scrollY>40));

  // ===== mobile menu =====
  const mm = document.getElementById('mobileMenu');
  const burger = document.getElementById('burger');
  const openMenu = ()=>{mm.classList.add('open');burger.setAttribute('aria-expanded','true')};
  const closeMenu = ()=>{mm.classList.remove('open');burger.setAttribute('aria-expanded','false')};
  burger.onclick = openMenu;
  document.getElementById('closeMenu').onclick = closeMenu;

  // ===== smooth-scroll for ALL in-page anchors (fixes sandbox navigation) =====
  document.querySelectorAll('a[href^="#"]').forEach(a=>{
    a.addEventListener('click', (e)=>{
      const href = a.getAttribute('href');
      if(href.length > 1){
        const target = document.querySelector(href);
        if(target){ e.preventDefault(); target.scrollIntoView({behavior:'smooth', block:'start'}); closeMenu(); }
      }
    });
  });

  // ===== experience video: loads only on tap (preload=none); poster shows until then =====
  const expStage = document.getElementById('videoStage');
  const expVideo = document.getElementById('expVideo');
  document.getElementById('playBtn').addEventListener('click', ()=>{
    expStage.classList.add('playing');           // reveal the video, hide the poster overlay
    expVideo.play().catch(()=>{                   // user tapped, so sound is allowed;
      expVideo.muted = true; expVideo.play();     // fall back to muted only if a browser blocks it
    });
  });

  // ===== flavour guide =====
  const FLAV = {
    oak:{name:'Oak',img:'assets/img/flavour-oak.jpg',pair:'Pure oak · rich & smooth',note:'Deep, warm and classic — the backbone of barrel aging. Rounds out the spirit with a slow, woody sweetness.',best:'Old Fashioned · Neat bourbon · Rye'},
    cherry:{name:'Cherry',img:'assets/img/flavour-cherry.jpg',pair:'Sweet & mild',note:'Fruity and fragrant with a soft finish. Lifts stirred and fruit-forward drinks without overpowering them.',best:'Manhattan · Dark rum · Amaro'},
    pecan:{name:'Pecan',img:'assets/img/flavour-pecan.jpg',pair:'Nutty & rich',note:'Toasty, full and a little sweet. A rich, rounded smoke that flatters darker, aged spirits.',best:'Neat whiskey · Aged rum · Old Fashioned'},
    apple:{name:'Apple',img:'assets/img/flavour-apple.jpg',pair:'Fruity & light',note:'Mild, mellow and gently sweet. The easy option when you want aroma without weight.',best:'Tequila · Gin · White rum'},
    peach:{name:'Peach',img:'assets/img/flavour-peach.jpg',pair:'Sweet & smooth',note:'Soft stone-fruit sweetness with a smooth, warm finish. Made for sippable, sweeter cocktails.',best:'Bourbon sour · Whiskey · Peach cocktails'},
    pear:{name:'Pear',img:'assets/img/flavour-pear.jpg',pair:'Mild & refreshing',note:'Light, clean and delicate. A refreshing smoke that keeps bright drinks bright.',best:'Vodka · Gin · Light cocktails'}
  };
  const panel = document.getElementById('flavPanel');
  function renderFlav(key){
    const f = FLAV[key];
    panel.innerHTML = '<div class="tin"><img src="'+f.img+'" alt="'+f.name+' wood chips tin"><div><h3>'+f.name+'</h3><div class="pair">'+f.pair+'</div></div></div><p class="note">'+f.note+'</p><div class="best">Best with · <b>'+f.best+'</b></div>';
  }
  renderFlav('oak');
  document.querySelectorAll('.flav-tab').forEach(t=>{
    t.onclick=()=>{document.querySelectorAll('.flav-tab').forEach(x=>x.classList.remove('active'));t.classList.add('active');renderFlav(t.dataset.f);};
  });

  // ===== scroll reveal =====
  const io = new IntersectionObserver((entries)=>{entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}});},{threshold:.16});
  document.querySelectorAll('.reveal').forEach(el=>io.observe(el));
