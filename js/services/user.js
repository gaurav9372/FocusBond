/* ===========================
   FocusBond — User Service
   =========================== */

const UserService = {
  // Get profile for a user
  async getProfile(userId) {
    const { data, error } = await db
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    return { data, error };
  },

  // Update profile fields (name, username)
  async updateProfile(userId, updates) {
    // Check username uniqueness if username is being changed
    if (updates.username) {
      const { data: existing } = await db
        .from('profiles')
        .select('id')
        .eq('username', updates.username.toLowerCase())
        .neq('id', userId)
        .maybeSingle();

      if (existing) {
        return { error: { message: 'Username is already taken' } };
      }
      updates.username = updates.username.toLowerCase();
    }

    const { data, error } = await db
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();
    return { data, error };
  },

  // Update password via Supabase Auth
  async updatePassword(newPassword) {
    const { error } = await db.auth.updateUser({ password: newPassword });
    return { error };
  }
};
