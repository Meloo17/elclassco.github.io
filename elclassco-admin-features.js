/* EL CLASSCO admin review moderation add-on */
(() => {
  const style=document.createElement('style');
  style.textContent='.ec-admin-review{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;border:1px solid var(--line);border-radius:12px;background:#0f0a19;padding:13px;margin-top:10px}.ec-admin-review-copy{min-width:0;overflow-wrap:anywhere}.ec-admin-review-copy strong{font-size:11px;color:#e9d5ff}.ec-admin-review-copy p{font-size:12px;line-height:1.6;color:#e9e2f5;white-space:pre-wrap;margin:6px 0}.ec-admin-review-copy small{font-size:10px;color:var(--muted)}@media(max-width:650px){.ec-admin-review{flex-direction:column}}';
  document.head.appendChild(style);
  let adminClient=null;
  function init(){
    const nav=document.querySelector('.sidebar'),anchor=document.getElementById('section-announcements');
    if(!nav||!anchor||document.getElementById('section-reviews'))return;
    const tab=document.createElement('button');tab.className='tab';tab.dataset.tab='reviews';tab.textContent='⭐ Oyun yorumları';nav.insertBefore(tab,nav.querySelector('[data-tab="announcements"]')||null);
    const section=document.createElement('section');section.id='section-reviews';section.className='panel hidden';
    section.innerHTML='<div class="row"><div><h2>⭐ Oyun yorumları</h2><p class="muted">Oyuncu puanlarını ve yorumlarını incele, uygunsuz içerikleri kaldır.</p></div><button id="ecRefreshReviews" class="btn" type="button">↻ Yenile</button></div><div id="ecReviewsStatus" class="notice">Yorumlar yükleniyor…</div><div id="ecReviewsList"></div><p class="muted">Bu bölüm için <code>game-reviews.sql</code> dosyasını Supabase SQL Editor içinde çalıştır.</p>';
    anchor.parentNode.insertBefore(section,anchor);
    tab.addEventListener('click',()=>{document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('active',b===tab));document.querySelectorAll('[id^="section-"]').forEach(s=>s.classList.toggle('hidden',s!==section));load();});
    document.getElementById('ecRefreshReviews').addEventListener('click',load);
    const client=()=>{if(!adminClient&&window.supabase&&window.ELCLASSCO_SUPABASE_URL&&window.ELCLASSCO_SUPABASE_ANON_KEY)adminClient=window.supabase.createClient(window.ELCLASSCO_SUPABASE_URL,window.ELCLASSCO_SUPABASE_ANON_KEY);return adminClient;};
    async function load(){
      const c=client(),status=document.getElementById('ecReviewsStatus'),list=document.getElementById('ecReviewsList');list.replaceChildren();
      if(!c){status.textContent='Supabase bağlantısı bulunamadı.';return;}
      status.textContent='Yorumlar yükleniyor…';
      try{
        const {data,error}=await c.from('game_reviews').select('id,game_name,nickname,rating,comment,created_at').order('created_at',{ascending:false}).limit(100);
        if(error)throw error;
        if(!data?.length){status.textContent='Henüz oyun yorumu yok.';return;}
        status.textContent='Son '+data.length+' yorum listeleniyor.';
        data.forEach(r=>{
          const row=document.createElement('article');row.className='ec-admin-review';
          const copy=document.createElement('div');copy.className='ec-admin-review-copy';
          const title=document.createElement('strong');title.textContent=r.game_name+' · '+'★'.repeat(r.rating);
          const comment=document.createElement('p');comment.textContent=String(r.comment||'');
          const meta=document.createElement('small');meta.textContent=String(r.nickname||'Oyuncu')+' · '+new Date(r.created_at).toLocaleString('tr-TR');
          copy.append(title,comment,meta);
          const del=document.createElement('button');del.className='btn danger';del.type='button';del.textContent='Yorumu sil';
          del.addEventListener('click',async()=>{if(!confirm('Bu yorumu silmek istiyor musun?'))return;del.disabled=true;try{const {error}=await c.from('game_reviews').delete().eq('id',r.id);if(error)throw error;await load();}catch(e){alert('Yorum silinemedi: '+e.message);del.disabled=false;}});
          row.append(copy,del);list.appendChild(row);
        });
      }catch(e){status.textContent='Yorumlar yüklenemedi: '+(e.message||'game-reviews.sql dosyasını çalıştır.');}
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();