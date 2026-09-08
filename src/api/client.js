// Local standalone data client. This module is the entire surface the app
// knows: entities, functions, auth and integrations.
// All data is stored in localStorage; the single user is the deployment owner,
// configured via VITE_OWNER_EMAIL / VITE_OWNER_NAME. No network calls.
//
// NOTE: this is a single-browser demo backend. It is NOT multi-user and has no
// real authentication — see docs/DEPLOYMENT.md before shipping to customers.

import { OWNER_EMAIL, OWNER_NAME } from '@/lib/owner';

const STORAGE_PREFIX = 'oss_data_';

const ADMIN_USER = {
  id: 'local-admin-001',
  email: OWNER_EMAIL,
  full_name: OWNER_NAME,
  name: OWNER_NAME,
  role: 'admin',
  profile_image_url: null,
  ui_prefs: {},
  project_order: [],
};

function getCollection(name) {
  try {
    return JSON.parse(localStorage.getItem(`${STORAGE_PREFIX}${name}`) || '[]');
  } catch {
    return [];
  }
}

function setCollection(name, items) {
  localStorage.setItem(`${STORAGE_PREFIX}${name}`, JSON.stringify(items));
}

function genId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function parseOrderBy(orderBy) {
  if (!orderBy) return null;
  const desc = orderBy.startsWith('-');
  const field = desc ? orderBy.slice(1) : orderBy;
  return { field, desc };
}

function matchValue(item, key, value) {
  if (value === null || value === undefined) return true;
  if (typeof value === 'object' && !Array.isArray(value)) {
    if (value.$in) return value.$in.includes(item[key]);
    if (value.$gte) return (item[key] ?? 0) >= value.$gte;
    if (value.$lte) return (item[key] ?? 0) <= value.$lte;
    if (value.$gt) return (item[key] ?? 0) > value.$gt;
    if (value.$lt) return (item[key] ?? 0) < value.$lt;
    if (value.$ne) return item[key] !== value.$ne;
    return true;
  }
  return item[key] === value;
}

function matchFilter(item, filter) {
  if (!filter) return true;
  for (const [key, value] of Object.entries(filter)) {
    if (key === '$or') {
      if (!value.some(sub => matchFilter(item, sub))) return false;
    } else if (key === '$and') {
      if (!value.every(sub => matchFilter(item, sub))) return false;
    } else {
      if (!matchValue(item, key, value)) return false;
    }
  }
  return true;
}

function createEntityHandler(name) {
  return {
    list: async (orderBy) => {
      let items = getCollection(name);
      const ob = parseOrderBy(orderBy);
      if (ob) {
        items.sort((a, b) => {
          const av = a[ob.field] ?? '';
          const bv = b[ob.field] ?? '';
          if (typeof av === 'number' && typeof bv === 'number') {
            return ob.desc ? bv - av : av - bv;
          }
          const cmp = String(av).localeCompare(String(bv), 'he');
          return ob.desc ? -cmp : cmp;
        });
      }
      return items;
    },
    filter: async (query) => {
      let items = getCollection(name);
      if (query && query.filter) {
        items = items.filter(item => matchFilter(item, query.filter));
      }
      if (query && query.orderBy) {
        const ob = parseOrderBy(query.orderBy);
        if (ob) {
          items.sort((a, b) => {
            const av = a[ob.field] ?? '';
            const bv = b[ob.field] ?? '';
            const cmp = String(av).localeCompare(String(bv), 'he');
            return ob.desc ? -cmp : cmp;
          });
        }
      }
      return items;
    },
    get: async (id) => {
      const items = getCollection(name);
      return items.find(item => item.id === id) || null;
    },
    create: async (data) => {
      const items = getCollection(name);
      // An id in the payload means the record already HAS an identity — this is
      // a restore, not a new row. Anything id-linked to it survives the undo.
      const newItem = {
        created_date: new Date().toISOString(),
        created_by_id: ADMIN_USER.id,
        ...data,
        id: data.id || genId(),
      };
      items.push(newItem);
      setCollection(name, items);
      return newItem;
    },
    update: async (id, data) => {
      const items = getCollection(name);
      const idx = items.findIndex(item => item.id === id);
      if (idx >= 0) {
        // Every write leaves a timestamp: the automation runner decides what to
        // act on by asking which records moved since it last ran.
        items[idx] = { ...items[idx], ...data, updated_date: data.updated_date || new Date().toISOString() };
        setCollection(name, items);
        return items[idx];
      }
      throw new Error(`${name} ${id} not found`);
    },
    delete: async (id) => {
      let items = getCollection(name);
      items = items.filter(item => item.id !== id);
      setCollection(name, items);
      return { success: true };
    },
    deleteMany: async (ids) => {
      let items = getCollection(name);
      items = items.filter(item => !ids.includes(item.id));
      setCollection(name, items);
      return { success: true, deleted: ids.length };
    },
    bulkCreate: async (itemsData) => {
      const items = getCollection(name);
      const created = itemsData.map(data => ({
        created_date: new Date().toISOString(),
        created_by_id: ADMIN_USER.id,
        ...data,
        id: data.id || genId(),
      }));
      items.push(...created);
      setCollection(name, items);
      return created;
    },
    bulkUpdate: async (itemsData) => {
      const items = getCollection(name);
      itemsData.forEach(data => {
        const idx = items.findIndex(item => item.id === data.id);
        if (idx >= 0) items[idx] = { ...items[idx], ...data };
      });
      setCollection(name, items);
      return itemsData;
    },
    updateMany: async (itemsData) => {
      const items = getCollection(name);
      itemsData.forEach(data => {
        const idx = items.findIndex(item => item.id === data.id);
        if (idx >= 0) items[idx] = { ...items[idx], ...data };
      });
      setCollection(name, items);
      return itemsData;
    },
    subscribe: async () => () => {},
  };
}


// ── integrations.Core ────────────────────────────────────────────────────────
// The SDK exposes these; the standalone client must too, or ~20 call sites throw
// "Cannot read properties of undefined". Files become data URLs so they survive
// a reload; AI calls fail loudly instead of returning junk the UI would render.
const MAX_INLINE_FILE = 4 * 1024 * 1024;

const readAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('קריאת הקובץ נכשלה'));
    reader.readAsDataURL(file);
  });

const unavailable = (label) => {
  throw new Error(`${label} אינו זמין במצב עצמאי — נדרש שרת. ראה docs/DEPLOYMENT.md`);
};

const integrations = {
  Core: {
    UploadFile: async ({ file }) => {
      if (!file) throw new Error('לא נבחר קובץ');
      if (file.size > MAX_INLINE_FILE) {
        throw new Error('הקובץ גדול מ-4MB. במצב עצמאי קבצים נשמרים בדפדפן — העלה קובץ קטן יותר.');
      }
      const dataUrl = await readAsDataUrl(file);
      return { file_url: dataUrl, file_name: file.name, file_size: file.size, mime_type: file.type };
    },
    UploadPrivateFile: async (args) => integrations.Core.UploadFile(args),
    CreateFileSignedUrl: async ({ file_url }) => ({ signed_url: file_url }),
    SendEmail: async ({ to, subject, body, ...rest }) => {
      // No mail server in standalone mode — record it so flows continue and the
      // message is auditable from the error/email log.
      const items = getCollection('EmailLog');
      items.push({
        id: genId(),
        to, subject, body: body || '',
        status: 'not_sent_local_mode',
        created_date: new Date().toISOString(),
        ...rest,
      });
      setCollection('EmailLog', items);
      return { success: true, delivered: false, reason: 'local_mode' };
    },
    InvokeLLM: async () => unavailable('שירות ה-AI'),
    GenerateImage: async () => unavailable('יצירת תמונות'),
    ExtractDataFromUploadedFile: async () => unavailable('חילוץ נתונים מקובץ'),
  },
};

const localClient = {
  auth: {
    me: async () => ADMIN_USER,
    isAuthenticated: () => true,
    logout: async () => {
      // Local mode — no-op, stay logged in
    },
    redirectToLogin: () => {
      // Local mode — always authenticated, no-op
    },
    updateMe: async (data) => {
      Object.assign(ADMIN_USER, data);
      return ADMIN_USER;
    },
  },
  integrations,
  entities: new Proxy({}, {
    get(target, prop) {
      if (typeof prop !== 'string') return undefined;
      if (!target[prop]) {
        target[prop] = createEntityHandler(prop);
      }
      return target[prop];
    },
  }),
  functions: {
    invoke: async (name, body = {}) => {
      // Short-circuits for functions that genuinely have nothing to do locally.
      // NOTE: only add a name here if it has no local implementation. This list
      // runs BEFORE the dispatcher, so a name listed here can never reach its
      // implementation — that is what silently discarded every settings toggle.
      const defaults = {
        ensureAccess: { data: { allowed: true } },
      };
      if (defaults[name]) return defaults[name];
      // Functions with full local implementations
      const { invokeLocalFunction } = await import('./localFunctions.js');
      // Before manageTeamMember update, capture old email to sync ADMIN_USER if needed
      let oldMemberEmail = null;
      if (name === 'manageTeamMember' && body.action === 'update' && body.data?.email) {
        const members = getCollection('TeamMember');
        const oldMember = members.find(m => m.id === body.memberId);
        oldMemberEmail = oldMember ? oldMember.email : null;
      }
      try {
        const result = invokeLocalFunction(name, body);
        // Sync ADMIN_USER email if the updated member's old email matched
        if (oldMemberEmail && oldMemberEmail.trim().toLowerCase() === ADMIN_USER.email.trim().toLowerCase()) {
          ADMIN_USER.email = body.data.email;
        }
        return result;
      } catch (err) {
        // Wrap to match the error shape mutations expect: err.response.data.error
        const message = err?.message || String(err);
        const status = err?.status || 500;
        throw { response: { status, data: { error: message } }, message };
      }
    },
  },
};

export const api = localClient;
