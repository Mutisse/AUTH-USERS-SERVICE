export function generateCustomSessionId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `SES${timestamp}${random}`.toUpperCase();
}

export function generateCustomActivityId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `ACT${timestamp}${random}`.toUpperCase();
}
