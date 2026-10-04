// Local implementations of backend functions for the standalone client.
// Replicates the essential logic from the Deno edge functions so that
// CRUD operations on the users/permissions page work in local mode.

import { OWNER_EMAIL } from '@/lib/owner';
import { slugify } from '@/lib/projectSlug';
import { runAutomations } from './automationRunner';
import { demoDataFor, isDemoRecord, DEMO_FLAG } from '@/lib/demoData';
import { ACTIVE_MODULE_IDS } from '@/lib/moduleRegistry';
import { CRM_SCHEMAS } from '@/lib/crm/schemas';

const STORAGE_PREFIX = 'oss_data_';
const FULL = ['full'];
const ADMIN_USER_ID = 'local-admin-001';

const CHILD_ENTITIES = [
  'Task', 'ProjectNote', 'Quote',
  'GanttItem', 'GanttGroup', 'GanttColumn', 'GanttView',
  'Reminder', 'TaskComment', 'ProjectAlert',
  'ProjectDocumentText', 'ProjectStage', 'ProjectChecklistItem', 'ClientHighlight',
];
const ROADMAP_ENTITIES = ['RoadmapItem', 'RoadmapMessage'];

function cleanEmail(email) {
  if (!email) return '';
  return email.replace(/^mailto:/i, '').replace(/^-+/, '').replace(/-+$/, '').toLowerCase().trim();
}

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

// --- Entity helpers (operate directly on localStorage) ---

function entityCreate(name, data) {
  const items = getCollection(name);
  const newItem = { ...data, id: genId(), created_date: new Date().toISOString(), created_by_id: ADMIN_USER_ID };
  items.push(newItem);
  setCollection(name, items);
  return newItem;
}

function entityUpdate(name, id, data) {
  const items = getCollection(name);
  const idx = items.findIndex(item => item.id === id);
  if (idx >= 0) {
    // Automations answer "what moved since the last run", so an update has to
    // leave a timestamp. A caller that supplies its own keeps it.
    items[idx] = { ...items[idx], ...data, updated_date: data.updated_date || new Date().toISOString() };
    setCollection(name, items);
    return items[idx];
  }
  return null;
}

function entityDelete(name, id) {
  let items = getCollection(name);
  items = items.filter(item => item.id !== id);
  setCollection(name, items);
}

function entityFilter(name, filter) {
  const items = getCollection(name);
  if (!filter) return items;
  return items.filter(item => {
    for (const [key, value] of Object.entries(filter)) {
      if (item[key] !== value) return false;
    }
    return true;
  });
}

// --- Array sync helpers ---

function removeFromAllArrays(email) {
  const e = cleanEmail(email);
  const entities = ['Project', ...CHILD_ENTITIES, ...ROADMAP_ENTITIES];
  for (const name of entities) {
    const records = getCollection(name);
    let changed = false;
    for (const r of records) {
      if (Array.isArray(r.member_emails) && r.member_emails.some(x => cleanEmail(x) === e)) {
        r.member_emails = r.member_emails.filter(x => cleanEmail(x) !== e);
        r.editor_emails = (r.editor_emails || []).filter(x => cleanEmail(x) !== e);
        changed = true;
      }
    }
    if (changed) setCollection(name, records);
  }
}

function replaceInAllArrays(oldEmail, newEmail) {
  const oldE = cleanEmail(oldEmail);
  const newE = cleanEmail(newEmail);
  const entities = ['Project', ...CHILD_ENTITIES, ...ROADMAP_ENTITIES];
  for (const name of entities) {
    const records = getCollection(name);
    let changed = false;
    for (const r of records) {
      if (Array.isArray(r.member_emails) && r.member_emails.some(x => cleanEmail(x) === oldE)) {
        r.member_emails = r.member_emails.map(x => cleanEmail(x) === oldE ? newE : x);
        r.editor_emails = (r.editor_emails || []).map(x => cleanEmail(x) === oldE ? newE : x);
        changed = true;
      }
    }
    if (changed) setCollection(name, records);
  }
}

function syncRoadmapAccess() {
  const members = getCollection('TeamMember');
  const emailSet = new Set();
  for (const m of members) {
    if (m.is_admin || m.roadmap_access) {
      const e = cleanEmail(m.email);
      if (e) emailSet.add(e);
    }
  }
  const emails = [...emailSet];
  for (const name of ROADMAP_ENTITIES) {
    const records = getCollection(name);
    let changed = false;
    for (const r of records) {
      r.member_emails = emails;
      changed = true;
    }
    if (changed) setCollection(name, records);
  }
}

function fullSync() {
  const projects = getCollection('Project');
  const admins = getCollection('TeamMember').filter(m => m.is_admin);
  const adminEmails = new Set(admins.map(a => cleanEmail(a.email)).filter(Boolean));
  const allPerms = getCollection('ProjectPermission');
  const users = getCollection('User');
  let totalChild = 0;

  for (const project of projects) {
    const memberSet = new Set();
    const editorSet = new Set();

    const projPerms = allPerms.filter(p => p.project_id === project.id);
    for (const p of projPerms) {
      const e = cleanEmail(p.member_email);
      if (!e) continue;
      if ((p.permissions || []).includes('view') || (p.permissions || []).length > 0) {
        memberSet.add(e);
        editorSet.add(e);
      }
    }
    for (const e of adminEmails) { memberSet.add(e); editorSet.add(e); }

    if (project.created_by_id) {
      const creator = users.find(u => u.id === project.created_by_id);
      if (creator?.email) {
        const e = cleanEmail(creator.email);
        memberSet.add(e); editorSet.add(e);
      }
    }

    const memberArr = [...memberSet];
    const editorArr = [...editorSet];

    entityUpdate('Project', project.id, { member_emails: memberArr, editor_emails: editorArr });

    for (const name of CHILD_ENTITIES) {
      const records = entityFilter(name, { project_id: project.id });
      if (records.length === 0) continue;
      totalChild += records.length;
      for (const r of records) {
        entityUpdate(name, r.id, { member_emails: memberArr, editor_emails: editorArr });
      }
    }
  }
  return { projectsSynced: projects.length, childRecordsSynced: totalChild };
}

function syncProjectArrays(projectId) {
  const project = getCollection('Project').find(p => p.id === projectId);
  if (!project) return { error: 'Project not found' };

  const perms = entityFilter('ProjectPermission', { project_id: projectId });
  const allTeamMembers = getCollection('TeamMember');
  const accessSet = new Set();

  // PM and liaison get full access automatically
  const roleNames = [project.project_manager, project.current_liaison].filter(Boolean);
  for (const name of roleNames) {
    const m = allTeamMembers.find(
      tm => (tm.name || '').trim().toLowerCase() === String(name).trim().toLowerCase()
    );
    if (m?.email) accessSet.add(m.email.trim());
  }

  // Anyone with a ProjectPermission record (any non-empty permissions) = full access
  for (const p of perms) {
    const e = (p.member_email || '').trim();
    if (!e) continue;
    if ((p.permissions || []).length > 0) accessSet.add(e);
  }

  // Admins
  const admins = allTeamMembers.filter(m => m.is_admin);
  for (const a of admins) {
    const e = (a.email || '').trim();
    if (e) accessSet.add(e);
  }

  // Project creator
  if (project.created_by_id) {
    const creator = getCollection('User').find(u => u.id === project.created_by_id);
    if (creator?.email) accessSet.add(creator.email.trim());
  }

  const accessArr = [...accessSet];

  entityUpdate('Project', projectId, { member_emails: accessArr, editor_emails: accessArr });

  let childCount = 0;
  for (const name of CHILD_ENTITIES) {
    const records = entityFilter(name, { project_id: projectId });
    if (records.length === 0) continue;
    childCount += records.length;
    for (const r of records) {
      entityUpdate(name, r.id, { member_emails: accessArr, editor_emails: accessArr });
    }
  }

  return { member_emails: accessArr, editor_emails: accessArr, childRecordsSynced: childCount };
}

// --- Main function dispatcher ---

export function invokeLocalFunction(name, body = {}) {
  switch (name) {
    case 'manageTeamMember':
      return manageTeamMember(body);
    case 'setProjectMembers':
      return setProjectMembers(body);
    case 'syncPermissions':
      return syncPermissions(body);
    case 'askSystem':
      return askSystem(body);
    case 'manageProject':
      return manageProject(body);
    case 'applyPlaybook':
      return applyPlaybook(body);
    case 'deleteProjectCascade':
      return deleteProjectCascade(body);
    case 'globalTabVisibility':
      return globalTabVisibility(body);
    case 'listTeamMembers':
      return listTeamMembers();
    case 'listProjectPermissions':
      return listProjectPermissions(body);
    case 'deleteTask':
      return deleteTask(body);
    case 'manageCustomField':
      return manageCustomField(body);
    case 'logAudit':
      return logAudit(body);
    case 'notificationsAdmin':
      return notificationsAdmin(body);
    case 'notifySupportTicket':
      return notifySupportTicket(body);
    case 'notifyRoadmapMention':
    case 'sendRoadmapNotification':
      return notifyRoadmapMention(body);
    case 'replyToTicket':
      return replyToTicket(body);
    case 'transferProjectOwnership':
      return transferProjectOwnership(body);
    case 'manageMyTeam':
      return manageMyTeam(body);
    case 'syncDirectory':
      return syncDirectory(body);
    case 'runAutomations':
      return runAutomationRules(body);

    // The client heartbeat. It used to fall through to the default warning while
    // every automation rule in the system sat unexecuted.
    case 'runAlertsIfDue':
      return runAutomationRules(body);

    // No-ops: nothing scheduled runs in a browser-only build.
    case 'processProjectAlerts':
    case 'routeRoadmapItem':
    case 'adminSyncControl':
      return { data: { success: true, processed: 0 } };
    case 'manageMockFixtures':
      return manageMockFixtures(body);

    // Server-only: AI, mail and calendar sync.
    case 'agentAction':
    case 'projectAgent':
    case 'projectChat':
    case 'reportsChat':
    case 'guideFromText':
    case 'ingestProjectDocument':
    case 'sendGmail':
    case 'backfillEmailLogs':
    case 'fetchOutlookCalendar':
    case 'syncOutlookCalendar':
    case 'outlookCalendarConfig':
    case 'fetchTeamsAttendance':
      return serverOnly(name);

    case 'checkIntegrations':
    case 'userConnectionsStatus':
    case 'outlookConnectionStatus':
      return notConfigured();
    default:
      // Unimplemented backend function. Returning an empty payload is correct for
      // optional/no-op functions, but it must be visible — a silent {} is what
      // made project creation report success while creating nothing.
      if (import.meta.env?.DEV) {
        console.warn(`[localFunctions] '${name}' has no local implementation — returning empty payload.`);
      }
      return { data: {} };
  }
}

function askSystem(body = {}) {
  // Warmup calls — return empty success
  if (body.warmup) return { data: { answer: '', source_type: 'pending' } };

  const question = (body.question || '').toLowerCase().trim();
  const proposals = getCollection('Proposal');
  const projects = getCollection('Project');
  const tasks = getCollection('Task');
  const tickets = getCollection('SupportTicket');

  // "כמה הצעות מחיר יש במערכת?"
  if (/כמה.*הצעות|הצעות.*מחיר|proposals/.test(question)) {
    const sent = proposals.filter(p => p.status === 'sent').length;
    const draft = proposals.filter(p => p.status === 'draft').length;
    return {
      data: {
        answer: `יש ${proposals.length} הצעות מחיר במערכת${sent ? ` (${sent} נשלחו, ${draft} בטיוטה)` : ''}.`,
        source_type: 'data',
        follow_ups: [],
      },
    };
  }

  // "סקורת מצב" / "סקירת מצב" / status review
  if (/סק(ו|י)רת מצב|סטטוס|status review|מצב המערכת/.test(question)) {
    const openTasks = tasks.filter(t => t.status !== 'done').length;
    const openTickets = tickets.filter(t => t.status !== 'closed').length;
    return {
      data: {
        answer: `סקירת מצב המערכת:\n• פרויקטים: ${projects.length}\n• הצעות מחיר: ${proposals.length}\n• משימות פתוחות: ${openTasks}\n• פניות תמיכה פתוחות: ${openTickets}`,
        source_type: 'data',
        follow_ups: [],
      },
    };
  }

  // "כמה פרויקטים"
  if (/כמה.*פרויקטים|projects/.test(question)) {
    return {
      data: {
        answer: `יש ${projects.length} פרויקטים במערכת.`,
        source_type: 'data',
        follow_ups: [],
      },
    };
  }

  // "כמה משימות"
  if (/כמה.*משימות|tasks/.test(question)) {
    const open = tasks.filter(t => t.status !== 'done').length;
    return {
      data: {
        answer: `יש ${tasks.length} משימות במערכת (${open} פתוחות, ${tasks.length - open} הושלמו).`,
        source_type: 'data',
        follow_ups: [],
      },
    };
  }

  // Default fallback
  return {
    data: {
      answer: 'אני יכול לעזור עם שאלות על הצעות מחיר, פרויקטים, משימות ופניות תמיכה. נסה לשאול לדוגמה: "כמה הצעות מחיר יש במערכת?"',
      source_type: 'data',
      follow_ups: [],
    },
  };
}

// Fields a team member record may carry. `password_hash`/`password_salt` are
// written but never read back into the UI — only credentials.js compares them.
const TEAM_MEMBER_FIELDS = [
  'name', 'email', 'role', 'is_admin', 'manager_email', 'username',
  'password_hash', 'password_salt', 'password_updated_at',
];

const pickTeamMemberFields = (data = {}) =>
  Object.fromEntries(Object.entries(data).filter(([k]) => TEAM_MEMBER_FIELDS.includes(k)));

function manageTeamMember(body) {
  const { action, memberId, data } = body;

  // --- CREATE ---
  if (action === 'create') {
    if (!data?.name) throw { status: 400, message: 'name required' };
    const member = entityCreate('TeamMember', pickTeamMemberFields(data));
    const syncResult = fullSync();
    syncRoadmapAccess();
    return { data: { success: true, memberId: member.id, ...syncResult } };
  }

  // --- UPDATE / DELETE ---
  if (!action || !memberId) throw { status: 400, message: 'missing action or memberId' };

  const members = getCollection('TeamMember');
  const oldMember = members.find(m => m.id === memberId);
  if (!oldMember) throw { status: 404, message: 'member not found' };

  const oldEmail = cleanEmail(oldMember.email);
  const isOwner = oldEmail === cleanEmail(OWNER_EMAIL);

  // Safety: cannot delete or demote owner
  if (action === 'delete' && isOwner) {
    throw { status: 409, message: 'לא ניתן למחוק את בעל המערכת' };
  }
  if (action === 'update' && isOwner && data.is_admin === false) {
    throw { status: 409, message: 'לא ניתן להוריד אדמין מבעל המערכת' };
  }

  // Safety: cannot demote/delete the last admin
  const willReduceAdmins = oldMember.is_admin === true && (
    action === 'delete' || (action === 'update' && data.is_admin === false)
  );
  if (willReduceAdmins) {
    const admins = members.filter(m => m.is_admin);
    if (admins.length <= 1) {
      throw { status: 409, message: 'לא ניתן להוריד את האדמין האחרון במערכת' };
    }
  }

  if (action === 'delete') {
    entityDelete('TeamMember', memberId);
    const perms = entityFilter('ProjectPermission', { member_email: oldEmail });
    for (const p of perms) entityDelete('ProjectPermission', p.id);
    removeFromAllArrays(oldEmail);
    // Best-effort User role downgrade
    const users = getCollection('User');
    const userRecord = users.find(u => cleanEmail(u.email) === oldEmail);
    if (userRecord) entityUpdate('User', userRecord.id, { role: 'user' });
  } else if (action === 'update') {
    const newEmail = cleanEmail(data.email);

    // Sync User.role if is_admin changed
    if (data.is_admin !== undefined && oldMember.is_admin !== data.is_admin) {
      const users = getCollection('User');
      const userRecord = users.find(u => cleanEmail(u.email) === (newEmail || oldEmail));
      if (userRecord) entityUpdate('User', userRecord.id, { role: data.is_admin ? 'admin' : 'user' });
    }

    entityUpdate('TeamMember', memberId, pickTeamMemberFields(data));

    if (newEmail && oldEmail && newEmail !== oldEmail) {
      const perms = entityFilter('ProjectPermission', { member_email: oldEmail });
      for (const p of perms) entityUpdate('ProjectPermission', p.id, { member_email: newEmail });
      replaceInAllArrays(oldEmail, newEmail);
    }
  } else {
    throw { status: 400, message: 'unknown action' };
  }

  const syncResult = fullSync();
  syncRoadmapAccess();
  return { data: { success: true, ...syncResult } };
}

function setProjectMembers(body) {
  const { projectId, memberEmail, grant } = body;
  if (!projectId || !memberEmail) throw { status: 400, message: 'missing projectId or memberEmail' };

  const email = String(memberEmail).trim();

  // Validation: target must be an existing TeamMember
  const allTeamMembers = getCollection('TeamMember');
  const targetMember = allTeamMembers.find(
    m => (m.email || '').trim().toLowerCase() === email.toLowerCase()
  );
  if (!targetMember) {
    throw { status: 422, message: 'המשתמש אינו קיים במערכת — יש להוסיפו תחילה בעמוד משתמשים והרשאות' };
  }
  const storedEmail = (targetMember.email || '').trim();

  // Upsert / delete the ProjectPermission record
  const existing = entityFilter('ProjectPermission', { project_id: projectId, member_email: storedEmail });

  if (grant) {
    if (existing[0]) {
      entityUpdate('ProjectPermission', existing[0].id, { permissions: FULL });
    } else {
      entityCreate('ProjectPermission', { project_id: projectId, member_email: storedEmail, permissions: FULL });
    }
  } else {
    if (existing[0]) entityDelete('ProjectPermission', existing[0].id);
  }

  const result = syncProjectArrays(projectId);
  return { data: { success: true, ...result } };
}

function syncPermissions(body = {}) {
  const projectId = body?.projectId;
  const teamMembers = getCollection('TeamMember');
  const adminTeamMembers = teamMembers.filter(m => m.is_admin);
  const adminEmails = new Set(adminTeamMembers.map(m => cleanEmail(m.email)).filter(Boolean));

  // Reconcile User.role with TeamMember.is_admin
  const users = getCollection('User');
  let rolesUpdated = 0;
  for (const member of adminTeamMembers) {
    const e = cleanEmail(member.email);
    if (!e) continue;
    const userRecord = users.find(u => cleanEmail(u.email) === e);
    if (userRecord && userRecord.role !== 'admin') {
      entityUpdate('User', userRecord.id, { role: 'admin' });
      rolesUpdated++;
    }
  }
  for (const u of users) {
    if (u.role !== 'admin') continue;
    if (cleanEmail(u.email) === cleanEmail(OWNER_EMAIL)) continue;
    const hasAdminMember = adminTeamMembers.some(m => cleanEmail(m.email) === cleanEmail(u.email));
    if (!hasAdminMember) {
      entityUpdate('User', u.id, { role: 'user' });
      rolesUpdated++;
    }
  }

  // Rebuild arrays
  let projects;
  if (projectId) {
    const p = getCollection('Project').find(pr => pr.id === projectId);
    projects = p ? [p] : [];
  } else {
    projects = getCollection('Project');
  }

  let totalChild = 0;
  for (const project of projects) {
    const allPerms = entityFilter('ProjectPermission', { project_id: project.id });
    const accessSet = new Set();

    for (const p of allPerms) {
      const e = cleanEmail(p.member_email);
      if (!e) continue;
      if ((p.permissions || []).length > 0) accessSet.add(e);
    }

    // Auto-grant to PM and liaison
    const roleNames = [project.project_manager, project.current_liaison].filter(Boolean);
    for (const name of roleNames) {
      const member = teamMembers.find(m =>
        (m.name || '').trim().toLowerCase() === String(name).trim().toLowerCase()
      );
      if (member?.email) {
        const e = cleanEmail(member.email);
        if (e) accessSet.add(e);
      }
    }

    for (const e of adminEmails) accessSet.add(e);

    if (project.created_by_id) {
      const creator = users.find(u => u.id === project.created_by_id);
      if (creator?.email) accessSet.add(cleanEmail(creator.email));
    }

    const accessArr = [...accessSet];
    entityUpdate('Project', project.id, { member_emails: accessArr, editor_emails: accessArr });

    for (const name of CHILD_ENTITIES) {
      const records = entityFilter(name, { project_id: project.id });
      if (records.length === 0) continue;
      totalChild += records.length;
      for (const r of records) {
        entityUpdate(name, r.id, { member_emails: accessArr, editor_emails: accessArr });
      }
    }
  }

  syncRoadmapAccess();

  return {
    data: {
      success: true,
      rolesUpdated,
      projectsSynced: projects.length,
      childRecordsSynced: totalChild,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// PROJECT LIFECYCLE
// Local implementation of manageProject + applyPlaybook + deleteProjectCascade.
// Previously these fell through to the dispatcher's `{ data: {} }` default, so the
// wizard reported success and created nothing.
// ─────────────────────────────────────────────────────────────────────────────

function normalizeHours(pricingModel, value) {
  if (pricingModel === 'fix_price') return 0;
  return value ? Number(value) : 0;
}

function ensureUniqueSlug(baseSlug, excludeId = null) {
  const fallback = baseSlug || 'project';
  const taken = new Set(
    getCollection('Project')
      .filter(p => p.id !== excludeId)
      .map(p => p.slug)
      .filter(Boolean)
  );
  if (!taken.has(fallback)) return fallback;
  let i = 2;
  while (taken.has(`${fallback}-${i}`)) i++;
  return `${fallback}-${i}`;
}

function applyPlaybook({ projectId, templateId }) {
  if (!projectId) throw Object.assign(new Error('missing projectId'), { status: 400 });
  const project = getCollection('Project').find(p => p.id === projectId);
  if (!project) throw Object.assign(new Error('פרויקט לא נמצא'), { status: 404 });
  if (!templateId || templateId === 'none') {
    return { data: { success: true, stagesCreated: 0, itemsCreated: 0 } };
  }
  if (entityFilter('ProjectStage', { project_id: projectId }).length > 0) {
    throw Object.assign(new Error('לפרויקט כבר קיימים שלבי Playbook'), { status: 409 });
  }

  const memberEmails = project.member_emails || [];
  const editorEmails = project.editor_emails || [];
  const byOrder = (a, b) => (a.order ?? 0) - (b.order ?? 0);

  const templateStages = entityFilter('PlaybookStage', { template_id: templateId }).sort(byOrder);
  if (templateStages.length === 0) {
    return { data: { success: true, stagesCreated: 0, itemsCreated: 0 } };
  }
  const templateItems = entityFilter('PlaybookItem', { template_id: templateId }).sort(byOrder);

  let itemsCreated = 0;
  templateStages.forEach((stage, si) => {
    const created = entityCreate('ProjectStage', {
      project_id: projectId,
      template_id: templateId,
      name: stage.name,
      description: stage.description || '',
      order: stage.order ?? si,
      status: 'not_started',
      member_emails: memberEmails,
      editor_emails: editorEmails,
    });
    templateItems
      .filter(it => it.stage_id === stage.id)
      .forEach((it, ii) => {
        entityCreate('ProjectChecklistItem', {
          project_id: projectId,
          stage_id: created.id,
          title: it.title || it.name || '',
          description: it.description || '',
          order: it.order ?? ii,
          status: 'pending',
          member_emails: memberEmails,
          editor_emails: editorEmails,
        });
        itemsCreated++;
      });
  });

  return { data: { success: true, stagesCreated: templateStages.length, itemsCreated } };
}

const PROJECT_UPDATABLE_FIELDS = [
  'pricing_model', 'contract_value', 'project_manager', 'current_liaison',
  'external_consultants', 'has_setup', 'setup_details', 'pilot_date',
  'kickoff_date', 'go_live_date', 'go_live_notes', 'frozen_until', 'frozen_notes',
  'licensing_start_date', 'licensing_reminder_date', 'licensing_duration',
  'licensing_duration_unit', 'dev_hours_purchased', 'conversion_hours_purchased',
  'hours_alert_threshold', 'document_url', 'image_url', 'tags', 'team_members',
  'custom_fields',
];

function createChildRecords(entity, rows, project, build) {
  const valid = (rows || []).filter(r => (r.name || r.title || '').trim());
  valid.forEach((row, i) => {
    entityCreate(entity, {
      ...build(row, i),
      project_id: project.id,
      member_emails: project.member_emails || [],
      editor_emails: project.editor_emails || [],
    });
  });
  return valid.length;
}

function manageProject(body = {}) {
  const {
    action,
    project_data: data = {},
    client_highlights = [],
    playbook_template_id: templateId,
    project_id: projectId,
  } = body;

  const ownerEmail = cleanEmail(OWNER_EMAIL);

  // ── CREATE ────────────────────────────────────────────────────────────
  if (action === 'create') {
    const clientName = (data.client_name || '').trim();
    if (!clientName) throw Object.assign(new Error('שם הלקוח חובה'), { status: 400 });

    const pricingModel = data.pricing_model || '';
    const project = entityCreate('Project', {
      name: clientName,
      slug: ensureUniqueSlug(slugify(clientName)),
      client_name: clientName,
      member_emails: [ownerEmail],
      editor_emails: [ownerEmail],
      image_url: data.image_url || null,
      contract_value: data.contract_value ? Number(data.contract_value) : null,
      pricing_model: pricingModel,
      project_manager: data.project_manager || '',
      current_liaison: data.current_liaison || '',
      external_consultants: data.external_consultants || '',
      has_setup: data.has_setup || false,
      setup_details: data.setup_details || '',
      pilot_date: data.pilot_date || '',
      licensing_start_date: data.licensing_start_date || null,
      kickoff_date: data.kickoff_date || null,
      go_live_date: data.go_live_date || null,
      go_live_notes: data.go_live_notes || '',
      frozen_until: data.frozen_until || null,
      frozen_notes: data.frozen_notes || '',
      licensing_reminder_date: data.licensing_reminder_date || null,
      licensing_duration: data.licensing_duration ? Number(data.licensing_duration) : null,
      licensing_duration_unit: data.licensing_duration_unit || 'months',
      training_hours_purchased: normalizeHours(pricingModel, data.training_hours_purchased),
      dev_hours_purchased: data.dev_hours_purchased ? Number(data.dev_hours_purchased) : 0,
      conversion_hours_purchased: data.conversion_hours_purchased ? Number(data.conversion_hours_purchased) : 0,
      hours_alert_threshold: data.hours_alert_threshold ? Number(data.hours_alert_threshold) : 5,
      document_url: data.document_url || null,
      tags: data.tags || [],
      team_members: data.team_members || [],
      custom_fields: data.custom_fields || {},
    });

    const highlightsCreated = createChildRecords('ClientHighlight', client_highlights, project, (h, i) => ({
      category: h.category || 'other',
      title: h.title.trim(),
      content: h.content || '',
      is_pinned: h.is_pinned || false,
      order: i,
    }));

    let playbookApplied = false;
    if (templateId && templateId !== 'none') {
      try { applyPlaybook({ projectId: project.id, templateId }); playbookApplied = true; } catch { /* non-critical */ }
    }

    if (entityFilter('ProjectPermission', { project_id: project.id, member_email: ownerEmail }).length === 0) {
      entityCreate('ProjectPermission', {
        project_id: project.id,
        member_email: ownerEmail,
        permissions: FULL,
      });
    }
    try { syncPermissions({ projectId: project.id }); } catch { /* non-critical */ }

    return {
      data: {
        success: true,
        project_id: project.id,
        project_name: project.name,
        slug: project.slug,
        highlights_created: highlightsCreated,
        playbook_applied: playbookApplied,
      },
    };
  }

  // ── UPDATE ────────────────────────────────────────────────────────────
  if (action === 'update') {
    if (!projectId) throw Object.assign(new Error('project_id חובה לעדכון'), { status: 400 });
    const existing = getCollection('Project').find(p => p.id === projectId);
    if (!existing) throw Object.assign(new Error('פרויקט לא נמצא'), { status: 404 });

    const updateData = {};
    for (const f of PROJECT_UPDATABLE_FIELDS) {
      if (data[f] !== undefined) updateData[f] = data[f];
    }

    if ((data.client_name || '').trim()) {
      const clientName = data.client_name.trim();
      updateData.name = clientName;
      updateData.client_name = clientName;
      const newBaseSlug = slugify(clientName);
      if (newBaseSlug && slugify(existing.client_name || existing.name || '') !== newBaseSlug) {
        const newSlug = ensureUniqueSlug(newBaseSlug, existing.id);
        if (existing.slug && existing.slug !== newSlug) updateData.previous_slug = existing.slug;
        updateData.slug = newSlug;
      }
    }

    if (data.training_hours_purchased !== undefined || data.pricing_model !== undefined) {
      const model = data.pricing_model ?? existing.pricing_model;
      const hoursVal = data.training_hours_purchased ?? existing.training_hours_purchased;
      updateData.training_hours_purchased = normalizeHours(model, hoursVal);
    }

    entityUpdate('Project', projectId, updateData);
    const updated = getCollection('Project').find(p => p.id === projectId);

    const highlightsCreated = createChildRecords('ClientHighlight', client_highlights, updated, (h, i) => ({
      category: h.category || 'other',
      title: h.title.trim(),
      content: h.content || '',
      is_pinned: h.is_pinned || false,
      order: i,
    }));

    try { syncPermissions({ projectId }); } catch { /* non-critical */ }

    return {
      data: {
        success: true,
        project_id: projectId,
        project_name: updated.name,
        slug: updated.slug,
        highlights_created: highlightsCreated,
      },
    };
  }

  throw Object.assign(new Error('פעולה לא תקינה — השתמש ב-create או update'), { status: 400 });
}

function deleteProjectCascade(body = {}) {
  const projectId = body.projectId || body.project_id;
  if (!projectId) throw Object.assign(new Error('missing projectId'), { status: 400 });
  let deleted = 0;
  for (const entity of [...CHILD_ENTITIES, 'ProjectPermission', 'ProjectPage', 'ProjectAlert', 'ProjectDocumentText']) {
    for (const rec of entityFilter(entity, { project_id: projectId })) {
      entityDelete(entity, rec.id);
      deleted++;
    }
  }
  entityDelete('Project', projectId);
  return { data: { success: true, deleted_records: deleted } };
}

// ─────────────────────────────────────────────────────────────────────────────
// SYSTEM SETTINGS
// Every settings panel reads and writes through globalTabVisibility. It had no
// local implementation, so it fell to the dispatcher's empty default: toggles
// appeared to flip and then reverted on the next read, and every feature gate
// saw an empty object. Persisted here against a SystemSetting collection.
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_SETTING_KEY = 'global_tab_visibility';

function settingRecord(key) {
  return getCollection('SystemSetting').find((s) => s.key === key) || null;
}

function globalTabVisibility(body = {}) {
  const key = body.settingKey || DEFAULT_SETTING_KEY;
  const existing = settingRecord(key);

  if (body.action === 'set') {
    if (!body.tabId) throw Object.assign(new Error('tabId חובה'), { status: 400 });
    const value = { ...(existing?.value || {}), [body.tabId]: body.enabled };
    if (existing) entityUpdate('SystemSetting', existing.id, { value });
    else entityCreate('SystemSetting', { key, value });
    return { data: { success: true, key, value } };
  }

  if (body.action === 'reset') {
    if (existing) entityUpdate('SystemSetting', existing.id, { value: {} });
    return { data: { success: true, key, value: {} } };
  }

  return { data: { key, value: existing?.value || {} } };
}

// ── Directory ────────────────────────────────────────────────────────────────

function listTeamMembers() {
  // Credentials never leave the storage layer.
  const members = getCollection('TeamMember').map(
    ({ password_hash, password_salt, ...safe }) => safe
  );
  return { data: { members, total: members.length } };
}

function listProjectPermissions(body = {}) {
  const { projectId } = body;
  const rows = projectId
    ? entityFilter('ProjectPermission', { project_id: projectId })
    : getCollection('ProjectPermission');
  return { data: { permissions: rows } };
}

// ── Small record operations the UI expects to exist ──────────────────────────

function deleteTask(body = {}) {
  const id = body.taskId || body.id;
  if (!id) throw Object.assign(new Error('taskId חובה'), { status: 400 });
  entityDelete('Task', id);
  return { data: { success: true } };
}

function manageCustomField(body = {}) {
  const { action, fieldId, data = {} } = body;
  if (action === 'delete') {
    entityDelete('CustomField', fieldId);
    return { data: { success: true } };
  }
  if (action === 'update') {
    entityUpdate('CustomField', fieldId, data);
    return { data: { success: true, field: getCollection('CustomField').find((f) => f.id === fieldId) } };
  }
  return { data: { success: true, field: entityCreate('CustomField', data) } };
}

function logAudit(body = {}) {
  entityCreate('AuditLog', { ...body, created_date: new Date().toISOString() });
  return { data: { success: true } };
}

// Integrations need a server. Report "not configured" honestly instead of
// leaving the UI spinning on an empty payload.
const notConfigured = () => ({
  data: { connected: false, configured: false, reason: 'local_mode', services: [] },
});

// ─────────────────────────────────────────────────────────────────────────────
// REMAINING BACKEND FUNCTIONS
//
// Everything the UI calls now has a definite answer. Functions that can be
// served from local data are implemented; functions that genuinely need a
// server (AI, mail, calendar sync) report that plainly instead of returning an
// empty payload the caller mistakes for success.
// ─────────────────────────────────────────────────────────────────────────────

function serverOnly(name) {
  return {
    data: {
      success: false,
      unavailable: true,
      reason: 'local_mode',
      function: name,
      message: 'הפעולה דורשת צד שרת ואינה זמינה במצב עצמאי',
    },
  };
}

function notificationsAdmin(body = {}) {
  const { action, id, active, type } = body;
  if (action === 'setActive') {
    entityUpdate('Notification', id, { active });
    return { data: { success: true } };
  }
  if (action === 'delete') {
    entityDelete(type === 'template' ? 'NotificationTemplate' : 'Notification', id);
    return { data: { success: true } };
  }
  return { data: { notifications: getCollection('Notification') } };
}

function createNotification(payload) {
  return entityCreate('Notification', {
    active: true,
    read: false,
    created_date: new Date().toISOString(),
    ...payload,
  });
}

function notifySupportTicket(body = {}) {
  const ticket = getCollection('SupportTicket').find((t) => t.id === body.ticket_id);
  if (!ticket) return { data: { success: false, reason: 'ticket_not_found' } };
  createNotification({
    type: 'support_ticket',
    title: ticket.title || 'פנייה חדשה',
    related_id: ticket.id,
    recipient_email: cleanEmail(OWNER_EMAIL),
  });
  return { data: { success: true } };
}

function notifyRoadmapMention(body = {}) {
  createNotification({
    type: 'roadmap_mention',
    title: body.title || 'אוזכרת בפריט פיתוח',
    related_id: body.item_id || body.itemId || null,
    recipient_email: cleanEmail(body.recipient_email || body.email || OWNER_EMAIL),
  });
  return { data: { success: true } };
}

function replyToTicket(body = {}) {
  const { ticket_id: ticketId, content = '', image_urls: images = [] } = body;
  if (!ticketId) throw Object.assign(new Error('ticket_id חובה'), { status: 400 });
  if (!content.trim() && images.length === 0) {
    throw Object.assign(new Error('אין תוכן לשליחה'), { status: 400 });
  }
  const message = entityCreate('TicketMessage', {
    ticket_id: ticketId,
    content,
    image_urls: images,
    author_email: cleanEmail(OWNER_EMAIL),
    created_date: new Date().toISOString(),
  });
  entityUpdate('SupportTicket', ticketId, { last_reply_at: message.created_date });
  return { data: { success: true, message } };
}

function transferProjectOwnership(body = {}) {
  const { projectId, newProjectManager, newLiaison } = body;
  if (!projectId) throw Object.assign(new Error('projectId חובה'), { status: 400 });
  const updates = {};
  if (newProjectManager !== undefined) updates.project_manager = newProjectManager;
  if (newLiaison !== undefined) updates.current_liaison = newLiaison;
  if (Object.keys(updates).length === 0) return { data: { success: true, changed: false } };
  entityUpdate('Project', projectId, updates);
  try { syncPermissions({ projectId }); } catch { /* non-critical */ }
  return { data: { success: true, changed: true } };
}

function manageMyTeam(body = {}) {
  const { action, member_email: email } = body;
  const me = cleanEmail(OWNER_EMAIL);
  const member = getCollection('TeamMember').find((m) => cleanEmail(m.email) === cleanEmail(email));
  if (!member) return { data: { success: false, reason: 'member_not_found' } };
  entityUpdate('TeamMember', member.id, { manager_email: action === 'add' ? me : '' });
  return { data: { success: true } };
}

function syncDirectory(body = {}) {
  // Local mode has exactly one directory: the TeamMember collection.
  const members = getCollection('TeamMember').map(({ password_hash, password_salt, ...safe }) => safe);
  if (body.action === 'preview') {
    return { data: { preview: members, added: 0, updated: 0, total: members.length } };
  }
  return { data: { success: true, added: 0, updated: 0, total: members.length } };
}

// ─────────────────────────────────────────────────────────────────────────────
// Automations. The rules are data; the engine lives in ./automationRunner.js so
// that it can be tested without a browser and moved to a server unchanged.
// ─────────────────────────────────────────────────────────────────────────────
function runAutomationRules(body = {}) {
  try {
    const summary = runAutomations(
      {
        getCollection,
        setCollection,
        createRecord: entityCreate,
        updateRecord: entityUpdate,
      },
      { manualRuleId: body.rule_id || null }
    );
    return { data: { success: true, ...summary } };
  } catch (error) {
    // A broken rule must never take the heartbeat — and with it the whole app
    // shell — down with it.
    return { data: { success: false, error: error?.message || 'הרצת האוטומציות נכשלה' } };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DEMO DATA
//
// The opening wizard offers to start from an example, so the offer has to be
// real. Records are generated from the schemas of the modules THIS build
// contains, and every one carries a flag — which is what lets the purge remove
// exactly the demo rows and never touch anything a person typed.
// ─────────────────────────────────────────────────────────────────────────────
function demoEntities() {
  return ACTIVE_MODULE_IDS.filter((id) => CRM_SCHEMAS[id]).map((id) => CRM_SCHEMAS[id].entity);
}

/**
 * Which modules an example should cover.
 *
 * The caller may say (the wizard passes the package it just chose). Otherwise
 * it is every module an administrator has left OPEN — seeding a module that was
 * switched off produces rows nobody asked for, in a screen nobody can reach.
 */
function demoModules(requested) {
  if (Array.isArray(requested) && requested.length) {
    return requested.filter((id) => ACTIVE_MODULE_IDS.includes(id) && CRM_SCHEMAS[id]);
  }
  const settings = getCollection('SystemSetting').find((s) => s.key === 'global_system_features');
  const values = settings?.value || {};
  return ACTIVE_MODULE_IDS.filter(
    (id) => CRM_SCHEMAS[id] && values[`module:${id}`] !== 'closed'
  );
}

function countDemo() {
  return demoEntities().reduce((total, entity) => total + getCollection(entity).filter(isDemoRecord).length, 0);
}

function manageMockFixtures(body = {}) {
  const { action } = body;

  if (action === 'seed') {
    // Seeding twice would double the example rather than refresh it.
    const data = demoDataFor(demoModules(body.modules), { ownerEmail: cleanEmail(OWNER_EMAIL) });
    let created = 0;
    for (const [entity, records] of Object.entries(data)) {
      if (getCollection(entity).some(isDemoRecord)) continue;
      for (const record of records) { entityCreate(entity, record); created += 1; }
    }
    return { data: { success: true, created, entities: Object.keys(data).length } };
  }

  if (action === 'purge') {
    let removed = 0;
    for (const entity of demoEntities()) {
      const rows = getCollection(entity);
      const keep = rows.filter((r) => !isDemoRecord(r));
      removed += rows.length - keep.length;
      if (keep.length !== rows.length) setCollection(entity, keep);
    }
    return { data: { success: true, removed } };
  }

  if (action === 'counts') {
    return { data: { fixtures: countDemo(), calendar_events: 0, demo_project_exists: false } };
  }

  if (action === 'list') {
    // One row per module that currently holds demo data.
    const fixtures = ACTIVE_MODULE_IDS
      .filter((id) => CRM_SCHEMAS[id])
      .map((id) => ({
        id,
        key: id,
        label: CRM_SCHEMAS[id].title,
        active: getCollection(CRM_SCHEMAS[id].entity).some(isDemoRecord),
        count: getCollection(CRM_SCHEMAS[id].entity).filter(isDemoRecord).length,
      }))
      .filter((f) => f.count > 0);
    return { data: { fixtures } };
  }

  // create / update / toggle / delete act on individual fixtures, which the
  // local generator does not have — it produces a whole example or none.
  return { data: { success: true, unsupported: action, flag: DEMO_FLAG } };
}
