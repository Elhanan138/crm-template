import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import ClientHighlightsSection from './ClientHighlightsSection';
import KpiCard from '@/components/shared/KpiCard';
import { KPI_ICONS, formatKpi } from '@/lib/kpi';
import { isFixedPrice } from '@/lib/pricingModel';

export default function OverviewTab({ project, tasks, canEditCustom = false, onNavigate }) {
  const openTasks = tasks.filter(t => t.status !== 'done').length;
  const urgentTasks = tasks.filter(t => t.priority === 'urgent' && t.status !== 'done').length;

  // The hours field was removed from the task form, so nothing books hours any
  // more. A "hours used" KPI would read zero for ever, which is worse than not
  // asking the question: the hours bank is stated on the project itself.
  const purchasedHours = project.training_hours_purchased || 0;

  const { data: projectStages = [] } = useQuery({
    queryKey: ['project-stages-overview', project.id],
    queryFn: () => api.entities.ProjectStage.filter({ project_id: project.id }, 'order'),
    enabled: !!project.id,
  });
  const { data: projectChecklistItems = [] } = useQuery({
    queryKey: ['project-checklist-items-overview', project.id],
    queryFn: () => api.entities.ProjectChecklistItem.filter({ project_id: project.id }),
    enabled: !!project.id,
  });
  const currentStage = projectStages.find(s => s.status === 'active');
  const stageItems = projectChecklistItems.filter(i => i.stage_id === currentStage?.id);
  const stageDoneCount = stageItems.filter(i => i.status === 'done').length;
  const stageEffectiveTotal = stageItems.filter(i => i.status !== 'skipped').length;
  const stagePercentage = stageEffectiveTotal > 0 ? Math.round((stageDoneCount / stageEffectiveTotal) * 100) : 0;

  // Overall project life progress across all stages (skipped items excluded)
  const allDoneCount = projectChecklistItems.filter(i => i.status === 'done').length;
  const allEffectiveTotal = projectChecklistItems.filter(i => i.status !== 'skipped').length;
  const overallPercentage = allEffectiveTotal > 0 ? Math.round((allDoneCount / allEffectiveTotal) * 100) : 0;
  const completedStages = projectStages.filter(s => s.status === 'completed').length;

  return (
    <div className="space-y-4">
      {/* Compact KPI strip - clickable BI-style */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          label="חיי פרויקט"
          value={projectStages.length > 0 ? formatKpi(overallPercentage, 'percent') : '—'}
          sub={currentStage ? `${currentStage.name} · ${completedStages}/${projectStages.length} שלבים` : (projectStages.length > 0 ? `${completedStages}/${projectStages.length} שלבים · אין שלב פעיל` : 'לא הוחלו חיי פרויקט')}
          icon={KPI_ICONS.project_life}
          tone="primary"
          density="compact"
          progress={projectStages.length > 0 ? overallPercentage : 0}
          onClick={() => onNavigate('project-life')}
        />
        <KpiCard
          label="משימות פתוחות"
          value={formatKpi(openTasks, 'count')}
          sub={urgentTasks > 0 ? `${urgentTasks} דחופות` : undefined}
          icon={KPI_ICONS.tasks}
          tone={urgentTasks > 0 ? 'destructive' : 'neutral'}
          density="compact"
          onClick={() => onNavigate('tasks')}
        />
        {purchasedHours > 0 && !isFixedPrice(project.pricing_model) && (
          <KpiCard
            label="שעות הדרכה שנרכשו"
            value={formatKpi(purchasedHours, 'count')}
            icon={KPI_ICONS.hours}
            tone="neutral"
            density="compact"
          />
        )}
        <KpiCard
          label="שלב נוכחי"
          value={currentStage ? formatKpi(stagePercentage, 'percent') : '—'}
          sub={currentStage ? `${stageDoneCount}/${stageEffectiveTotal} פעולות` : 'אין שלב פעיל'}
          icon={KPI_ICONS.project_life}
          tone="neutral"
          density="compact"
          progress={stagePercentage}
          onClick={() => onNavigate('project-life')}
        />
      </div>

      {/* Client info — highlights timeline */}
      <ClientHighlightsSection projectId={project.id} memberEmails={project.member_emails || []} />
    </div>
  );
}
