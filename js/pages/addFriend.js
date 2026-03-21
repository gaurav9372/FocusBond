/* ===========================
   FocusBond — Add Friend Page
   =========================== */

document.addEventListener('DOMContentLoaded', async () => {
  const user = await AuthService.getCurrentUser();
  if (!user) return;

  const searchInput = Dom.getById('searchUsername');
  const searchResults = Dom.getById('searchResults');
  const resultsList = Dom.getById('resultsList');

  // Load sent requests to know which users already have pending requests
  let sentRequests = [];
  const { data: sent } = await FriendsService.getSentRequests(user.id);
  if (sent) sentRequests = sent;

  // Load accepted friends to know which users are already friends
  let myFriends = [];
  const { data: friends } = await FriendsService.getMyFriends(user.id);
  if (friends) myFriends = friends;

  let searchTimeout = null;

  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    const query = searchInput.value.trim();

    if (query.length < 2) {
      Dom.hide(searchResults);
      Dom.clear(resultsList);
      return;
    }

    searchTimeout = setTimeout(() => performSearch(query), 300);
  });

  async function performSearch(query) {
    const { data: users, error } = await FriendsService.searchByUsername(query, user.id);

    if (error) {
      Dom.showToast(error.message || 'Search failed');
      return;
    }

    Dom.clear(resultsList);

    if (!users || users.length === 0) {
      resultsList.innerHTML = '<div class="friends-empty" style="padding: var(--spacing-md) 0;">No users found</div>';
      Dom.show(searchResults);
      return;
    }

    users.forEach(foundUser => {
      // Check if already friends
      const isFriend = myFriends.some(f => f.id === foundUser.id);
      if (isFriend) {
        const badge = Dom.create('span', { className: 'badge badge-active', textContent: 'Friends' });
        const row = Dom.buildUserRow(foundUser, badge);
        resultsList.appendChild(row);
        return;
      }

      // Check if request already sent
      const sentReq = sentRequests.find(r => r.receiver_id === foundUser.id);

      if (sentReq) {
        const cancelBtn = Dom.create('button', {
          className: 'btn btn-danger btn-sm',
          textContent: 'Cancel'
        });

        cancelBtn.addEventListener('click', async () => {
          cancelBtn.disabled = true;
          const { error } = await FriendsService.cancelRequest(sentReq.id);
          if (error) {
            Dom.showToast(error.message || 'Failed to cancel');
            cancelBtn.disabled = false;
          } else {
            sentRequests = sentRequests.filter(r => r.id !== sentReq.id);
            Dom.showToast('Request cancelled', 'success');
            performSearch(searchInput.value.trim());
          }
        });

        const row = Dom.buildUserRow(foundUser, cancelBtn);
        resultsList.appendChild(row);
        return;
      }

      // Default: Add Friend button
      const addBtn = Dom.create('button', {
        className: 'btn btn-primary btn-sm',
        textContent: 'Add Friend'
      });

      addBtn.addEventListener('click', async () => {
        addBtn.disabled = true;
        addBtn.textContent = 'Sending...';

        const { data, error } = await FriendsService.sendRequest(user.id, foundUser.id);

        if (error) {
          Dom.showToast(error.message || 'Failed to send request');
          addBtn.disabled = false;
          addBtn.textContent = 'Add Friend';
        } else {
          sentRequests.push({ id: data.id, receiver_id: foundUser.id });
          Dom.showToast('Friend request sent!', 'success');
          performSearch(searchInput.value.trim());
        }
      });

      const row = Dom.buildUserRow(foundUser, addBtn);
      resultsList.appendChild(row);
    });

    Dom.show(searchResults);
  }
});
