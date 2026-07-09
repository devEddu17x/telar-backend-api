export async function retry<T>(
  operation: () => Promise<T>,
  opts: { attempts?: number; delayMs?: number } = {},
): Promise<T> {
  const attempts = opts.attempts ?? 20;
  const delayMs = opts.delayMs ?? 500;
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt === attempts) break;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw lastError;
}
