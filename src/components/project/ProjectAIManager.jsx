import React from 'react';
import { Sparkles } from 'lucide-react';
import SectionCard from '@/components/shared/SectionCard';
import DocumentStatusSection from './ai/DocumentStatusSection';
import QAManagementSection from './ai/QAManagementSection';
import TestQuestionSection from './ai/TestQuestionSection';

export default function ProjectAIManager({ projectId }) {
  return (
    <SectionCard title="ניהול AI" icon={Sparkles}>
      <div className="space-y-5">
        {/* Section 1: Document status */}
        <DocumentStatusSection projectId={projectId} />

        {/* Divider */}
        <div className="border-t border-border" />

        {/* Section 2: Q&A management */}
        <QAManagementSection projectId={projectId} />

        {/* Divider */}
        <div className="border-t border-border" />

        {/* Section 3: Test question */}
        <TestQuestionSection projectId={projectId} />
      </div>
    </SectionCard>
  );
}