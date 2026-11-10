// frontend/src/utils/device.js

// Same rule the app already used: phones and small screens are "mobile".
export const isMobile = () =>
  window.innerWidth <= 768 || /Mobi|Android/i.test(navigator.userAgent);

// Where an admin should land after login or on a visit to "/".
export const adminHome = () => (isMobile() ? "/home" : "/admin/dashboard");