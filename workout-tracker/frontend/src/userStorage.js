export const getUserDisplayName = (user) => {
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();
  if (fullName) return fullName;
  if (user?.name?.trim()) return user.name.trim();
  const emailPrefix = user?.email?.split('@')[0] || 'Member';
  return emailPrefix
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ');
};

export const getUserFirstName = (user) => {
  if (user?.firstName?.trim()) return user.firstName.trim();
  return getUserDisplayName(user).split(/\s+/)[0] || 'Athlete';
};

export const getUserInitials = (user) => {
  const displayName = getUserDisplayName(user);
  return displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || 'PG';
};

export const getUserStorageKey = (baseKey, user) => (
  user?.id ? `${baseKey}:user:${user.id}` : baseKey
);
