import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import ClientHighlightsSection from './ClientHighlightsSection';
import KpiCard from '@/components/shared/KpiCard';
import { KPI_ICONS, formatKpi, resolveTone } from '@/lib/kpi';
import { isFixedPrice } from '@/lib/pricingModel';

export default function OverviewTab({ project, meetings, tasks, canEditCustom = false, onNavigate }) {
  const openTasks = tasks.filter(t => t.status !== 'done').length;
  const urgentTasks = tasks.filter(t => t.priority === 'urgent' && t.status !== 'done').length;

  const effectiveHours = (m) => {
    if (m.effective_hours != null) return m.effective_hours;
    const dur = m.duration_hours || 0;
    const count = (m.implementers && m.implementers.length) ? m.implementers.length : 1;
    return dur * count;
  };
  const purchasedHours = project.training_hours_purchased || 0;
  const usedHours = meetings.reduce((s, m) => s + effectiveHours(m), 0);
  const remainingHours = purchasedHours - usedHours;

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
        {purchasedHours > 0 && !isFixedPrice(project.pricing_model) ? (
          <KpiCard
            label="מאזן שעות הדרכה"
            value={formatKpi([usedHours, purchasedHours], 'ratio')}
            sub={remainingHours < purchasedHours * 0.2 ? 'נגמר בקרוב' : `נותרו ${Math.max(0, remainingHours).toFixed(1)} שע׳`}
            icon={KPI_ICONS.hours}
            tone={resolveTone({ metric: 'hours', value: purchasedHours > 0 ? (usedHours / purchasedHours) * 100 : 0, threshold: { warning: 80, destructive: 90 } })}
            density="compact"
            onClick={() => onNavigate('meetings')}
          />
        ) : (
          <KpiCard
            label="פגישות תועדו"
            value={formatKpi(meetings.length, 'count')}
            icon={KPI_ICONS.meetings}
            tone="neutral"
            density="compact"
            onClick={() => onNavigate('meetings')}
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
