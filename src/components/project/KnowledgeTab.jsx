import React from 'react';
import ProjectDocuments from './ProjectDocuments';
import ProjectAIManager from './ProjectAIManager';

export default function KnowledgeTab({ project }) {
  return (
    <div className="space-y-4">
      <ProjectDocuments project={project} />
      <ProjectAIManager projectId={project.id} />
    </div>
  );
}