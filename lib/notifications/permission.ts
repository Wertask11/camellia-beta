export function notificationPermissionState() {
  return typeof Notification === 'undefined'
    ? 'unsupported'
    : Notification.permission;
}
/** No prompt on page load or while delivery is unconfigured. Caller must be an explicit user gesture. */
export async function requestNotificationPermission(options: {
  deliveryReady: boolean;
  userInitiated: boolean;
}) {
  if (!options.deliveryReady || !options.userInitiated)
    return notificationPermissionState();
  if (typeof Notification === 'undefined') return 'unsupported';
  if (Notification.permission !== 'default') return Notification.permission;
  return Notification.requestPermission();
}
