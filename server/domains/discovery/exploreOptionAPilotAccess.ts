export interface ExploreOptionAPilotEnvironment {
  EXPLORE_OPTION_A_PILOT_ENABLED?: string;
  EXPLORE_OPTION_A_PILOT_ALLOWED_USER_IDS?: string;
}

function isPilotExplicitlyEnabled(value?: string): boolean {
  return value?.trim().toLowerCase() === 'true';
}

export function parseExploreOptionAPilotAllowedUserIds(value?: string): Set<string> {
  return new Set(
    (value ?? '')
      .split(',')
      .map(entry => entry.trim())
      .filter(entry => /^\d+$/.test(entry)),
  );
}

export function canAccessExploreOptionAPilot(
  userId: number | null | undefined,
  environment: ExploreOptionAPilotEnvironment = process.env as ExploreOptionAPilotEnvironment,
): boolean {
  if (!isPilotExplicitlyEnabled(environment.EXPLORE_OPTION_A_PILOT_ENABLED)) {
    return false;
  }

  if (userId === null || userId === undefined || !Number.isSafeInteger(userId) || userId <= 0) {
    return false;
  }

  const allowedUserIds = parseExploreOptionAPilotAllowedUserIds(
    environment.EXPLORE_OPTION_A_PILOT_ALLOWED_USER_IDS,
  );

  return allowedUserIds.has(String(userId));
}
