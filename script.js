const form = document.getElementById('scholarship-form');
const list = document.getElementById('scholarship-list');
const summary = document.getElementById('summary');

let scholarships = JSON.parse(localStorage.getItem('scholarships')) || [
  { name: 'County Medical Society Scholarship', amount: '$1,500', due: '2026-07-30', status: 'Not Applied' },
  { name: 'State Primary Care Scholarship', amount: '$5,000', due: '2026-08-20', status: 'Not Applied' },
  { name: 'National Leadership Scholarship', amount: '$2,500', due: '2026-11-01', status: 'Not Applied' }
];

// Tracks which scholarship (by index) is currently being edited.
// null means "nothing is being edited right now."
let editingIndex = null;

function saveScholarships() {
  localStorage.setItem('scholarships', JSON.stringify(scholarships));
}

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

// Builds the HTML for one item when it's in EDIT mode.
function renderEditRow(scholarship, index) {
  const item = document.createElement('li');
  item.className = 'editing';

  item.innerHTML = `
    <input type="text" class="edit-name-input" value="${scholarship.name}">
    <input type="text" class="edit-amount-input" value="${scholarship.amount}">
    <input type="date" class="edit-due-input" value="${scholarship.due}">
    <button class="save-btn" data-index="${index}">Save</button>
    <button class="cancel-btn" data-index="${index}">Cancel</button>
  `;

  return item;
}

// Builds the HTML for one item in its NORMAL (display) mode.
function renderDisplayRow(scholarship, index) {
  const status = scholarship.status || 'Not Applied';
  const daysLeft = daysUntil(scholarship.due);
  const urgency = urgencyInfo(daysLeft);

  const item = document.createElement('li');
  item.className = 'status-' + status.toLowerCase().replace(' ', '-');

  item.innerHTML = `
    <strong>${scholarship.name}</strong> — ${scholarship.amount} — Due: ${formatDate(scholarship.due)}
    <span class="urgency-badge ${urgency.cssClass}">${urgency.label}</span>
    <button class="edit-btn" data-index="${index}">Edit</button>
    <button class="delete-btn" data-index="${index}">Delete</button>
    <select class="status-select" data-index="${index}">
      <option value="Not Applied">Not Applied</option>
      <option value="Applied">Applied</option>
      <option value="Won">Won</option>
      <option value="Not Awarded">Not Awarded</option>
    </select>
  `;

  item.querySelector('.status-select').value = status;
  return item;
}

function renderScholarships() {
  scholarships.sort(function(a, b) {
    return new Date(a.due) - new Date(b.due);
  });

  list.innerHTML = '';

  scholarships.forEach(function(scholarship, index) {
    const row = (index === editingIndex)
      ? renderEditRow(scholarship, index)
      : renderDisplayRow(scholarship, index);
    list.appendChild(row);
  });

  renderSummary();
}

form.addEventListener('submit', function(event) {
  event.preventDefault();

  const name = document.getElementById('name-input').value;
  const amount = document.getElementById('amount-input').value;
  const due = document.getElementById('due-input').value;

  scholarships.push({ name: name, amount: amount, due: due, status: 'Not Applied' });

  saveScholarships();
  renderScholarships();
  form.reset();
});

list.addEventListener('click', function(event) {
  const target = event.target;
  const index = target.getAttribute('data-index');

  if (target.classList.contains('delete-btn')) {
    scholarships.splice(index, 1);
    saveScholarships();
    renderScholarships();
  }

  if (target.classList.contains('edit-btn')) {
    editingIndex = parseInt(index);
    renderScholarships();
  }

  if (target.classList.contains('cancel-btn')) {
    editingIndex = null;
    renderScholarships();
  }

  if (target.classList.contains('save-btn')) {
    const row = target.closest('li');
    const newName = row.querySelector('.edit-name-input').value;
    const newAmount = row.querySelector('.edit-amount-input').value;
    const newDue = row.querySelector('.edit-due-input').value;

    scholarships[index].name = newName;
    scholarships[index].amount = newAmount;
    scholarships[index].due = newDue;

    editingIndex = null;
    saveScholarships();
    renderScholarships();
  }
});

list.addEventListener('change', function(event) {
  if (event.target.classList.contains('status-select')) {
    const index = event.target.getAttribute('data-index');
    scholarships[index].status = event.target.value;
    saveScholarships();
    renderScholarships();
  }
});

renderScholarships();