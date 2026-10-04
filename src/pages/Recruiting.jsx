import React from 'react';
import CrmModulePage from '@/components/crm/CrmModulePage';
import { CRM_SCHEMAS } from '@/lib/crm/schemas';

// `boardField`/`boardStages` on the schema still win over the derived board, so
// candidates keep their own stage order.
export default function Recruiting() {
  return <CrmModulePage schema={CRM_SCHEMAS.recruiting} moduleId="recruiting" />;
}
