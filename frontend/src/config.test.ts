import { describe, expect, it } from 'vitest';
import { getApiBaseUrl } from './config';

describe('frontend config', () => {
  it('uses the Track A backend URL by default', () => {
    expect(getApiBaseUrl({})).toBe('http://localhost:8080/api/v1');
  });

  it('loads the Vite API base URL from env', () => {
    expect(
      getApiBaseUrl({
        VITE_API_BASE_URL: 'http://backend.example/api/v1',
      }),
    ).toBe('http://backend.example/api/v1');
  });
});
