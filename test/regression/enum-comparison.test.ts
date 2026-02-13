/**
 * Regression Tests: Enum Comparison (BUG-005)
 * Ensures proper enum string comparison with Prisma
 */

describe('@regression:BUG-005 Enum String Comparison', () => {
  // Simulate Prisma enum behavior
  enum Dimension {
    SECURITY = 'SECURITY',
    ARCHITECTURE = 'ARCHITECTURE',
    TESTING = 'TESTING',
    OPERATIONS = 'OPERATIONS',
  }

  // Prisma returns strings at runtime even if typed as enum
  interface HeatmapCell {
    dimension: Dimension | string;
    severity: number;
    coverage: number;
  }

  // Safe comparison function (the fix)
  function isDimensionEqual(
    cellDimension: Dimension | string,
    targetDimension: Dimension,
  ): boolean {
    // Convert both to string for safe comparison
    return String(cellDimension) === String(targetDimension);
  }

  // Unsafe comparison (the bug)
  function isDimensionEqualUnsafe(
    cellDimension: Dimension | string,
    targetDimension: Dimension,
  ): boolean {
    // This can fail if cellDimension is actually a string from DB
    return cellDimension === targetDimension;
  }

  describe('String vs Enum Comparison', () => {
    it('should match when both are enum values', () => {
      const cell: HeatmapCell = {
        dimension: Dimension.SECURITY,
        severity: 0.8,
        coverage: 0.5,
      };

      expect(isDimensionEqual(cell.dimension, Dimension.SECURITY)).toBe(true);
    });

    it('should match when cell dimension is string (Prisma runtime)', () => {
      // Simulate Prisma returning string instead of enum
      const cell: HeatmapCell = {
        dimension: 'SECURITY' as unknown as Dimension, // This is what Prisma does
        severity: 0.8,
        coverage: 0.5,
      };

      expect(isDimensionEqual(cell.dimension, Dimension.SECURITY)).toBe(true);
    });

    it('should not match different dimensions', () => {
      const cell: HeatmapCell = {
        dimension: Dimension.ARCHITECTURE,
        severity: 0.8,
        coverage: 0.5,
      };

      expect(isDimensionEqual(cell.dimension, Dimension.SECURITY)).toBe(false);
    });

    it('should handle lowercase string (edge case)', () => {
      const cell: HeatmapCell = {
        dimension: 'security' as unknown as Dimension, // Shouldn't happen but might
        severity: 0.8,
        coverage: 0.5,
      };

      // Won't match because case doesn't match - expected behavior
      expect(isDimensionEqual(cell.dimension, Dimension.SECURITY)).toBe(false);
    });
  });

  describe('Filter by Dimension', () => {
    const mockCells: HeatmapCell[] = [
      { dimension: 'SECURITY', severity: 0.8, coverage: 0.5 },
      { dimension: 'ARCHITECTURE', severity: 0.6, coverage: 0.7 },
      { dimension: 'SECURITY', severity: 0.9, coverage: 0.3 },
      { dimension: 'TESTING', severity: 0.4, coverage: 0.9 },
    ];

    it('should filter cells by dimension correctly', () => {
      const securityCells = mockCells.filter((cell) =>
        isDimensionEqual(cell.dimension, Dimension.SECURITY),
      );

      expect(securityCells).toHaveLength(2);
      expect(securityCells.every((c) => c.dimension === 'SECURITY')).toBe(true);
    });

    it('should return empty array for non-existent dimension', () => {
      const operationsCells = mockCells.filter((cell) =>
        isDimensionEqual(cell.dimension, Dimension.OPERATIONS),
      );

      expect(operationsCells).toHaveLength(0);
    });
  });

  describe('Type-Safe Enum Handling', () => {
    // Type guard function
    function isDimension(value: unknown): value is Dimension {
      return Object.values(Dimension).includes(value as Dimension);
    }

    it('should identify valid dimension enum values', () => {
      expect(isDimension('SECURITY')).toBe(true);
      expect(isDimension(Dimension.SECURITY)).toBe(true);
    });

    it('should reject invalid dimension values', () => {
      expect(isDimension('INVALID')).toBe(false);
      expect(isDimension('')).toBe(false);
      expect(isDimension(null)).toBe(false);
      expect(isDimension(undefined)).toBe(false);
    });
  });
});
