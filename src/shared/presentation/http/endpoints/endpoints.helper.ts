/**
 * Helper to safely replace path parameters
 * Example: replacePath('/users/:userId/words/:wordId', { userId: '123', wordId: '456' })
 * Returns: '/users/123/words/456'
 */
export function replacePath(
  path: string,
  params: Record<string, string | number>,
): string {
  let result = path;
  Object.entries(params).forEach(([key, value]) => {
    result = result.replace(`:${key}`, String(value));
  });
  return result;
}
