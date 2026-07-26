const form = document.getElementById('scholarship-form');
const list = document.getElementById('scholarship-list');
const summary = document.getElementById('summary');
const searchInput = document.getElementById('search-input');
const statusFilterSelect = document.getElementById('status-filter');
const tagFilterSelect = document.getElementById('tag-filter');

let scholarships = [];
let searchTerm = '';
let statusFilter = 'All';
let tagFilter = 'All';
let currentFocusId = null;

const CATEGORY_OPTIONS = ['Institutional', 'State', 'National', 'Local/Community', 'Specialty/Professional', 'Service-Based', 'Other'];
const STATUS_OPTIONS = ['Not Started', 'In Progress', 'Submitted', 'Won', 'Not Awarded'];

const STATUS_META = {
  'Not Started': { pillClass: 'muted', slug: 'not-started' },
  'In Progress': { pillClass: 'neutral', slug: 'in-progress' },
  'Submitted':   { pillClass: 'accent', slug: 'submitted' },
  'Won':         { pillClass: 'growth', slug: 'won' },
  'Not Awarded': { pillClass: 'loss', slug: 'not-awarded' }
};

function parseAmount(amountStr) {
  const cleaned = amountStr.replace(/[^0-9.]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function formatMoney(num) {
  return '$' + num.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

function daysUntil(dueDateStr) {
  const due = new Date(dueDateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffMs = due - today;
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

function formatDate(dueDateStr) {
  const due = new Date(dueDateStr + 'T00:00:00');
  return due.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function urgencyInfo(daysLeft) {
  if (daysLeft < 0) {
    return { label: `Overdue ${Math.abs(daysLeft)}d`, pillClass: 'loss' };
  }
  if (daysLeft <= 7) {
    return { label: daysLeft === 0 ? 'Due today' : `${daysLeft}d left`, pillClass: 'loss' };
  }
  if (daysLeft <= 30) {
    return { label: `${daysLeft}d left`, pillClass: 'neutral' };
  }
  return { label: `${daysLeft}d left`, pillClass: 'growth' };
}

function categoryOptionsHtml() {
  return CATEGORY_OPTIONS.map(function(cat) {
    return `<option value="${cat}">${cat}</option>`;
  }).join('');
}

function statusOptionsHtml() {
  return STATUS_OPTIONS.map(function(s) {
    return `<option value="${s}">${s}</option>`;
  }).join('');
}

function parseTags(tagsStr) {
  return (tagsStr || '').split(',').map(function(t) { return t.trim(); }).filter(Boolean);
}
  function tagsHtml(tagsStr) {
  return parseTags(tagsStr).map(function(t) {
    return `<span class="tag tag-outline">${t}</span>`;
  }).join('');
}


function getAllTags() {
  const tagSet = new Set();
  scholarships.forEach(function(s) {
    parseTags(s.tags).forEach(function(t) { tagSet.add(t); });
  });
  return Array.from(tagSet).sort();
}

async function loadScholarships() {
  const { data, error } = await supabaseClient
    .from('scholarships')
    .select('*')
    .order('due', { ascending: true });

  if (error) {
    console.error('Error loading scholarships:', error);
    return;
  }

  scholarships = data;
  renderScholarships();
}

function getFilteredScholarships() {
  return scholarships.filter(function(s) {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || (s.status || 'Not Started') === statusFilter;
    const matchesTag = tagFilter === 'All' || parseTags(s.tags).includes(tagFilter);
    return matchesSearch && matchesStatus && matchesTag;
  });
}

function renderTagFilterOptions() {
  const currentValue = tagFilterSelect.value || 'All';
  const tags = getAllTags();
  tagFilterSelect.innerHTML = '<option value="All">All Tags</option>' +
    tags.map(function(t) { return `<option value="${t}">${t}</option>`; }).join('');
  tagFilterSelect.value = tags.includes(currentValue) ? currentValue : 'All';
}

function renderSummary() {
  let totalAppliedFor = 0;
  let appliedForCount = 0;
  let totalWon = 0;
  let wonCount = 0;
  let inProgressCount = 0;
  let submittedCount = 0;
  let dueSoonCount = 0;

  scholarships.forEach(function(scholarship) {
    const value = parseAmount(scholarship.amount);
    const status = scholarship.status || 'Not Started';
    const stillActive = status !== 'Won' && status !== 'Not Awarded';

    if (status === 'Submitted' || status === 'Won' || status === 'Not Awarded') {
      totalAppliedFor += value;
      appliedForCount++;
    }
    if (status === 'In Progress') inProgressCount++;
    if (status === 'Submitted') submittedCount++;
    if (status === 'Won') {
      totalWon += value;
      wonCount++;
    }

    const daysLeft = daysUntil(scholarship.due);
    if (stillActive && daysLeft >= 0 && daysLeft <= 30) {
      dueSoonCount++;
    }
  });

  summary.innerHTML = `
    <div class="kpi">
      <div class="top"><span class="label">Tracked</span></div>
      <div class="val">${scholarships.length}</div>
      <div class="sub">total scholarships</div>
    </div>
    <div class="kpi">
      <div class="top"><span class="label">Applied For</span><span class="status-pill neutral">Total</span></div>
      <div class="val">${formatMoney(totalAppliedFor)}</div>
      <div class="sub">${appliedForCount} scholarship${appliedForCount === 1 ? '' : 's'}</div>
    </div>
    <div class="kpi">
      <div class="top"><span class="label">In Progress</span></div>
      <div class="val">${inProgressCount}</div>
    </div>
    <div class="kpi">
      <div class="top"><span class="label">Submitted</span><span class="status-pill accent">Total</span></div>
      <div class="val">${submittedCount}</div>
    </div>
    <div class="kpi">
      <div class="top"><span class="label">Won</span><span class="status-pill growth">Total</span></div>
      <div class="val">${formatMoney(totalWon)}</div>
      <div class="sub">${wonCount} scholarship${wonCount === 1 ? '' : 's'}</div>
    </div>
    <div class="kpi">
      <div class="top"><span class="label">Due Within 30 Days</span>${dueSoonCount > 0 ? '<span class="status-pill loss">Act now</span>' : ''}</div>
      <div class="val">${dueSoonCount}</div>
    </div>
  `;
}

function renderUpcomingDeadlines() {
  const container = document.getElementById('upcoming-deadlines');
  if (!container) return;

  const upcoming = scholarships
    .filter(function(s) { return s.status !== 'Won' && s.status !== 'Not Awarded'; })
    .slice(0, 4);

  if (upcoming.length === 0) {
    container.innerHTML = `
      <div class="action-card">
        <div class="ic"></div>
        <div>
          <div class="t">Nothing due soon</div>
          <div class="s">Add a scholarship to get started</div>
        </div>
      </div>
    `;
    return;
  }

  container.innerHTML = upcoming.map(function(s) {
    const urgency = urgencyInfo(daysUntil(s.due));
    return `
      <div class="action-card">
        <div class="ic"></div>
        <div>
          <div class="t">${s.name}</div>
          <div class="s">${formatDate(s.due)} — ${s.amount}</div>
        </div>
        <span class="status-pill ${urgency.pillClass}">${urgency.label}</span>
      </div>
    `;
  }).join('');
}

function renderScholarshipRow(scholarship) {
  const status = scholarship.status || 'Not Started';
  const meta = STATUS_META[status] || STATUS_META['Not Started'];

  const item = document.createElement('li');
  item.className = 'scholarship-row';
  item.setAttribute('data-id', scholarship.id);

  item.innerHTML = `
    <div class="row-main">
      <strong>${scholarship.name}</strong>
      <span class="row-due">Due ${formatDate(scholarship.due)}</span>
    </div>
    <span class="status-pill ${meta.pillClass}">${status}</span>
  `;

  return item;
}

function renderScholarships() {
  const filtered = getFilteredScholarships();
  list.innerHTML = '';

  if (filtered.length === 0) {
    list.innerHTML = '<li class="empty-state">No scholarships match your filters.</li>';
  } else {
    filtered.forEach(function(scholarship) {
      list.appendChild(renderScholarshipRow(scholarship));
    });
  }

  renderTagFilterOptions();
  renderSummary();
  renderUpcomingDeadlines();
}
function renderFocusProgress(scholarshipId) {
  const relevantTasks = tasks.filter(function(t) { return t.scholarship_id === scholarshipId; });
  const total = relevantTasks.length;
  const completed = relevantTasks.filter(function(t) { return t.completed; }).length;
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

  document.getElementById('focus-progress-fill').style.width = percent + '%';
  document.getElementById('focus-progress-label').textContent =
    total === 0 ? 'No tasks yet' : `${completed} / ${total} tasks — ${percent}%`;
}

function openFocusMode(id) {
  const scholarship = scholarships.find(function(s) { return s.id === id; });
  if (!scholarship) return;

  currentFocusId = id;

  const status = scholarship.status || 'Not Started';
  const meta = STATUS_META[status] || STATUS_META['Not Started'];

  document.getElementById('focus-name').textContent = scholarship.name;
  const pill = document.getElementById('focus-status-pill');
  pill.textContent = status;
  pill.className = 'status-pill ' + meta.pillClass;
  document.getElementById('focus-amount').textContent = scholarship.amount;
  document.getElementById('focus-due').textContent = 'Due ' + formatDate(scholarship.due);
  document.getElementById('focus-tags').innerHTML = tagsHtml(scholarship.tags);

  const statusSelect = document.getElementById('focus-status-select');
  statusSelect.innerHTML = statusOptionsHtml();
  statusSelect.value = status;

  document.getElementById('focus-notes-input').value = scholarship.notes || '';
  document.getElementById('focus-tasks').innerHTML = renderTasksHtml(id);

  renderFocusProgress(id);
  renderFocusTimeline(id);

  switchView('focus');
  document.getElementById('view-title').textContent = scholarship.name;
  document.getElementById('view-subtitle').textContent = 'Scholarship workspace';
}

document.getElementById('focus-back-btn').addEventListener('click', function() {
  switchView('scholarships');
});


form.addEventListener('submit', async function(event) {
  event.preventDefault();

  const name = document.getElementById('name-input').value;
  const amount = document.getElementById('amount-input').value;
  const due = document.getElementById('due-input').value;
  const category = document.getElementById('category-input').value;
  const tags = document.getElementById('tags-input').value;
  const notes = document.getElementById('notes-input').value;

  const { data, error } = await supabaseClient
    .from('scholarships')
    .insert({ name: name, amount: amount, due: due, category: category, tags: tags, notes: notes })
    .select()
    .single();

  if (error) {
    alert('Error adding scholarship: ' + error.message);
    return;
  }

  await logActivity(data.id, 'created', `Scholarship "${data.name}" created`);

  form.reset();
  loadScholarships();
});

list.addEventListener('click', function(event) {
  const row = event.target.closest('.scholarship-row');
  if (!row) return;
  openFocusMode(row.getAttribute('data-id'));
});

searchInput.addEventListener('input', function() {
  searchTerm = searchInput.value;
  renderScholarships();
});

statusFilterSelect.addEventListener('change', function() {
  statusFilter = statusFilterSelect.value;
  renderScholarships();
});

tagFilterSelect.addEventListener('change', function() {
  tagFilter = tagFilterSelect.value;
  renderScholarships();
});
function refreshFocusTasks() {
  if (!currentFocusId) return;
  document.getElementById('focus-tasks').innerHTML = renderTasksHtml(currentFocusId);
  renderFocusProgress(currentFocusId);
}

const focusTasksContainer = document.getElementById('focus-tasks');

focusTasksContainer.addEventListener('click', async function(event) {
  if (event.target.classList.contains('task-delete-btn')) {
    const taskId = event.target.getAttribute('data-task-id');
    const { error } = await supabaseClient.from('tasks').delete().eq('id', taskId);
    if (error) { alert('Error deleting task: ' + error.message); return; }
    await loadTasks();
    refreshFocusTasks();
  }
});

focusTasksContainer.addEventListener('submit', async function(event) {
  if (event.target.classList.contains('task-add-form')) {
    event.preventDefault();
    const scholarshipId = event.target.getAttribute('data-scholarship-id');
    const input = event.target.querySelector('.task-add-input');
    const title = input.value.trim();
    if (!title) return;

    const { error } = await supabaseClient.from('tasks').insert({ scholarship_id: scholarshipId, title: title });
    if (error) { alert('Error adding task: ' + error.message); return; }
    await loadTasks();
    refreshFocusTasks();
  }
});

focusTasksContainer.addEventListener('change', async function(event) {
  if (event.target.classList.contains('task-checkbox')) {
    const taskId = event.target.getAttribute('data-task-id');
    const completed = event.target.checked;
    const taskTitle = event.target.nextElementSibling.textContent;

    const { error } = await supabaseClient.from('tasks').update({ completed: completed }).eq('id', taskId);
    if (error) { alert('Error updating task: ' + error.message); return; }

    if (completed) {
      await logActivity(currentFocusId, 'task_completed', `Completed task: ${taskTitle}`);
    }

    await loadTasks();
    refreshFocusTasks();
    renderFocusTimeline(currentFocusId);
  }
});

document.getElementById('focus-status-select').addEventListener('change', async function(event) {
  const newStatus = event.target.value;

  const { error } = await supabaseClient
    .from('scholarships')
    .update({ status: newStatus })
    .eq('id', currentFocusId);

  if (error) { alert('Error updating status: ' + error.message); return; }

  await logActivity(currentFocusId, 'status_change', `Status changed to ${newStatus}`);

  await loadScholarships();
  openFocusMode(currentFocusId);
});

document.getElementById('focus-delete-btn').addEventListener('click', async function() {
  if (!confirm('Delete this scholarship? This cannot be undone.')) return;

  const { error } = await supabaseClient.from('scholarships').delete().eq('id', currentFocusId);
  if (error) { alert('Error deleting: ' + error.message); return; }

  currentFocusId = null;
  await loadScholarships();
  switchView('scholarships');
});

document.getElementById('focus-notes-save-btn').addEventListener('click', async function() {
  const newNotes = document.getElementById('focus-notes-input').value;
  const { error } = await supabaseClient
    .from('scholarships')
    .update({ notes: newNotes })
    .eq('id', currentFocusId);

  if (error) { alert('Error saving notes: ' + error.message); return; }
  await loadScholarships();
});