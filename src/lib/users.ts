// Helper functions for user display names with fallbacks

/**
 * Get display name for a user, with fallbacks
 * Priority: first_name + last_name > first_name > last_name > short UUID
 */
export function getUserDisplayName(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
  userId?: string
): string {
  const first = firstName?.trim() || '';
  const last = lastName?.trim() || '';
  
  if (first && last) {
    return `${first} ${last}`;
  }
  if (first) {
    return first;
  }
  if (last) {
    return last;
  }
  if (userId) {
    return userId.substring(0, 8);
  }
  return 'Utilisateur';
}

/**
 * Get short UUID for display
 */
export function getShortId(id: string): string {
  return id.substring(0, 8);
}
