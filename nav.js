const sideItems = document.querySelectorAll('.side-item[data-view]');
const viewPanels = document.querySelectorAll('[data-view-panel]');
const viewTitle = document.getElementById('view-title');
const viewSubtitle = document.getElementById('view-subtitle');

const VIEW_META = {
  overview: { title: 'Overview', subtitle: 'Your scholarship strategy at a glance.' },
  scholarships: { title: 'Scholarships', subtitle: 'Track, edit, and manage every application.' },
  essays: { title: 'Essays', subtitle: 'Write, tag, and reuse essays across scholarships.' },
  documents: { title: 'Documents', subtitle: 'Coming in a future phase.' },
  recommenders: { title: 'Recommenders', subtitle: 'Coming in a future phase.' }
};

function switchView(viewName) {
  sideItems.forEach(function(item) {
    item.classList.toggle('active', item.getAttribute('data-view') === viewName);
  });

  viewPanels.forEach(function(panel) {
    panel.hidden = panel.getAttribute('data-view-panel') !== viewName;
  });

  const meta = VIEW_META[viewName];
  if (meta) {
    viewTitle.textContent = meta.title;
    viewSubtitle.textContent = meta.subtitle;
  }
}

sideItems.forEach(function(item) {
  item.addEventListener('click', function() {
    switchView(item.getAttribute('data-view'));
  });
});

switchView('overview');