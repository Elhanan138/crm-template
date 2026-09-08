import React from 'react';
import ProposalsView from '@/components/proposals/ProposalsView';

// Thin page wrapper. All logic lives in the module component so that other
// modules (e.g. the project Finance tab) can reuse it without importing a page.
export default function Proposals(props) {
  return <ProposalsView {...props} />;
}
