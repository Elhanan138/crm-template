import React from 'react';
import CrmModulePage from '@/components/crm/CrmModulePage';
import { CRM_SCHEMAS, stageMeta } from '@/lib/crm/schemas';

// The pipeline board, the stage totals and the list/board switch are no longer
// written here: every module whose status field carries tones gets them from
// CrmModulePage. Leads is not a special case, it was just the first one.
export default function Leads() {
  return <CrmModulePage schema={CRM_SCHEMAS.leads} moduleId="leads" />;
}

export { stageMeta };
