const form = document.getElementById('scholarship-form');
const list = document.getElementById('scholarship-list');
const summary = document.getElementById('summary');

let scholarships = [];
let editingId = null;

const CATEGORY_OPTIONS = ['Institutional', 'State', 'National', 'Local/Community', 'Specialty/Professional', 'Service-Based', 'Other'];

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
const STATUS_OPTIONS = ['Not Started', 'In Progress', 'Submitted', 'Won', 'Not Awarded'];

const STATUS_META = {
  'Not Started': { pillClass: 'muted', slug: 'not-started' },
  'In Progress': { pillClass: 'neutral', slug: 'in-progress' },
  'Submitted':   { pillClass: 'accent', slug: 'submitted' },
  'Won':         { pillClass: 'growth', slug: 'won' },
  'Not Awarded': { pillClass: 'loss', slug: 'not-awarded' }
};

function statusOptionsHtml() {
  return STATUS_OPTIONS.map(function(s) {
    return `<option value="${s}">${s}</option>`;
  }).join('');
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

function renderSummary() {
  let totalAppliedFor = 0;
  let totalWon = 0;
  let dueSoonCount = 0;

  scholarships.forEach(function(scholarship) {
    const value = parseAmount(scholarship.amount);
    const stillActive = scholarship.status !== 'Won' && scholarship.status !== 'Not Awarded';

    if (scholarship.status === 'Submitted' || scholarship.status === 'Won' || scholarship.status === 'Not Awarded') {
      totalAppliedFor += value;
    }
    if (scholarship.status === 'Won') {
      totalWon += value;
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
    </div>
    <div class="kpi">
      <div class="top"><span class="label">Won</span><span class="status-pill growth">Growth</span></div>
      <div class="val">${formatMoney(totalWon)}</div>
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

function renderEditRow(scholarship) {
  const item = document.createElement('li');
  item.className = 'scholarship-card editing';
  const notes = scholarship.notes || '';

  item.innerHTML = `
    <input type="text" class="edit-name-input" value="${scholarship.name}">
    <input type="text" class="edit-amount-input" value="${scholarship.amount}">
    <input type="date" class="edit-due-input" value="${scholarship.due}">
    <select class="edit-category-input">${categoryOptionsHtml()}</select>
    <textarea class="edit-notes-input">${notes}</textarea>
    <div class="card-actions">
      <button class="btn btn-accent btn-sm save-btn" data-id="${scholarship.id}">Save</button>
      <button class="btn btn-secondary btn-sm cancel-btn" data-id="${scholarship.id}">Cancel</button>
    </div>
  `;

  item.querySelector('.edit-category-input').value = scholarship.category || 'Other';
  return item;
}

function renderDisplayRow(scholarship) {
  const status = scholarship.status || 'Not Started';
  const meta = STATUS_META[status] || STATUS_META['Not Started'];
  const urgency = urgencyInfo(daysUntil(scholarship.due));
  const category = scholarship.category || 'Other';
  const notes = scholarship.notes || '';

  const item = document.createElement('li');
  item.className = 'scholarship-card status-' + meta.slug;

  item.innerHTML = `
    <div class="card-header">
      <div class="card-title-group">
        <strong>${scholarship.name}</strong>
        <span class="status-pill ${meta.pillClass}">${status}</span>
      </div>
      <span class="tag tag-neutral">${category}</span>
    </div>
    <div class="card-meta">
      <span>${scholarship.amount} — Due: ${formatDate(scholarship.due)}</span>
      <span class="status-pill ${urgency.pillClass}">${urgency.label}</span>
    </div>
    ${notes ? `<p class="card-notes">${notes}</p>` : ''}
    ${renderTasksHtml(scholarship.id)}
    <div class="card-actions">
      <select class="status-select" data-id="${scholarship.id}">${statusOptionsHtml()}</select>
      <button class="btn btn-secondary btn-sm edit-btn" data-id="${scholarship.id}">Edit</button>
      <button class="btn btn-secondary btn-sm delete-btn" data-id="${scholarship.id}">Delete</button>
    </div>
  `;

  item.querySelector('.status-select').value = status;
  return item;
}

function renderScholarships() {
  list.innerHTML = '';
  scholarships.forEach(function(scholarship) {
    const row = (scholarship.id === editingId)
      ? renderEditRow(scholarship)
      : renderDisplayRow(scholarship);
    list.appendChild(row);
  });
  renderSummary();
  renderUpcomingDeadlines();
}

form.addEventListener('submit', async function(event) {
  event.preventDefault();

  const name = document.getElementById('name-input').value;
  const amount = document.getElementById('amount-input').value;
  const due = document.getElementById('due-input').value;
  const category = document.getElementById('category-input').value;
  const notes = document.getElementById('notes-input').value;

  const { error } = await supabaseClient
    .from('scholarships')
    .insert({ name: name, amount: amount, due: due, category: category, notes: notes });

  if (error) {
    alert('Error adding scholarship: ' + error.message);
    return;
  }

  form.reset();
  loadScholarships();
});

list.addEventListener('click', async function(event) {
  const target = event.target;
  const id = target.getAttribute('data-id');

  if (target.classList.contains('delete-btn')) {
    const { error } = await supabaseClient.from('scholarships').delete().eq('id', id);
    if (error) { alert('Error deleting: ' + error.message); return; }
    loadScholarships();
  }

  if (target.classList.contains('edit-btn')) {
    editingId = id;
    renderScholarships();
  }

  if (target.classList.contains('cancel-btn')) {
    editingId = null;
    renderScholarships();
  }

  if (target.classList.contains('save-btn')) {
    const row = target.closest('li');
    const newName = row.querySelector('.edit-name-input').value;
    const newAmount = row.querySelector('.edit-amount-input').value;
    const newDue = row.querySelector('.edit-due-input').value;
    const newCategory = row.querySelector('.edit-category-input').value;
    const newNotes = row.querySelector('.edit-notes-input').value;

    const { error } = await supabaseClient
      .from('scholarships')
      .update({ name: newName, amount: newAmount, due: newDue, category: newCategory, notes: newNotes })
      .eq('id', id);

    if (error) { alert('Error saving: ' + error.message); return; }

    editingId = null;
    loadScholarships();
  }

  if (target.classList.contains('task-delete-btn')) {
    const taskId = target.getAttribute('data-task-id');
    const { error } = await supabaseClient.from('tasks').delete().eq('id', taskId);
    if (error) { alert('Error deleting task: ' + error.message); return; }
    loadTasks();
  }
});

list.addEventListener('submit', async function(event) {
  if (event.target.classList.contains('task-add-form')) {
    event.preventDefault();
    const scholarshipId = event.target.getAttribute('data-scholarship-id');
    const input = event.target.querySelector('.task-add-input');
    const title = input.value.trim();
    if (!title) return;

    const { error } = await supabaseClient
      .from('tasks')
      .insert({ scholarship_id: scholarshipId, title: title });

    if (error) { alert('Error adding task: ' + error.message); return; }
    loadTasks();
  }
});

list.addEventListener('change', async function(event) {
  if (event.target.classList.contains('status-select')) {
    const id = event.target.getAttribute('data-id');
    const newStatus = event.target.value;

    const { error } = await supabaseClient
      .from('scholarships')
      .update({ status: newStatus })
      .eq('id', id);

    if (error) { alert('Error updating status: ' + error.message); return; }
    loadScholarships();
  }

  if (event.target.classList.contains('task-checkbox')) {
    const taskId = event.target.getAttribute('data-task-id');
    const completed = event.target.checked;

    const { error } = await supabaseClient
      .from('tasks')
      .update({ completed: completed })
      .eq('id', taskId);

    if (error) { alert('Error updating task: ' + error.message); return; }
    loadTasks();
  }
});