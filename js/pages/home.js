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

  if (profile) {
    Dom.getById('userName').textContent = profile.name;

    const avatarBtn = Dom.getById('avatarBtn');
    avatarBtn.textContent = profile.name.charAt(0).toUpperCase();
    avatarBtn.style.backgroundColor = profile.avatar_color || '#8b5cf6';
  }

  // ---- Avatar dropdown ----
  const avatarBtn = Dom.getById('avatarBtn');
  const dropdown = Dom.getById('avatarDropdown');

  avatarBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown.classList.toggle('hidden');
  });

  document.addEventListener('click', () => {
    dropdown.classList.add('hidden');
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
  const friendPicker = Dom.getById('friendPickerList');
  const sendBtn = Dom.getById('sendSessionBtn');
  let selectedFriendId = null;

  Dom.getById('newSessionBtn').addEventListener('click', async () => {
    Dom.show(modal);
    selectedFriendId = null;
    sendBtn.disabled = true;

    // Load friends into picker
    const { data: friends } = await FriendsService.getMyFriends(user.id);
    Dom.clear(friendPicker);

    if (!friends || friends.length === 0) {
      friendPicker.innerHTML = '<div class="home-empty" style="padding: var(--spacing-md) 0;">No friends yet</div>';
      return;
    }

    friends.forEach(friend => {
      const row = Dom.buildUserRow(friend);
      row.addEventListener('click', () => {
        // Deselect all
        friendPicker.querySelectorAll('.user-row').forEach(r => r.classList.remove('selected'));
        row.classList.add('selected');
        selectedFriendId = friend.id;
        sendBtn.disabled = false;
      });
      friendPicker.appendChild(row);
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

  // Collect all past session items into one array with a common date for sorting
  const allItems = [];

  // 1. Sessions where user was a participant
  const { data: myParticipations } = await db
    .from('session_participants')
    .select(`
      id,
      focus_time_seconds,
      status,
      hidden,
      session_id,
      session:sessions!session_participants_session_id_fkey(
        id,
        duration_minutes,
        status,
        created_at,
        started_at
      )
    `)
    .eq('user_id', userId)
    .eq('hidden', false);

  const pastSessions = (myParticipations || []).filter(p =>
    p.session && (p.session.status === 'completed' || p.status === 'left')
  );

  for (const entry of pastSessions) {
    const { data: allParticipants } = await db
      .from('session_participants')
      .select(`
        user_id,
        focus_time_seconds,
        status,
        profile:profiles!session_participants_user_id_fkey(name, username, avatar_color)
      `)
      .eq('session_id', entry.session_id);

    let partner = (allParticipants || []).find(p => p.user_id !== userId);

    if (!partner) {
      const { data: reqData } = await db
        .from('session_requests')
        .select('receiver:profiles!session_requests_receiver_id_fkey(name, username, avatar_color)')
        .eq('session_id', entry.session_id)
        .limit(1)
        .maybeSingle();
      if (reqData && reqData.receiver) {
        partner = { profile: reqData.receiver };
      }
    }

    const targetSeconds = entry.session.duration_minutes * 60;
    const focusSeconds = entry.focus_time_seconds || 0;
    const neverStarted = !entry.session.started_at;
    const outcome = neverStarted ? 'waiting_left' : TimeUtils.getOutcome(focusSeconds, targetSeconds);

    allItems.push({
      type: 'participant',
      date: entry.session.created_at,
      card: buildPastSessionCard({
        partner: partner ? partner.profile : null,
        date: entry.session.created_at,
        focusSeconds,
        targetSeconds,
        durationMinutes: entry.session.duration_minutes,
        outcome,
        onDelete: async (cardEl) => {
          await db.from('session_participants').update({ hidden: true }).eq('id', entry.id);
          cardEl.remove();
          if (container.children.length === 0) {
            container.innerHTML = '<div class="home-empty">No past sessions yet</div>';
          }
        }
      }),
      sessionId: entry.session_id
    });
  }

  // 2. Cancelled/rejected session requests
  const { data: receiverRequests } = await db
    .from('session_requests')
    .select(`
      id, session_id, status, duration_minutes, created_at, sender_id, receiver_id,
      sender:profiles!session_requests_sender_id_fkey(name, username, avatar_color),
      receiver:profiles!session_requests_receiver_id_fkey(name, username, avatar_color)
    `)
    .eq('receiver_id', userId)
    .in('status', ['cancelled', 'rejected']);

  const { data: senderRequests } = await db
    .from('session_requests')
    .select(`
      id, session_id, status, duration_minutes, created_at, sender_id, receiver_id,
      sender:profiles!session_requests_sender_id_fkey(name, username, avatar_color),
      receiver:profiles!session_requests_receiver_id_fkey(name, username, avatar_color)
    `)
    .eq('sender_id', userId)
    .eq('status', 'rejected');

  const endedRequests = [...(receiverRequests || []), ...(senderRequests || [])];
  const shownSessionIds = pastSessions.map(p => p.session_id);

  for (const req of endedRequests) {
    if (shownSessionIds.includes(req.session_id)) continue;

    const isSender = req.sender_id === userId;
    const otherUser = isSender ? req.receiver : req.sender;

    let label = '';
    if (req.status === 'cancelled' && !isSender) {
      label = `Ended by ${req.sender.name}`;
    } else if (req.status === 'rejected' && isSender) {
      label = `${req.receiver.name} rejected`;
    } else if (req.status === 'rejected' && !isSender) {
      label = 'You rejected';
    } else {
      continue;
    }

    const card = document.createElement('div');
    card.className = 'request-card';
    card.style.opacity = '0.7';

    const header = document.createElement('div');
    header.className = 'request-card__header';

    const avatar = Dom.buildAvatar(otherUser.name, otherUser.avatar_color, 'sm');
    const info = document.createElement('div');
    info.className = 'user-row__info';
    info.innerHTML = `
      <div class="user-row__name">${otherUser.name}</div>
      <div class="user-row__username">${otherUser.username}</div>
    `;
    header.appendChild(avatar);
    header.appendChild(info);

    const dateMeta = Dom.create('div', {
      className: 'request-card__meta',
      textContent: `${TimeUtils.formatDate(req.created_at)} at ${TimeUtils.formatTime(req.created_at)}`
    });
    header.appendChild(dateMeta);

    const timeRow = document.createElement('div');
    timeRow.className = 'past-session__time';
    timeRow.innerHTML = `
      <span class="past-session__label text-red">${label}</span>
      <span class="past-session__focus">
        <span class="text-muted">00:00 | ${TimeUtils.formatMinutes(req.duration_minutes)}</span>
      </span>
    `;

    const actions = document.createElement('div');
    actions.className = 'request-card__actions';

    const deleteBtn = Dom.create('button', { className: 'icon-btn-ghost' });
    deleteBtn.innerHTML = '<img src="../assets/icons/delete.svg" alt="Delete" width="22" height="22">';
    deleteBtn.addEventListener('click', async () => {
      deleteBtn.style.opacity = '0.5';
      await db.from('session_requests').delete().eq('id', req.id);
      card.remove();
      if (container.children.length === 0) {
        container.innerHTML = '<div class="home-empty">No past sessions yet</div>';
      }
    });
    actions.appendChild(deleteBtn);

    card.appendChild(header);
    card.appendChild(timeRow);
    card.appendChild(actions);

    allItems.push({ type: 'request', date: req.created_at, card, sessionId: req.session_id });
  }

  // Sort all items by date, latest first
  allItems.sort((a, b) => new Date(b.date) - new Date(a.date));

  if (allItems.length === 0) {
    container.innerHTML = '<div class="home-empty">No past sessions yet</div>';
    return;
  }

  allItems.forEach(item => container.appendChild(item.card));
}

function buildPastSessionCard({ partner, date, focusSeconds, targetSeconds, durationMinutes, outcome, onDelete }) {
  const card = document.createElement('div');
  card.className = 'request-card';

  const header = document.createElement('div');
  header.className = 'request-card__header';

  if (partner) {
    const avatar = Dom.buildAvatar(partner.name, partner.avatar_color, 'sm');
    const info = document.createElement('div');
    info.className = 'user-row__info';
    info.innerHTML = `
      <div class="user-row__name">${partner.name}</div>
      <div class="user-row__username">${partner.username}</div>
    `;
    header.appendChild(avatar);
    header.appendChild(info);
  } else {
    const info = Dom.create('div', { className: 'user-row__info' });
    info.innerHTML = '<div class="user-row__name">Solo Session</div>';
    header.appendChild(info);
  }

  const dateEl = Dom.create('div', {
    className: 'request-card__meta',
    textContent: `${TimeUtils.formatDate(date)} at ${TimeUtils.formatTime(date)}`
  });
  header.appendChild(dateEl);

  let outcomeLabel = '';
  let timeClass = '';
  card.style.opacity = '0.7';

  if (outcome === 'waiting_left') {
    outcomeLabel = 'You left while waiting';
    timeClass = 'text-muted';
  } else if (outcome === SESSION_STATES.LEFT_EARLY) {
    outcomeLabel = 'Left Early';
    timeClass = 'text-red';
  } else if (outcome === SESSION_STATES.COMPLETED) {
    outcomeLabel = 'Completed';
    timeClass = 'text-green';
  } else {
    outcomeLabel = 'Outdid!';
    timeClass = 'text-green';
  }

  const timeRow = document.createElement('div');
  timeRow.className = 'past-session__time';
  timeRow.innerHTML = `
    <span class="past-session__label">${outcomeLabel}</span>
    <span class="past-session__focus">
      <span class="${timeClass}">${TimeUtils.formatTimerLong(focusSeconds)}</span>
      <span class="text-muted"> | ${TimeUtils.formatMinutes(durationMinutes)}</span>
    </span>
  `;

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
  card.appendChild(timeRow);
  card.appendChild(actions);
  return card;
}
