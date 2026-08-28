const essayForm = document.getElementById('essay-form');
const essayList = document.getElementById('essay-list');
const essaySearchInput = document.getElementById('essay-search-input');
const essayTagFilterSelect = document.getElementById('essay-tag-filter');

let essays = [];
let essaySearchTerm = '';
let essayTagFilter = 'All';
let editingEssayId = null;

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
  return clean.length > 180 ? clean.slice(0, 180) + '...' : clean;
}

function renderEssayDisplayCard(essay) {
  const item = document.createElement('div');
  item.className = 'essay-card';

  item.innerHTML = `
    <div class="essay-card-header">
      <strong>${essay.title}</strong>
      <span class="essay-word-count">${wordCount(essay.content)} words</span>
    </div>
    <p class="essay-snippet">${essaySnippet(essay.content)}</p>
    <div class="essay-card-tags">${tagsHtml(essay.tags)}</div>
    <div class="essay-card-actions">
      <button type="button" class="btn btn-secondary btn-sm essay-edit-btn" data-id="${essay.id}">Edit</button>
      <button type="button" class="btn btn-secondary btn-sm essay-delete-btn" data-id="${essay.id}">Delete</button>
    </div>
  `;

  return item;
}

function renderEssayEditCard(essay) {
  const item = document.createElement('div');
  item.className = 'essay-card editing';

  item.innerHTML = `
    <input type="text" class="essay-edit-title-input" value="${essay.title}">
    <input type="text" class="essay-edit-tags-input" value="${essay.tags || ''}" placeholder="Tags (comma separated)">
    <textarea class="essay-edit-content-input">${essay.content || ''}</textarea>
    <div class="essay-card-actions">
      <button type="button" class="btn btn-accent btn-sm essay-save-btn" data-id="${essay.id}">Save</button>
      <button type="button" class="btn btn-secondary btn-sm essay-cancel-btn" data-id="${essay.id}">Cancel</button>
    </div>
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
      const card = (essay.id === editingEssayId) ? renderEssayEditCard(essay) : renderEssayDisplayCard(essay);
      essayList.appendChild(card);
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

essayList.addEventListener('click', async function(event) {
  const target = event.target;
  const id = target.getAttribute('data-id');

  if (target.classList.contains('essay-delete-btn')) {
    if (!confirm('Delete this essay? This cannot be undone.')) return;
    const { error } = await supabaseClient.from('essays').delete().eq('id', id);
    if (error) { alert('Error deleting essay: ' + error.message); return; }
    loadEssays();
  }

  if (target.classList.contains('essay-edit-btn')) {
    editingEssayId = id;
    renderEssays();
  }

  if (target.classList.contains('essay-cancel-btn')) {
    editingEssayId = null;
    renderEssays();
  }

  if (target.classList.contains('essay-save-btn')) {
    const card = target.closest('.essay-card');
    const newTitle = card.querySelector('.essay-edit-title-input').value;
    const newTags = card.querySelector('.essay-edit-tags-input').value;
    const newContent = card.querySelector('.essay-edit-content-input').value;

    const { error } = await supabaseClient
      .from('essays')
      .update({ title: newTitle, tags: newTags, content: newContent, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) { alert('Error saving essay: ' + error.message); return; }

    editingEssayId = null;
    loadEssays();
  }
});

essaySearchInput.addEventListener('input', function() {
  essaySearchTerm = essaySearchInput.value;
  renderEssays();
});

essayTagFilterSelect.addEventListener('change', function() {
  essayTagFilter = essayTagFilterSelect.value;
  renderEssays();
});