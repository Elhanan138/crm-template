import { ArrowLeftRight, FileSignature, Receipt, Repeat } from 'lucide-react';
import { ACTIVE_MODULE_IDS } from '@/lib/moduleRegistry';
import { MODULES } from '@/lib/modules';

// ─────────────────────────────────────────────────────────────────────────────
// RECORD ACTIONS
//
// A record action is a HAND-OFF between two modules: it takes what one module
// already knows and starts the next step in another one, instead of making
// someone retype it.
//
// Everything is declared, so an action can only appear when both ends of the
// hand-off are part of this build — a bundle without `projects` shows no
// "convert to project" button, and nothing imports the target module's code.
//
// `seed(record)` names the fields to carry over. They travel as query
// parameters and the target form accepts only the ones its own schema
// declares, so a hand-off can never introduce a field that module does not
// have, and nothing here needs to know how the target form is built.
//
// An action reads STORED fields only. Recomputing the other module's
// arithmetic here would be a second source for a number that already has one
// — which is why a proposal stores `amount_before_vat` rather than having this
// file multiply a subtotal by a discount.
// ─────────────────────────────────────────────────────────────────────────────

const ACTIONS = [
  {
    from: 'leads',
    requires: 'projects',
    key: 'lead-to-project',
    label: 'המרה לפרויקט',
    icon: ArrowLeftRight,
    hint: 'פותח אשף פרויקט חדש עם פרטי הליד, ומסמן את הליד כנסגר בהצלחה',
    // A lead becomes a project when it is won — offering it earlier invites a
    // project for a deal that has not closed.
    available: (record) => !!record?.id && !record.converted_project_id,
    seed: (record) => ({
      lead_id: record.id,
      client_name: record.company,
      contract_value: record.value,
    }),
    // The project wizard is its own route, not a record form: it takes the
    // seed on a path of its own rather than through `?new=1`.
    path: () => `${MODULES.projects.navPath}/new`,
  },
  {
    from: 'leads',
    requires: 'proposals',
    key: 'lead-to-proposal',
    label: 'הפקת הצעת מחיר',
    icon: FileSignature,
    hint: 'פותח הצעת מחיר חדשה עם הלקוח מהליד',
    // Without a customer there is nothing to address a quote to, and the
    // graph would have nothing to link it by either.
    available: (record) => !!record?.id && !!String(record.company || '').trim(),
    seed: (record) => ({ client_name: record.company, notes: record.notes }),
  },
  {
    from: 'proposals',
    requires: 'invoices',
    key: 'proposal-to-invoice',
    label: 'הפקת חשבונית',
    icon: Receipt,
    hint: 'פותח חשבונית חדשה עם הלקוח והסכום מההצעה',
    // Only an approved quote. Invoicing a draft is how a customer receives a
    // bill for a price nobody agreed to.
    available: (record) => !!record?.id && record.status === 'approved',
    seed: (record) => ({
      client_name: record.client_name,
      project_id: record.project_id,
      // The quote's own figure, before VAT and after its discount — which is
      // exactly what an invoice's `amount` field means.
      amount: record.amount_before_vat,
      vat_percent: record.vat_percent,
      notes: record.proposal_number ? `הצעת מחיר ${record.proposal_number}` : '',
    }),
  },
  {
    from: 'invoices',
    requires: 'subscriptions',
    key: 'invoice-to-subscription',
    label: 'הפיכה למנוי',
    icon: Repeat,
    hint: 'פותח מנוי חדש עם הלקוח והסכום מהחשבונית',
    available: (record) => !!record?.id && !!String(record.client_name || '').trim(),
    seed: (record) => ({ customer: record.client_name, amount: record.amount }),
  },
];

const isPresent = (value) => value !== undefined && value !== null && String(value) !== '';

/** The seed as query parameters, empty values dropped. */
export function seedParams(action, record) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(action.seed?.(record) || {})) {
    if (isPresent(value)) params.set(key, String(value));
  }
  return params;
}

/**
 * Where a hand-off leads.
 *
 * `?new=1` is the same door the target module's own create button opens — a
 * hand-off is never a second way into a form.
 */
export function actionPath(action, record) {
  const params = seedParams(action, record);
  if (action.path) {
    const query = params.toString();
    return query ? `${action.path(record)}?${query}` : action.path(record);
  }
  const navPath = MODULES[action.requires]?.navPath;
  if (!navPath) return null;
  params.set('new', '1');
  return `${navPath}?${params.toString()}`;
}

/** Actions this build can offer for one record. */
export const recordActionsFor = (moduleId, record) =>
  ACTIONS.filter(
    (a) =>
      a.from === moduleId &&
      ACTIVE_MODULE_IDS.includes(a.requires) &&
      !!MODULES[a.requires]?.navPath &&
      (!a.available || a.available(record))
  ).map((a) => ({ ...a, to: (r = record) => actionPath(a, r) }));

/** Every hand-off declared, for tests and diagnostics. */
export const allRecordActions = () => ACTIONS;
