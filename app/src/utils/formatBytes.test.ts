import { describe, it, expect } from 'vitest';
import { formatBytes } from './formatBytes';

describe('formatBytes', () => {
  describe('bytes formatting', () => {
    it('formats small byte values correctly', () => {
      expect(formatBytes(0)).toBe('0.0 B');
      expect(formatBytes(1)).toBe('1.0 B');
      expect(formatBytes(512)).toBe('512.0 B');
      expect(formatBytes(1023)).toBe('1023.0 B');
    });
  });

  describe('kilobytes formatting', () => {
    it('formats kilobyte values correctly', () => {
      expect(formatBytes(1024)).toBe('1.0 KB');
      expect(formatBytes(1536)).toBe('1.5 KB');
      expect(formatBytes(2048)).toBe('2.0 KB');
      expect(formatBytes(5120)).toBe('5.0 KB');
      expect(formatBytes(1048575)).toBe('1024.0 KB'); // Just under 1MB
    });

    it('handles fractional kilobytes', () => {
      expect(formatBytes(1433)).toBe('1.4 KB');
      expect(formatBytes(1587)).toBe('1.5 KB');
      expect(formatBytes(1741)).toBe('1.7 KB');
    });
  });

  describe('megabytes formatting', () => {
    it('formats megabyte values correctly', () => {
      expect(formatBytes(1048576)).toBe('1.0 MB'); // 1024^2
      expect(formatBytes(1572864)).toBe('1.5 MB');
      expect(formatBytes(2097152)).toBe('2.0 MB');
      expect(formatBytes(5242880)).toBe('5.0 MB');
      expect(formatBytes(1073741823)).toBe('1024.0 MB'); // Just under 1GB
    });

    it('handles fractional megabytes', () => {
      expect(formatBytes(1638400)).toBe('1.6 MB');
      expect(formatBytes(2621440)).toBe('2.5 MB');
      expect(formatBytes(10485760)).toBe('10.0 MB');
    });
  });

  describe('gigabytes formatting', () => {
    it('formats gigabyte values correctly', () => {
      expect(formatBytes(1073741824)).toBe('1.0 GB'); // 1024^3
      expect(formatBytes(1610612736)).toBe('1.5 GB');
      expect(formatBytes(2147483648)).toBe('2.0 GB');
      expect(formatBytes(5368709120)).toBe('5.0 GB');
    });

    it('handles fractional gigabytes', () => {
      expect(formatBytes(1288490188.8)).toBe('1.2 GB');
      expect(formatBytes(3221225472)).toBe('3.0 GB');
      expect(formatBytes(10737418240)).toBe('10.0 GB');
    });

    it('handles very large gigabyte values', () => {
      expect(formatBytes(1099511627776)).toBe('1024.0 GB'); // 1TB but capped at GB
      expect(formatBytes(2199023255552)).toBe('2048.0 GB'); // 2TB but capped at GB
    });
  });

  describe('decimal precision', () => {
    it('always shows one decimal place', () => {
      expect(formatBytes(1024)).toBe('1.0 KB');
      expect(formatBytes(1536)).toBe('1.5 KB');
      expect(formatBytes(1048576)).toBe('1.0 MB');
      expect(formatBytes(1073741824)).toBe('1.0 GB');
    });

    it('rounds to one decimal place correctly', () => {
      expect(formatBytes(1126)).toBe('1.1 KB'); // 1126 / 1024 = 1.099...
      expect(formatBytes(1177)).toBe('1.1 KB'); // 1177 / 1024 = 1.149...
      expect(formatBytes(1229)).toBe('1.2 KB'); // 1229 / 1024 = 1.200...
    });
  });

  describe('edge cases', () => {
    it('handles exact unit boundaries', () => {
      expect(formatBytes(1024)).toBe('1.0 KB');
      expect(formatBytes(1048576)).toBe('1.0 MB');
      expect(formatBytes(1073741824)).toBe('1.0 GB');
    });

    it('handles very small decimal values', () => {
      expect(formatBytes(0.1)).toBe('0.1 B');
      expect(formatBytes(0.9)).toBe('0.9 B');
    });

    it('handles negative values (edge case)', () => {
      expect(() => formatBytes(-1024)).toThrowError(
        'Byte size cannot be negative'
      );
      expect(() => formatBytes(-1048576)).toThrowError(
        'Byte size cannot be negative'
      );
    });

    it('handles extremely large values', () => {
      const largeValue = Number.MAX_SAFE_INTEGER;
      const result = formatBytes(largeValue);
      expect(result).toContain('GB');
      expect(result).toMatch(/^\d+\.\d GB$/);
    });
  });

  describe('unit progression', () => {
    it('uses the correct unit for each range', () => {
      expect(formatBytes(500)).toContain('B');
      expect(formatBytes(5000)).toContain('KB');
      expect(formatBytes(5000000)).toContain('MB');
      expect(formatBytes(5000000000)).toContain('GB');
    });

    it('stops at GB unit (does not go to TB)', () => {
      const oneTerabyte = 1024 * 1024 * 1024 * 1024;
      expect(formatBytes(oneTerabyte)).toContain('GB');
      expect(formatBytes(oneTerabyte)).not.toContain('TB');
    });
  });
});
