import { AppService } from './app.service';

describe('AppService', () => {
  let service: AppService;

  beforeEach(() => {
    service = new AppService();
  });

  it('debería estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('healthCheck', () => {
    it('devuelve el mensaje de estado de la API', () => {
      const result = service.healthCheck();

      expect(result).toBe('Api is working!');
    });

    it('siempre devuelve un string', () => {
      const result = service.healthCheck();

      expect(typeof result).toBe('string');
    });
  });
});
