/* ===========================
   FocusBond — Register Page
   =========================== */

document.addEventListener('DOMContentLoaded', async () => {
  await redirectIfLoggedIn();

  const form = Dom.getById('registerForm');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    Validation.clearFormErrors(form);

    const name = Dom.getById('name').value.trim();
    const username = Dom.getById('username').value.trim();
    const email = Dom.getById('email').value.trim();
    const password = Dom.getById('password').value;
    const confirmPassword = Dom.getById('confirmPassword').value;

    // Validate
    const errors = Validation.validateForm(
      { name, username, email, password, confirmPassword },
      {
        name: [
          { check: v => Validation.isRequired(v), message: 'Name is required' },
          { check: v => Validation.minLength(v, 2), message: 'Name must be at least 2 characters' },
          { check: v => Validation.maxLength(v, 30), message: 'Name must be 30 characters or less' },
          { check: v => Validation.isValidName(v), message: 'Name can only contain letters, spaces, hyphens and apostrophes' }
        ],
        username: [
          { check: v => Validation.isRequired(v), message: 'Username is required' },
          { check: v => Validation.minLength(v, 3), message: 'Username must be at least 3 characters' },
          { check: v => Validation.maxLength(v, 15), message: 'Username must be 15 characters or less' },
          { check: v => Validation.isValidUsername(v), message: 'Username can only contain lowercase letters, numbers and underscores' }
        ],
        email: [
          { check: v => Validation.isRequired(v), message: 'Email is required' },
          { check: v => Validation.isEmail(v), message: 'Enter a valid email' }
        ],
        password: [
          { check: v => Validation.isRequired(v), message: 'Password is required' },
          { check: v => Validation.minLength(v, 6), message: 'Password must be at least 6 characters' }
        ],
        confirmPassword: [
          { check: v => Validation.isRequired(v), message: 'Please re-enter your password' },
          { check: (v, vals) => Validation.passwordsMatch(vals.password, v), message: 'Passwords do not match' }
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
    submitBtn.textContent = 'Creating account...';

    const { error } = await AuthService.register({ name, username, email, password });

    if (error) {
      Dom.showToast(error.message || 'Registration failed');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit';
      return;
    }

    Dom.showToast('Account created!', 'success');
    window.location.href = resolveAppPath('pages/home.html');
  });
});
