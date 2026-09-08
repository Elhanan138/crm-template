import React from 'react';
import CrmModulePage from '@/components/crm/CrmModulePage';
import { CRM_SCHEMAS } from '@/lib/crm/schemas';

export default function Training() {
  return <CrmModulePage schema={CRM_SCHEMAS.training} moduleId="training" />;
}
