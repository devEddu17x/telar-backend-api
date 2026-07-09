import { maskEmail } from './mask-email.util';

describe('maskEmail', () => {
  it('masks the local part while keeping the first two characters visible', () => {
    expect(maskEmail('juanperez@gmail.com')).toBe('ju***@gmail.com');
  });

  it('keeps the full domain visible', () => {
    expect(maskEmail('ana@empresa.com')).toBe('an***@empresa.com');
  });

  it('returns an empty string for empty or undefined emails', () => {
    expect(maskEmail('')).toBe('');
    expect(maskEmail(undefined as unknown as string)).toBe('');
  });

  it('handles emails with a local part shorter than two characters', () => {
    expect(maskEmail('a@gmail.com')).toBe('a***@gmail.com');
  });

  it('returns an empty domain when the email does not contain "@"', () => {
    expect(maskEmail('sinarroba')).toBe('si***@');
  });
});
