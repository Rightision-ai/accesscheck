import { describe, it, expect } from 'vitest';
import { selectBestMatch } from '../epcService';

// Lean camelCase summary rows as returned by GET /api/domestic/search.
const ROWS = [
  { certificateNumber: 'A', uprn: 100, addressLine1: '10 Downing Street', postTown: 'LONDON', postcode: 'SW1A 2AA', registrationDate: '2018-01-01' },
  { certificateNumber: 'B', uprn: 101, addressLine1: '12 Downing Street', postTown: 'LONDON', postcode: 'SW1A 2AA', registrationDate: '2020-01-01' },
  { certificateNumber: 'C', uprn: 100, addressLine1: '10 Downing Street', postTown: 'LONDON', postcode: 'SW1A 2AA', registrationDate: '2022-06-01' },
];

describe('selectBestMatch', () => {
  it('picks the row whose house number matches and prefers the most recent', () => {
    const match = selectBestMatch(ROWS, '10 Downing Street, SW1A 2AA');
    expect(match?.row.certificateNumber).toBe('C'); // number 10, latest registration
    expect(match?.row.uprn).toBe(100);
    expect(match?.confidence).toBeGreaterThan(0.5);
  });

  it('returns null when nothing matches well enough', () => {
    expect(selectBestMatch(ROWS, '999 Nowhere Lane, ZZ1 1ZZ')).toBeNull();
  });

  it('treats a direct UPRN search result as a strong match', () => {
    const match = selectBestMatch([ROWS[0]], 'anything', { fromUprn: true });
    expect(match?.confidence).toBe(0.85);
  });

  it('returns null on empty input', () => {
    expect(selectBestMatch([], 'x')).toBeNull();
  });
});
