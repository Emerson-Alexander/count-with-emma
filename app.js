(function () {
  "use strict";

  const { DENOMINATIONS, toCents, totalRegister, chooseDrop } = window.CountWithEmma;
  const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
  const state = { expected: [0, 0], closingTarget: 0 };

  const setupStep = document.querySelector("#setup-step");
  const countStep = document.querySelector("#count-step");
  const resultsStep = document.querySelector("#results-step");
  const setupForm = document.querySelector("#setup-form");
  const countForm = document.querySelector("#count-form");
  const registerCounts = document.querySelector("#register-counts");
  const countSummary = document.querySelector("#count-summary");
  const varianceNotices = document.querySelector("#variance-notices");
  const dropSummary = document.querySelector("#drop-summary");
  const results = document.querySelector("#results");

  function formatCents(cents) {
    return money.format(cents / 100);
  }

  function showStep(step) {
    const steps = [setupStep, countStep, resultsStep];
    const activeStep = steps.indexOf(step);
    steps.forEach((section) => {
      const active = section === step;
      section.hidden = !active;
      section.classList.toggle("step--active", active);
    });
    document.querySelectorAll("[data-progress-step]").forEach((item, index) => {
      item.classList.toggle("progress--active", index === activeStep);
      item.classList.toggle("progress--done", index < activeStep);
      if (index === activeStep) item.setAttribute("aria-current", "step");
      else item.removeAttribute("aria-current");
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
    requestAnimationFrame(() => step.querySelector("input, button")?.focus({ preventScroll: true }));
  }

  function registerCard(registerIndex) {
    const registerNumber = registerIndex + 1;
    const rows = DENOMINATIONS.map(
      (denomination) => `
        <label class="count-row">
          <span class="denomination">${denomination.label}</span>
          <span class="times" aria-hidden="true">×</span>
          <input
            id="r${registerNumber}-${denomination.key}"
            data-register="${registerIndex}"
            data-denomination="${denomination.key}"
            type="number"
            min="0"
            step="1"
            inputmode="numeric"
            placeholder="0"
            aria-label="Register ${registerNumber}, number of ${denomination.label} ${denomination.cents >= 100 ? "bills" : "coins"}"
          />
          <output data-row-total="${registerIndex}-${denomination.key}">${formatCents(0)}</output>
        </label>`
    ).join("");

    return `
      <article class="register-card" data-register-card="${registerIndex}">
        <header>
          <div><span class="register-number">R${registerNumber}</span><h2>Register ${registerNumber}</h2></div>
          <div class="register-actions">
            <span class="expected-pill">Expected ${formatCents(state.expected[registerIndex])}</span>
            <button class="clear-register" data-clear-register="${registerIndex}" type="button">Clear R${registerNumber}</button>
          </div>
        </header>
        <div class="count-table">${rows}</div>
        <label class="count-row extra-row">
          <span><strong>Rolled coins</strong><small>Always stays in register</small></span>
          <span class="times" aria-hidden="true">$</span>
          <input
            id="r${registerNumber}-extra"
            data-register="${registerIndex}"
            data-extra
            type="number"
            min="0"
            step="0.01"
            inputmode="decimal"
            placeholder="0.00"
            aria-label="Register ${registerNumber}, rolled coins dollar value"
          />
          <span></span>
        </label>
        <div class="running-total">
          <div><span>Counted total</span><strong data-actual="${registerIndex}">${formatCents(0)}</strong></div>
          <div class="comparison" data-comparison="${registerIndex}">Enter counts to compare</div>
        </div>
      </article>`;
  }

  function buildCountScreen() {
    if (!registerCounts.children.length) {
      registerCounts.innerHTML = registerCard(0) + registerCard(1);
      return;
    }
    registerCounts.querySelectorAll(".expected-pill").forEach((pill, registerIndex) => {
      pill.textContent = `Expected ${formatCents(state.expected[registerIndex])}`;
    });
  }

  function readRegister(registerIndex) {
    const counts = {};
    DENOMINATIONS.forEach((denomination) => {
      counts[denomination.key] = Number(document.querySelector(`#r${registerIndex + 1}-${denomination.key}`).value) || 0;
    });
    const extraCents = toCents(document.querySelector(`#r${registerIndex + 1}-extra`).value);
    return { counts, extraCents };
  }

  function updateTotals() {
    const summaries = [];
    const notices = [];
    [0, 1].forEach((registerIndex) => {
      const register = readRegister(registerIndex);
      const actual = totalRegister(register);
      const hasStarted = Array.from(registerCounts.querySelectorAll(`[data-register="${registerIndex}"]`))
        .some((input) => input.value !== "");
      document.querySelector(`[data-actual="${registerIndex}"]`).textContent = formatCents(actual);
      const comparison = document.querySelector(`[data-comparison="${registerIndex}"]`);
      const difference = actual - state.expected[registerIndex];
      const absoluteDifference = Math.abs(difference);
      comparison.className = "comparison";
      if (!hasStarted) {
        comparison.textContent = "Enter counts to compare";
      } else if (difference === 0) {
        comparison.textContent = "Matches expected";
        comparison.classList.add("comparison--even");
      } else {
        comparison.textContent = `${formatCents(Math.abs(difference))} ${difference > 0 ? "over" : "short"}`;
        comparison.classList.add(difference > 0 ? "comparison--over" : "comparison--short");
      }

      const statusText = !hasStarted
        ? "Waiting for count"
        : difference === 0
        ? "Matches"
        : `${formatCents(absoluteDifference)} ${difference > 0 ? "over" : "short"}`;
      summaries.push(`
        <div class="count-summary-item">
          <span>R${registerIndex + 1} counted</span>
          <strong>${formatCents(actual)}</strong>
          <small class="${!hasStarted ? "status-waiting" : difference === 0 ? "status-even" : absoluteDifference < 1000 ? "status-minor" : "status-major"}">${statusText}</small>
        </div>`);

      if (hasStarted && difference !== 0) {
        const major = absoluteDifference >= 1000;
        notices.push(`
          <div class="variance-notice variance-notice--${major ? "major" : "minor"}" role="alert">
            <strong>R${registerIndex + 1} is ${formatCents(absoluteDifference)} ${difference > 0 ? "over" : "short"}</strong>
            <span>${major ? "Large discrepancy—double-check the count and notify accounting." : "Double-check the count before preparing the drop."}</span>
          </div>`);
      }

      DENOMINATIONS.forEach((denomination) => {
        const rowTotal = register.counts[denomination.key] * denomination.cents;
        document.querySelector(`[data-row-total="${registerIndex}-${denomination.key}"]`).textContent = formatCents(rowTotal);
      });
    });
    countSummary.innerHTML = summaries.join("");
    varianceNotices.innerHTML = notices.join("");
  }

  function moneyList(title, instruction, totalCents, counts, extraCents, isDrop) {
    const items = DENOMINATIONS.map((denomination) => {
      const count = counts[denomination.key];
      return `
          <li class="${count === 0 ? "zero-row" : ""}">
            <span>${denomination.label}</span>
            <strong>${count}</strong>
            <small>${formatCents(count * denomination.cents)}</small>
          </li>`;
    }).join("");
    const extra = !isDrop && extraCents > 0
      ? `<li class="rolled"><span>Rolled coins</span><strong>—</strong><small>${formatCents(extraCents)}</small></li>`
      : "";

    return `
      <section class="money-list ${isDrop ? "money-list--drop" : ""}">
        <div class="money-list-heading">
          <div><h3>${title}</h3><span>${instruction}</span></div>
          <strong>${formatCents(totalCents)}</strong>
        </div>
        <div class="list-labels"><span>Denomination</span><span>Count</span><span>Value</span></div>
        <ul>${items}${extra}</ul>
      </section>`;
  }

  function varianceNotice(registerNumber, variance) {
    if (variance === 0) return "";
    const absoluteVariance = Math.abs(variance);
    const major = absoluteVariance >= 1000;
    return `
      <div class="result-variance result-variance--${major ? "major" : "minor"}" role="alert">
        <strong>${formatCents(absoluteVariance)} ${variance > 0 ? "over" : "short"}</strong>
        <span>${major ? `R${registerNumber} has a large discrepancy. Notify accounting.` : `R${registerNumber} was off by less than $10.`}</span>
      </div>`;
  }

  function resultCard(registerIndex, split) {
    const registerNumber = registerIndex + 1;
    const expected = state.expected[registerIndex];
    const variance = split.actualCents - expected;
    const varianceSeverity = variance === 0 ? "even" : Math.abs(variance) < 1000 ? "minor" : "major";
    const warning = split.belowTarget
      ? `<div class="warning" role="alert"><strong>Below the ${formatCents(split.targetCents)} closing target</strong><span>This register is ${formatCents(split.targetCents - split.actualCents)} short of the target. The full ${formatCents(split.actualCents)} stays in the register; check with a manager.</span></div>`
      : "";

    return `
      <article class="result-card">
        <header class="result-summary">
          <div><span class="register-number">R${registerNumber}</span><h2>Register ${registerNumber}</h2></div>
          <div class="summary-numbers">
            <span>Counted <strong>${formatCents(split.actualCents)}</strong></span>
            <span>Expected <strong>${formatCents(expected)}</strong></span>
            <span class="${varianceSeverity}">${variance === 0 ? "Matches" : `${formatCents(Math.abs(variance))} ${variance > 0 ? "over" : "short"}`}</span>
          </div>
        </header>
        ${varianceNotice(registerNumber, variance)}
        ${warning}
        <div class="split-lists">
          ${moneyList(`R${registerNumber} Final Drop`, "Put this cash in the bank drop", split.dropCents, split.dropCounts, 0, true)}
          ${moneyList(`R${registerNumber} Closing Counts`, "Leave this cash in the register", split.closingCents, split.closingCounts, split.extraCents, false)}
        </div>
      </article>`;
  }

  function clearRegister(registerIndex) {
    const registerNumber = registerIndex + 1;
    if (!window.confirm(`Clear every count entered for Register ${registerNumber}?`)) return;
    registerCounts.querySelectorAll(`[data-register="${registerIndex}"]`).forEach((input) => {
      input.value = "";
    });
    updateTotals();
    document.querySelector(`#r${registerNumber}-100`)?.focus();
  }

  setupForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!setupForm.reportValidity()) return;
    state.expected = [toCents(document.querySelector("#expected-r1").value), toCents(document.querySelector("#expected-r2").value)];
    state.closingTarget = toCents(document.querySelector("#closing-target").value);
    document.querySelector("#count-target-note").textContent = `Closing target: ${formatCents(state.closingTarget)} per register.`;
    buildCountScreen();
    updateTotals();
    showStep(countStep);
  });

  countForm.addEventListener("input", updateTotals);
  countForm.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" || event.target.tagName !== "INPUT") return;
    event.preventDefault();
    const inputs = Array.from(countForm.querySelectorAll('input[type="number"]'));
    const currentIndex = inputs.indexOf(event.target);
    const nextInput = inputs[currentIndex + 1];
    if (nextInput) {
      nextInput.focus();
      nextInput.select();
    } else {
      countForm.querySelector('button[type="submit"]').focus();
    }
  });
  registerCounts.addEventListener("click", (event) => {
    const button = event.target.closest("[data-clear-register]");
    if (button) clearRegister(Number(button.dataset.clearRegister));
  });
  countForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!countForm.reportValidity()) return;
    const splits = [chooseDrop(readRegister(0), state.closingTarget), chooseDrop(readRegister(1), state.closingTarget)];
    dropSummary.innerHTML = `
      <div><span>R1 Drop</span><strong>${formatCents(splits[0].dropCents)}</strong></div>
      <div><span>R2 Drop</span><strong>${formatCents(splits[1].dropCents)}</strong></div>
      <div class="drop-summary-total"><span>Total Bank Deposit</span><strong>${formatCents(splits[0].dropCents + splits[1].dropCents)}</strong></div>`;
    results.innerHTML = resultCard(0, splits[0]) + resultCard(1, splits[1]);
    showStep(resultsStep);
  });

  document.addEventListener("wheel", () => {
    if (document.activeElement?.matches('input[type="number"]')) document.activeElement.blur();
  }, { passive: true });

  document.querySelector("#edit-expected").addEventListener("click", () => showStep(setupStep));
  document.querySelector("#edit-counts").addEventListener("click", () => showStep(countStep));
  document.querySelector("#print-closeout").addEventListener("click", () => window.print());
  document.querySelector("#start-over").addEventListener("click", () => {
    setupForm.reset();
    countForm.reset();
    registerCounts.innerHTML = "";
    results.innerHTML = "";
    dropSummary.innerHTML = "";
    state.expected = [0, 0];
    state.closingTarget = 0;
    showStep(setupStep);
  });
})();
