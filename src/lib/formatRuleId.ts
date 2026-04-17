/**
 * Niyam AI v3.0 — formatRuleId
 * Single source of truth for converting internal node IDs to display strings.
 * 
 * PWM_2016_R9_1     → "Rule 9(1)"
 * PWM_2016_R9_1_a   → "Rule 9(1)(a)"
 * PWM_2018_R3_gb    → "Rule 3(gb) [2018 Amendment]"
 * PWM_2016_S2_1     → "Schedule II, Item 1"
 * PWM_2016_R15      → "Rule 15"
 */
export function formatRuleId(id: string): string {
  const parts = id.split('_');
  if (parts.length < 4) return id;

  const [, year, ruleCode, ...rest] = parts;
  const ySuffix = year !== '2016' ? ` [${year} Amendment]` : '';

  if (ruleCode.startsWith('R')) {
    const num = ruleCode.slice(1);
    const clauses = rest.map(c => `(${c})`).join('');
    return `Rule ${num}${clauses}${ySuffix}`;
  }

  if (ruleCode.startsWith('S')) {
    const sched = ruleCode.slice(1);
    const schedName = sched === '1' ? 'I' : sched === '2' ? 'II' : sched;
    return `Schedule ${schedName}${rest.length ? ', Item ' + rest.join('.') : ''}${ySuffix}`;
  }

  return id; // fallback — should never be reached
}

/**
 * Format a breadcrumb path array into a display string
 */
export function formatBreadcrumb(path: string[]): string {
  return path.join(' > ');
}
