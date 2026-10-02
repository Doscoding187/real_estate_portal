/** Recover only a concurrent insert of the same canonical onboarding identity. */
export async function createOrReadOnboardingState<T>(
  insert: () => Promise<unknown>,
  read: () => Promise<T | undefined>,
): Promise<T> {
  let duplicate: unknown;
  try {
    await insert();
  } catch (error) {
    const seen = new Set<unknown>();
    let current: unknown = error;
    let isDuplicate = false;
    while (current && typeof current === 'object' && !seen.has(current)) {
      seen.add(current);
      const driver = current as { code?: string; errno?: number; cause?: unknown };
      if (driver.code === 'ER_DUP_ENTRY' && driver.errno === 1062) {
        isDuplicate = true;
        break;
      }
      current = driver.cause;
    }
    if (!isDuplicate) throw error;
    duplicate = error;
  }
  const state = await read();
  if (!state) {
    throw duplicate ?? new Error('Onboarding state was not visible after creation.');
  }
  return state;
}
