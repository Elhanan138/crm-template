import React from 'react';
import { SectionIcon } from '@radix-ui/react-icons';
import PageHeader from '@/components/shared/PageHeader';
import NotionTab from '@/components/project/NotionTab';

export default function Notes() {
  return (
    <div dir="rtl">
      <PageHeader
        icon={SectionIcon}
        title="פתקים"
        subtitle="ניהול פתקים גלובלי — ניתן לקשר פתקים לפרויקטים"
      />
      <NotionTab />
    </div>
  );
}
