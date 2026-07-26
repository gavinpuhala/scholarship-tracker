async function logActivity(scholarshipId, eventType, description) {
  const { error } = await supabaseClient
    .from('activity_log')
    .insert({ scholarship_id: scholarshipId, event_type: eventType, description: description });

  if (error) {
    console.error('Error logging activity:', error);
  }
}

async function renderFocusTimeline(scholarshipId) {
  const container = document.getElementById('focus-timeline');
  if (!container) return;

  const { data, error } = await supabaseClient
    .from('activity_log')
    .select('*')
    .eq('scholarship_id', scholarshipId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error loading activity log:', error);
    return;
  }

  if (data.length === 0) {
    container.innerHTML = '<li class="timeline-empty">No activity yet.</li>';
    return;
  }

  container.innerHTML = data.map(function(entry) {
    const when = new Date(entry.created_at).toLocaleString('en-US', {
      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
    });
    return `
      <li class="timeline-item">
        <span class="timeline-dot"></span>
        <div>
          <div class="timeline-desc">${entry.description}</div>
          <div class="timeline-when">${when}</div>
        </div>
      </li>
    `;
  }).join('');
}