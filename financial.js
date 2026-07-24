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
  const container = document.getElementById('financial-summary');

  if (!assumptions) {
    container.innerHTML = '<p>Enter your assumptions above to see your projected financial impact.</p>';
    return;
  }

  const wonTotal = scholarships
    .filter(function(s) { return s.status === 'Won'; })
    .reduce(function(sum, s) { return sum + parseAmount(s.amount); }, 0);

  const baselineDebt = (assumptions.annual_tuition * assumptions.years_remaining) + assumptions.existing_debt;
  const debtAvoided = Math.min(wonTotal, baselineDebt);
  const projectedDebt = Math.max(0, baselineDebt - wonTotal);
  const roughInterestAvoided = debtAvoided * (assumptions.interest_rate / 100) * (assumptions.years_remaining / 2);

  container.innerHTML = `
    <div class="summary-card">
      <div class="summary-label">Baseline Debt (no scholarships)</div>
      <div class="summary-value">${formatMoney(baselineDebt)}</div>
    </div>
    <div class="summary-card summary-won">
      <div class="summary-label">Debt Avoided So Far</div>
      <div class="summary-value">${formatMoney(debtAvoided)}</div>
    </div>
    <div class="summary-card">
      <div class="summary-label">Projected Remaining Debt</div>
      <div class="summary-value">${formatMoney(projectedDebt)}</div>
    </div>
    <div class="summary-card">
      <div class="summary-label">Est. Interest Avoided</div>
      <div class="summary-value">${formatMoney(roughInterestAvoided)}</div>
    </div>
  `;
}