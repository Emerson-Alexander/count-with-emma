const fs = require("node:fs");
const vm = require("node:vm");
const assert = require("node:assert/strict");

vm.runInThisContext(fs.readFileSync("calculator.js", "utf8"));
const { totalRegister, chooseDrop } = globalThis.CountWithEmma;

function register(counts, extraCents = 0) {
  return { counts, extraCents };
}

assert.equal(totalRegister(register({ "20": 15, "001": 3 }, 2500)), 32503);

const ordinary = chooseDrop(register({ "100": 3, "50": 1, "20": 5, "10": 4, "5": 2, "1": 10, "025": 8, "010": 10, "005": 10, "001": 3 }, 2500), 30000);
assert.equal(ordinary.actualCents, 53853);
assert.equal(ordinary.dropCents, 23850);
assert.equal(ordinary.closingCents, 30003);
assert.equal(ordinary.dropCounts["001"], 0);
assert.equal(ordinary.closingCounts["001"], 3);
assert.equal(ordinary.extraCents, 2500);

const below = chooseDrop(register({ "20": 10, "1": 10 }), 30000);
assert.equal(below.actualCents, 21000);
assert.equal(below.dropCents, 0);
assert.equal(below.closingCents, 21000);
assert.equal(below.belowTarget, true);

const largeFirst = chooseDrop(register({ "100": 3, "50": 2 }), 20000);
assert.equal(largeFirst.dropCents, 20000);
assert.equal(largeFirst.dropCounts["100"], 2);
assert.equal(largeFirst.dropCounts["50"], 0);
assert.equal(largeFirst.closingCents, 20000);

const indivisible = chooseDrop(register({ "100": 3 }), 24000);
assert.equal(indivisible.dropCents, 0);
assert.equal(indivisible.closingCents, 30000);

console.log("All calculator checks passed.");
