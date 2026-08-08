document.addEventListener('DOMContentLoaded', () => {
  const dirSearch = document.getElementById('dirSearch');
  const dirCards = document.querySelectorAll('.biz-card');
  const filterPills = document.querySelectorAll('.filter-pill');
  let activeCat = 'all';

  function applyFilter() {
    const q = (dirSearch ? dirSearch.value : '').toLowerCase().trim();
    dirCards.forEach(card => {
      const name = (card.dataset.name || '').toLowerCase();
      const cat = card.dataset.cat || '';
      const matchesQ = !q || name.includes(q) || cat.toLowerCase().includes(q);
      const matchesCat = activeCat === 'all' || cat === activeCat;
      card.style.display = (matchesQ && matchesCat) ? '' : 'none';
    });
  }
  if (dirSearch) dirSearch.addEventListener('input', applyFilter);
  filterPills.forEach(pill => {
    pill.addEventListener('click', () => {
      filterPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      activeCat = pill.dataset.cat;
      applyFilter();
    });
  });
});
