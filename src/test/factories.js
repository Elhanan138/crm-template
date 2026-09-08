// Test factories — each returns a record matching its entity schema.
// Pass a partial overrides object to customize any field.

export function makeProject(overrides = {}) {
  return {
    name: 'Test Project',
    client_name: 'Test Client',
    image_url: '',
    contract_value: 100000,
    order: 0,
    document_url: '',
    document_contexts: {},
    pricing_model: 'fix_price',
    project_manager: 'Test Manager',
    current_liaison: 'Test Liaison',
    external_consultants: '',
    has_setup: false,
    setup_details: '',
    tags: [],
    pilot_date: '',
    licensing_start_date: '',
    kickoff_date: '',
    go_live_date: '',
    go_live_notes: '',
    frozen_until: '',
    frozen_notes: '',
    licensing_reminder_date: '',
    licensing_duration: 12,
    licensing_duration_unit: 'months',
    training_hours_purchased: 0,
    dev_hours_purchased: 0,
    dev_hours_used: 0,
    conversion_hours_purchased: 0,
    conversion_hours_used: 0,
    hours_alert_threshold: 0,
    hours_alert_sent: {},
    predefined_questions: '',
    playbook_template_id: '',
    hidden_tabs: [],
    member_emails: ['test@blossom-kc.com'],
    editor_emails: ['test@blossom-kc.com'],
    ...overrides,
  }
}

export function makeTask(overrides = {}) {
  return {
    project_id: 'proj-1',
    title: 'Test Task',
    description: 'A test task',
    checklist: [],
    assigned_to: 'Test User',
    due_date: '',
    priority: 'medium',
    status: 'open',
    show_in_gantt: false,
    order: 0,
    member_emails: ['test@blossom-kc.com'],
    editor_emails: ['test@blossom-kc.com'],
    ...overrides,
  }
}

export function makeMilestone(overrides = {}) {
  return {
    project_id: 'proj-1',
    name: 'Test Milestone',
    description: 'A test milestone',
    assigned_to: 'Test User',
    target_date: '',
    billing_amount: 0,
    status: 'not_started',
    depends_on: '',
    order: 0,
    member_emails: ['test@blossom-kc.com'],
    editor_emails: ['test@blossom-kc.com'],
    ...overrides,
  }
}

export function makeTicket(overrides = {}) {
  return {
    submitted_by: 'Test User',
    submitted_by_email: 'test@blossom-kc.com',
    type: 'bug',
    title: 'Test Ticket',
    description: 'A test support ticket',
    image_urls: [],
    status: 'open',
    priority: 'medium',
    dev_summary: '',
    resolution_note: '',
    internal: false,
    project_id: '',
    ...overrides,
  }
}

export function makeTeamMember(overrides = {}) {
  return {
    name: 'Test Member',
    email: 'test@blossom-kc.com',
    role: 'Developer',
    is_admin: false,
    manager_email: '',
    ...overrides,
  }
}

export function makeNotification(overrides = {}) {
  return {
    recipient_email: 'test@blossom-kc.com',
    message: 'Test notification',
    project_id: '',
    milestone_id: '',
    ticket_id: '',
    task_id: '',
    form_template_id: '',
    is_read: false,
    type: 'mention',
    delivery_status: 'sent',
    sent_at: new Date().toISOString(),
    triggered_by_scan_at: '',
    ...overrides,
  }
}