export interface QueueEligibilityInput {
  birthDate: string;
  agreedToRules: boolean;
  profileComplete: boolean;
}

export type QueueEligibilityResult =
  | { eligible: true }
  | { eligible: false; reason: "INVALID_BIRTH_DATE" | "UNDERAGE" | "RULES_REQUIRED" | "PROFILE_INCOMPLETE" };

function parseDateOnly(value: string): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const candidate = new Date(Date.UTC(year, month - 1, day));

  if (
    candidate.getUTCFullYear() !== year ||
    candidate.getUTCMonth() !== month - 1 ||
    candidate.getUTCDate() !== day
  ) return null;

  return { year, month, day };
}

export function ageOnDate(birthDate: string, now = new Date()): number | null {
  const birth = parseDateOnly(birthDate);
  if (!birth) return null;

  const currentMonth = now.getUTCMonth() + 1;
  const currentDay = now.getUTCDate();
  const birthdayPassed = currentMonth > birth.month || (currentMonth === birth.month && currentDay >= birth.day);
  return now.getUTCFullYear() - birth.year - Number(!birthdayPassed);
}

export function isAdult(birthDate: string, now = new Date()): boolean {
  const age = ageOnDate(birthDate, now);
  return age !== null && age >= 18;
}

export function evaluateQueueEligibility(input: QueueEligibilityInput, now = new Date()): QueueEligibilityResult {
  const age = ageOnDate(input.birthDate, now);
  if (age === null) return { eligible: false, reason: "INVALID_BIRTH_DATE" };
  if (age < 18) return { eligible: false, reason: "UNDERAGE" };
  if (!input.agreedToRules) return { eligible: false, reason: "RULES_REQUIRED" };
  if (!input.profileComplete) return { eligible: false, reason: "PROFILE_INCOMPLETE" };
  return { eligible: true };
}
