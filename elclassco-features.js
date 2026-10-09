/* EL CLASSCO 2.0 add-ons: live notifications, discovery, reviews, personal library */
(() => {
  const style = document.createElement('style');
  style.textContent = `
    .ec-feature-controls{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0 16px}
    .ec-feature-controls select{min-width:150px;padding:10px 12px;color:#eee5ff;background:#130e20;border:1px solid #a855f755;border-radius:10px;font:inherit;font-size:11px}
    .ec-library-btn{position:absolute;right:10px;bottom:49px;z-index:4;border:1px solid #c084fc66;border-radius:8px;background:#130d20ed;color:#e9d5ff;padding:7px 9px;font-size:10px;font-weight:800;cursor:pointer}
    .ec-library-btn.saved{background:#6d28d9;color:white}
    #ec-live-notice{position:fixed;z-index:9999;top:18px;right:18px;max-width:min(360px,calc(100vw - 36px));display:grid;gap:8px;pointer-events:none}
    .ec-toast{pointer-events:auto;padding:13px 16px;border:1px solid #c084fc88;border-radius:12px;background:#160e25f5;box-shadow:0 12px 40px #0008;color:#f5eaff;font-size:12px;line-height:1.5}
    .ec-toast strong{display:block;color:#d8b4fe;margin-bottom:3px}.ec-toast button{float:right;border:0;background:transparent;color:#c4b5fd;cursor:pointer;font-size:15px}
    .ec-review-panel{margin-top:18px;border:1px solid #a855f744;border-radius:14px;padding:15px;background:linear-gradient(145deg,#171023,#0f0b18)}
    .ec-review-head{display:flex;justify-content:space-between;gap:10px;align-items:center}.ec-review-head h3{font-size:15px;margin:0;color:#f3e8ff}.ec-review-head p{font-size:11px;color:#a99bbd;margin:5px 0}.ec-review-average{font-size:25px;font-weight:900;color:#f5d0fe}
    .ec-review-form{display:grid;gap:7px;margin-top:12px}.ec-review-form label{font-size:10px;color:#c4b5fd;font-weight:800}.ec-review-form input,.ec-review-form select,.ec-review-form textarea{width:100%;border:1px solid #ffffff20;border-radius:9px;padding:10px;background:#0c0813;color:#f5f3ff;font:inherit;font-size:12px}.ec-review-form-footer{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap}.ec-review-form small{font-size:10px;color:#a99bbd}
    .ec-review-list{display:grid;gap:9px;margin-top:14px}.ec-review-item{padding:11px;border:1px solid #ffffff17;border-radius:10px;background:#0b0812}.ec-review-item header{display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap}.ec-review-item strong{font-size:11px;color:#e9d5ff}.ec-review-item .stars{font-size:11px;color:#fbbf24}.ec-review-item p{font-size:12px;line-height:1.6;white-space:pre-wrap;overflow-wrap:anywhere;color:#ded5eb;margin:7px 0 0}.ec-review-item time{font-size:9px;color:#a99bbd}
    .ec-review-summary{font-size:10px;color:#c4b5fd;margin-top:6px}
    @media(max-width:620px){.ec-feature-controls select{flex:1;min-width:0}.ec-review-panel{padding:11px}}
  `;
  document.head.appendChild(style);
  const visitorId = () => {
    let id = localStorage.getItem('elclassco_visitor_id');
    if (!id) { id = (crypto && crypto.randomUUID) ? crypto.randomUUID() : 'ec-'+Math.random().toString(36).slice(2)+Date.now().toString(36); localStorage.setItem('elclassco_visitor_id',id); }
    return id;
  };
  const getClient = () => {
    if (window.supabase && window.ELCLASSCO_SUPABASE_URL && window.ELCLASSCO_SUPABASE_ANON_KEY) {
      if (!window.__elClasscoFeatureClient) window.__elClasscoFeatureClient=window.supabase.createClient(window.ELCLASSCO_SUPABASE_URL,window.ELCLASSCO_SUPABASE_ANON_KEY);
      return window.__elClasscoFeatureClient;
    }
    return null;
  };
  const readLibrary = () => { try { return JSON.parse(localStorage.getItem('elclassco_library')||'[]'); } catch (_) { return []; } };
  const writeLibrary = list => localStorage.setItem('elclassco_library',JSON.stringify(list));
  const stats = {};
  let currentGameName = '';
  let notificationChannel = null;
  function toast(title,message) {
    let host=document.getElementById('ec-live-notice');
    if(!host){host=document.createElement('div');host.id='ec-live-notice';host.setAttribute('aria-live','polite');document.body.appendChild(host);}
    const card=document.createElement('div');card.className='ec-toast';
    const close=document.createElement('button');close.type='button';close.textContent='×';close.setAttribute('aria-label','Bildirimi kapat');close.onclick=()=>card.remove();
    const head=document.createElement('strong');head.textContent=title;
    const body=document.createElement('span');body.textContent=message;
    card.append(close,head,body);host.prepend(card);while(host.children.length>3)host.lastElementChild.remove();
    setTimeout(()=>card.remove(),7000);
  }
  function getTitle(card) { return card?.querySelector('.game-title')?.textContent?.trim() || ''; }
  function attachLibraryButtons() {
    document.querySelectorAll('#grid .game').forEach(card=>{
      const name=getTitle(card); if(!name)return;
      card.dataset.ecGameName=name;
      let btn=card.querySelector('.ec-library-btn');
      if(!btn){btn=document.createElement('button');btn.type='button';btn.className='ec-library-btn';btn.addEventListener('click',e=>{
        e.preventDefault();e.stopPropagation();
        const game=btn.dataset.gameName;let saved=readLibrary();
        saved=saved.includes(game)?saved.filter(x=>x!==game):[...saved,game];writeLibrary(saved);
        btn.classList.toggle('saved',saved.includes(game));btn.textContent=saved.includes(game)?'✓ Kütüphanende':'📚 Kütüphaneme kaydet';
        if(window.active==='📚 Kütüphanem' || (typeof active!=='undefined'&&active==='📚 Kütüphanem')) render();
      });card.appendChild(btn);}
      btn.dataset.gameName=name;
      const saved=readLibrary().includes(name);btn.classList.toggle('saved',saved);btn.textContent=saved?'✓ Kütüphanende':'📚 Kütüphaneme kaydet';
    });
  }
  function buildDiscoveryControls() {
    const tools=document.querySelector('.tools');if(!tools||document.getElementById('ec-discovery-controls'))return;
    const wrap=document.createElement('div');wrap.className='ec-feature-controls';wrap.id='ec-discovery-controls';
    const filter=document.createElement('select');filter.id='ec-rating-filter';filter.setAttribute('aria-label','Puan filtresi');
    filter.innerHTML='<option value="all">Tüm puanlar</option><option value="rated">Yorum yapılan oyunlar</option><option value="4">4 yıldız ve üzeri</option>';
    const sort=document.createElement('select');sort.id='ec-rating-sort';sort.setAttribute('aria-label','Puanlara göre sırala');
    sort.innerHTML='<option value="normal">Puan sıralaması yok</option><option value="rating">⭐ En yüksek puan</option><option value="reviews">💬 En çok yorum</option>';
    wrap.append(filter,sort);tools.insertAdjacentElement('afterend',wrap);
    filter.addEventListener('change',()=>{if(typeof render==='function')render();});
    sort.addEventListener('change',()=>{if(typeof render==='function')render();});
  }
  function patchRender() {
    if(typeof render!=='function'||render.__ecPatched)return;
    const base=render;
    const enhanced=function(){
      const libraryMode=typeof active!=='undefined'&&active==='📚 Kütüphanem';
      if(libraryMode) active='Tümü';
      base();
      if(libraryMode) active='📚 Kütüphanem';
      const ratingMode=document.getElementById('ec-rating-filter')?.value||'all';
      const sortMode=document.getElementById('ec-rating-sort')?.value||'normal';
      const cards=[...document.querySelectorAll('#grid .game')];
      cards.forEach(card=>{
        const name=getTitle(card);card.dataset.ecGameName=name;
        const s=stats[name]||{count:0,average:0};
        const libraryModeNow=typeof active!=='undefined'&&active==='📚 Kütüphanem';
        card.hidden=(libraryModeNow&&!readLibrary().includes(name))||(ratingMode==='rated'&&s.count===0)||(ratingMode==='4'&&s.average<4);
        let summary=card.querySelector('.ec-review-summary');
        if(!summary){summary=document.createElement('div');summary.className='ec-review-summary';const info=card.querySelector('.game-info');if(info)info.appendChild(summary);}
        summary.textContent=s.count?(s.average.toFixed(1)+' ★ · '+s.count+' yorum'):'Henüz puan yok';
      });
      if(sortMode!=='normal'){
        const grid=document.getElementById('grid');
        cards.sort((a,b)=>{const x=stats[getTitle(a)]||{count:0,average:0},y=stats[getTitle(b)]||{count:0,average:0};return sortMode==='rating'?(y.average-x.average):(y.count-x.count);});
        cards.forEach(card=>grid.appendChild(card));
      }
      const visibleCount=cards.filter(card=>!card.hidden).length;
      const countEl=document.getElementById('gameCount');if(countEl)countEl.textContent=String(visibleCount);
      const emptyEl=document.getElementById('empty');if(emptyEl)emptyEl.style.display=visibleCount?'none':'block';
      attachLibraryButtons();
    };
    enhanced.__ecPatched=true;render=enhanced;
  }
  function addLibraryFilter() {
    if(typeof categories==='undefined'||typeof makeFilters!=='function')return;
    if(!categories.includes('📚 Kütüphanem')){categories.splice(3,0,'📚 Kütüphanem');makeFilters();}
  }
  function ensureReviewUI() {
    const modal=document.getElementById('gameDetailModal'),content=modal?.querySelector('.modal-content');
    if(!content||document.getElementById('ec-review-panel'))return;
    const panel=document.createElement('section');panel.className='ec-review-panel';panel.id='ec-review-panel';
    panel.innerHTML='<div class="ec-review-head"><div><h3>⭐ Oyuncu puanları</h3><p id="ec-review-summary">Henüz yorum yok.</p></div><div class="ec-review-average" id="ec-review-average">—</div></div><form id="ec-review-form" class="ec-review-form"><label for="ec-review-nickname">Takma ad</label><input id="ec-review-nickname" maxlength="24" minlength="2" required placeholder="Örn. ShadowPlayer"><label for="ec-review-rating">Puanın</label><select id="ec-review-rating"><option value="5">★★★★★ · 5</option><option value="4">★★★★☆ · 4</option><option value="3">★★★☆☆ · 3</option><option value="2">★★☆☆☆ · 2</option><option value="1">★☆☆☆☆ · 1</option></select><label for="ec-review-comment">Yorumun</label><textarea id="ec-review-comment" maxlength="500" rows="3" required placeholder="Oyun hakkında ne düşünüyorsun?"></textarea><div class="ec-review-form-footer"><small id="ec-review-status" role="status">Takma ad ve yorum gerekli.</small><button class="btn primary" type="submit">Yorumu gönder ↗</button></div></form><div class="ec-review-list" id="ec-review-list"></div>';
    content.appendChild(panel);
    const save=document.createElement('button');save.type='button';save.className='part-btn';save.id='ec-detail-library-save';save.textContent='📚 Kütüphaneme kaydet';
    document.querySelector('.game-detail-download-box')?.appendChild(save);
    save.addEventListener('click',()=>{if(!currentGameName)return;let list=readLibrary();list=list.includes(currentGameName)?list.filter(n=>n!==currentGameName):[...list,currentGameName];writeLibrary(list);save.textContent=list.includes(currentGameName)?'✓ Kütüphanende':'📚 Kütüphaneme kaydet';if(typeof active!=='undefined'&&active==='📚 Kütüphanem'&&typeof render==='function')render();attachLibraryButtons();});
    document.getElementById('ec-review-nickname').value=localStorage.getItem('elclassco_chat_nickname')||'';
    panel.querySelector('form').addEventListener('submit',submitReview);
  }
  async function loadStats() {
    const client=getClient();if(!client)return;
    try{
      const {data,error}=await client.from('game_reviews').select('game_name,rating');
      if(error)throw error;
      Object.keys(stats).forEach(k=>delete stats[k]);
      (data||[]).forEach(row=>{const s=stats[row.game_name]||(stats[row.game_name]={count:0,total:0,average:0});s.count++;s.total+=row.rating;s.average=s.total/s.count;});
      if(typeof render==='function')render();
    }catch(e){console.warn('EL CLASSCO yorum istatistikleri:',e.message);}
  }
  async function loadReviews(name) {
    currentGameName=name;
    ensureReviewUI();
    const list=document.getElementById('ec-review-list'),summary=document.getElementById('ec-review-summary'),average=document.getElementById('ec-review-average'),status=document.getElementById('ec-review-status');
    if(!list)return;
    list.replaceChildren();summary.textContent='Yorumlar yükleniyor…';average.textContent='—';
    const client=getClient();if(!client){summary.textContent='Yorumlar için Supabase bağlantısı gerekli.';return;}
    try{
      const {data,error}=await client.from('game_reviews').select('id,nickname,rating,comment,created_at').eq('game_name',name).order('created_at',{ascending:false}).limit(40);
      if(error)throw error;
      const rows=data||[],avg=rows.length?rows.reduce((sum,r)=>sum+r.rating,0)/rows.length:0;
      summary.textContent=rows.length?(rows.length+' yorum · ortalama '+avg.toFixed(1)+'/5'):'Henüz yorum yok; ilk yorumu sen yaz!';
      average.textContent=rows.length?avg.toFixed(1)+' ★':'—';
      stats[name]={count:rows.length,average:avg};
      if(!rows.length){const empty=document.createElement('p');empty.className='subtitle';empty.textContent='Bu oyuna henüz yorum yapılmamış.';list.appendChild(empty);}
      rows.forEach(r=>{const item=document.createElement('article');item.className='ec-review-item';const head=document.createElement('header');const user=document.createElement('strong');user.textContent=String(r.nickname||'Oyuncu').slice(0,24);const stars=document.createElement('span');stars.className='stars';stars.textContent='★'.repeat(r.rating)+'☆'.repeat(5-r.rating);const time=document.createElement('time');time.textContent=new Date(r.created_at).toLocaleString('tr-TR');head.append(user,stars,time);const comment=document.createElement('p');comment.textContent=String(r.comment||'').slice(0,500);item.append(head,comment);list.appendChild(item);});
      if(typeof render==='function')render();
    }catch(e){summary.textContent='Yorumlar yüklenemedi.';status.textContent=e.message||'game-reviews.sql dosyasını çalıştır.';}
  }
  async function submitReview(e) {
    e.preventDefault();const status=document.getElementById('ec-review-status'),form=e.currentTarget,button=form.querySelector('button[type="submit"]');
    const nickname=document.getElementById('ec-review-nickname').value.trim().replace(/[<>]/g,''),comment=document.getElementById('ec-review-comment').value.trim(),rating=Number(document.getElementById('ec-review-rating').value);
    if(nickname.length<2||nickname.length>24||!comment||comment.length>500){status.textContent='Takma ad 2-24, yorum 1-500 karakter olmalı.';return;}
    const client=getClient();if(!client){status.textContent='Supabase bağlantısı bulunamadı.';return;}
    button.disabled=true;status.textContent='Yorum gönderiliyor…';
    try{const {error}=await client.rpc('submit_game_review',{p_game_name:currentGameName,p_nickname:nickname,p_rating:rating,p_comment:comment,p_visitor_id:visitorId()});if(error)throw error;document.getElementById('ec-review-comment').value='';status.textContent='Yorumun kaydedildi, teşekkürler!';await loadReviews(currentGameName);await loadStats();}
    catch(e){status.textContent=e.message||'Yorum gönderilemedi.';}
    finally{button.disabled=false;}
  }
  function watchModal() {
    const modal=document.getElementById('gameDetailModal');if(!modal)return;
    const observer=new MutationObserver(()=>{if(modal.classList.contains('open')){ensureReviewUI();const title=document.getElementById('detailTitle')?.textContent||'';const name=title.replace(/\\s+İndir$/,'').trim();if(name&&name!==currentGameName){document.getElementById('ec-review-nickname').value=localStorage.getItem('elclassco_chat_nickname')||'';loadReviews(name);}else if(name&&document.getElementById('ec-review-list')?.childElementCount===0)loadReviews(name);const save=document.getElementById('ec-detail-library-save');if(save){const saved=readLibrary().includes(name);save.textContent=saved?'✓ Kütüphanende':'📚 Kütüphaneme kaydet';}}});
    observer.observe(modal,{attributes:true,attributeFilter:['class']});
  }
  function liveNotifications() {
    const client=getClient();if(!client||notificationChannel)return;
    notificationChannel=client.channel('el-classco-feature-notifications')
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'site_announcements'},payload=>toast('📣 Yeni duyuru',String(payload.new?.title||'EL CLASSCO duyurusu yayınlandı')))
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'games'},payload=>toast('🎮 Yeni oyun eklendi',String(payload.new?.name||'Oyun kataloğu güncellendi')))
      .subscribe();
  }
  function init() {
    buildDiscoveryControls();addLibraryFilter();patchRender();attachLibraryButtons();watchModal();loadStats();liveNotifications();
    const grid=document.getElementById('grid');
    if(grid)new MutationObserver(()=>{attachLibraryButtons();}).observe(grid,{childList:true,subtree:true});
    const filters=document.getElementById('filters');
    if(filters)new MutationObserver(()=>{addLibraryFilter();}).observe(filters,{childList:true});
    if(!getClient())setTimeout(liveNotifications,1800);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();