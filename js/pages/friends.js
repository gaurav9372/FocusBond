/* ===========================
   FocusBond — Friends Page
   =========================== */

document.addEventListener('DOMContentLoaded', async () => {
  const user = await AuthService.getCurrentUser();
  if (!user) return;

  const friendsList = Dom.getById('friendsList');

  // Load pending requests
  const { data: pending } = await FriendsService.getPendingRequests(user.id);

  // Load accepted friends
  const { data: friends } = await FriendsService.getMyFriends(user.id);

  renderFriendsList(pending || [], friends || []);

  function renderFriendsList(pendingRequests, acceptedFriends) {
    Dom.clear(friendsList);

    // Pending requests section
    if (pendingRequests.length > 0) {
      const pendingTitle = Dom.create('div', { className: 'section-title', textContent: 'Friend Requests' });
      friendsList.appendChild(pendingTitle);

      pendingRequests.forEach(req => {
        const actions = document.createElement('div');
        actions.className = 'friend-request-actions';

        const acceptBtn = Dom.create('button', { className: 'btn btn-success btn-sm', textContent: 'Accept' });
        const rejectBtn = Dom.create('button', { className: 'btn btn-danger btn-sm', textContent: 'Reject' });

        acceptBtn.addEventListener('click', async () => {
          acceptBtn.disabled = true;
          const { error } = await FriendsService.acceptRequest(req.id);
          if (error) {
            Dom.showToast(error.message || 'Failed to accept');
            acceptBtn.disabled = false;
          } else {
            Dom.showToast('Friend added!', 'success');
            location.reload();
          }
        });

        rejectBtn.addEventListener('click', async () => {
          rejectBtn.disabled = true;
          const { error } = await FriendsService.rejectRequest(req.id);
          if (error) {
            Dom.showToast(error.message || 'Failed to reject');
            rejectBtn.disabled = false;
          } else {
            location.reload();
          }
        });

        actions.appendChild(acceptBtn);
        actions.appendChild(rejectBtn);

        const row = Dom.buildUserRow(req.requester, actions);
        friendsList.appendChild(row);
      });

      if (acceptedFriends.length > 0) {
        friendsList.appendChild(Dom.create('hr', { className: 'divider' }));
      }
    }

    // Accepted friends section
    if (acceptedFriends.length > 0) {
      acceptedFriends.forEach(friend => {
        const deleteBtn = Dom.create('button', { className: 'icon-btn-ghost' });
        deleteBtn.innerHTML = '<img src="../assets/icons/delete.svg" alt="Remove" width="22" height="22">';
        deleteBtn.addEventListener('click', async () => {
          if (!confirm(`Remove ${friend.name} from friends?`)) return;
          deleteBtn.style.opacity = '0.5';
          const { error } = await FriendsService.removeFriend(friend.friendship_id);
          if (error) {
            Dom.showToast(error.message || 'Failed to remove');
            deleteBtn.style.opacity = '1';
          } else {
            Dom.showToast('Friend removed', 'success');
            location.reload();
          }
        });

        const row = Dom.buildUserRow(friend, deleteBtn);
        friendsList.appendChild(row);
      });
    }

    // Empty state
    if (pendingRequests.length === 0 && acceptedFriends.length === 0) {
      friendsList.innerHTML = '<div class="friends-empty">No friends yet. Tap + to add friends!</div>';
    }
  }
});
