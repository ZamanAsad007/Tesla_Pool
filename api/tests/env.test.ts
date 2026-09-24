import { describe, it, expect } from 'vitest';
import { env } from '../src/config/env';

describe('Environment Configuration', () => {
  it('loads valid environment defaults', () => {
    expect(env.PORT).toBeDefined();
    expect(typeof env.PORT).toBe('number');
    expect(env.DATABASE_URL).toBeDefined();
    expect(env.JWT_SECRET).toBeDefined();
    expect(env.NODE_ENV).toBeDefined();
  });
});
