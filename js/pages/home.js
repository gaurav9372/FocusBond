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

  // Load both pending and cancelled requests
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
    .in('status', ['pending', 'cancelled']);

  if (error || !requests || requests.length === 0) {
    container.innerHTML = '<div class="home-empty">No pending session requests</div>';
    return;
  }

  Dom.clear(container);

  requests.forEach(req => {
    const card = document.createElement('div');
    card.className = 'request-card';
    const isCancelled = req.status === 'cancelled';

    // Header: avatar + name + duration
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

    if (isCancelled) {
      // Cancelled by host
      const meta = Dom.create('div', {
        className: 'request-card__meta text-red',
        textContent: `Ended by ${req.sender.name}`
      });

      const actions = document.createElement('div');
      actions.className = 'request-card__actions';

      const dismissBtn = Dom.create('button', { className: 'btn btn-secondary btn-block', textContent: 'Dismiss' });
      dismissBtn.addEventListener('click', async () => {
        dismissBtn.disabled = true;
        await db
          .from('session_requests')
          .update({ status: 'rejected' })
          .eq('id', req.id);
        card.remove();
        if (container.children.length === 0) {
          container.innerHTML = '<div class="home-empty">No pending session requests</div>';
        }
      });

      actions.appendChild(dismissBtn);
      card.appendChild(header);
      card.appendChild(meta);
      card.appendChild(actions);
      if (isCancelled) card.style.opacity = '0.7';
    } else {
      // Pending — normal accept/reject
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
    }

    container.appendChild(card);
  });
}

async function loadPastSessions(userId) {
  const container = Dom.getById('pastSessions');

  // Get sessions where user is a participant, not hidden, and session is completed
  const { data: myParticipations, error } = await db
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
    .eq('hidden', false)
    .order('joined_at', { ascending: false });

  if (error) return;

  // Filter to only completed/ended sessions (not waiting or active)
  const pastSessions = (myParticipations || []).filter(p =>
    p.session && (p.session.status === 'completed' || p.status === 'left')
  );

  if (pastSessions.length === 0) {
    container.innerHTML = '<div class="home-empty">No past sessions yet</div>';
    return;
  }

  Dom.clear(container);

  // For each past session, load the other participants
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

    const partner = (allParticipants || []).find(p => p.user_id !== userId);
    const targetSeconds = entry.session.duration_minutes * 60;
    const focusSeconds = entry.focus_time_seconds || 0;
    const outcome = TimeUtils.getOutcome(focusSeconds, targetSeconds);

    const card = document.createElement('div');
    card.className = 'request-card';

    // Header row: partner info + date
    const header = document.createElement('div');
    header.className = 'request-card__header';

    if (partner && partner.profile) {
      const avatar = Dom.buildAvatar(partner.profile.name, partner.profile.avatar_color, 'sm');
      const info = document.createElement('div');
      info.className = 'user-row__info';
      info.innerHTML = `
        <div class="user-row__name">${partner.profile.name}</div>
        <div class="user-row__username">${partner.profile.username}</div>
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
      textContent: TimeUtils.formatDate(entry.session.created_at)
    });
    header.appendChild(dateEl);

    // Focus time row
    const timeRow = document.createElement('div');
    timeRow.className = 'past-session__time';

    let outcomeLabel = '';
    let timeClass = '';
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

    timeRow.innerHTML = `
      <span class="past-session__label">${outcomeLabel}</span>
      <span class="past-session__focus">
        <span class="${timeClass}">${TimeUtils.formatTimerLong(focusSeconds)}</span>
        <span class="text-muted"> | ${TimeUtils.formatMinutes(entry.session.duration_minutes)}</span>
      </span>
    `;

    // Delete button
    const actions = document.createElement('div');
    actions.className = 'request-card__actions';

    const deleteBtn = Dom.create('button', { className: 'icon-btn-ghost' });
    deleteBtn.innerHTML = '<img src="../assets/icons/delete.svg" alt="Delete" width="22" height="22">';
    deleteBtn.addEventListener('click', async () => {
      deleteBtn.style.opacity = '0.5';
      await db
        .from('session_participants')
        .update({ hidden: true })
        .eq('id', entry.id);
      card.remove();
      if (container.children.length === 0) {
        container.innerHTML = '<div class="home-empty">No past sessions yet</div>';
      }
    });

    actions.appendChild(deleteBtn);

    card.appendChild(header);
    card.appendChild(timeRow);
    card.appendChild(actions);
    container.appendChild(card);
  }
}
