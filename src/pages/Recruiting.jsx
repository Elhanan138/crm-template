import React from 'react';
import CrmModulePage from '@/components/crm/CrmModulePage';
import BoardView from '@/components/crm/BoardView';
import { CRM_SCHEMAS } from '@/lib/crm/schemas';

const schema = CRM_SCHEMAS.recruiting;

export default function Recruiting() {
  return (
    <CrmModulePage
      schema={schema}
      renderAbove={({ records, openRecord }) => (
        <BoardView
          schema={schema}
          records={records}
          openRecord={openRecord}
          subtitleOf={(c) => c.position}
        />
      )}
    />
  );
}
