/* ===========================
   FocusBond — Time Utility
   =========================== */

const TimeUtils = {
  // Format seconds into MM:SS
  formatTimer(totalSeconds) {
    const mins = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const secs = (totalSeconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  },

  // Format seconds into HH:MM:SS (for longer durations)
  formatTimerLong(totalSeconds) {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
    const secs = (totalSeconds % 60).toString().padStart(2, '0');
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins}:${secs}`;
    }
    return `${mins}:${secs}`;
  },

  // Format minutes into readable duration (e.g., 60 → "01:00")
  formatMinutes(minutes) {
    return this.formatTimer(minutes * 60);
  },

  // Format a date into "MM/DD/YYYY, Day" format
  formatDate(dateStr) {
    const date = new Date(dateStr);
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const mm = (date.getMonth() + 1).toString().padStart(2, '0');
    const dd = date.getDate().toString().padStart(2, '0');
    const yyyy = date.getFullYear();
    const day = days[date.getDay()];
    return `${mm}/${dd}/${yyyy}, ${day}`;
  },

  // Format a date into time string (e.g., "08:00 PM")
  formatTime(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  },

  // Calculate progress percentage
  progressPercent(elapsedSeconds, totalSeconds) {
    if (totalSeconds <= 0) return 0;
    return Math.min((elapsedSeconds / totalSeconds) * 100, 100);
  },

  // Determine session outcome from focus time vs target
  getOutcome(focusSeconds, targetSeconds) {
    if (focusSeconds < targetSeconds) return SESSION_STATES.LEFT_EARLY;
    if (focusSeconds === targetSeconds) return SESSION_STATES.COMPLETED;
    return SESSION_STATES.OUTDID;
  }
};
