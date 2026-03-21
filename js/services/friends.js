/* ===========================
   FocusBond — Friends Service
   =========================== */

const FriendsService = {
  // Search users by username (excludes self)
  async searchByUsername(username, currentUserId) {
    const { data, error } = await db
      .from('profiles')
      .select('id, name, username, avatar_color')
      .ilike('username', `%${username}%`)
      .neq('id', currentUserId)
      .limit(10);
    return { data, error };
  },

  // Send a friend request
  async sendRequest(requesterId, receiverId) {
    // Check if a friendship already exists in either direction
    const { data: existing } = await db
      .from('friends')
      .select('id, status')
      .or(`and(requester_id.eq.${requesterId},receiver_id.eq.${receiverId}),and(requester_id.eq.${receiverId},receiver_id.eq.${requesterId})`)
      .maybeSingle();

    if (existing) {
      if (existing.status === 'accepted') {
        return { error: { message: 'Already friends' } };
      }
      if (existing.status === 'pending') {
        return { error: { message: 'Request already sent' } };
      }
    }

    const { data, error } = await db
      .from('friends')
      .insert({ requester_id: requesterId, receiver_id: receiverId })
      .select()
      .single();
    return { data, error };
  },

  // Get all accepted friends for a user
  async getMyFriends(userId) {
    const { data, error } = await db
      .from('friends')
      .select(`
        id,
        requester_id,
        receiver_id,
        requester:profiles!friends_requester_id_fkey(id, name, username, avatar_color),
        receiver:profiles!friends_receiver_id_fkey(id, name, username, avatar_color)
      `)
      .or(`requester_id.eq.${userId},receiver_id.eq.${userId}`)
      .eq('status', 'accepted');

    if (error) return { data: null, error };

    // Normalize: return the "other" user as the friend
    const friends = data.map(row => {
      const friend = row.requester_id === userId ? row.receiver : row.requester;
      return { ...friend, friendship_id: row.id };
    });

    return { data: friends, error: null };
  },

  // Get pending friend requests received by user
  async getPendingRequests(userId) {
    const { data, error } = await db
      .from('friends')
      .select(`
        id,
        requester:profiles!friends_requester_id_fkey(id, name, username, avatar_color),
        created_at
      `)
      .eq('receiver_id', userId)
      .eq('status', 'pending');
    return { data, error };
  },

  // Get pending requests sent BY user
  async getSentRequests(userId) {
    const { data, error } = await db
      .from('friends')
      .select('id, receiver_id')
      .eq('requester_id', userId)
      .eq('status', 'pending');
    return { data, error };
  },

  // Cancel a sent friend request
  async cancelRequest(friendshipId) {
    const { error } = await db
      .from('friends')
      .delete()
      .eq('id', friendshipId);
    return { error };
  },

  // Accept a friend request
  async acceptRequest(friendshipId) {
    const { data, error } = await db
      .from('friends')
      .update({ status: 'accepted' })
      .eq('id', friendshipId)
      .select()
      .single();
    return { data, error };
  },

  // Reject a friend request
  async rejectRequest(friendshipId) {
    const { data, error } = await db
      .from('friends')
      .update({ status: 'rejected' })
      .eq('id', friendshipId)
      .select()
      .single();
    return { data, error };
  },

  // Remove a friend (delete the friendship row)
  async removeFriend(friendshipId) {
    const { error } = await db
      .from('friends')
      .delete()
      .eq('id', friendshipId);
    return { error };
  }
};
