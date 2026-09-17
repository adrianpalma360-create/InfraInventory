import assert from 'assert';
import { calculateNextVersion, parseSemVer, loadVersion, checkConsistency } from './release.mjs';

console.log('🧪 Running Semantic Versioning Unit Tests...');

// 1. Test parseSemVer
assert.deepStrictEqual(parseSemVer('11.0.0'), { major: 11, minor: 0, patch: 0, version: '11.0.0' });
assert.deepStrictEqual(parseSemVer('v11.0.1'), { major: 11, minor: 0, patch: 1, version: '11.0.1' });
assert.deepStrictEqual(parseSemVer('12.5.9'), { major: 12, minor: 5, patch: 9, version: '12.5.9' });

// 2. Test Patch Bump (Default)
const current = { major: 11, minor: 0, patch: 0, version: '11.0.0' };
const nextPatch = calculateNextVersion(current, 'patch');
assert.deepStrictEqual(nextPatch, { major: 11, minor: 0, patch: 1, version: '11.0.1' });
console.log('   ✅ Patch Bump: 11.0.0 -> 11.0.1');

// 3. Test Minor Bump
const currentMinor = { major: 11, minor: 0, patch: 3, version: '11.0.3' };
const nextMinor = calculateNextVersion(currentMinor, 'minor');
assert.deepStrictEqual(nextMinor, { major: 11, minor: 1, patch: 0, version: '11.1.0' });
console.log('   ✅ Minor Bump: 11.0.3 -> 11.1.0');

// 4. Test Major Bump
const currentMajor = { major: 11, minor: 1, patch: 5, version: '11.1.5' };
const nextMajor = calculateNextVersion(currentMajor, 'major');
assert.deepStrictEqual(nextMajor, { major: 12, minor: 0, patch: 0, version: '12.0.0' });
console.log('   ✅ Major Bump: 11.1.5 -> 12.0.0');

// 5. Test Explicit Version
const explicit = calculateNextVersion(current, '20.5.3');
assert.deepStrictEqual(explicit, { major: 20, minor: 5, patch: 3, version: '20.5.3' });
console.log('   ✅ Explicit Version: 20.5.3');

// 6. Test Current Version Consistency
const consistency = checkConsistency();
assert.strictEqual(consistency.valid, true);
assert.strictEqual(consistency.version, '11.0.0');
console.log('   ✅ Current Version is strictly 11.0.0 and consistent across project files');

console.log('🎉 ALL VERSION TESTS PASSED SUCCESSFULLY!');
