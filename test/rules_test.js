// Unit Tests for Ludo Game Rules (Capture, Home, Bonus, 6s)
const assert = require('assert');

// We test the Ludo rules logic directly
console.log('--- TESTING LUDO RULES ENGINE ---');

const START_INDEXES = { red: 0, green: 13, yellow: 26, blue: 39 };
const SAFE_SQUARES = [0, 8, 13, 21, 26, 34, 39, 47];

// Test 1: Coordinate mapping & safe squares
assert.strictEqual(SAFE_SQUARES.includes(START_INDEXES.red), true, 'Red start must be safe');
assert.strictEqual(SAFE_SQUARES.includes(START_INDEXES.green), true, 'Green start must be safe');
assert.strictEqual(SAFE_SQUARES.includes(START_INDEXES.yellow), true, 'Yellow start must be safe');
assert.strictEqual(SAFE_SQUARES.includes(START_INDEXES.blue), true, 'Blue start must be safe');
console.log('✓ Test 1: Starting squares are safe');

// Test 2: Calculate track index
function getTrackIndex(color, step) {
  if (step < 0 || step > 50) return null;
  return (START_INDEXES[color] + step) % 52;
}

assert.strictEqual(getTrackIndex('red', 0), 0);
assert.strictEqual(getTrackIndex('green', 0), 13);
assert.strictEqual(getTrackIndex('red', 13), 13); // Red after 13 steps meets Green start
console.log('✓ Test 2: Track indices computed accurately');

// Test 3: Safe square protects against capture
function canCapture(attackerColor, attackerStep, victimColor, victimStep) {
  const attackerTrack = getTrackIndex(attackerColor, attackerStep);
  const victimTrack = getTrackIndex(victimColor, victimStep);

  if (attackerTrack === null || victimTrack === null) return false;
  if (attackerTrack !== victimTrack) return false;
  if (SAFE_SQUARES.includes(attackerTrack)) return false; // Protected by safe square!

  return true;
}

// Case A: Red lands on Green at square 13 (Green Start - Safe Square)
assert.strictEqual(canCapture('red', 13, 'green', 0), false, 'Safe square must protect victim');
console.log('✓ Test 3A: Safe star / starting square protects from capture');

// Case B: Red lands on Green at square 14 (Unsafe square)
// Red step 14 -> track 14. Green step 1 -> track (13+1) = 14.
assert.strictEqual(canCapture('red', 14, 'green', 1), true, 'Non-safe square must allow capture');
console.log('✓ Test 3B: Non-safe square allows capture');

// Test 4: Overshooting Home rule
function isValidMove(step, roll) {
  if (step === -1) return roll === 6;
  return (step + roll) <= 56;
}

assert.strictEqual(isValidMove(-1, 6), true, '6 can bring token out');
assert.strictEqual(isValidMove(-1, 5), false, '5 cannot bring token out');
assert.strictEqual(isValidMove(53, 3), true, '53 + 3 = 56 exact hit');
assert.strictEqual(isValidMove(53, 4), false, '53 + 4 = 57 overshoot not allowed');
console.log('✓ Test 4: Overshooting Home is blocked');

console.log('\n=======================================');
console.log('🎉 ALL LUDO RULES TESTS PASSED 100%!');
console.log('=======================================\n');
