/* ===========================
   FocusBond — Login Page
   =========================== */

document.addEventListener('DOMContentLoaded', async () => {
  await redirectIfLoggedIn();

  const form = Dom.getById('loginForm');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    Validation.clearFormErrors(form);

    const identifier = Dom.getById('loginIdentifier').value.trim();
    const password = Dom.getById('password').value;

    // Validate
    const errors = Validation.validateForm(
      { identifier, password },
      {
        identifier: [
          { check: v => Validation.isRequired(v), message: 'Username or email is required' }
        ],
        password: [
          { check: v => Validation.isRequired(v), message: 'Password is required' }
        ]
      }
    );

    if (Object.keys(errors).length > 0) {
      Validation.showFormErrors(form, errors);
      return;
    }

    // Disable button during request
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Logging in...';

    const { error } = await AuthService.login(identifier, password);

    if (error) {
      Dom.showToast(error.message || 'Login failed');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Login';
      return;
    }

    window.location.href = resolveAppPath('pages/home.html');
  });
});
