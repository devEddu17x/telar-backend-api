import { maskEmail } from './mask-email.util';

describe('maskEmail', () => {
  it('enmascara la parte local dejando visibles los primeros 2 caracteres', () => {
    expect(maskEmail('juanperez@gmail.com')).toBe('ju***@gmail.com');
  });

  it('mantiene el dominio completo sin enmascarar', () => {
    expect(maskEmail('ana@empresa.com')).toBe('an***@empresa.com');
  });

  it('devuelve string vacío si el email es undefined o vacío', () => {
    expect(maskEmail('')).toBe('');
    expect(maskEmail(undefined as unknown as string)).toBe('');
  });

  it('maneja emails cuya parte local tiene menos de 2 caracteres', () => {
    expect(maskEmail('a@gmail.com')).toBe('a***@gmail.com');
  });

  it('devuelve dominio vacío si el email no tiene "@"', () => {
    expect(maskEmail('sinarroba')).toBe('si***@');
  });
});
