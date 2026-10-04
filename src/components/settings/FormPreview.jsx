import React from 'react';
import { CRM_SCHEMAS } from '@/lib/crm/schemas';
import CrmFormFields from '@/components/crm/CrmFormFields';
import TaskFormFields from '@/components/tasks/TaskFormFields';
import SupportFormFields from '@/components/support/SupportFormFields';
import ProjectFormFields from '@/components/project/wizard/ProjectFormFields';
import { lineSourceFor } from '@/lib/crm/lineItems';

// ─────────────────────────────────────────────────────────────────────────────
// FORM PREVIEW
//
// The preview renders THE REAL FORM — the same components the record sheet and
// the task, support and project forms render, with the same controls and the
// same layout. Not a drawing of a form: the form.
//
// That is the only way "what will this look like" can be answered honestly. A
// preview built out of look-alike boxes is correct on the day it is written and
// wrong the first time either side changes.
//
// It is fed an empty record and setters that do nothing, so nothing typed here
// can go anywhere. `wrap` comes from the editor above and puts a grip and a
// drop target around each field.
// ─────────────────────────────────────────────────────────────────────────────

const noop = () => {};

const schemaFor = (entity) => Object.values(CRM_SCHEMAS).find((s) => s.entity === entity);

/** A blank record, with the defaults a real new record would open with. */
const blankRecord = (entity) => {
  const schema = schemaFor(entity);
  if (!schema) return { custom_fields: {} };
  return {
    custom_fields: {},
    ...Object.fromEntries(
      schema.fields.filter((f) => f.default !== undefined).map((f) => [f.key, f.default]),
    ),
  };
};

export default function FormPreview({ entity, layout, customFields, wrap }) {
  const schema = schemaFor(entity);

  if (schema) {
    return (
      <CrmFormFields
        schema={schema}
        layout={layout}
        form={blankRecord(entity)}
        set={noop}
        relations={{}}
        lineSource={lineSourceFor(
          Object.keys(CRM_SCHEMAS).find((id) => CRM_SCHEMAS[id].entity === entity),
        )}
        wrap={wrap}
      />
    );
  }

  if (entity === 'Task') {
    return (
      <TaskFormFields
        form={{ custom_fields: {}, priority: 'medium', status: 'not_started' }}
        set={noop}
        layout={layout}
        customFields={customFields}
        // Both branches shown: the preview is about the shape of the form, and
        // a block hidden behind "only when editing" is still part of it.
        isEditing
        projectId={null}
        allProjects={[]}
        teamMembers={[]}
        wrap={wrap}
      />
    );
  }

  if (entity === 'SupportTicket') {
    return (
      <SupportFormFields
        form={{ custom_fields: {}, priority: 'medium', title: '', description: '', image_urls: [] }}
        setForm={noop}
        layout={layout}
        customFields={customFields}
        uploading={false}
        handlePaste={noop}
        handleImageUpload={noop}
        removeImage={noop}
        wrap={wrap}
      />
    );
  }

  if (entity === 'Project') {
    return (
      <ProjectFormFields
        form={{ custom_fields: {}, client_name: '', contract_value: '' }}
        updateField={noop}
        layout={layout}
        customFields={customFields}
        uploadingImage={false}
        handleImageUpload={noop}
        wrap={wrap}
      />
    );
  }

  return null;
}
