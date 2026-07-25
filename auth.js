const authSection = document.getElementById('auth-section');
const appSection = document.getElementById('app-section');
const authMessage = document.getElementById('auth-message');
const userEmailDisplay = document.getElementById('user-email');

const emailInput = document.getElementById('auth-email');
const passwordInput = document.getElementById('auth-password');

// Runs whenever someone signs up.
document.getElementById('signup-btn').addEventListener('click', async function() {
  const { data, error } = await supabaseClient.auth.signUp({
    email: emailInput.value,
    password: passwordInput.value
  });

  if (error) {
    authMessage.textContent = error.message;
  } else {
    authMessage.textContent = 'Account created! Check your email to confirm, then log in.';
  }
});

// Runs whenever someone logs in.
document.getElementById('login-btn').addEventListener('click', async function() {
  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email: emailInput.value,
    password: passwordInput.value
  });

  if (error) {
    authMessage.textContent = error.message;
  }
  // If successful, no need to do anything else here -
  // the auth listener below will notice and update the screen.
});

// Runs whenever someone clicks "Log Out".
document.getElementById('logout-btn').addEventListener('click', async function() {
  await supabaseClient.auth.signOut();
});

// This runs automatically whenever the login state changes
// (after login, logout, or when the page first loads).
supabaseClient.auth.onAuthStateChange(function(event, session) {
  if (session) {
    // Someone is logged in
    authSection.style.display = 'none';
    appSection.style.display = 'grid';
    userEmailDisplay.textContent = session.user.email;
    loadScholarships();
    loadFinancialData();
    loadTasks();
  } else {
    // No one is logged in
    authSection.style.display = 'flex';
    appSection.style.display = 'none';
    scholarships = [];
    tasks = [];
    editingId = null;
  }
});