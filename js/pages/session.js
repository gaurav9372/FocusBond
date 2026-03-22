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
  let startTimestamp = null;
  let hasLeft = false;
  let partnerLeftNotified = false;
  let idleWarningTimeout = null;
  let awayWarningTimeout = null;
  let awayState = null;
  let warningVisible = false;
  let warningReason = null;
  let warningStartedAt = null;
  let returnBannerTimeout = null;
  let lastActivityAt = Date.now();
  let sessionStartCountdownInterval = null;
  let sessionStartCountdownSeconds = 0;
  const targetSeconds = session.duration_minutes * 60;
  const IDLE_WARNING_AFTER_MS = 2 * 60 * 1000;
  const AWAY_WARNING_AFTER_MS = 30 * 1000;
  const RETURN_SUMMARY_MIN_MS = 5 * 1000;
  const SESSION_START_COUNTDOWN_SECONDS = 3;

  // DOM refs
  const els = {
    sessionLive: Dom.getById('sessionLive'),
    focusReturnBanner: Dom.getById('focusReturnBanner'),
    focusReturnText: Dom.getById('focusReturnText'),
    focusReturnDismiss: Dom.getById('focusReturnDismiss'),
    sessionStartBanner: Dom.getById('sessionStartBanner'),
    sessionStartCountdown: Dom.getById('sessionStartCountdown'),
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
    outcomeTarget: Dom.getById('outcomeTarget'),
    focusWarningModal: Dom.getById('focusWarningModal'),
    focusWarningTitle: Dom.getById('focusWarningTitle'),
    focusWarningMessage: Dom.getById('focusWarningMessage'),
    focusWarningSummary: Dom.getById('focusWarningSummary'),
    focusWarningContinue: Dom.getById('focusWarningContinue'),
    focusWarningLeave: Dom.getById('focusWarningLeave'),
    sessionReportSummary: Dom.getById('sessionReportSummary'),
    sessionReportParticipants: Dom.getById('sessionReportParticipants')
  };

  function formatDuration(ms) {
    return TimeUtils.formatTimerLong(Math.max(1, Math.floor(ms / 1000)));
  }

  function getElapsedSecondsNow() {
    if (!startTimestamp) return elapsedSeconds;
    return Math.max(elapsedSeconds, Math.floor((Date.now() - startTimestamp) / 1000));
  }

  function getSessionStatusSummary() {
    return `${TimeUtils.formatTimerLong(getElapsedSecondsNow())} / ${TimeUtils.formatMinutes(session.duration_minutes)}`;
  }

  function isActiveFocusSession() {
    return session.status === 'active' && !hasLeft;
  }

  function getReportParticipants() {
    const me = participants.find(p => p.user_id === user.id) || null;
    const partner = participants.find(p => p.user_id !== user.id) || null;
    return { me, partner };
  }

  function getOutcomeLabel(focusSeconds) {
    const outcome = TimeUtils.getOutcome(focusSeconds, targetSeconds);
    if (outcome === SESSION_STATES.LEFT_EARLY) return 'Left early';
    if (outcome === SESSION_STATES.COMPLETED) return 'Completed';
    return 'Outdid yourself';
  }

  function getOutcomePillClass(focusSeconds) {
    const outcome = TimeUtils.getOutcome(focusSeconds, targetSeconds);
    if (outcome === SESSION_STATES.LEFT_EARLY) return 'session-report-pill--red';
    if (outcome === SESSION_STATES.COMPLETED) return 'session-report-pill--green';
    return 'session-report-pill--yellow';
  }

  function formatSessionReportTime(value) {
    return value ? TimeUtils.formatTime(value) : '--:--';
  }

  function clearAttentionTimers() {
    if (idleWarningTimeout) {
      clearTimeout(idleWarningTimeout);
      idleWarningTimeout = null;
    }

    if (awayWarningTimeout) {
      clearTimeout(awayWarningTimeout);
      awayWarningTimeout = null;
    }
  }

  function hideReturnBanner() {
    if (returnBannerTimeout) {
      clearTimeout(returnBannerTimeout);
      returnBannerTimeout = null;
    }
    Dom.hide(els.focusReturnBanner);
  }

  function resetAttentionState() {
    clearAttentionTimers();
    clearSessionStartCountdown();
    hideReturnBanner();
    awayState = null;
    warningVisible = false;
    warningReason = null;
    warningStartedAt = null;
    document.body.classList.remove('session-warning-active');
    Dom.hide(els.focusWarningModal);
  }

  function clearSessionStartCountdown() {
    if (sessionStartCountdownInterval) {
      clearInterval(sessionStartCountdownInterval);
      sessionStartCountdownInterval = null;
    }

    sessionStartCountdownSeconds = 0;
    Dom.hide(els.sessionStartBanner);
  }

  function allParticipantsReady() {
    return participants.length >= 2 && participants.every(p => p.status === 'ready');
  }

  async function promoteSessionToActive() {
    if (hasLeft || session.status !== 'waiting') return;

    clearSessionStartCountdown();

    if (user.id === session.created_by) {
      const { error: sessionError } = await SessionService.updateSessionStatus(sessionId, 'active');
      if (sessionError) {
        Dom.showToast(sessionError.message || 'Failed to start session');
        maybeStartSessionCountdown();
        return;
      }

      const { error: myStatusError } = await SessionService.updateMyStatus(sessionId, user.id, 'active');
      if (myStatusError) {
        Dom.showToast(myStatusError.message || 'Failed to update your status');
        maybeStartSessionCountdown();
        return;
      }

      session.status = 'active';
      showActiveState();
      return;
    }

    const { error: myStatusError } = await SessionService.updateMyStatus(sessionId, user.id, 'active');
    if (myStatusError) {
      Dom.showToast(myStatusError.message || 'Failed to update your status');
      maybeStartSessionCountdown();
    }
  }

  function renderSessionStartCountdown() {
    els.sessionStartCountdown.textContent = sessionStartCountdownSeconds.toString();
    Dom.show(els.sessionStartBanner);
  }

  function maybeStartSessionCountdown() {
    if (hasLeft || session.status !== 'waiting') {
      clearSessionStartCountdown();
      return;
    }

    if (!allParticipantsReady()) {
      clearSessionStartCountdown();
      return;
    }

    if (sessionStartCountdownInterval) return;

    sessionStartCountdownSeconds = SESSION_START_COUNTDOWN_SECONDS;
    renderSessionStartCountdown();

    sessionStartCountdownInterval = setInterval(async () => {
      if (hasLeft || session.status !== 'waiting' || !allParticipantsReady()) {
        clearSessionStartCountdown();
        return;
      }

      sessionStartCountdownSeconds -= 1;

      if (sessionStartCountdownSeconds <= 0) {
        await promoteSessionToActive();
        return;
      }

      renderSessionStartCountdown();
    }, 1000);
  }

  function scheduleIdleWarning() {
    clearAttentionTimers();

    if (!isActiveFocusSession() || warningVisible || awayState) {
      return;
    }

    idleWarningTimeout = setTimeout(() => {
      if (!isActiveFocusSession() || warningVisible || awayState) return;
      openAttentionWarning('idle', lastActivityAt);
    }, IDLE_WARNING_AFTER_MS);
  }

  function beginAwayState(mode) {
    if (!isActiveFocusSession() || warningVisible) return;

    if (awayState) {
      if (awayState.mode === 'hidden' || awayState.mode === mode) return;
      if (mode === 'hidden') {
        awayState.mode = 'hidden';
      }
      return;
    }

    awayState = {
      mode,
      startedAt: Date.now()
    };

    clearAttentionTimers();
    awayWarningTimeout = setTimeout(() => {
      if (!isActiveFocusSession() || warningVisible || !awayState) return;
      openAttentionWarning(awayState.mode, awayState.startedAt);
    }, AWAY_WARNING_AFTER_MS);
  }

  function finishAwayState() {
    if (!awayState) return null;

    const state = awayState;
    awayState = null;

    if (awayWarningTimeout) {
      clearTimeout(awayWarningTimeout);
      awayWarningTimeout = null;
    }

    return state;
  }

  function showReturnSummaryBanner(reason, awayMs) {
    if (warningVisible) return;

    const awayLabel = reason === 'idle' ? 'You were idle for' : 'You were away for';
    els.focusReturnText.textContent = `${awayLabel} ${formatDuration(awayMs)}. Session is still active at ${getSessionStatusSummary()}.`;
    Dom.show(els.focusReturnBanner);

    if (returnBannerTimeout) {
      clearTimeout(returnBannerTimeout);
    }

    returnBannerTimeout = setTimeout(() => {
      hideReturnBanner();
    }, 7000);
  }

  function updateWarningModal(reason, startedAt) {
    const awayMs = Math.max(0, Date.now() - startedAt);
    const isIdle = reason === 'idle';

    els.focusWarningTitle.textContent = isIdle ? 'Stay in focus' : 'Welcome back';
    els.focusWarningMessage.textContent = isIdle
      ? 'You have been inactive long enough that the session needs attention.'
      : 'You stepped away from the session. It is still running.';
    els.focusWarningSummary.textContent = `${isIdle ? 'Idle' : 'Away'} for ${formatDuration(awayMs)}. Session is active at ${getSessionStatusSummary()}.`;
  }

  function openAttentionWarning(reason, startedAt) {
    if (!isActiveFocusSession() || warningVisible) return;

    warningVisible = true;
    warningReason = reason;
    warningStartedAt = startedAt;
    document.body.classList.add('session-warning-active');
    updateWarningModal(reason, startedAt);
    Dom.show(els.focusWarningModal);
  }

  function closeAttentionWarning(showSummary = true) {
    if (!warningVisible) return;

    const startedAt = warningStartedAt || (warningReason === 'idle' ? lastActivityAt : Date.now());
    const reason = warningReason || 'away';
    const awayMs = Math.max(0, Date.now() - startedAt);

    warningVisible = false;
    warningReason = null;
    warningStartedAt = null;
    Dom.hide(els.focusWarningModal);
    document.body.classList.remove('session-warning-active');
    clearAttentionTimers();

    if (showSummary && awayMs >= RETURN_SUMMARY_MIN_MS) {
      showReturnSummaryBanner(reason, awayMs);
    }

    if (isActiveFocusSession()) {
      lastActivityAt = Date.now();
      scheduleIdleWarning();
    }
  }

  function handleReturnFromAway() {
    const state = finishAwayState();

    if (state) {
      const awayMs = Math.max(0, Date.now() - state.startedAt);

      if (warningVisible) {
        updateWarningModal(state.mode, state.startedAt);
        warningStartedAt = state.startedAt;
      } else if (awayMs >= RETURN_SUMMARY_MIN_MS) {
        showReturnSummaryBanner(state.mode, awayMs);
      }
    }

    lastActivityAt = Date.now();

    if (!warningVisible && isActiveFocusSession()) {
      scheduleIdleWarning();
    }
  }

  function handleUserActivity() {
    if (!isActiveFocusSession() || warningVisible) return;

    lastActivityAt = Date.now();
    scheduleIdleWarning();
  }

  function handleVisibilityChange() {
    if (!isActiveFocusSession()) return;

    if (document.hidden) {
      beginAwayState('hidden');
      return;
    }

    handleReturnFromAway();
  }

  function handleWindowBlur() {
    if (!isActiveFocusSession() || document.hidden) return;
    beginAwayState('blur');
  }

  function handleWindowFocus() {
    if (!isActiveFocusSession() || document.hidden) return;
    handleReturnFromAway();
  }

  async function endCurrentSession() {
    if (hasLeft) return;

    hasLeft = true;
    resetAttentionState();
    stopTimer();
    elapsedSeconds = Math.floor((Date.now() - startTimestamp) / 1000);
    await SessionService.submitFocusTime(sessionId, user.id, elapsedSeconds);
    await SessionService.updateMyStatus(sessionId, user.id, 'left');
    showOutcome(elapsedSeconds);
  }

  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('blur', handleWindowBlur);
  window.addEventListener('focus', handleWindowFocus);
  document.addEventListener('pointerdown', handleUserActivity, { passive: true });
  document.addEventListener('keydown', handleUserActivity);
  document.addEventListener('touchstart', handleUserActivity, { passive: true });
  document.addEventListener('scroll', handleUserActivity, { passive: true, capture: true });

  els.focusReturnDismiss.addEventListener('click', hideReturnBanner);
  els.focusWarningContinue.addEventListener('click', () => closeAttentionWarning(true));
  els.focusWarningLeave.addEventListener('click', async () => {
    resetAttentionState();
    await endCurrentSession();
  });

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
    // Ignore realtime events if user has already left
    if (hasLeft) return;

    await loadParticipants();
    renderParticipants();

    // Re-fetch session status from DB to stay in sync
    const { data: freshSession } = await SessionService.getSession(sessionId);
    if (freshSession) {
      session.status = freshSession.status;
      session.started_at = freshSession.started_at;
    }

    // Check if host left during waiting — redirect others
    if (session.status === 'waiting') {
      const host = participants.find(p => p.user_id === session.created_by);
      if (host && host.status === 'left' && user.id !== session.created_by) {
        clearSessionStartCountdown();
        Dom.showToast('Host cancelled the session');
        setTimeout(() => { window.location.href = './home.html'; }, 1500);
        return;
      }

      maybeStartSessionCountdown();
    } else {
      clearSessionStartCountdown();
    }

    // If session became active (triggered by the other user), start timer
    if (session.status === 'active' && !timerInterval) {
      await SessionService.updateMyStatus(sessionId, user.id, 'active');
      showActiveState();
    }

    // Beep + toast when partner leaves during active session (once only)
    if (session.status === 'active' && !partnerLeftNotified && payload.new && payload.new.status === 'left' && payload.new.user_id !== user.id) {
      partnerLeftNotified = true;
      const partnerP = participants.find(p => p.user_id === payload.new.user_id);
      const partnerName = partnerP && partnerP.profile ? partnerP.profile.name : 'Partner';
      playBeep();
      Dom.showToast(`${partnerName} left the session`);
    }
  });

  // Subscribe to session request changes (invite accepted/rejected)
  let requestsChannel = SessionService.subscribeToRequests(sessionId, async (payload) => {
    const updated = payload.new;

    // If the invite was rejected, end session for the host
    if (updated && updated.status === 'rejected' && session.status === 'waiting' && session.created_by === user.id) {
      await SessionService.updateMyStatus(sessionId, user.id, 'left');
      await SessionService.updateSessionStatus(sessionId, 'completed');
      Dom.showToast('Session request was declined');
      setTimeout(() => { window.location.href = './home.html'; }, 1500);
      return;
    }

    await loadParticipants();
    renderParticipants();
  });

  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    resetAttentionState();
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
      const actionEl = document.createElement('div');
      actionEl.className = 'participant-status';

      if (p.status === 'left' && session.status === 'active' && p.left_at) {
        // Show leave info for users who left during active session
        const focusTime = p.focus_time_seconds || 0;
        const leftBadge = Dom.create('span', { className: 'badge badge-left', textContent: 'Left' });
        const leftInfo = Dom.create('div', {
          className: 'participant-left-info',
          textContent: `${TimeUtils.formatTimerLong(focusTime)} · ${TimeUtils.formatTime(p.left_at)}`
        });
        actionEl.appendChild(leftBadge);
        actionEl.appendChild(leftInfo);
      } else {
        const badge = Dom.create('span', {
          className: `badge badge-${p.status}`,
          textContent: p.status
        });
        actionEl.appendChild(badge);
      }

      const row = Dom.buildUserRow(p.profile, actionEl);
      if (p.status === 'left') row.style.opacity = '0.6';
      els.participantsList.appendChild(row);
    });

    // Show invited users who haven't joined yet
    pendingInvites.forEach(invite => {
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

    els.timerElapsed.textContent = '00:00:00';
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
      SessionService.updateMyStatus(sessionId, user.id, 'ready').then(() => {
        if (session.status === 'waiting') {
          maybeStartSessionCountdown();
        }
      });
    }

    maybeStartSessionCountdown();
  }

  // ---- ACTIVE STATE ----

  function showActiveState() {
    document.body.classList.add('session-active');
    resetAttentionState();
    Dom.show(els.sessionLive);
    Dom.hide(els.sessionOutcome);
    Dom.show(els.liveActions);
    Dom.hide(els.outcomeActions);
    Dom.hide(els.btnLeave);
    Dom.show(els.btnStop);

    // Calculate start timestamp
    if (session.started_at) {
      startTimestamp = new Date(session.started_at).getTime();

      els.timeStart.textContent = TimeUtils.formatTime(session.started_at);
      const endTime = new Date(startTimestamp + targetSeconds * 1000);
      els.timeEnd.textContent = TimeUtils.formatTime(endTime.toISOString());
    } else {
      startTimestamp = Date.now();
    }

    renderParticipants();
    startTimer();
    lastActivityAt = Date.now();
    scheduleIdleWarning();

    // Stop session button
    els.btnStop.onclick = async () => {
      await endCurrentSession();
    };
  }

  // ---- BEEP SOUND ----

  function playBeep() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      osc.type = 'sine';
      gain.gain.value = 0.3;
      osc.start();
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.stop(ctx.currentTime + 0.3);
    } catch (e) {
      // Audio not supported
    }
  }

  // ---- TIMER ----

  let timesUpShown = false;

  function startTimer() {
    function tick() {
      const elapsedMs = Date.now() - startTimestamp;
      elapsedSeconds = Math.floor(elapsedMs / 1000);
      const centis = Math.floor((elapsedMs % 1000) / 10);

      const mins = Math.floor(elapsedSeconds / 60).toString().padStart(2, '0');
      const secs = (elapsedSeconds % 60).toString().padStart(2, '0');
      const cs = centis.toString().padStart(2, '0');
      els.timerElapsed.textContent = `${mins}:${secs}:${cs}`;

      const percent = TimeUtils.progressPercent(elapsedSeconds, targetSeconds);
      els.progressFill.style.width = `${percent}%`;

      if (elapsedSeconds >= targetSeconds) {
        els.timerElapsed.classList.add('text-green');
        els.timerElapsed.classList.remove('text-red');
        els.progressFill.style.backgroundColor = 'var(--color-green)';

        // Pause and show Time's Up modal once
        if (!timesUpShown) {
          timesUpShown = true;
          stopTimer();
          showTimesUpModal();
          return;
        }
      } else {
        els.timerElapsed.classList.remove('text-green');
      }

      timerInterval = requestAnimationFrame(tick);
    }
    timerInterval = requestAnimationFrame(tick);
  }

  function stopTimer() {
    if (timerInterval) {
      cancelAnimationFrame(timerInterval);
      timerInterval = null;
    }
  }

  function showTimesUpModal() {
    const modal = Dom.getById('timesUpModal');
    Dom.show(modal);

    Dom.getById('timesUpComplete').onclick = async () => {
      hasLeft = true;
      Dom.hide(modal);
      elapsedSeconds = Math.floor((Date.now() - startTimestamp) / 1000);
      await SessionService.updateMyStatus(sessionId, user.id, 'left');
      showOutcome(elapsedSeconds);
    };

    Dom.getById('timesUpContinue').onclick = () => {
      Dom.hide(modal);
      startTimer();
    };
  }

  function renderSessionReport(currentUserFocusSeconds) {
    const { me, partner } = getReportParticipants();
    const reportParticipants = [me, partner].filter(Boolean);

    const startedAt = session.started_at || (me && me.joined_at) || (partner && partner.joined_at) || session.created_at;
    const endedAt = session.ended_at || (me && me.left_at) || (partner && partner.left_at) || null;

    els.sessionReportSummary.textContent = [
      `Started ${formatSessionReportTime(startedAt)}`,
      `Ended ${formatSessionReportTime(endedAt)}`,
      `Target ${TimeUtils.formatMinutes(session.duration_minutes)}`
    ].join(' · ');

    Dom.clear(els.sessionReportParticipants);

    if (reportParticipants.length === 0) {
      els.sessionReportParticipants.innerHTML = '<div class="friends-empty">No report data available</div>';
      return;
    }

    reportParticipants.forEach((participant, index) => {
      const focusSeconds = participant.user_id === user.id
        ? currentUserFocusSeconds
        : (participant.focus_time_seconds || 0);
      const outcomeLabel = getOutcomeLabel(focusSeconds);
      const pillClass = getOutcomePillClass(focusSeconds);
      const statusClass = index === 0 ? 'session-report-card--primary' : 'session-report-card--secondary';
      const name = participant.profile ? participant.profile.name : (participant.user_id === user.id ? 'You' : 'Partner');
      const username = participant.profile && participant.profile.username ? `@${participant.profile.username}` : '';

      const card = document.createElement('div');
      card.className = `session-report-card ${statusClass}`;

      const header = document.createElement('div');
      header.className = 'session-report-card__header';

      const avatar = Dom.buildAvatar(name, participant.profile && participant.profile.avatar_color, 'md');
      header.appendChild(avatar);

      const info = document.createElement('div');
      info.className = 'session-report-card__info';
      info.innerHTML = `
        <div class="session-report-card__name">${name}</div>
        <div class="session-report-card__username">${username || 'Session participant'}</div>
      `;
      header.appendChild(info);

      const meta = Dom.create('div', { className: 'session-report-card__meta' });
      meta.appendChild(Dom.create('span', { className: `session-report-pill ${pillClass}`, textContent: outcomeLabel }));
      if (participant.user_id === user.id) {
        meta.appendChild(Dom.create('span', { className: 'session-report-pill session-report-pill--green', textContent: 'You' }));
      } else {
        meta.appendChild(Dom.create('span', { className: 'session-report-pill session-report-pill--yellow', textContent: 'Partner' }));
      }
      header.appendChild(meta);

      const details = document.createElement('div');
      details.className = 'session-report-card__details';
      details.appendChild(Dom.create('div', {
        className: 'session-report-card__detail',
        innerHTML: `
          <span class="session-report-card__label">Focus time</span>
          <span class="session-report-card__value">${TimeUtils.formatTimerLong(focusSeconds)}</span>
        `
      }));
      details.appendChild(Dom.create('div', {
        className: 'session-report-card__detail',
        innerHTML: `
          <span class="session-report-card__label">Joined</span>
          <span class="session-report-card__value">${formatSessionReportTime(participant.joined_at)}</span>
        `
      }));
      details.appendChild(Dom.create('div', {
        className: 'session-report-card__detail',
        innerHTML: `
          <span class="session-report-card__label">Left</span>
          <span class="session-report-card__value">${formatSessionReportTime(participant.left_at)}</span>
        `
      }));

      card.appendChild(header);
      card.appendChild(details);
      els.sessionReportParticipants.appendChild(card);
    });
  }

  // ---- OUTCOME STATE ----

  function showOutcome(focusSeconds) {
    resetAttentionState();
    document.body.classList.remove('session-active');
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
    renderSessionReport(focusSeconds);

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
      const modal = Dom.getById('editTimeModal');
      const minsInput = Dom.getById('editMinutes');
      const secsInput = Dom.getById('editSeconds');

      minsInput.value = Math.floor(focusSeconds / 60);
      secsInput.value = focusSeconds % 60;
      Dom.show(modal);

      Dom.getById('editTimeClose').onclick = () => Dom.hide(modal);
      modal.addEventListener('click', (e) => { if (e.target === modal) Dom.hide(modal); });

      Dom.getById('editTimeSave').onclick = () => {
        const editedMins = parseInt(minsInput.value) || 0;
        const editedSecs = parseInt(secsInput.value) || 0;
        if (editedMins >= 0 && editedSecs >= 0 && editedSecs < 60) {
          Dom.hide(modal);
          showOutcome(editedMins * 60 + editedSecs);
        } else {
          Dom.showToast('Invalid time');
        }
      };
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
