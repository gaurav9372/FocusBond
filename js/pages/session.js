/* ===========================
   FocusBond — Session Page
   =========================== */

document.addEventListener('DOMContentLoaded', async () => {
  const user = await AuthService.getCurrentUser();
  if (!user) return;

  // Get session ID from URL
  const params = new URLSearchParams(window.location.search);
  const sessionId = params.get('id');
  if (!sessionId) {
    window.location.href = './home.html';
    return;
  }

  // Load session data
  const { data: session, error: sessionError } = await SessionService.getSession(sessionId);
  if (sessionError || !session) {
    Dom.showToast('Session not found');
    window.location.href = './home.html';
    return;
  }

  // State
  let timerInterval = null;
  let elapsedSeconds = 0;
  let realtimeChannel = null;
  let pendingInvites = [];
  const targetSeconds = session.duration_minutes * 60;

  // DOM refs
  const els = {
    sessionLive: Dom.getById('sessionLive'),
    sessionOutcome: Dom.getById('sessionOutcome'),
    sessionNumber: Dom.getById('sessionNumber'),
    sessionDate: Dom.getById('sessionDate'),
    timeStart: Dom.getById('timeStart'),
    timeEnd: Dom.getById('timeEnd'),
    progressFill: Dom.getById('progressFill'),
    timerElapsed: Dom.getById('timerElapsed'),
    timerTarget: Dom.getById('timerTarget'),
    participantsList: Dom.getById('participantsList'),
    liveActions: Dom.getById('liveActions'),
    outcomeActions: Dom.getById('outcomeActions'),
    btnLeave: Dom.getById('btnLeave'),
    btnStop: Dom.getById('btnStop'),
    btnSubmit: Dom.getById('btnSubmit'),
    btnEditTime: Dom.getById('btnEditTime'),
    outcomeEmoji: Dom.getById('outcomeEmoji'),
    outcomeTitle: Dom.getById('outcomeTitle'),
    outcomeFocus: Dom.getById('outcomeFocus'),
    outcomeTarget: Dom.getById('outcomeTarget')
  };

  // Set session info
  els.sessionDate.textContent = TimeUtils.formatDate(session.created_at);
  els.timerTarget.textContent = TimeUtils.formatMinutes(session.duration_minutes);
  els.outcomeTarget.textContent = TimeUtils.formatMinutes(session.duration_minutes);

  // Set time range
  if (session.started_at) {
    els.timeStart.textContent = TimeUtils.formatTime(session.started_at);
    const endTime = new Date(new Date(session.started_at).getTime() + targetSeconds * 1000);
    els.timeEnd.textContent = TimeUtils.formatTime(endTime.toISOString());
  } else {
    els.timeStart.textContent = '--:--';
    els.timeEnd.textContent = '--:--';
  }

  // Load participants
  let participants = [];
  await loadParticipants();

  // Determine initial state
  if (session.status === 'waiting') {
    showWaitingState();
  } else if (session.status === 'active') {
    showActiveState();
  } else {
    showOutcomeFromDB();
  }

  // Subscribe to realtime participant changes
  realtimeChannel = SessionService.subscribeToParticipants(sessionId, async (payload) => {
    await loadParticipants();
    renderParticipants();

    // Check if host left during waiting — redirect others
    if (session.status === 'waiting') {
      const host = participants.find(p => p.user_id === session.created_by);
      if (host && host.status === 'left' && user.id !== session.created_by) {
        Dom.showToast('Host cancelled the session');
        setTimeout(() => { window.location.href = './home.html'; }, 1500);
        return;
      }

      // Check if all participants are ready -> auto-start
      const allReady = participants.length >= 2 && participants.every(p => p.status === 'ready');
      if (allReady) {
        session.status = 'active';
        await SessionService.updateSessionStatus(sessionId, 'active');
        await SessionService.updateMyStatus(sessionId, user.id, 'active');
        showActiveState();
      }
    }
  });

  // Subscribe to session request changes (invite accepted/rejected)
  let requestsChannel = SessionService.subscribeToRequests(sessionId, async () => {
    await loadParticipants();
    renderParticipants();
  });

  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    SessionService.unsubscribe(realtimeChannel);
    SessionService.unsubscribe(requestsChannel);
    if (timerInterval) clearInterval(timerInterval);
  });

  // ---- LOAD & RENDER PARTICIPANTS ----

  async function loadParticipants() {
    const { data } = await SessionService.getParticipants(sessionId);
    if (data) participants = data;

    els.sessionNumber.textContent = 'Session';

    // Load pending session requests to show invited users
    const { data: requests } = await db
      .from('session_requests')
      .select(`
        id,
        status,
        receiver:profiles!session_requests_receiver_id_fkey(id, name, username, avatar_color)
      `)
      .eq('session_id', sessionId)
      .eq('status', 'pending');

    pendingInvites = requests || [];
  }

  function renderParticipants() {
    Dom.clear(els.participantsList);

    // Show actual participants
    participants.forEach(p => {
      const badge = Dom.create('span', {
        className: `badge badge-${p.status}`,
        textContent: p.status
      });
      const row = Dom.buildUserRow(p.profile, badge);
      els.participantsList.appendChild(row);
    });

    // Show invited users who haven't joined yet
    pendingInvites.forEach(invite => {
      // Skip if they're already a participant
      if (participants.some(p => p.user_id === invite.receiver.id)) return;

      const badge = Dom.create('span', {
        className: 'badge badge-waiting',
        textContent: 'Waiting to join'
      });
      const row = Dom.buildUserRow(invite.receiver, badge);
      row.style.opacity = '0.6';
      els.participantsList.appendChild(row);
    });
  }

  // ---- WAITING STATE ----

  function showWaitingState() {
    Dom.show(els.sessionLive);
    Dom.hide(els.sessionOutcome);
    Dom.show(els.liveActions);
    Dom.hide(els.outcomeActions);
    Dom.show(els.btnLeave);
    Dom.hide(els.btnStop);

    els.timerElapsed.textContent = '00:00';
    els.timerElapsed.classList.remove('text-red', 'text-green');
    els.progressFill.style.width = '0%';

    renderParticipants();

    // Leave session button
    els.btnLeave.onclick = () => {
      showConfirmModal('Leave Session?', 'Are you sure you want to leave this session?', async () => {
        els.btnLeave.disabled = true;

        // If host (creator) leaves, cancel the whole session
        if (session.created_by === user.id) {
          await db
            .from('session_requests')
            .update({ status: 'cancelled' })
            .eq('session_id', sessionId)
            .eq('status', 'pending');

          await SessionService.updateSessionStatus(sessionId, 'completed');
        }

        await SessionService.updateMyStatus(sessionId, user.id, 'left');
        window.location.href = './home.html';
      });
    };

    // Check if already ready or need to mark ready
    const myParticipant = participants.find(p => p.user_id === user.id);
    if (myParticipant && myParticipant.status === 'waiting') {
      // Auto-mark as ready
      SessionService.updateMyStatus(sessionId, user.id, 'ready');
    }
  }

  // ---- ACTIVE STATE ----

  function showActiveState() {
    Dom.show(els.sessionLive);
    Dom.hide(els.sessionOutcome);
    Dom.show(els.liveActions);
    Dom.hide(els.outcomeActions);
    Dom.hide(els.btnLeave);
    Dom.show(els.btnStop);

    // Calculate elapsed if session already started
    if (session.started_at) {
      const startedAt = new Date(session.started_at).getTime();
      elapsedSeconds = Math.floor((Date.now() - startedAt) / 1000);

      els.timeStart.textContent = TimeUtils.formatTime(session.started_at);
      const endTime = new Date(startedAt + targetSeconds * 1000);
      els.timeEnd.textContent = TimeUtils.formatTime(endTime.toISOString());
    }

    renderParticipants();
    startTimer();

    // Stop session button
    els.btnStop.onclick = async () => {
      stopTimer();
      await SessionService.updateMyStatus(sessionId, user.id, 'left');
      showOutcome(elapsedSeconds);
    };
  }

  // ---- TIMER ----

  function startTimer() {
    updateTimerDisplay();
    timerInterval = setInterval(() => {
      elapsedSeconds++;
      updateTimerDisplay();
    }, 1000);
  }

  function stopTimer() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  function updateTimerDisplay() {
    els.timerElapsed.textContent = TimeUtils.formatTimerLong(elapsedSeconds);

    const percent = TimeUtils.progressPercent(elapsedSeconds, targetSeconds);
    els.progressFill.style.width = `${percent}%`;

    // Color the timer based on progress
    if (elapsedSeconds >= targetSeconds) {
      els.timerElapsed.classList.add('text-green');
      els.timerElapsed.classList.remove('text-red');
      els.progressFill.style.backgroundColor = 'var(--color-green)';
    } else {
      els.timerElapsed.classList.remove('text-green');
    }
  }

  // ---- OUTCOME STATE ----

  function showOutcome(focusSeconds) {
    Dom.hide(els.sessionLive);
    Dom.show(els.sessionOutcome);
    Dom.hide(els.liveActions);
    Dom.show(els.outcomeActions);

    const outcome = TimeUtils.getOutcome(focusSeconds, targetSeconds);

    // Set emoji and title
    if (outcome === SESSION_STATES.LEFT_EARLY) {
      els.outcomeEmoji.textContent = '\u{1F926}'; // facepalm
      els.outcomeTitle.textContent = 'You Left Early';
      els.outcomeFocus.className = 'text-red';
    } else if (outcome === SESSION_STATES.COMPLETED) {
      els.outcomeEmoji.textContent = '\u{1F973}'; // party face
      els.outcomeTitle.textContent = 'Session Completed';
      els.outcomeFocus.className = 'text-green';
    } else {
      els.outcomeEmoji.textContent = '\u{1F60E}'; // cool face
      els.outcomeTitle.textContent = 'You Outdid Yourself!';
      els.outcomeFocus.className = 'text-green';
    }

    els.outcomeFocus.textContent = TimeUtils.formatTimerLong(focusSeconds);
    els.outcomeTarget.textContent = TimeUtils.formatMinutes(session.duration_minutes);

    // Submit button
    els.btnSubmit.onclick = async () => {
      els.btnSubmit.disabled = true;
      els.btnSubmit.textContent = 'Saving...';

      await SessionService.submitFocusTime(sessionId, user.id, focusSeconds);
      Dom.showToast('Session saved!', 'success');
      window.location.href = './home.html';
    };

    // Edit time button
    els.btnEditTime.onclick = () => {
      const input = prompt('Enter your focus time in minutes:', Math.floor(focusSeconds / 60));
      if (input !== null) {
        const editedMinutes = parseInt(input);
        if (!isNaN(editedMinutes) && editedMinutes >= 0) {
          showOutcome(editedMinutes * 60);
        }
      }
    };
  }

  // Show outcome from DB (for completed sessions loaded after the fact)
  async function showOutcomeFromDB() {
    const myParticipant = participants.find(p => p.user_id === user.id);
    const focusSeconds = myParticipant ? myParticipant.focus_time_seconds : 0;
    showOutcome(focusSeconds);
  }

  // ---- CONFIRM MODAL ----

  function showConfirmModal(title, message, onConfirm) {
    const modal = Dom.getById('confirmModal');
    Dom.getById('confirmTitle').textContent = title;
    Dom.getById('confirmMessage').textContent = message;
    Dom.show(modal);

    const cancelBtn = Dom.getById('confirmCancel');
    const okBtn = Dom.getById('confirmOk');

    // Clean up old listeners by replacing nodes
    const newCancel = cancelBtn.cloneNode(true);
    const newOk = okBtn.cloneNode(true);
    cancelBtn.replaceWith(newCancel);
    okBtn.replaceWith(newOk);

    newCancel.addEventListener('click', () => Dom.hide(modal));
    newOk.addEventListener('click', () => {
      Dom.hide(modal);
      onConfirm();
    });
  }
});
