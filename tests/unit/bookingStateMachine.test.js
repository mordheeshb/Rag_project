/**
 * Unit tests for the Booking state machine (valid/invalid transitions).
 * Tests the VALID_TRANSITIONS constant without needing a DB connection.
 */

const VALID_TRANSITIONS = {
  pending:   ['accepted', 'cancelled'],
  accepted:  ['en_route', 'cancelled'],
  en_route:  ['arrived', 'cancelled'],
  arrived:   ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

function canTransition(from, to) {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

describe('Booking State Machine', () => {
  test('pending → accepted is valid', () => {
    expect(canTransition('pending', 'accepted')).toBe(true);
  });

  test('pending → en_route is INVALID (must go through accepted)', () => {
    expect(canTransition('pending', 'en_route')).toBe(false);
  });

  test('accepted → en_route is valid', () => {
    expect(canTransition('accepted', 'en_route')).toBe(true);
  });

  test('en_route → arrived is valid', () => {
    expect(canTransition('en_route', 'arrived')).toBe(true);
  });

  test('arrived → completed is valid', () => {
    expect(canTransition('arrived', 'completed')).toBe(true);
  });

  test('completed → anything is INVALID (terminal state)', () => {
    expect(canTransition('completed', 'accepted')).toBe(false);
    expect(canTransition('completed', 'cancelled')).toBe(false);
  });

  test('cancelled → anything is INVALID (terminal state)', () => {
    expect(canTransition('cancelled', 'pending')).toBe(false);
    expect(canTransition('cancelled', 'accepted')).toBe(false);
  });

  test('any non-terminal state → cancelled is valid', () => {
    ['pending', 'accepted', 'en_route', 'arrived'].forEach(status => {
      expect(canTransition(status, 'cancelled')).toBe(true);
    });
  });

  test('all valid terminal states have no outgoing transitions', () => {
    expect(VALID_TRANSITIONS.completed).toHaveLength(0);
    expect(VALID_TRANSITIONS.cancelled).toHaveLength(0);
  });

  test('en_route → completed is INVALID (must arrive first)', () => {
    expect(canTransition('en_route', 'completed')).toBe(false);
  });
});
