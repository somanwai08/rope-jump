// qa.mjs - Node runner:  node js/qa.mjs   (exit code 0 = all green)
import { runQA } from './qa_core.js';

const results = runQA();
let fail = 0;
for (const r of results) {
  console.log((r.pass ? 'PASS' : 'FAIL') + '  ' + r.name + (r.detail ? '   [' + r.detail + ']' : ''));
  if (!r.pass) fail++;
}
console.log('--------------------------------------------------');
console.log(fail === 0
  ? 'ALL TESTS PASSED (' + results.length + ' checks)'
  : fail + ' TEST(S) FAILED of ' + results.length);
process.exit(fail === 0 ? 0 : 1);
