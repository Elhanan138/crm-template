import React from 'react';
import CrmModulePage from '@/components/crm/CrmModulePage';
import { CRM_SCHEMAS } from '@/lib/crm/schemas';

export default function Maintenance() {
  return <CrmModulePage schema={CRM_SCHEMAS.maintenance} moduleId="maintenance" />;
}
