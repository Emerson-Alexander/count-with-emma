(function (root) {
  "use strict";

  const DENOMINATIONS = Object.freeze([
    { key: "100", label: "$100", cents: 10000 },
    { key: "50", label: "$50", cents: 5000 },
    { key: "20", label: "$20", cents: 2000 },
    { key: "10", label: "$10", cents: 1000 },
    { key: "5", label: "$5", cents: 500 },
    { key: "1", label: "$1", cents: 100 },
    { key: "025", label: "$0.25", cents: 25 },
    { key: "010", label: "$0.10", cents: 10 },
    { key: "005", label: "$0.05", cents: 5 },
    { key: "001", label: "$0.01", cents: 1 }
  ]);

  function toCents(value) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.round(number * 100) : 0;
  }

  function normalizeCount(value) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? Math.floor(number) : 0;
  }

  function normalizeRegister(register) {
    const counts = {};
    DENOMINATIONS.forEach((denomination) => {
      counts[denomination.key] = normalizeCount(register.counts?.[denomination.key]);
    });
    return { counts, extraCents: Math.max(0, Math.round(Number(register.extraCents) || 0)) };
  }

  function totalRegister(register) {
    const normalized = normalizeRegister(register);
    return DENOMINATIONS.reduce(
      (total, denomination) => total + normalized.counts[denomination.key] * denomination.cents,
      normalized.extraCents
    );
  }

  // Find the highest-value drop that keeps at least the requested target in
  // the drawer. Among equal-value options, the first-seen path favors higher denominations.
  function chooseDrop(register, targetCents) {
    const normalized = normalizeRegister(register);
    const normalizedTargetCents = Math.max(0, Math.round(Number(targetCents) || 0));
    const actualCents = totalRegister(normalized);
    const allowanceCents = Math.max(0, actualCents - normalizedTargetCents);
    const unitLimit = Math.floor(allowanceCents / 5);
    const eligible = DENOMINATIONS.filter((denomination) => denomination.cents >= 5 && denomination.key !== "001");
    let paths = new Map([[0, []]]);

    eligible.forEach((denomination, denominationIndex) => {
      const value = denomination.cents / 5;
      const available = Math.min(normalized.counts[denomination.key], Math.floor(unitLimit / value));
      const next = new Map();

      for (const [sum, allocation] of paths) {
        const maximum = Math.min(available, Math.floor((unitLimit - sum) / value));
        for (let count = maximum; count >= 0; count -= 1) {
          const nextSum = sum + count * value;
          const candidate = allocation.concat(count);
          const existing = next.get(nextSum);
          if (!existing || isLexicographicallyGreater(candidate, existing)) next.set(nextSum, candidate);
        }
      }
      paths = next;
    });

    let bestUnits = 0;
    for (const sum of paths.keys()) bestUnits = Math.max(bestUnits, sum);
    const bestAllocation = paths.get(bestUnits) || [];
    const dropCounts = {};
    const closingCounts = {};

    DENOMINATIONS.forEach((denomination) => {
      dropCounts[denomination.key] = 0;
      closingCounts[denomination.key] = normalized.counts[denomination.key];
    });

    eligible.forEach((denomination, index) => {
      const count = bestAllocation[index] || 0;
      dropCounts[denomination.key] = count;
      closingCounts[denomination.key] -= count;
    });

    const dropCents = bestUnits * 5;
    return {
      actualCents,
      dropCents,
      closingCents: actualCents - dropCents,
      dropCounts,
      closingCounts,
      extraCents: normalized.extraCents,
      targetCents: normalizedTargetCents,
      belowTarget: actualCents < normalizedTargetCents
    };
  }

  function isLexicographicallyGreater(candidate, existing) {
    for (let index = 0; index < candidate.length; index += 1) {
      const difference = candidate[index] - (existing[index] || 0);
      if (difference !== 0) return difference > 0;
    }
    return false;
  }

  root.CountWithEmma = Object.freeze({ DENOMINATIONS, toCents, totalRegister, chooseDrop });
})(typeof window !== "undefined" ? window : globalThis);
