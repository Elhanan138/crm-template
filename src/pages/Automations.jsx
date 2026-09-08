import React from 'react';
import CrmModulePage from '@/components/crm/CrmModulePage';
import AutomationBuilder from '@/components/crm/AutomationBuilder';
import { CRM_SCHEMAS } from '@/lib/crm/schemas';

export default function Automations() {
  // Rules need a trigger/condition/action builder, not a flat field form.
  return <CrmModulePage schema={CRM_SCHEMAS.automations} moduleId="automations" EditorComponent={AutomationBuilder} />;
}
