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

function openFocusMode(id) {
  // Placeholder — Phase 4 replaces this with the real Focus Mode view.
  alert('Focus Mode is coming in Phase 4! You clicked scholarship: ' + id);
}

form.addEventListener('submit', async function(event) {
  event.preventDefault();

  const name = document.getElementById('name-input').value;
  const amount = document.getElementById('amount-input').value;
  const due = document.getElementById('due-input').value;
  const category = document.getElementById('category-input').value;
  const tags = document.getElementById('tags-input').value;
  const notes = document.getElementById('notes-input').value;

  const { error } = await supabaseClient
    .from('scholarships')
    .insert({ name: name, amount: amount, due: due, category: category, tags: tags, notes: notes });

  if (error) {
    alert('Error adding scholarship: ' + error.message);
    return;
  }

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