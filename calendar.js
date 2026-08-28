let calendarMonth = new Date();
calendarMonth.setDate(1);

function pad2(n) {
  return n < 10 ? '0' + n : '' + n;
}

function dateKey(year, month, day) {
  return `${year}-${pad2(month + 1)}-${pad2(day)}`;
}

function isSameDate(year, month, day, otherDate) {
  return year === otherDate.getFullYear() && month === otherDate.getMonth() && day === otherDate.getDate();
}

function renderCalendar() {
  const grid = document.getElementById('calendar-grid');
  const label = document.getElementById('calendar-month-label');
  if (!grid || !label) return;

  const year = calendarMonth.getFullYear();
  const month = calendarMonth.getMonth();

  label.textContent = calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const dueMap = {};
  scholarships.forEach(function(s) {
    if (!s.due) return;
    if (!dueMap[s.due]) dueMap[s.due] = [];
    dueMap[s.due].push(s.name);
  });

    let html = '';
  const today = new Date();

  for (let i = 0; i < firstWeekday; i++) {
    html += '<div class="calendar-day calendar-day-empty"></div>';
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const key = dateKey(year, month, day);
    const dueItems = dueMap[key];
    const hasDeadline = !!dueItems;
    const isToday = isSameDate(year, month, day, today);

    const classes = ['calendar-day'];
    if (hasDeadline) classes.push('has-deadline');
    if (isToday) classes.push('is-today');
    const tooltipAttr = hasDeadline ? ` data-tooltip="${dueItems.join(', ')}"` : '';

    html += `<div class="${classes.join(' ')}"${tooltipAttr}>${day}</div>`;
  }

  grid.innerHTML = html;
}

document.getElementById('calendar-prev-btn').addEventListener('click', function() {
  calendarMonth.setMonth(calendarMonth.getMonth() - 1);
  renderCalendar();
});

document.getElementById('calendar-next-btn').addEventListener('click', function() {
  calendarMonth.setMonth(calendarMonth.getMonth() + 1);
  renderCalendar();
});