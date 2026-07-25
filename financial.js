let assumptions = null;

async function loadFinancialData() {
  const { data, error } = await supabaseClient
    .from('financial_assumptions')
    .select('*')
    .maybeSingle();

  if (error) {
    console.error('Error loading financial assumptions:', error);
    return;
  }

  assumptions = data;

  if (assumptions) {
    document.getElementById('tuition-input').value = assumptions.annual_tuition;
    document.getElementById('years-input').value = assumptions.years_remaining;
    document.getElementById('debt-input').value = assumptions.existing_debt;
    document.getElementById('rate-input').value = assumptions.interest_rate;
  }

  renderFinancialImpact();
}

document.getElementById('assumptions-form').addEventListener('submit', async function(event) {
  event.preventDefault();

  const newAssumptions = {
    annual_tuition: parseFloat(document.getElementById('tuition-input').value) || 0,
    years_remaining: parseFloat(document.getElementById('years-input').value) || 0,
    existing_debt: parseFloat(document.getElementById('debt-input').value) || 0,
    interest_rate: parseFloat(document.getElementById('rate-input').value) || 0
  };

  const { error } = await supabaseClient
    .from('financial_assumptions')
    .upsert(newAssumptions, { onConflict: 'user_id' });

  if (error) {
    alert('Error saving assumptions: ' + error.message);
    return;
  }

  loadFinancialData();
});

function renderFinancialImpact() {
  const targets = document.querySelectorAll('.financial-kpis');
  if (targets.length === 0) return;

  let html;

  if (!assumptions) {
    html = `
      <div class="kpi">
        <div class="top"><span class="label">Financial Impact</span></div>
        <div class="sub">Enter your assumptions on the Financial Impact page to see projections.</div>
      </div>
    `;
  } else {
    const wonTotal = scholarships
      .filter(function(s) { return s.status === 'Won'; })
      .reduce(function(sum, s) { return sum + parseAmount(s.amount); }, 0);

    const baselineDebt = (assumptions.annual_tuition * assumptions.years_remaining) + assumptions.existing_debt;
    const debtAvoided = Math.min(wonTotal, baselineDebt);
    const projectedDebt = Math.max(0, baselineDebt - wonTotal);
    const roughInterestAvoided = debtAvoided * (assumptions.interest_rate / 100) * (assumptions.years_remaining / 2);

    html = `
      <div class="kpi">
        <div class="top"><span class="label">Baseline Debt</span></div>
        <div class="val">${formatMoney(baselineDebt)}</div>
        <div class="sub">No scholarships</div>
      </div>
      <div class="kpi">
        <div class="top"><span class="label">Debt Avoided</span><span class="status-pill growth">Growth</span></div>
        <div class="val">${formatMoney(debtAvoided)}</div>
        <div class="sub">So far</div>
      </div>
      <div class="kpi">
        <div class="top"><span class="label">Projected Debt</span></div>
        <div class="val">${formatMoney(projectedDebt)}</div>
        <div class="sub">At graduation</div>
      </div>
      <div class="kpi">
        <div class="top"><span class="label">Interest Avoided</span></div>
        <div class="val">${formatMoney(roughInterestAvoided)}</div>
        <div class="sub">Rough estimate</div>
      </div>
    `;
  }

  targets.forEach(function(target) {
    target.innerHTML = html;
  });
}