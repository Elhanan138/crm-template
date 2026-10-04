import React from 'react';
import CrmModulePage from '@/components/crm/CrmModulePage';
import { CRM_SCHEMAS } from '@/lib/crm/schemas';

export default function Compliance() {
  return <CrmModulePage schema={CRM_SCHEMAS.compliance} moduleId="compliance" />;
}
