/* ===========================
   FocusBond — Auth Service
   =========================== */

const AuthService = {
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

  // Login with email + password
  async login(email, password) {
    const { data, error } = await db.auth.signInWithPassword({
      email,
      password
    });
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
