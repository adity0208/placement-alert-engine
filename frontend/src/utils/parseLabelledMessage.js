/**
 * Pure helper to extract structured fields from labelled template messages.
 * Only extracts when explicitly present in message text.
 * Never invents or defaults values.
 *
 * @param {string} message
 * @returns {{
 *   companyName: string|null,
 *   jobRole: string|null,
 *   location: string|null,
 *   stipend: string|null,
 *   batch: string|null
 * }}
 */

const COMPANY_REGEX = /^(?:[*_~]*)(?:Company(?:\s*name)?|Organization|Org)(?:[*_~]*)\s*:\s*(.+)$/im;
const ROLE_REGEX = /^(?:[*_~]*)(?:Role|Position|Job(?:\s*Role)?|Designation)(?:[*_~]*)\s*:\s*(.+)$/im;
const LOCATION_REGEX = /^(?:[*_~]*)(?:Job(?:\s*Location)?|Location)(?:[*_~]*)\s*:\s*(.+)$/im;
const STIPEND_REGEX = /^(?:[*_~]*)(?:Expected(?:\s*stipend)?|Stipend|Salary|CTC|Package)(?:[*_~]*)\s*:\s*(.+)$/im;
const BATCH_REGEX = /^(?:[*_~]*)(?:Target(?:\s*Batch)?|Batch(?:\s*Eligible)?|Eligible(?:\s*Batch)?|Batch)(?:[*_~]*)\s*:\s*(.+)$/im;

function extractValue(message, regex) {
  if (!message || typeof message !== 'string') return null;
  const match = message.match(regex);
  if (!match || !match[1]) return null;

  let val = match[1].trim();

  // If multiple inline labels exist on the same line, truncate before the next label
  const inlineNextLabel = val.search(/\b(?:Role|Position|Location|Stipend|Salary|CTC|Apply|Link|Batch|Eligibility|Deadline)\s*:/i);
  if (inlineNextLabel > 0) {
    val = val.slice(0, inlineNextLabel).trim();
  }

  // Strip pipe or bullet separators if any
  if (val.includes('|')) {
    val = val.split('|')[0].trim();
  }

  // Strip trailing markdown symbols and surrounding quotes
  val = val.replace(/[*_~`]+$/g, '').trim();
  val = val.replace(/^["'`]+|["'`]+$/g, '').trim();

  // Guard against placeholders
  if (!val || /^(null|undefined|n\/a|none|-)$/i.test(val)) {
    return null;
  }

  return val;
}

export function parseLabelledMessage(message) {
  if (!message || typeof message !== 'string') {
    return {
      companyName: null,
      jobRole: null,
      location: null,
      stipend: null,
      batch: null
    };
  }

  return {
    companyName: extractValue(message, COMPANY_REGEX),
    jobRole: extractValue(message, ROLE_REGEX),
    location: extractValue(message, LOCATION_REGEX),
    stipend: extractValue(message, STIPEND_REGEX),
    batch: extractValue(message, BATCH_REGEX)
  };
}
