import React from 'react';
import CrmModulePage from '@/components/crm/CrmModulePage';
import { CRM_SCHEMAS } from '@/lib/crm/schemas';

export default function Assets() {
  return <CrmModulePage schema={CRM_SCHEMAS.assets} moduleId="assets" />;
}
