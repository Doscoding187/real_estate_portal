import { describe, expect, it } from 'vitest';
import {
  filterManagerDevelopmentAssignments,
  getManagerAssignmentTransactionLabel,
  normalizeManagerAssignmentTransactionLane,
} from './ManagerDevelopmentOpsPage';

describe('ManagerDevelopmentOpsPage transaction lane helpers', () => {
  it('normalizes manager assignment transaction types into DLE lanes', () => {
    expect(normalizeManagerAssignmentTransactionLane('for_sale')).toBe('sale');
    expect(normalizeManagerAssignmentTransactionLane('for_rent')).toBe('rent');
    expect(normalizeManagerAssignmentTransactionLane('rental')).toBe('rent');
    expect(normalizeManagerAssignmentTransactionLane('on_auction')).toBe('auction');
    expect(normalizeManagerAssignmentTransactionLane('leasehold')).toBe('sale');
  });

  it('labels manager assignments as Sale, Rental, or Auction engines', () => {
    expect(getManagerAssignmentTransactionLabel('for_sale')).toBe('Sale engine');
    expect(getManagerAssignmentTransactionLabel('for_rent')).toBe('Rental engine');
    expect(getManagerAssignmentTransactionLabel('auction')).toBe('Auction engine');
  });

  it('filters assigned developments by transaction engine without dropping all-lane visibility', () => {
    const assignments = [
      { developmentId: 1, developmentName: 'Sale Ridge', transactionType: 'for_sale' },
      { developmentId: 2, developmentName: 'Rental Quarter', transactionType: 'for_rent' },
      { developmentId: 3, developmentName: 'Auction Yard', transactionType: 'auction' },
    ];

    expect(filterManagerDevelopmentAssignments(assignments, 'all').map(item => item.developmentName)).toEqual([
      'Sale Ridge',
      'Rental Quarter',
      'Auction Yard',
    ]);
    expect(filterManagerDevelopmentAssignments(assignments, 'rent').map(item => item.developmentName)).toEqual([
      'Rental Quarter',
    ]);
    expect(filterManagerDevelopmentAssignments(assignments, 'auction').map(item => item.developmentName)).toEqual([
      'Auction Yard',
    ]);
  });
});
