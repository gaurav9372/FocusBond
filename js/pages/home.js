/* ===========================
   FocusBond — Home Page
   =========================== */

document.addEventListener('DOMContentLoaded', async () => {
  const user = await AuthService.getCurrentUser();
  if (!user) return;

  // Load profile
  const { data: profile } = await db
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  const avatarBtn = Dom.getById('avatarBtn');
  if (profile) {
    Dom.getById('userName').textContent = profile.name;
    avatarBtn.textContent = profile.name.charAt(0).toUpperCase();
    avatarBtn.style.backgroundColor = profile.avatar_color || '#8b5cf6';
  }

  // ---- Avatar dropdown ----
  const avatarDropdown = Dom.getById('avatarDropdown');

  avatarBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    avatarDropdown.classList.toggle('hidden');
  });

  document.addEventListener('click', () => {
    avatarDropdown.classList.add('hidden');
  });

  // ---- Friend requests notification dot ----
  const { data: pendingFriends } = await FriendsService.getPendingRequests(user.id);
  if (pendingFriends && pendingFriends.length > 0) {
    Dom.show(Dom.getById('friendsDot'));
  }

  // ---- Session requests ----
  await loadSessionRequests(user.id);

  // ---- Past sessions ----
  await loadPastSessions(user.id);

  // ---- New Session modal ----
  const modal = Dom.getById('newSessionModal');
  const friendDD = Dom.getById('friendDropdown');
  const friendDDTrigger = Dom.getById('friendDropdownTrigger');
  const friendDDMenu = Dom.getById('friendDropdownMenu');
  const sendBtn = Dom.getById('sendSessionBtn');
  let selectedFriendId = null;

  // Toggle dropdown
  friendDDTrigger.addEventListener('click', (e) => {
    e.stopPropagation();
    friendDDMenu.classList.toggle('hidden');
    friendDD.classList.toggle('open');
  });

  // Close dropdown on outside click
  document.addEventListener('click', (e) => {
    if (!friendDD.contains(e.target)) {
      friendDDMenu.classList.add('hidden');
      friendDD.classList.remove('open');
    }
  });

  Dom.getById('newSessionBtn').addEventListener('click', async () => {
    Dom.show(modal);
    selectedFriendId = null;
    sendBtn.disabled = true;
    friendDDTrigger.querySelector('.custom-dropdown__text').textContent = 'Select a friend';
    friendDDMenu.classList.add('hidden');
    friendDD.classList.remove('open');

    // Load friends into dropdown
    const { data: friends } = await FriendsService.getMyFriends(user.id);
    Dom.clear(friendDDMenu);

    if (!friends || friends.length === 0) {
      friendDDMenu.innerHTML = '<div class="custom-dropdown__item custom-dropdown__empty">No friends yet</div>';
      return;
    }

    friends.forEach(friend => {
      const item = document.createElement('div');
      item.className = 'custom-dropdown__item';
      const initial = (friend.name || '?')[0].toUpperCase();
      const color = friend.avatar_color || '#8b5cf6';
      item.innerHTML = `
        <div class="avatar avatar-sm" style="background:${color};color:#fff;font-size:0.75rem;">${initial}</div>
        <div class="custom-dropdown__info">
          <span class="custom-dropdown__name">${friend.name}</span>
          <span class="custom-dropdown__username">${friend.username}</span>
        </div>
      `;
      item.addEventListener('click', () => {
        selectedFriendId = friend.id;
        sendBtn.disabled = false;
        friendDDTrigger.querySelector('.custom-dropdown__text').innerHTML = `
          <div class="avatar avatar-xs" style="background:${color};color:#fff;font-size:0.6rem;">${initial}</div>
          ${friend.name}
        `;
        friendDDMenu.classList.add('hidden');
        friendDD.classList.remove('open');
      });
      friendDDMenu.appendChild(item);
    });
  });

  // Close modal
  Dom.getById('sessionModalClose').addEventListener('click', () => Dom.hide(modal));
  modal.addEventListener('click', (e) => { if (e.target === modal) Dom.hide(modal); });

  // Send session request
  sendBtn.addEventListener('click', async () => {
    if (!selectedFriendId) return;

    const duration = parseInt(Dom.getById('sessionDuration').value) || 60;
    if (duration < 1 || duration > 480) {
      Dom.showToast('Duration must be between 1 and 480 minutes');
      return;
    }

    sendBtn.disabled = true;
    sendBtn.textContent = 'Creating...';

    // 1. Create session
    const { data: session, error: sessionError } = await db
      .from('sessions')
      .insert({ created_by: user.id, duration_minutes: duration })
      .select()
      .single();

    if (sessionError) {
      Dom.showToast(sessionError.message || 'Failed to create session');
      sendBtn.disabled = false;
      sendBtn.textContent = 'Send Session Request';
      return;
    }

    // 2. Add creator as participant
    await db.from('session_participants').insert({
      session_id: session.id,
      user_id: user.id,
      status: 'ready'
    });

    // 3. Send session request to friend
    const { error: reqError } = await db
      .from('session_requests')
      .insert({
        session_id: session.id,
        sender_id: user.id,
        receiver_id: selectedFriendId,
        duration_minutes: duration
      });

    if (reqError) {
      Dom.showToast(reqError.message || 'Failed to send request');
      sendBtn.disabled = false;
      sendBtn.textContent = 'Send Session Request';
      return;
    }

    Dom.hide(modal);
    // Navigate to session waiting page
    window.location.href = `./session.html?id=${session.id}`;
  });

  // ---- Realtime: session requests ----
  db.channel('home-session-requests')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'session_requests',
        filter: `receiver_id=eq.${user.id}`
      },
      async () => {
        await loadSessionRequests(user.id);
        await loadPastSessions(user.id);
      }
    )
    .subscribe();

  // ---- Logout ----
  Dom.getById('logoutBtn').addEventListener('click', async () => {
    await AuthService.logout();
  });
});

async function loadSessionRequests(userId) {
  const container = Dom.getById('sessionRequests');

  // Load only pending requests
  const { data: requests, error } = await db
    .from('session_requests')
    .select(`
      id,
      session_id,
      status,
      duration_minutes,
      created_at,
      sender:profiles!session_requests_sender_id_fkey(id, name, username, avatar_color)
    `)
    .eq('receiver_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error || !requests || requests.length === 0) {
    container.innerHTML = '<div class="home-empty">No pending session requests</div>';
    return;
  }

  Dom.clear(container);

  requests.forEach(req => {
    const card = document.createElement('div');
    card.className = 'request-card';

    const header = document.createElement('div');
    header.className = 'request-card__header';

    const avatar = Dom.buildAvatar(req.sender.name, req.sender.avatar_color);
    const info = document.createElement('div');
    info.className = 'user-row__info';
    info.innerHTML = `
      <div class="user-row__name">${req.sender.name}</div>
      <div class="user-row__username">${req.sender.username}</div>
    `;
    const duration = Dom.create('div', {
      className: 'request-card__time',
      textContent: TimeUtils.formatMinutes(req.duration_minutes)
    });

    header.appendChild(avatar);
    header.appendChild(info);
    header.appendChild(duration);

    const meta = Dom.create('div', {
      className: 'request-card__meta',
      textContent: `Invited at ${TimeUtils.formatTime(req.created_at)}`
    });

    const actions = document.createElement('div');
    actions.className = 'request-card__actions';

    const rejectBtn = Dom.create('button', { className: 'btn btn-danger', textContent: 'Reject' });
    const acceptBtn = Dom.create('button', { className: 'btn btn-success', textContent: 'Accept' });

    rejectBtn.addEventListener('click', async () => {
      rejectBtn.disabled = true;
      const { error } = await db
        .from('session_requests')
        .update({ status: 'rejected' })
        .eq('id', req.id);

      if (error) {
        Dom.showToast(error.message || 'Failed to reject');
        rejectBtn.disabled = false;
      } else {
        card.remove();
        if (container.children.length === 0) {
          container.innerHTML = '<div class="home-empty">No pending session requests</div>';
        }
      }
    });

    acceptBtn.addEventListener('click', async () => {
      acceptBtn.disabled = true;
      const { error: updateError } = await db
        .from('session_requests')
        .update({ status: 'accepted' })
        .eq('id', req.id);

      if (updateError) {
        Dom.showToast(updateError.message || 'Failed to accept');
        acceptBtn.disabled = false;
        return;
      }

      const { error: joinError } = await db
        .from('session_participants')
        .insert({ session_id: req.session_id, user_id: userId });

      if (joinError) {
        Dom.showToast(joinError.message || 'Failed to join session');
        acceptBtn.disabled = false;
        return;
      }

      window.location.href = `./session.html?id=${req.session_id}`;
    });

    actions.appendChild(rejectBtn);
    actions.appendChild(acceptBtn);
    card.appendChild(header);
    card.appendChild(meta);
    card.appendChild(actions);
    container.appendChild(card);
  });
}

async function loadPastSessions(userId) {
  const container = Dom.getById('pastSessions');
  Dom.clear(container);
  const allItems = [];

  // 1. Fetch all session requests involving this user (cancelled/rejected)
  const { data: allRequests } = await db
    .from('session_requests')
    .select(`
      id, session_id, status, duration_minutes, created_at, sender_id, receiver_id,
      sender:profiles!session_requests_sender_id_fkey(name, username, avatar_color),
      receiver:profiles!session_requests_receiver_id_fkey(name, username, avatar_color)
    `)
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
    .in('status', ['cancelled', 'rejected']);

  // 2. Fetch participant-based past sessions
  const { data: myParticipations } = await db
    .from('session_participants')
    .select(`
      id, focus_time_seconds, status, hidden, session_id, joined_at, left_at,
      session:sessions!session_participants_session_id_fkey(id, duration_minutes, status, created_at, started_at, created_by)
    `)
    .eq('user_id', userId)
    .eq('hidden', false);

  const pastSessions = (myParticipations || []).filter(p =>
    p.session && (p.session.status === 'completed' || p.status === 'left')
  );

  const processedSessionIds = new Set();

  // Build timeline cards for participant-based sessions
  for (const entry of pastSessions) {
    processedSessionIds.add(entry.session_id);

    // Get all participants
    const { data: allParticipants } = await db
      .from('session_participants')
      .select(`
        user_id, status, joined_at, left_at,
        profile:profiles!session_participants_user_id_fkey(name, username, avatar_color)
      `)
      .eq('session_id', entry.session_id);

    // Get session request for this session
    const { data: reqData } = await db
      .from('session_requests')
      .select('created_at, sender_id, receiver_id, status, sender:profiles!session_requests_sender_id_fkey(name, username, avatar_color), receiver:profiles!session_requests_receiver_id_fkey(name, username, avatar_color)')
      .eq('session_id', entry.session_id)
      .maybeSingle();

    const me = (allParticipants || []).find(p => p.user_id === userId);
    const partner = (allParticipants || []).find(p => p.user_id !== userId);
    const isHost = entry.session.created_by === userId;
    const partnerProfile = partner ? partner.profile : (reqData ? (isHost ? reqData.receiver : reqData.sender) : null);
    const partnerName = partnerProfile ? partnerProfile.name : 'Partner';

    // Build timeline events
    const events = [];
    const requestTime = reqData ? reqData.created_at : entry.session.created_at;

    events.push(`Requested by ${isHost ? 'you' : (reqData ? reqData.sender.name : partnerName)} at ${TimeUtils.formatTime(requestTime)}`);

    if (me && me.joined_at) {
      events.push(`You joined at ${TimeUtils.formatTime(me.joined_at)}`);
    }

    if (partner && partner.joined_at) {
      events.push(`${partnerName} joined at ${TimeUtils.formatTime(partner.joined_at)}`);
    } else if (!partner) {
      events.push(`${partnerName} didn't join`);
    }

    if (reqData && reqData.status === 'rejected') {
      const rejectorIsMe = reqData.receiver_id === userId;
      events.push(rejectorIsMe ? `You rejected` : `${partnerName} rejected`);
    }

    if (me && me.status === 'left' && me.left_at) {
      events.push(`You left at ${TimeUtils.formatTime(me.left_at)}`);
    }
    if (partner && partner.status === 'left' && partner.left_at) {
      events.push(`${partnerName} left at ${TimeUtils.formatTime(partner.left_at)}`);
    }

    // Determine not-started reason
    let notStartedReason = '';
    if (!entry.session.started_at) {
      if (reqData && reqData.status === 'rejected') {
        const rejectorIsMe = reqData.receiver_id === userId;
        notStartedReason = rejectorIsMe ? 'You rejected' : `${partnerName} rejected`;
      } else if (me && me.status === 'left') {
        notStartedReason = 'You left while waiting';
      } else {
        notStartedReason = `${partnerName} left while waiting`;
      }
    }

    const card = buildTimelineCard({
      partnerProfile,
      requestTime,
      durationMinutes: entry.session.duration_minutes,
      focusSeconds: entry.focus_time_seconds || 0,
      targetSeconds: entry.session.duration_minutes * 60,
      sessionStarted: !!entry.session.started_at,
      notStartedReason,
      events,
      onDelete: async (cardEl) => {
        await db.from('session_participants').update({ hidden: true }).eq('id', entry.id);
        cardEl.remove();
        if (container.children.length === 0) {
          container.innerHTML = '<div class="home-empty">No past sessions yet</div>';
        }
      }
    });

    allItems.push({ date: requestTime, card });
  }

  // Build timeline cards for cancelled/rejected requests where user was NOT a participant
  for (const req of (allRequests || [])) {
    if (processedSessionIds.has(req.session_id)) continue;

    const isSender = req.sender_id === userId;
    const partnerProfile = isSender ? req.receiver : req.sender;
    const partnerName = partnerProfile.name;

    const events = [];
    events.push(`Requested by ${isSender ? 'you' : req.sender.name} at ${TimeUtils.formatTime(req.created_at)}`);

    if (isSender) {
      events.push(`You joined at ${TimeUtils.formatTime(req.created_at)}`);
      events.push(`${partnerName} didn't join`);
      if (req.status === 'rejected') {
        events.push(`${partnerName} rejected`);
      }
    } else {
      events.push(`${req.sender.name} joined at ${TimeUtils.formatTime(req.created_at)}`);
      events.push(`You didn't join`);
      if (req.status === 'rejected') {
        events.push(`You rejected`);
      } else if (req.status === 'cancelled') {
        events.push(`${req.sender.name} left`);
      }
    }

    let notStartedReason = '';
    if (req.status === 'rejected') {
      notStartedReason = isSender ? `${partnerName} rejected` : 'You rejected';
    } else if (req.status === 'cancelled') {
      notStartedReason = isSender ? 'You left while waiting' : `${req.sender.name} left while waiting`;
    }

    const card = buildTimelineCard({
      partnerProfile,
      requestTime: req.created_at,
      durationMinutes: req.duration_minutes,
      focusSeconds: 0,
      targetSeconds: req.duration_minutes * 60,
      sessionStarted: false,
      notStartedReason,
      events,
      onDelete: async (cardEl) => {
        await db.from('session_requests').delete().eq('id', req.id);
        cardEl.remove();
        if (container.children.length === 0) {
          container.innerHTML = '<div class="home-empty">No past sessions yet</div>';
        }
      }
    });

    allItems.push({ date: req.created_at, card });
  }

  // Sort latest first
  allItems.sort((a, b) => new Date(b.date) - new Date(a.date));

  if (allItems.length === 0) {
    container.innerHTML = '<div class="home-empty">No past sessions yet</div>';
    return;
  }

  allItems.forEach(item => container.appendChild(item.card));
}

function buildTimelineCard({ partnerProfile, requestTime, durationMinutes, focusSeconds, targetSeconds, sessionStarted, notStartedReason, events, onDelete }) {
  const card = document.createElement('div');
  card.className = 'request-card';
  card.style.opacity = '0.7';
  card.classList.add(sessionStarted ? 'request-card--success' : 'request-card--failed');

  // Header: partner + duration
  const header = document.createElement('div');
  header.className = 'request-card__header';

  if (partnerProfile) {
    const avatar = Dom.buildAvatar(partnerProfile.name, partnerProfile.avatar_color, 'sm');
    const info = document.createElement('div');
    info.className = 'user-row__info';
    info.innerHTML = `
      <div class="user-row__name">${partnerProfile.name}</div>
      <div class="user-row__username">${partnerProfile.username || ''}</div>
    `;
    header.appendChild(avatar);
    header.appendChild(info);
  }

  const dur = Dom.create('div', {
    className: 'request-card__time',
    textContent: TimeUtils.formatMinutes(durationMinutes)
  });
  header.appendChild(dur);

  // Timeline events
  const timeline = document.createElement('div');
  timeline.className = 'session-timeline';
  events.forEach(evt => {
    const line = Dom.create('div', { className: 'session-timeline__event', textContent: evt });
    timeline.appendChild(line);
  });

  // Focus time summary
  const summary = document.createElement('div');
  summary.className = 'past-session__time';

  let outcomeLabel, timeClass;
  if (!sessionStarted) {
    outcomeLabel = notStartedReason ? `Not started: ${notStartedReason}` : 'Not started';
    timeClass = 'text-muted';
  } else {
    const outcome = TimeUtils.getOutcome(focusSeconds, targetSeconds);
    if (outcome === SESSION_STATES.LEFT_EARLY) {
      outcomeLabel = 'Left Early';
      timeClass = 'text-red';
    } else if (outcome === SESSION_STATES.COMPLETED) {
      outcomeLabel = 'Completed';
      timeClass = 'text-green';
    } else {
      outcomeLabel = 'Outdid!';
      timeClass = 'text-green';
    }
  }

  summary.innerHTML = `
    <span class="past-session__label">${outcomeLabel}</span>
    <span class="past-session__focus">
      <span class="${timeClass}">${TimeUtils.formatTimerLong(focusSeconds)}</span>
      <span class="text-muted"> | ${TimeUtils.formatMinutes(durationMinutes)}</span>
    </span>
  `;

  // Delete
  const actions = document.createElement('div');
  actions.className = 'request-card__actions';
  const deleteBtn = Dom.create('button', { className: 'icon-btn-ghost' });
  deleteBtn.innerHTML = '<img src="../assets/icons/delete.svg" alt="Delete" width="22" height="22">';
  deleteBtn.addEventListener('click', async () => {
    deleteBtn.style.opacity = '0.5';
    await onDelete(card);
  });
  actions.appendChild(deleteBtn);

  card.appendChild(header);
  card.appendChild(timeline);
  card.appendChild(summary);
  card.appendChild(actions);
  return card;
}
