import React, { useState, useRef } from 'react';
import { api } from '@/api/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/AuthContext';
import BackButton from '@/components/shared/BackButton';
import { useSelectablePeople } from '@/hooks/useSelectablePeople';
import Step1General from './wizard/Step1General';
import { getProjectPath } from '@/lib/projectSlug';
import { normalizeHoursOnSave } from '@/lib/pricingModel';
import { sortFields, validateCustomFields } from '@/lib/customFields';

export default function ProjectWizard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // Arriving from a won lead: the deal's details seed the wizard instead of
  // being retyped, and the lead is closed out once the project exists.
  const fromLeadId = searchParams.get('lead_id') || '';
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const people = useSelectablePeople();
  const { data: allCustomFields = [] } = useQuery({
    queryKey: ['custom-fields'],
    queryFn: () => api.entities.CustomField.list(),
    staleTime: 60000,
  });
  const customFields = sortFields(allCustomFields.filter((f) => f.entity === 'Project'));

  const [uploadingImage, setUploadingImage] = useState(false);
  const submittingRef = useRef(false);

  const [form, setForm] = useState({
    client_name: searchParams.get('client_name') || '',
    image_url: '',
    contract_value: searchParams.get('contract_value') || '',
    pricing_model: '',
    project_manager: '',
    current_liaison: '',
    external_consultants: '',
    has_setup: false,
    setup_details: '',
    pilot_date: '',
    licensing_start_date: '',
    kickoff_date: '',
    go_live_date: '',
    go_live_notes: '',
    frozen_until: '',
    frozen_notes: '',
    licensing_reminder_date: '',
    licensing_duration: '',
    licensing_duration_unit: 'months',
    training_hours_purchased: '',
    dev_hours_purchased: '',
    conversion_hours_purchased: '',
    hours_alert_threshold: '5',
    document_url: '',
    client_highlights: [],
    playbook_template_id: '',
    custom_fields: {},
  });

  const updateField = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const { file_url } = await api.integrations.Core.UploadFile({ file });
      updateField('image_url', file_url);
    } catch (err) {
      toast.error(err?.message || 'העלאת התמונה נכשלה');
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  };

  const createProjectMutation = useMutation({
    mutationFn: async (data) => {
      const { data: result } = await api.functions.invoke('manageProject', {
        action: 'create',
        project_data: {
          client_name: data.client_name,
          image_url: data.image_url || null,
          contract_value: data.contract_value ? Number(data.contract_value) : null,
          pricing_model: data.pricing_model || '',
          project_manager: data.project_manager || '',
          current_liaison: data.current_liaison || '',
          external_consultants: data.external_consultants || '',
          has_setup: data.has_setup || false,
          setup_details: data.setup_details || '',
          pilot_date: data.pilot_date || '',
          licensing_start_date: data.licensing_start_date || null,
          kickoff_date: data.kickoff_date || null,
          go_live_date: data.go_live_date || null,
          go_live_notes: data.go_live_notes || '',
          frozen_until: data.frozen_until || null,
          frozen_notes: data.frozen_notes || '',
          licensing_reminder_date: data.licensing_reminder_date || null,
          document_url: data.document_url || null,
          training_hours_purchased: normalizeHoursOnSave(data.pricing_model, data.training_hours_purchased),
          dev_hours_purchased: data.dev_hours_purchased ? Number(data.dev_hours_purchased) : 0,
          conversion_hours_purchased: data.conversion_hours_purchased ? Number(data.conversion_hours_purchased) : 0,
          hours_alert_threshold: data.hours_alert_threshold ? Number(data.hours_alert_threshold) : 5,
          licensing_duration: data.licensing_duration ? Number(data.licensing_duration) : null,
          licensing_duration_unit: data.licensing_duration_unit || 'months',
          custom_fields: data.custom_fields || {},
        },
        ...(data.client_highlights?.length > 0 ? { client_highlights: data.client_highlights } : {}),
        playbook_template_id: data.playbook_template_id && data.playbook_template_id !== 'none' ? data.playbook_template_id : undefined,
      });
      // The backend must return an id. Anything else means nothing was created —
      // never report success on an empty payload.
      if (!result?.project_id) {
        throw new Error('השרת לא החזיר מזהה פרויקט — הפרויקט לא נוצר');
      }
      return result;
    },
    onSuccess: async (result) => {
      submittingRef.current = false;
      // Close the loop on the originating lead. Failing to update it must not
      // fail the project that was already created — it is reported, not thrown.
      if (fromLeadId) {
        try {
          await api.entities.Lead.update(fromLeadId, { stage: 'won', converted_project_id: result.project_id });
          queryClient.invalidateQueries({ queryKey: ['crm', 'Lead'] });
        } catch {
          toast.warning('הפרויקט נוצר, אך עדכון הליד נכשל');
        }
      }
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['projectsCreatorMeta'] });
      queryClient.invalidateQueries({ queryKey: ['projectPermissions'] });
      toast.success('הפרויקט נוצר בהצלחה');
      navigate(getProjectPath({ id: result.project_id, slug: result.slug, client_name: result.project_name }));
    },
    onError: (error) => {
      submittingRef.current = false;
      console.error('Project creation error:', error);
      const msg = error?.response?.data?.error || error?.message || '';
      toast.error(msg ? `שגיאה ביצירת הפרויקט: ${msg}` : 'שגיאה ביצירת הפרויקט');
    },
  });

  const addClientHighlight = () => setForm(prev => ({ ...prev, client_highlights: [...prev.client_highlights, { category: 'other', title: '', content: '' }] }));
  const updateClientHighlight = (index, field, value) => setForm(prev => ({ ...prev, client_highlights: prev.client_highlights.map((h, i) => i === index ? { ...h, [field]: value } : h) }));
  const removeClientHighlight = (index) => setForm(prev => ({ ...prev, client_highlights: prev.client_highlights.filter((_, i) => i !== index) }));

  const doCreate = () => {
    if (submittingRef.current) return;
    if (!form.client_name.trim()) { toast.error('שם הלקוח הוא שדה חובה'); return; }
    const missing = validateCustomFields(customFields, form.custom_fields || {});
    if (missing.length) { toast.error(`שדות חובה חסרים: ${missing.join(', ')}`); return; }
    if (form.contract_value && Number.isNaN(Number(form.contract_value))) {
      toast.error('ערך החוזה חייב להיות מספר'); return;
    }
    submittingRef.current = true;
    createProjectMutation.mutate({ ...form });
  };

  return (
    <div dir="rtl" className="max-w-3xl mx-auto">
      {/* Sticky save bar */}
      <div className="sticky top-0 z-30 -mx-4 px-4 py-2.5 mb-3 bg-background/90 backdrop-blur-sm border-b border-border flex items-center justify-between gap-3">
        <BackButton />
        <Button
          type="button"
          onClick={doCreate}
          disabled={createProjectMutation.isPending || !form.client_name.trim()}
          className="bg-gradient-to-l from-primary to-success hover:opacity-90 text-primary-foreground rounded-full h-10 px-7 text-sm font-bold shadow-md gap-2"
        >
          {createProjectMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          שמור וצור פרויקט
        </Button>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); doCreate(); }} className="space-y-4">
        <Step1General form={form} updateField={updateField} people={people} uploadingImage={uploadingImage} handleImageUpload={handleImageUpload} customFields={customFields} />
      </form>
    </div>
  );
}