/* ===========================
   FocusBond — Validation Utility
   =========================== */

const Validation = {
  isEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  },

  isRequired(value) {
    return value !== null && value !== undefined && value.toString().trim().length > 0;
  },

  minLength(value, min) {
    return value && value.length >= min;
  },

  maxLength(value, max) {
    return !value || value.length <= max;
  },

  // Name: letters, spaces, hyphens, apostrophes only
  isValidName(value) {
    return /^[a-zA-Z\s'-]+$/.test(value);
  },

  // Username: lowercase letters, numbers, underscores only
  isValidUsername(value) {
    return /^[a-z0-9_]+$/.test(value);
  },

  passwordsMatch(password, confirmPassword) {
    return password === confirmPassword;
  },

  // Validate a form and return errors object
  // rules: { fieldName: [{ check: fn, message: string }] }
  validateForm(values, rules) {
    const errors = {};
    for (const [field, checks] of Object.entries(rules)) {
      for (const { check, message } of checks) {
        if (!check(values[field], values)) {
          errors[field] = message;
          break;
        }
      }
    }
    return errors;
  },

  // Show errors on form inputs
  showFormErrors(form, errors) {
    // Clear previous errors
    form.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));
    form.querySelectorAll('.error-text').forEach(el => el.remove());

    for (const [field, message] of Object.entries(errors)) {
      const input = form.querySelector(`[data-field="${field}"]`);
      if (input) {
        input.classList.add('input-error');
        const errorEl = document.createElement('span');
        errorEl.className = 'error-text';
        errorEl.textContent = message;
        input.parentElement.appendChild(errorEl);
      }
    }
  },

  // Clear all form errors
  clearFormErrors(form) {
    form.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));
    form.querySelectorAll('.error-text').forEach(el => el.remove());
  }
};
