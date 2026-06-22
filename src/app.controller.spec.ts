import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let controller: AppController;

  beforeEach(() => {
    controller = new AppController(new AppService());
  });

  it('should return the health check message', () => {
    expect(controller.healthCheck()).toBe('Api is working!');
  });
});
