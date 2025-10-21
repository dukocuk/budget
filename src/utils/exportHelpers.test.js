/**
 * Tests for CSV export functionality
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateCSV, downloadCSV } from './exportHelpers';

describe('generateCSV', () => {
  describe('Basic CSV Generation', () => {
    it('should generate CSV with UTF-8 BOM', () => {
      const expenses = [];
      const csv = generateCSV(expenses, 5700, 4831);

      expect(csv.charCodeAt(0)).toBe(0xfeff); // UTF-8 BOM
    });

    it('should include expense summary section', () => {
      const expenses = [
        {
          id: 1,
          name: 'Test Expense',
          amount: 100,
          frequency: 'monthly',
          startMonth: 1,
          endMonth: 12,
        },
      ];
      const csv = generateCSV(expenses, 5700, 4831);

      expect(csv).toContain(
        'Udgift,Beløb,Frekvens,Start Måned,Slut Måned,Årlig Total'
      );
      expect(csv).toContain('Test Expense');
    });

    it('should handle empty expenses array', () => {
      const csv = generateCSV([], 5700, 4831);

      expect(csv).toContain('Udgift,Beløb,Frekvens');
      expect(csv).toContain('Månedlig Oversigt');
      expect(csv).toContain('Opsummering');
    });
  });

  describe('Fixed Monthly Payment', () => {
    it('should format fixed monthly payment correctly', () => {
      const expenses = [
        {
          id: 1,
          name: 'Rent',
          amount: 5000,
          frequency: 'monthly',
          startMonth: 1,
          endMonth: 12,
        },
      ];
      const csv = generateCSV(expenses, 5700, 4831);

      expect(csv).toContain('Månedlig indbetaling,5700');
      expect(csv).not.toContain('Variabel');
    });

    it('should calculate annual totals for monthly expenses', () => {
      const expenses = [
        {
          id: 1,
          name: 'Monthly',
          amount: 100,
          frequency: 'monthly',
          startMonth: 1,
          endMonth: 12,
        },
      ];
      const csv = generateCSV(expenses, 5700, 4831);

      expect(csv).toContain('1200'); // 100 * 12 months
    });

    it('should calculate annual totals for quarterly expenses', () => {
      const expenses = [
        {
          id: 1,
          name: 'Quarterly',
          amount: 400,
          frequency: 'quarterly',
          startMonth: 1,
          endMonth: 12,
        },
      ];
      const csv = generateCSV(expenses, 5700, 4831);

      expect(csv).toContain('1600'); // 400 * 4 quarters
    });

    it('should calculate annual totals for yearly expenses', () => {
      const expenses = [
        {
          id: 1,
          name: 'Yearly',
          amount: 1000,
          frequency: 'yearly',
          startMonth: 1,
          endMonth: 12,
        },
      ];
      const csv = generateCSV(expenses, 5700, 4831);

      expect(csv).toContain('1000'); // 1000 * 1
    });
  });

  describe('Variable Monthly Payments', () => {
    it('should format variable monthly payments correctly', () => {
      const expenses = [
        {
          id: 1,
          name: 'Rent',
          amount: 5000,
          frequency: 'monthly',
          startMonth: 1,
          endMonth: 12,
        },
      ];
      const variablePayments = [
        5700, 5700, 5700, 6000, 6000, 6000, 5700, 5700, 5700, 5700, 5700, 5700,
      ];
      const csv = generateCSV(expenses, variablePayments, 4831);

      expect(csv).toContain('Månedlige Indbetalinger');
      expect(csv).toContain('Variabel (se oversigt ovenfor)');
      expect(csv).toContain('Gennemsnitlig månedlig indbetaling');
    });

    it('should include monthly payments section for variable payments', () => {
      const expenses = [];
      const variablePayments = [
        5000, 5100, 5200, 5300, 5400, 5500, 5600, 5700, 5800, 5900, 6000, 6100,
      ];
      const csv = generateCSV(expenses, variablePayments, 0);

      expect(csv).toContain('Månedlige Indbetalinger');
      expect(csv).toContain(
        'Jan,Feb,Mar,Apr,Maj,Jun,Jul,Aug,Sep,Okt,Nov,Dec,Total'
      );
    });

    it('should calculate total annual income for variable payments', () => {
      const expenses = [];
      const variablePayments = [
        1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000,
      ];
      const csv = generateCSV(expenses, variablePayments, 0);

      expect(csv).toContain('12000'); // Sum of all payments
    });

    it('should handle zero values in variable payments', () => {
      const expenses = [];
      const variablePayments = [
        1000, 0, 1000, 0, 1000, 0, 1000, 0, 1000, 0, 1000, 0,
      ];
      const csv = generateCSV(expenses, variablePayments, 0);

      expect(csv).toContain('6000'); // Sum of non-zero payments
    });
  });

  describe('Monthly Breakdown Section', () => {
    it('should include all 12 month columns', () => {
      const expenses = [
        {
          id: 1,
          name: 'Test',
          amount: 100,
          frequency: 'monthly',
          startMonth: 1,
          endMonth: 12,
        },
      ];
      const csv = generateCSV(expenses, 5700, 0);

      expect(csv).toContain(
        'Jan,Feb,Mar,Apr,Maj,Jun,Jul,Aug,Sep,Okt,Nov,Dec,Total'
      );
    });

    it('should show correct monthly amounts for partial year expenses', () => {
      const expenses = [
        {
          id: 1,
          name: 'Summer',
          amount: 500,
          frequency: 'monthly',
          startMonth: 6,
          endMonth: 8,
        },
      ];
      const csv = generateCSV(expenses, 5700, 0);

      // Debug: Log the actual CSV to understand the structure
      // console.log('CSV Output:', csv)

      // The CSV should have zeros for months outside the range (Jan-May, Sep-Dec)
      // and 500 for months within the range (Jun-Aug)
      expect(csv).toContain('Summer');

      // Verify the monthly totals in the breakdown section
      // The Summer expense should only appear in June, July, August
      const lines = csv.split('\n');

      // Find the "Månedlig Oversigt" section
      const monthlyOverviewIndex = lines.findIndex(line =>
        line.includes('Månedlig Oversigt')
      );
      expect(monthlyOverviewIndex).toBeGreaterThan(-1);

      // The Summer line should be in the monthly breakdown section (after the header)
      const summerLine = lines.find(
        line => line.startsWith('"Summer"') && !line.includes('Jun')
      ); // Exclude the summary section line

      expect(summerLine).toBeTruthy();

      // According to exportHelpers.js logic:
      // Section 2 format: Expense name, then 12 monthly values, then total
      // Row format: `"${expense.name}"` + 12 months + total
      // Example: "Summer",0,0,0,0,0,500,500,500,0,0,0,0,1500

      const parts = summerLine.split(',');

      // Verify structure
      expect(parts.length).toBe(14); // name + 12 months + total

      // parts[0] is "Summer", parts[1-12] are monthly values (Jan-Dec), parts[13] is total
      expect(parts[0]).toBe('"Summer"');

      // Months outside range should be 0
      expect(parseInt(parts[1])).toBe(0); // Jan
      expect(parseInt(parts[2])).toBe(0); // Feb
      expect(parseInt(parts[3])).toBe(0); // Mar
      expect(parseInt(parts[4])).toBe(0); // Apr
      expect(parseInt(parts[5])).toBe(0); // May

      // Months within range should be 500
      expect(parseInt(parts[6])).toBe(500); // Jun
      expect(parseInt(parts[7])).toBe(500); // Jul
      expect(parseInt(parts[8])).toBe(500); // Aug

      // Months outside range should be 0
      expect(parseInt(parts[9])).toBe(0); // Sep
      expect(parseInt(parts[10])).toBe(0); // Oct
      expect(parseInt(parts[11])).toBe(0); // Nov
      expect(parseInt(parts[12])).toBe(0); // Dec

      // Total should be 1500 (3 months * 500)
      expect(parseInt(parts[13])).toBe(1500);
    });

    it('should calculate totals row correctly', () => {
      const expenses = [
        {
          id: 1,
          name: 'Expense1',
          amount: 100,
          frequency: 'monthly',
          startMonth: 1,
          endMonth: 12,
        },
        {
          id: 2,
          name: 'Expense2',
          amount: 200,
          frequency: 'monthly',
          startMonth: 1,
          endMonth: 12,
        },
      ];
      const csv = generateCSV(expenses, 5700, 0);

      expect(csv).toContain('TOTAL');
      expect(csv).toContain('3600'); // (100 + 200) * 12
    });
  });

  describe('Summary Section', () => {
    it('should include all summary fields', () => {
      const expenses = [
        {
          id: 1,
          name: 'Test',
          amount: 100,
          frequency: 'monthly',
          startMonth: 1,
          endMonth: 12,
        },
      ];
      const csv = generateCSV(expenses, 5700, 4831);

      expect(csv).toContain('Opsummering');
      expect(csv).toContain('Årlige udgifter');
      expect(csv).toContain('Månedlig indbetaling');
      expect(csv).toContain('Overført fra sidste år,4831');
    });

    it('should show average monthly income for variable payments', () => {
      const expenses = [];
      const variablePayments = [
        6000, 6000, 6000, 6000, 6000, 6000, 6000, 6000, 6000, 6000, 6000, 6000,
      ];
      const csv = generateCSV(expenses, variablePayments, 0);

      expect(csv).toContain('Gennemsnitlig månedlig indbetaling,6000');
    });
  });

  describe('Special Characters and Quoting', () => {
    it('should quote expense names with special characters', () => {
      const expenses = [
        {
          id: 1,
          name: 'Expense, with comma',
          amount: 100,
          frequency: 'monthly',
          startMonth: 1,
          endMonth: 12,
        },
      ];
      const csv = generateCSV(expenses, 5700, 0);

      expect(csv).toContain('"Expense, with comma"');
    });

    it('should handle Danish characters correctly', () => {
      const expenses = [
        {
          id: 1,
          name: 'Forsikring æøå ÆØÅ',
          amount: 100,
          frequency: 'monthly',
          startMonth: 1,
          endMonth: 12,
        },
      ];
      const csv = generateCSV(expenses, 5700, 0);

      expect(csv).toContain('Forsikring æøå ÆØÅ');
    });
  });

  describe('Multiple Expenses', () => {
    it('should handle multiple expenses of different frequencies', () => {
      const expenses = [
        {
          id: 1,
          name: 'Monthly',
          amount: 100,
          frequency: 'monthly',
          startMonth: 1,
          endMonth: 12,
        },
        {
          id: 2,
          name: 'Quarterly',
          amount: 400,
          frequency: 'quarterly',
          startMonth: 1,
          endMonth: 12,
        },
        {
          id: 3,
          name: 'Yearly',
          amount: 1000,
          frequency: 'yearly',
          startMonth: 1,
          endMonth: 12,
        },
      ];
      const csv = generateCSV(expenses, 5700, 0);

      expect(csv).toContain('Monthly');
      expect(csv).toContain('Quarterly');
      expect(csv).toContain('Yearly');
      expect(csv).toContain('3800'); // 1200 + 1600 + 1000
    });
  });
});

describe('downloadCSV', () => {
  let createElementSpy;
  let clickSpy;
  let createObjectURLSpy;
  let revokeObjectURLSpy;

  beforeEach(() => {
    // Mock DOM APIs
    clickSpy = vi.fn();
    createObjectURLSpy = vi.fn(() => 'blob:mock-url');
    revokeObjectURLSpy = vi.fn();

    createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue({
      click: clickSpy,
      href: '',
      download: '',
    });

    global.URL.createObjectURL = createObjectURLSpy;
    global.URL.revokeObjectURL = revokeObjectURLSpy;
    global.Blob = vi.fn(function (content, options) {
      this.content = content;
      this.options = options;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create a download link', () => {
    const csvContent = 'test,csv,content';
    downloadCSV(csvContent);

    expect(createElementSpy).toHaveBeenCalledWith('a');
  });

  it('should trigger download with click', () => {
    const csvContent = 'test,csv,content';
    downloadCSV(csvContent);

    expect(clickSpy).toHaveBeenCalled();
  });

  it('should use default filename format when no filename provided', () => {
    const csvContent = 'test,csv,content';
    const link = { click: clickSpy, href: '', download: '' };
    createElementSpy.mockReturnValue(link);

    downloadCSV(csvContent);

    expect(link.download).toMatch(/^budget_\d{4}-\d{2}-\d{2}\.csv$/);
  });

  it('should use custom filename when provided', () => {
    const csvContent = 'test,csv,content';
    const customFilename = 'my-budget-2024.csv';
    const link = { click: clickSpy, href: '', download: '' };
    createElementSpy.mockReturnValue(link);

    downloadCSV(csvContent, customFilename);

    expect(link.download).toBe(customFilename);
  });

  it('should create blob with correct content type', () => {
    const csvContent = 'test,csv,content';
    downloadCSV(csvContent);

    expect(global.Blob).toHaveBeenCalledWith([csvContent], {
      type: 'text/csv;charset=utf-8;',
    });
  });

  it('should create and revoke object URL', () => {
    const csvContent = 'test,csv,content';
    downloadCSV(csvContent);

    expect(createObjectURLSpy).toHaveBeenCalled();
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-url');
  });
});
