/* ===========================
   FocusBond — Session Service
   =========================== */

const SessionService = {
  // Get session with participants
  async getSession(sessionId) {
    const { data, error } = await db
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .single();
    return { data, error };
  },

  // Get participants for a session (with profile info)
  async getParticipants(sessionId) {
    const { data, error } = await db
      .from('session_participants')
      .select(`
        id,
        user_id,
        status,
        focus_time_seconds,
        joined_at,
        left_at,
        profile:profiles!session_participants_user_id_fkey(id, name, username, avatar_color)
      `)
      .eq('session_id', sessionId);
    return { data, error };
  },

  // Update own participant status
  async updateMyStatus(sessionId, userId, status) {
    const updates = { status };
    if (status === 'left') {
      updates.left_at = new Date().toISOString();
    }
    const { data, error } = await db
      .from('session_participants')
      .update(updates)
      .eq('session_id', sessionId)
      .eq('user_id', userId)
      .select()
      .single();
    return { data, error };
  },

  // Submit focus time
  async submitFocusTime(sessionId, userId, focusTimeSeconds) {
    const { data, error } = await db
      .from('session_participants')
      .update({ focus_time_seconds: focusTimeSeconds })
      .eq('session_id', sessionId)
      .eq('user_id', userId)
      .select()
      .single();
    return { data, error };
  },

  // Update session status (waiting -> active -> completed)
  async updateSessionStatus(sessionId, status) {
    const updates = { status };
    if (status === 'active') {
      updates.started_at = new Date().toISOString();
    } else if (status === 'completed') {
      updates.ended_at = new Date().toISOString();
    }
    const { data, error } = await db
      .from('sessions')
      .update(updates)
      .eq('id', sessionId)
      .select()
      .single();
    return { data, error };
  },

  // Subscribe to participant changes (realtime)
  subscribeToParticipants(sessionId, callback) {
    return db
      .channel(`session-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'session_participants',
          filter: `session_id=eq.${sessionId}`
        },
        callback
      )
      .subscribe();
  },

  // Subscribe to session request changes (for invite status updates)
  subscribeToRequests(sessionId, callback) {
    return db
      .channel(`session-requests-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'session_requests',
          filter: `session_id=eq.${sessionId}`
        },
        callback
      )
      .subscribe();
  },

  // Unsubscribe from channel
  unsubscribe(channel) {
    if (channel) db.removeChannel(channel);
  }
};
