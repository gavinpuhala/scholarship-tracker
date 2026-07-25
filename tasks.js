let tasks = [];

async function loadTasks() {
  const { data, error } = await supabaseClient
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error loading tasks:', error);
    return;
  }

  tasks = data;
  renderScholarships();
}

function renderTasksHtml(scholarshipId) {
  const relevantTasks = tasks.filter(function(t) {
    return t.scholarship_id === scholarshipId;
  });

  const taskItems = relevantTasks.map(function(t) {
    return `
      <li class="task-item ${t.completed ? 'task-completed' : ''}">
        <label>
          <input type="checkbox" class="task-checkbox" data-task-id="${t.id}" ${t.completed ? 'checked' : ''}>
          <span>${t.title}</span>
        </label>
        <button class="task-delete-btn" data-task-id="${t.id}" type="button">&times;</button>
      </li>
    `;
  }).join('');

  return `
    <div class="task-section">
      <ul class="task-list">${taskItems}</ul>
      <form class="task-add-form" data-scholarship-id="${scholarshipId}">
        <input type="text" class="task-add-input" placeholder="Add a task...">
        <button type="submit">Add</button>
      </form>
    </div>
  `;
}