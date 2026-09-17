/** Small pure domain helpers shared by routes. */
import type { ProfileRecord } from "./types/api.js";

/**
 * A profile is complete once the user has a display name and a birth date.
 * Bio is optional. Queue eligibility requires a complete profile.
 */
export function isProfileComplete(profile: ProfileRecord | null): boolean {
  if (!profile) return false;
  return (
    profile.displayName.trim().length > 0 &&
    /^\d{4}-\d{2}-\d{2}$/.test(profile.birthDate)
  );
}

/** Computes whole-year age from an ISO birth date relative to `now`. */
export function ageFromBirthDate(birthDate: string, now = new Date()): number {
  const birth = new Date(`${birthDate}T00:00:00Z`);
  let age = now.getUTCFullYear() - birth.getUTCFullYear();
  const monthDiff = now.getUTCMonth() - birth.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getUTCDate() < birth.getUTCDate())) {
    age -= 1;
  }
  return age;
}
