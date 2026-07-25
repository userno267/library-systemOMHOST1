export function getImageUrl(path, baseUrl) {
  if (!path) return "/placeholder-book.png";
  if (path.startsWith("http")) return path;
  return `${baseUrl}${path}`;
}

export function getProfileUrl(path, baseUrl) {
  if (!path) return "/default-avatar.png";
  if (path.startsWith("http")) return path;
  return `${baseUrl}${path}`;
}