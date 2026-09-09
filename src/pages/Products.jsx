import React from 'react';
import CrmModulePage from '@/components/crm/CrmModulePage';
import { CRM_SCHEMAS } from '@/lib/crm/schemas';

export default function Products() {
  return <CrmModulePage schema={CRM_SCHEMAS.products} moduleId="products" />;
}
