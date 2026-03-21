/* ===========================
   FocusBond — Profile Page
   =========================== */

document.addEventListener('DOMContentLoaded', async () => {
  const user = await AuthService.getCurrentUser();
  if (!user) return;

  const form = Dom.getById('profileForm');
  const passwordModal = Dom.getById('passwordModal');
  const passwordForm = Dom.getById('passwordForm');

  // Load current profile into form
  const { data: profile } = await UserService.getProfile(user.id);
  if (profile) {
    Dom.getById('name').value = profile.name || '';
    Dom.getById('username').value = profile.username || '';
    Dom.getById('email').value = profile.email || '';
  }

  // Handle profile save
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    Validation.clearFormErrors(form);

    const name = Dom.getById('name').value.trim();
    const username = Dom.getById('username').value.trim();

    const errors = Validation.validateForm(
      { name, username },
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
        ]
      }
    );

    if (Object.keys(errors).length > 0) {
      Validation.showFormErrors(form, errors);
      return;
    }

    const submitBtn = document.querySelector('[form="profileForm"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving...';

    const { error } = await UserService.updateProfile(user.id, { name, username });

    if (error) {
      Dom.showToast(error.message || 'Failed to update profile');
    } else {
      Dom.showToast('Profile updated!', 'success');
    }

    submitBtn.disabled = false;
    submitBtn.textContent = 'Save';
  });

  // Open password modal
  Dom.getById('changePasswordBtn').addEventListener('click', () => {
    Dom.show(passwordModal);
  });

  // Close password modal
  Dom.getById('modalClose').addEventListener('click', () => {
    Dom.hide(passwordModal);
    passwordForm.reset();
    Validation.clearFormErrors(passwordForm);
  });

  // Close modal on overlay click
  passwordModal.addEventListener('click', (e) => {
    if (e.target === passwordModal) {
      Dom.hide(passwordModal);
      passwordForm.reset();
      Validation.clearFormErrors(passwordForm);
    }
  });

  // Handle password change
  passwordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    Validation.clearFormErrors(passwordForm);

    const newPassword = Dom.getById('newPassword').value;
    const confirmNewPassword = Dom.getById('confirmNewPassword').value;

    const errors = Validation.validateForm(
      { newPassword, confirmNewPassword },
      {
        newPassword: [
          { check: v => Validation.isRequired(v), message: 'Password is required' },
          { check: v => Validation.minLength(v, 6), message: 'Must be at least 6 characters' }
        ],
        confirmNewPassword: [
          { check: v => Validation.isRequired(v), message: 'Please confirm your password' },
          { check: (v, vals) => Validation.passwordsMatch(vals.newPassword, v), message: 'Passwords do not match' }
        ]
      }
    );

    if (Object.keys(errors).length > 0) {
      Validation.showFormErrors(passwordForm, errors);
      return;
    }

    const submitBtn = passwordForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Updating...';

    const { error } = await UserService.updatePassword(newPassword);

    if (error) {
      Dom.showToast(error.message || 'Failed to update password');
    } else {
      Dom.showToast('Password updated!', 'success');
      Dom.hide(passwordModal);
      passwordForm.reset();
    }

    submitBtn.disabled = false;
    submitBtn.textContent = 'Update Password';
  });
});
