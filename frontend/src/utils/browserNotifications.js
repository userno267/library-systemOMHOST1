// src/utils/browserNotifications.js

// Call this once, early in the app lifecycle (e.g. right after login,
// or when the notification-bearing page first mounts). Browsers only
// show the "Allow notifications?" prompt in response to a user gesture
// or shortly after page load — calling it repeatedly is harmless, it's
// a no-op once the user has already answered.
export function requestNotificationPermission() {
  if (!("Notification" in window)) {
    console.warn("This browser does not support desktop notifications.");
    return;
  }

  if (Notification.permission === "default") {
    Notification.requestPermission();
  }
}

// Call this wherever your socket currently handles the "newNotification"
// event. Shows a native OS-style popup while the tab is open — does NOT
// require the tab to be focused, just open.
export function showBrowserNotification(notification) {
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  const title = notification.title || "LibPortal";
  const options = {
    body: notification.message || "",
    icon: "/278737963_102029019168954_7338134888722766049_n.jpg", // your school logo, reuse existing asset
    tag: `notification-${notification.id}`, // prevents duplicate popups for the same notification if it fires twice
  };

  const popup = new Notification(title, options);

  popup.onclick = () => {
    window.focus();
    popup.close();
  };
}