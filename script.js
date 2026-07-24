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
    return { label: `Overdue by ${Math.abs(daysLeft)} day(s)`, cssClass: 'urgency-overdue' };
  }
  if (daysLeft <= 7) {
    return { label: daysLeft === 0 ? 'Due today' : `Due in ${daysLeft} day(s)`, cssClass: 'urgency-critical' };
  }
  if (daysLeft <= 30) {
    return { label: `Due in ${daysLeft} day(s)`, cssClass: 'urgency-attention' };
  }
  return { label: `Due in ${daysLeft} day(s)`, cssClass: 'urgency-ontrack' };
}

function categoryOptionsHtml(selected) {
  return CATEGORY_OPTIONS.map(function(cat) {
    return `<option value="${cat}">${cat}</option>`;
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
  renderFinancialImpact();
}

function renderSummary() {
  let totalAppliedFor = 0;
  let totalWon = 0;

  scholarships.forEach(function(scholarship) {
    const value = parseAmount(scholarship.amount);
    if (scholarship.status === 'Applied' || scholarship.status === 'Won' || scholarship.status === 'Not Awarded') {
      totalAppliedFor += value;
    }
    if (scholarship.status === 'Won') {
      totalWon += value;
    }
  });

  summary.innerHTML = `
    <div class="summary-card">
      <div class="summary-label">Tracked</div>
      <div class="summary-value">${scholarships.length}</div>
    </div>
    <div class="summary-card">
      <div class="summary-label">Applied For</div>
      <div class="summary-value">${formatMoney(totalAppliedFor)}</div>
    </div>
    <div class="summary-card summary-won">
      <div class="summary-label">Won</div>
      <div class="summary-value">${formatMoney(totalWon)}</div>
    </div>
  `;
}

function renderEditRow(scholarship) {
  const item = document.createElement('li');
  item.className = 'editing';
  const notes = scholarship.notes || '';

  item.innerHTML = `
    <input type="text" class="edit-name-input" value="${scholarship.name}">
    <input type="text" class="edit-amount-input" value="${scholarship.amount}">
    <input type="date" class="edit-due-input" value="${scholarship.due}">
    <select class="edit-category-input">${categoryOptionsHtml()}</select>
    <textarea class="edit-notes-input">${notes}</textarea>
    <div class="card-actions">
      <button class="save-btn" data-id="${scholarship.id}">Save</button>
      <button class="cancel-btn" data-id="${scholarship.id}">Cancel</button>
    </div>
  `;

  item.querySelector('.edit-category-input').value = scholarship.category || 'Other';
  return item;
}

function renderDisplayRow(scholarship) {
  const status = scholarship.status || 'Not Applied';
  const daysLeft = daysUntil(scholarship.due);
  const urgency = urgencyInfo(daysLeft);
  const category = scholarship.category || 'Other';
  const notes = scholarship.notes || '';

  const item = document.createElement('li');
  item.className = 'status-' + status.toLowerCase().replace(' ', '-');

  item.innerHTML = `
    <div class="card-header">
      <strong>${scholarship.name}</strong>
      <span class="category-badge">${category}</span>
    </div>
    <div class="card-meta">
      ${scholarship.amount} — Due: ${formatDate(scholarship.due)}
      <span class="urgency-badge ${urgency.cssClass}">${urgency.label}</span>
    </div>
    ${notes ? `<p class="card-notes">${notes}</p>` : ''}
    <div class="card-actions">
      <select class="status-select" data-id="${scholarship.id}">
        <option value="Not Applied">Not Applied</option>
        <option value="Applied">Applied</option>
        <option value="Won">Won</option>
        <option value="Not Awarded">Not Awarded</option>
      </select>
      <button class="edit-btn" data-id="${scholarship.id}">Edit</button>
      <button class="delete-btn" data-id="${scholarship.id}">Delete</button>
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
});