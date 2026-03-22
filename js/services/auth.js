/* ===========================
   FocusBond — Auth Service
   =========================== */

const AuthService = {
  // Resolve a login identifier (username or email) to email for Supabase Auth
  async resolveLoginEmail(identifier) {
    const input = (identifier || '').trim();
    if (!input) return null;

    // Email path: use directly
    if (input.includes('@')) {
      return input.toLowerCase();
    }

    // Username path: resolve via SECURITY DEFINER rpc (works for anon role)
    const { data, error } = await db.rpc('get_login_email', { login_input: input });
    if (error) return null;
    return data || null;
  },

  // Register a new user + create profile
  async register({ name, username, email, password }) {
    // 1. Check username uniqueness
    const { data: existing } = await db
      .from('profiles')
      .select('id')
      .eq('username', username.toLowerCase())
      .maybeSingle();

    if (existing) {
      return { error: { message: 'Username is already taken' } };
    }

    // 2. Sign up with Supabase Auth
    const { data: authData, error: authError } = await db.auth.signUp({
      email,
      password
    });

    if (authError) return { error: authError };

    // 3. Create profile row
    const { error: profileError } = await db
      .from('profiles')
      .insert({
        id: authData.user.id,
        name,
        username: username.toLowerCase(),
        email,
        avatar_color: getRandomAvatarColor()
      });

    if (profileError) return { error: profileError };

    return { data: authData };
  },

  // Login with username/email + password
  async login(identifier, password) {
    const resolvedEmail = await this.resolveLoginEmail(identifier);
    if (!resolvedEmail) {
      return { data: null, error: { message: 'Invalid username/email or password' } };
    }

    const { data, error } = await db.auth.signInWithPassword({
      email: resolvedEmail,
      password
    });

    if (error && error.message) {
      return { data: null, error: { message: 'Invalid username/email or password' } };
    }
    return { data, error };
  },

  // Logout
  async logout() {
    const { error } = await db.auth.signOut();
    return { error };
  },

  // Get the current authenticated user
  async getCurrentUser() {
    const { data: { user } } = await db.auth.getUser();
    return user;
  },

  // Get the current session
  async getSession() {
    const { data: { session } } = await db.auth.getSession();
    return session;
  }
};
