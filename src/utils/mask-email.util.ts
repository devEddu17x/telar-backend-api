export function maskEmail(email: string): string {
  if (!email) return '';
  const [localPart, domain] = email.split('@');
  return `${localPart.substring(0, 2)}***@${domain || ''}`;
}
