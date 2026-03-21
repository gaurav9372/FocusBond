/* ===========================
   FocusBond — Configuration
   =========================== */

// Supabase credentials (replace with your project values)
const SUPABASE_URL = 'https://ggxfllwktxnzkmsiqlca.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Fn-AntNCAnXX8FcNQ9NwKg_2wS8hznj';

// Session states
const SESSION_STATES = {
  WAITING: 'waiting',
  ACTIVE: 'active',
  LEFT_EARLY: 'left_early',
  COMPLETED: 'completed',
  OUTDID: 'outdid'
};

// Participant statuses
const PARTICIPANT_STATUS = {
  WAITING: 'waiting',
  READY: 'ready',
  ACTIVE: 'active',
  LEFT: 'left'
};

// Friend request statuses
const FRIEND_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected'
};

// Session request statuses
const REQUEST_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected'
};

// Avatar color palette
const AVATAR_COLORS = [
  '#8b5cf6', '#ef4444', '#22c55e', '#eab308',
  '#3b82f6', '#ec4899', '#14b8a6', '#f97316'
];

// Get a random avatar color
function getRandomAvatarColor() {
  return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
}
