import React from 'react';
import OutlookCalendarCard from './OutlookCalendarCard';
import TeamsConnectionCard from './TeamsConnectionCard';

export default function IntegrationsTab() {
  return (
    <div className="space-y-4">
      <OutlookCalendarCard />
      <TeamsConnectionCard />
    </div>
  );
}