const essayForm = document.getElementById('essay-form');
const essayList = document.getElementById('essay-list');
const essaySearchInput = document.getElementById('essay-search-input');
const essayTagFilterSelect = document.getElementById('essay-tag-filter');

let essays = [];
let essaySearchTerm = '';
let essayTagFilter = 'All';
let currentEssayModalId = null;

async function loadEssays() {
  const { data, error } = await supabaseClient
    .from('essays')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error loading essays:', error);
    return;
  }

  essays = data;
  renderEssays();
}

function getAllEssayTags() {
  const tagSet = new Set();
  essays.forEach(function(e) {
    parseTags(e.tags).forEach(function(t) { tagSet.add(t); });
  });
  return Array.from(tagSet).sort();
}

function renderEssayTagFilterOptions() {
  const currentValue = essayTagFilterSelect.value || 'All';
  const tags = getAllEssayTags();
  essayTagFilterSelect.innerHTML = '<option value="All">All Tags</option>' +
    tags.map(function(t) { return `<option value="${t}">${t}</option>`; }).join('');
  essayTagFilterSelect.value = tags.includes(currentValue) ? currentValue : 'All';
}

function getFilteredEssays() {
  return essays.filter(function(e) {
    const term = essaySearchTerm.toLowerCase();
    const matchesSearch = e.title.toLowerCase().includes(term) || e.content.toLowerCase().includes(term);
    const matchesTag = essayTagFilter === 'All' || parseTags(e.tags).includes(essayTagFilter);
    return matchesSearch && matchesTag;
  });
}

function wordCount(text) {
  const trimmed = (text || '').trim();
  return trimmed === '' ? 0 : trimmed.split(/\s+/).length;
}

function essaySnippet(text) {
  const clean = (text || '').trim();
  return clean.length > 140 ? clean.slice(0, 140) + '...' : clean;
}

function renderEssayCard(essay) {
  const item = document.createElement('div');
  item.className = 'essay-card';
  item.setAttribute('data-id', essay.id);

  item.innerHTML = `
    <div class="essay-card-header">
      <strong>${essay.title}</strong>
      <span class="essay-word-count">${wordCount(essay.content)} words</span>
    </div>
    <p class="essay-snippet">${essaySnippet(essay.content)}</p>
    <div class="essay-card-tags">${tagsHtml(essay.tags)}</div>
  `;

  return item;
}

function renderEssays() {
  const filtered = getFilteredEssays();
  essayList.innerHTML = '';

  if (filtered.length === 0) {
    essayList.innerHTML = '<div class="empty-state">No essays match your filters.</div>';
  } else {
    filtered.forEach(function(essay) {
      essayList.appendChild(renderEssayCard(essay));
    });
  }

  renderEssayTagFilterOptions();
}

essayForm.addEventListener('submit', async function(event) {
  event.preventDefault();

  const title = document.getElementById('essay-title-input').value;
  const tags = document.getElementById('essay-tags-input').value;
  const content = document.getElementById('essay-content-input').value;

  const { error } = await supabaseClient.from('essays').insert({ title: title, tags: tags, content: content });

  if (error) {
    alert('Error saving essay: ' + error.message);
    return;
  }

  essayForm.reset();
  loadEssays();
});

essayList.addEventListener('click', function(event) {
  const card = event.target.closest('.essay-card');
  if (!card) return;
  openEssayModal(card.getAttribute('data-id'));
});

essaySearchInput.addEventListener('input', function() {
  essaySearchTerm = essaySearchInput.value;
  renderEssays();
});

essayTagFilterSelect.addEventListener('change', function() {
  essayTagFilter = essayTagFilterSelect.value;
  renderEssays();
});

/* ---------- Essay Modal ---------- */

function showEssayModalDisplay(essay) {
  document.getElementById('essay-modal-title').textContent = essay.title;
  document.getElementById('essay-modal-wordcount').textContent = wordCount(essay.content) + ' words';
  document.getElementById('essay-modal-tags').innerHTML = tagsHtml(essay.tags);
  document.getElementById('essay-modal-content').textContent = essay.content;

  document.getElementById('essay-modal-display').hidden = false;
  document.getElementById('essay-modal-edit').hidden = true;
}

function openEssayModal(id) {
  const essay = essays.find(function(e) { return e.id === id; });
  if (!essay) return;

  currentEssayModalId = id;
  showEssayModalDisplay(essay);
  document.getElementById('essay-modal').hidden = false;
}

function closeEssayModal() {
  document.getElementById('essay-modal').hidden = true;
  currentEssayModalId = null;
}

document.getElementById('essay-modal-close-btn').addEventListener('click', closeEssayModal);

document.getElementById('essay-modal').addEventListener('click', function(event) {
  if (event.target.id === 'essay-modal') closeEssayModal();
});

document.getElementById('essay-modal-edit-btn').addEventListener('click', function() {
  const essay = essays.find(function(e) { return e.id === currentEssayModalId; });
  if (!essay) return;

  document.getElementById('essay-modal-edit-title').value = essay.title;
  document.getElementById('essay-modal-edit-tags').value = essay.tags || '';
  document.getElementById('essay-modal-edit-content').value = essay.content || '';

  document.getElementById('essay-modal-display').hidden = true;
  document.getElementById('essay-modal-edit').hidden = false;
});

document.getElementById('essay-modal-cancel-btn').addEventListener('click', function() {
  const essay = essays.find(function(e) { return e.id === currentEssayModalId; });
  if (essay) showEssayModalDisplay(essay);
});

document.getElementById('essay-modal-save-btn').addEventListener('click', async function() {
  const newTitle = document.getElementById('essay-modal-edit-title').value;
  const newTags = document.getElementById('essay-modal-edit-tags').value;
  const newContent = document.getElementById('essay-modal-edit-content').value;

  const { error } = await supabaseClient
    .from('essays')
    .update({ title: newTitle, tags: newTags, content: newContent, updated_at: new Date().toISOString() })
    .eq('id', currentEssayModalId);

  if (error) { alert('Error saving essay: ' + error.message); return; }

  await loadEssays();
  const updated = essays.find(function(e) { return e.id === currentEssayModalId; });
  if (updated) showEssayModalDisplay(updated);
});

document.getElementById('essay-modal-delete-btn').addEventListener('click', async function() {
  if (!confirm('Delete this essay? This cannot be undone.')) return;

  const { error } = await supabaseClient.from('essays').delete().eq('id', currentEssayModalId);
  if (error) { alert('Error deleting essay: ' + error.message); return; }

  closeEssayModal();
  loadEssays();
});