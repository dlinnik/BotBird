export function notifyHostUnread(hasUnread: boolean): void {
  window.parent.postMessage({ type: 'birdbot:unread', hasUnread }, '*');
}
