import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { DistributionReferralIntakePolicyDraft } from '@shared/distributionReferralIntake';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

const RETENTION_KEYS = [
  ['abandonedIntake', 'Unsubmitted intake'],
  ['sharingPermission', 'Information sharing permission'],
  ['identityEvidence', 'Identity evidence'],
  ['activeReferral', 'Active referral'],
  ['withdrawnReferral', 'Withdrawn referral'],
  ['closedReferral', 'Closed referral'],
  ['creditAuthorization', 'Credit report authorization'],
] as const;

const RETENTION_ANCHORS = [
  ['draft_created', 'Intake draft created'],
  ['last_activity', 'Last activity'],
  ['evidence_captured', 'Evidence captured'],
  ['referral_submitted', 'Referral submitted'],
  ['referral_withdrawn', 'Referral withdrawn'],
  ['referral_closed', 'Referral closed'],
  ['authorization_captured', 'Authorization captured'],
  ['credit_report_requested', 'Credit report requested'],
] as const;

type RetentionKey = (typeof RETENTION_KEYS)[number][0];
type PolicyForm = {
  sharingVersion: string;
  sharingTitle: string;
  sharingContent: string;
  privacyVersion: string;
  privacyTitle: string;
  privacyContent: string;
  sharingPurpose: string;
  namedRecipients: string;
  signatureMethod: string;
  acceptedEvidenceTypes: string;
  allowedMimeTypes: string;
  maxFileBytes: string;
  verificationInstructions: string;
  authorizedRoles: string;
  retention: Record<RetentionKey, { days: string; startsFrom: string }>;
  workflowSteps: Array<{
    key: string;
    title: string;
    partnerInstructions: string;
    ownerRole: string;
    isBlocking: boolean | null;
  }>;
  creditReportEnabled: boolean;
  creditProviderName: string;
  creditProviderApprovalReference: string;
  creditAuthorizationVersion: string;
  creditAuthorizationTitle: string;
  creditAuthorizationContent: string;
};

function emptyRetention(): PolicyForm['retention'] {
  return Object.fromEntries(
    RETENTION_KEYS.map(([key]) => [key, { days: '', startsFrom: '' }]),
  ) as PolicyForm['retention'];
}

function emptyPolicyForm(): PolicyForm {
  return {
    sharingVersion: '',
    sharingTitle: '',
    sharingContent: '',
    privacyVersion: '',
    privacyTitle: '',
    privacyContent: '',
    sharingPurpose: '',
    namedRecipients: '',
    signatureMethod: '',
    acceptedEvidenceTypes: '',
    allowedMimeTypes: '',
    maxFileBytes: '',
    verificationInstructions: '',
    authorizedRoles: '',
    retention: emptyRetention(),
    workflowSteps: [],
    creditReportEnabled: false,
    creditProviderName: '',
    creditProviderApprovalReference: '',
    creditAuthorizationVersion: '',
    creditAuthorizationTitle: '',
    creditAuthorizationContent: '',
  };
}

function lines(value: string): string[] {
  return value
    .split('\n')
    .map(item => item.trim())
    .filter(Boolean);
}

function optionalTextFields(values: Record<string, string>) {
  return Object.fromEntries(Object.entries(values).filter(([, value]) => value.trim().length > 0));
}

function documentDraft(version: string, title: string, content: string) {
  const fields = optionalTextFields({ version, title });
  if (content.trim()) fields.content = content;
  return Object.keys(fields).length ? fields : undefined;
}

function formFromConfiguration(value?: unknown): PolicyForm {
  const form = emptyPolicyForm();
  if (!value || typeof value !== 'object' || Array.isArray(value)) return form;
  const config = value as Record<string, any>;
  const sharing = config.sharingPermissionDocument || {};
  const privacy = config.privacyNoticeDocument || {};
  const identity = config.identityEvidence || {};
  const credit = config.creditReport || {};
  const creditDocument = credit.authorizationDocument || {};
  const retention = config.retention || {};

  form.sharingVersion = sharing.version || '';
  form.sharingTitle = sharing.title || '';
  form.sharingContent = sharing.content || '';
  form.privacyVersion = privacy.version || '';
  form.privacyTitle = privacy.title || '';
  form.privacyContent = privacy.content || '';
  form.sharingPurpose = config.sharingPurpose || '';
  form.namedRecipients = Array.isArray(config.namedRecipients)
    ? config.namedRecipients
        .map(
          (recipient: any) => `${recipient.name} | ${recipient.organization} | ${recipient.role}`,
        )
        .join('\n')
    : '';
  form.signatureMethod = config.signatureMethod || '';
  form.acceptedEvidenceTypes = Array.isArray(identity.acceptedEvidenceTypes)
    ? identity.acceptedEvidenceTypes.join('\n')
    : '';
  form.allowedMimeTypes = Array.isArray(identity.allowedMimeTypes)
    ? identity.allowedMimeTypes.join('\n')
    : '';
  form.maxFileBytes = identity.maxFileBytes != null ? String(identity.maxFileBytes) : '';
  form.verificationInstructions = identity.verificationInstructions || '';
  form.authorizedRoles = Array.isArray(identity.authorizedRoles)
    ? identity.authorizedRoles.join('\n')
    : '';
  for (const [key] of RETENTION_KEYS) {
    form.retention[key] = {
      days: retention[key]?.days != null ? String(retention[key].days) : '',
      startsFrom: retention[key]?.startsFrom || '',
    };
  }
  form.workflowSteps = Array.isArray(config.workflowSteps)
    ? config.workflowSteps.map((step: any) => ({
        key: step.key || '',
        title: step.title || '',
        partnerInstructions: step.partnerInstructions || '',
        ownerRole: step.ownerRole || '',
        isBlocking: typeof step.isBlocking === 'boolean' ? step.isBlocking : null,
      }))
    : [];
  form.creditReportEnabled = Boolean(credit.enabled);
  form.creditProviderName = credit.providerName || '';
  form.creditProviderApprovalReference = credit.providerApprovalReference || '';
  form.creditAuthorizationVersion = creditDocument.version || '';
  form.creditAuthorizationTitle = creditDocument.title || '';
  form.creditAuthorizationContent = creditDocument.content || '';
  return form;
}

function draftFromForm(form: PolicyForm): DistributionReferralIntakePolicyDraft {
  const identityEvidence = optionalTextFields({
    verificationInstructions: form.verificationInstructions,
  }) as Record<string, unknown>;
  const acceptedEvidenceTypes = lines(form.acceptedEvidenceTypes);
  const allowedMimeTypes = lines(form.allowedMimeTypes);
  const authorizedRoles = lines(form.authorizedRoles);
  const maxFileBytes = Number(form.maxFileBytes);
  if (acceptedEvidenceTypes.length) identityEvidence.acceptedEvidenceTypes = acceptedEvidenceTypes;
  if (allowedMimeTypes.length) identityEvidence.allowedMimeTypes = allowedMimeTypes;
  if (authorizedRoles.length) identityEvidence.authorizedRoles = authorizedRoles;
  if (form.maxFileBytes.trim()) identityEvidence.maxFileBytes = maxFileBytes;

  const retention: Record<string, { days?: number; startsFrom?: string }> = {};
  for (const [key] of RETENTION_KEYS) {
    const rule = form.retention[key];
    const days = Number(rule.days);
    const normalized: { days?: number; startsFrom?: string } = {};
    if (rule.days.trim()) normalized.days = days;
    if (rule.startsFrom) normalized.startsFrom = rule.startsFrom;
    if (Object.keys(normalized).length) retention[key] = normalized;
  }

  const namedRecipients = lines(form.namedRecipients).map(line => {
    const [name = '', organization = '', role = ''] = line.split('|').map(value => value.trim());
    return { name, organization, role };
  });
  const workflowSteps = form.workflowSteps
    .filter(step => step.key || step.title || step.partnerInstructions || step.ownerRole)
    .map(({ isBlocking, ...step }) => ({
      ...step,
      ...(typeof isBlocking === 'boolean' ? { isBlocking } : {}),
    }));
  const creditAuthorizationDocument = documentDraft(
    form.creditAuthorizationVersion,
    form.creditAuthorizationTitle,
    form.creditAuthorizationContent,
  );

  return {
    ...(documentDraft(form.sharingVersion, form.sharingTitle, form.sharingContent)
      ? {
          sharingPermissionDocument: documentDraft(
            form.sharingVersion,
            form.sharingTitle,
            form.sharingContent,
          ),
        }
      : {}),
    ...(documentDraft(form.privacyVersion, form.privacyTitle, form.privacyContent)
      ? {
          privacyNoticeDocument: documentDraft(
            form.privacyVersion,
            form.privacyTitle,
            form.privacyContent,
          ),
        }
      : {}),
    ...(form.sharingPurpose.trim() ? { sharingPurpose: form.sharingPurpose } : {}),
    ...(namedRecipients.length ? { namedRecipients } : {}),
    ...(form.signatureMethod === 'in_app_acknowledgement'
      ? { signatureMethod: 'in_app_acknowledgement' as const }
      : {}),
    ...(Object.keys(identityEvidence).length ? { identityEvidence } : {}),
    ...(Object.keys(retention).length ? { retention } : {}),
    ...(workflowSteps.length ? { workflowSteps } : {}),
    creditReport: {
      enabled: form.creditReportEnabled,
      providerName: form.creditProviderName || null,
      providerApprovalReference: form.creditProviderApprovalReference || null,
      authorizationDocument: creditAuthorizationDocument || null,
    },
  };
}

function retentionSummary(form: PolicyForm) {
  return RETENTION_KEYS.map(([key, label]) => ({ key, label, ...form.retention[key] }));
}

export function ReferralIntakePolicyEditor({
  developmentId,
  onChanged,
}: {
  developmentId: number;
  onChanged: () => Promise<unknown> | unknown;
}) {
  const utils = trpc.useUtils();
  const policyQuery = trpc.distribution.admin.getReferralIntakePolicy.useQuery({ developmentId });
  const saveMutation = trpc.distribution.admin.saveReferralIntakePolicyDraft.useMutation();
  const publishMutation = trpc.distribution.admin.publishReferralIntakePolicy.useMutation();
  const [form, setForm] = useState(emptyPolicyForm);
  const [approvalReference, setApprovalReference] = useState('');
  const [isDirty, setIsDirty] = useState(false);

  const draftRelease = policyQuery.data?.draftRelease;
  const activeRelease = policyQuery.data?.activeRelease;

  useEffect(() => {
    setForm(formFromConfiguration(draftRelease?.configuration ?? activeRelease?.configuration));
    setApprovalReference('');
    setIsDirty(false);
  }, [draftRelease?.id, draftRelease?.updatedAt, activeRelease?.id]);

  function updateForm(update: (current: PolicyForm) => PolicyForm) {
    setForm(current => update(current));
    setIsDirty(true);
  }

  function updateRetention(key: RetentionKey, field: 'days' | 'startsFrom', value: string) {
    updateForm(current => ({
      ...current,
      retention: {
        ...current.retention,
        [key]: { ...current.retention[key], [field]: value },
      },
    }));
  }

  async function saveDraft() {
    try {
      const result = await saveMutation.mutateAsync({
        developmentId,
        ...(draftRelease
          ? {
              releaseId: draftRelease.id,
              expectedConfigurationDigest: draftRelease.configurationDigest,
            }
          : {}),
        configuration: draftFromForm(form),
      });
      toast.success(result.created ? 'Policy draft created' : 'Policy draft saved');
      await Promise.all([
        utils.distribution.admin.getReferralIntakePolicy.invalidate({ developmentId }),
        utils.distribution.admin.getProgramReadiness.invalidate({ developmentId }),
        onChanged(),
      ]);
      setIsDirty(false);
    } catch (error: any) {
      toast.error(error?.message || 'Could not save the policy draft');
    }
  }

  async function publishDraft() {
    if (!draftRelease) return;
    try {
      await publishMutation.mutateAsync({
        developmentId,
        releaseId: draftRelease.id,
        expectedConfigurationDigest: draftRelease.configurationDigest,
        approvalReference,
      });
      toast.success('Policy published. Review program readiness and explicitly enable intake when appropriate.');
      await Promise.all([
        utils.distribution.admin.getReferralIntakePolicy.invalidate({ developmentId }),
        utils.distribution.admin.getProgramReadiness.invalidate({ developmentId }),
        onChanged(),
      ]);
    } catch (error: any) {
      toast.error(error?.message || 'Could not publish this policy');
    }
  }

  const isSaving = saveMutation.isPending || publishMutation.isPending;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {activeRelease ? (
          <Badge>Published version {activeRelease.policyVersion}</Badge>
        ) : (
          <Badge variant="secondary">No published policy</Badge>
        )}
        {draftRelease ? (
          <Badge variant="outline">Draft version {draftRelease.policyVersion}</Badge>
        ) : null}
        {policyQuery.isLoading ? (
          <span className="text-xs text-slate-500">Loading policy…</span>
        ) : null}
      </div>

      <div className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
        Publishing records this program’s policy version and approval reference. It does not itself
        establish legal approval or open partner intake. Referral intake remains off until an
        administrator explicitly enables a program that passes its readiness checks.
      </div>

      {activeRelease ? (
        <p className="text-xs text-slate-600">
          Active version {activeRelease.policyVersion}
          {activeRelease.approvalReference
            ? ` · approval record ${activeRelease.approvalReference}`
            : ''}
          {activeRelease.publishedAt
            ? ` · published ${new Date(activeRelease.publishedAt).toLocaleString()}`
            : ''}
        </p>
      ) : null}

      <section className="space-y-3 rounded border p-3">
        <h4 className="font-medium">Information sharing</h4>
        <p className="text-xs text-slate-600">
          Add the exact document version partners must present before collecting prospect details.
          Keep the approved wording intact.
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-1 text-xs">
            Document version
            <Input
              value={form.sharingVersion}
              onChange={event =>
                updateForm(current => ({ ...current, sharingVersion: event.target.value }))
              }
            />
          </label>
          <label className="space-y-1 text-xs">
            Document title
            <Input
              value={form.sharingTitle}
              onChange={event =>
                updateForm(current => ({ ...current, sharingTitle: event.target.value }))
              }
            />
          </label>
        </div>
        <label className="block space-y-1 text-xs">
          Information sharing document text
          <Textarea
            rows={5}
            value={form.sharingContent}
            onChange={event =>
              updateForm(current => ({ ...current, sharingContent: event.target.value }))
            }
          />
        </label>
        <label className="block space-y-1 text-xs">
          Privacy notice version
          <Input
            value={form.privacyVersion}
            onChange={event =>
              updateForm(current => ({ ...current, privacyVersion: event.target.value }))
            }
          />
        </label>
        <label className="block space-y-1 text-xs">
          Privacy notice title
          <Input
            value={form.privacyTitle}
            onChange={event =>
              updateForm(current => ({ ...current, privacyTitle: event.target.value }))
            }
          />
        </label>
        <label className="block space-y-1 text-xs">
          Privacy notice text
          <Textarea
            rows={5}
            value={form.privacyContent}
            onChange={event =>
              updateForm(current => ({ ...current, privacyContent: event.target.value }))
            }
          />
        </label>
        <label className="block space-y-1 text-xs">
          Purpose for sharing
          <Textarea
            rows={2}
            value={form.sharingPurpose}
            onChange={event =>
              updateForm(current => ({ ...current, sharingPurpose: event.target.value }))
            }
          />
        </label>
        <label className="block space-y-1 text-xs">
          Named recipients (one per line: name | organization | role)
          <Textarea
            rows={3}
            value={form.namedRecipients}
            onChange={event =>
              updateForm(current => ({ ...current, namedRecipients: event.target.value }))
            }
          />
        </label>
        <label className="block space-y-1 text-xs">
          Partner acknowledgement method
          <Select
            value={form.signatureMethod || undefined}
            onValueChange={value =>
              updateForm(current => ({ ...current, signatureMethod: value }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose an acknowledgement method" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="in_app_acknowledgement">
                In-app acknowledgement recorded with account, time, and policy version
              </SelectItem>
            </SelectContent>
          </Select>
          <span className="block text-slate-500">
            This records the partner’s acknowledgement. It does not establish that the wording or
            method is legally sufficient.
          </span>
        </label>
      </section>

      <section className="space-y-3 rounded border p-3">
        <h4 className="font-medium">Identity evidence</h4>
        <p className="text-xs text-slate-600">
          Choose accepted evidence and who may view or verify it. ID evidence and permission to
          share are separate records.
        </p>
        <label className="block space-y-1 text-xs">
          Accepted evidence types (one per line)
          <Textarea
            rows={3}
            value={form.acceptedEvidenceTypes}
            onChange={event =>
              updateForm(current => ({ ...current, acceptedEvidenceTypes: event.target.value }))
            }
          />
        </label>
        <label className="block space-y-1 text-xs">
          Allowed file types (one per line)
          <Textarea
            rows={2}
            placeholder={'application/pdf\nimage/jpeg'}
            value={form.allowedMimeTypes}
            onChange={event =>
              updateForm(current => ({ ...current, allowedMimeTypes: event.target.value }))
            }
          />
          <span className="block text-slate-500">Supported formats: PDF, JPEG, PNG, and WebP.</span>
        </label>
        <label className="block space-y-1 text-xs">
          Maximum file size in bytes
          <Input
            type="number"
            min="1"
            step="1"
            value={form.maxFileBytes}
            onChange={event =>
              updateForm(current => ({ ...current, maxFileBytes: event.target.value }))
            }
          />
        </label>
        <label className="block space-y-1 text-xs">
          Verification instructions
          <Textarea
            rows={3}
            value={form.verificationInstructions}
            onChange={event =>
              updateForm(current => ({ ...current, verificationInstructions: event.target.value }))
            }
          />
        </label>
        <label className="block space-y-1 text-xs">
          Account roles allowed to review evidence (use role codes, one per line)
          <Textarea
            rows={2}
            placeholder={'property_developer\nsuper_admin'}
            value={form.authorizedRoles}
            onChange={event =>
              updateForm(current => ({ ...current, authorizedRoles: event.target.value }))
            }
          />
          <span className="block text-slate-500">
            Review access also requires an active Distribution manager identity and assignment to
            this development.
          </span>
        </label>
      </section>

      <section className="space-y-3 rounded border p-3">
        <h4 className="font-medium">Retention schedule</h4>
        <p className="text-xs text-slate-600">
          Set a duration and starting event for each record type. The system does not choose
          defaults.
        </p>
        {retentionSummary(form).map(rule => (
          <div key={rule.key} className="grid items-end gap-2 md:grid-cols-[1.2fr_1fr_1.5fr]">
            <span className="text-xs font-medium">{rule.label}</span>
            <label className="space-y-1 text-xs">
              Days
              <Input
                type="number"
                min="1"
                value={rule.days}
                onChange={event => updateRetention(rule.key, 'days', event.target.value)}
              />
            </label>
            <label className="space-y-1 text-xs">
              Retention starts from
              <Select
                value={rule.startsFrom || undefined}
                onValueChange={value => updateRetention(rule.key, 'startsFrom', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a starting event" />
                </SelectTrigger>
                <SelectContent>
                  {RETENTION_ANCHORS.map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
          </div>
        ))}
      </section>

      <section className="space-y-3 rounded border p-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h4 className="font-medium">Credit report authorization</h4>
            <p className="text-xs text-slate-600">
              This stores program requirements only. No credit report is requested by this setting.
            </p>
          </div>
          <Switch
            checked={form.creditReportEnabled}
            onCheckedChange={checked =>
              updateForm(current => ({ ...current, creditReportEnabled: checked }))
            }
          />
        </div>
        {form.creditReportEnabled ? (
          <div className="space-y-3">
            <label className="block space-y-1 text-xs">
              Approved provider name
              <Input
                value={form.creditProviderName}
                onChange={event =>
                  updateForm(current => ({ ...current, creditProviderName: event.target.value }))
                }
              />
            </label>
            <label className="block space-y-1 text-xs">
              Provider approval reference
              <Input
                value={form.creditProviderApprovalReference}
                onChange={event =>
                  updateForm(current => ({
                    ...current,
                    creditProviderApprovalReference: event.target.value,
                  }))
                }
              />
            </label>
            <label className="block space-y-1 text-xs">
              Separate credit authorization version
              <Input
                value={form.creditAuthorizationVersion}
                onChange={event =>
                  updateForm(current => ({
                    ...current,
                    creditAuthorizationVersion: event.target.value,
                  }))
                }
              />
            </label>
            <label className="block space-y-1 text-xs">
              Separate credit authorization title
              <Input
                value={form.creditAuthorizationTitle}
                onChange={event =>
                  updateForm(current => ({
                    ...current,
                    creditAuthorizationTitle: event.target.value,
                  }))
                }
              />
            </label>
            <label className="block space-y-1 text-xs">
              Separate credit authorization text
              <Textarea
                rows={4}
                value={form.creditAuthorizationContent}
                onChange={event =>
                  updateForm(current => ({
                    ...current,
                    creditAuthorizationContent: event.target.value,
                  }))
                }
              />
            </label>
          </div>
        ) : null}
      </section>

      <section className="space-y-3 rounded border p-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h4 className="font-medium">Guided process</h4>
            <p className="text-xs text-slate-600">
              Describe what the referrer does and who owns each next step.
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              updateForm(current => ({
                ...current,
                workflowSteps: [
                  ...current.workflowSteps,
                  { key: '', title: '', partnerInstructions: '', ownerRole: '', isBlocking: null },
                ],
              }))
            }
          >
            <Plus className="mr-1 h-4 w-4" />
            Add step
          </Button>
        </div>
        {form.workflowSteps.map((step, index) => (
          <div key={`${index}-${step.key}`} className="space-y-2 rounded border bg-slate-50 p-3">
            <div className="grid gap-2 md:grid-cols-2">
              <label className="space-y-1 text-xs">
                Step key
                <Input
                  value={step.key}
                  onChange={event =>
                    updateForm(current => ({
                      ...current,
                      workflowSteps: current.workflowSteps.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, key: event.target.value } : item,
                      ),
                    }))
                  }
                />
              </label>
              <label className="space-y-1 text-xs">
                Step title
                <Input
                  value={step.title}
                  onChange={event =>
                    updateForm(current => ({
                      ...current,
                      workflowSteps: current.workflowSteps.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, title: event.target.value } : item,
                      ),
                    }))
                  }
                />
              </label>
            </div>
            <label className="block space-y-1 text-xs">
              Partner instructions
              <Textarea
                rows={2}
                value={step.partnerInstructions}
                onChange={event =>
                  updateForm(current => ({
                    ...current,
                    workflowSteps: current.workflowSteps.map((item, itemIndex) =>
                      itemIndex === index
                        ? { ...item, partnerInstructions: event.target.value }
                        : item,
                    ),
                  }))
                }
              />
            </label>
            <div className="flex items-end gap-2">
              <label className="flex-1 space-y-1 text-xs">
                Step owner role
                <Input
                  value={step.ownerRole}
                  onChange={event =>
                    updateForm(current => ({
                      ...current,
                      workflowSteps: current.workflowSteps.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, ownerRole: event.target.value } : item,
                      ),
                    }))
                  }
                />
              </label>
              <label className="space-y-1 text-xs">
                Does this step block progress?
                <Select
                  value={step.isBlocking === null ? undefined : step.isBlocking ? 'yes' : 'no'}
                  onValueChange={value =>
                    updateForm(current => ({
                      ...current,
                      workflowSteps: current.workflowSteps.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, isBlocking: value === 'yes' } : item,
                      ),
                    }))
                  }
                >
                  <SelectTrigger className="w-[190px]">
                    <SelectValue placeholder="Choose one" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Yes, it blocks progress</SelectItem>
                    <SelectItem value="no">No, it is guidance</SelectItem>
                  </SelectContent>
                </Select>
              </label>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                aria-label="Remove process step"
                onClick={() =>
                  updateForm(current => ({
                    ...current,
                    workflowSteps: current.workflowSteps.filter(
                      (_, itemIndex) => itemIndex !== index,
                    ),
                  }))
                }
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </section>

      <div className="space-y-2 border-t pt-4">
        <Button onClick={saveDraft} disabled={isSaving || policyQuery.isLoading}>
          {saveMutation.isPending ? 'Saving draft…' : 'Save policy draft'}
        </Button>
        {draftRelease ? (
          <div className="flex flex-col gap-2 rounded border border-slate-200 p-3 md:flex-row md:items-end">
            <label className="flex-1 space-y-1 text-xs">
              Approval record reference
              <Input
                value={approvalReference}
                onChange={event => setApprovalReference(event.target.value)}
                placeholder="Enter the approval record identifier"
              />
            </label>
            <Button
              onClick={publishDraft}
              disabled={isSaving || isDirty || approvalReference.trim().length < 2}
            >
              {publishMutation.isPending ? 'Publishing…' : 'Publish policy version'}
            </Button>
          </div>
        ) : null}
        {isDirty ? (
          <p className="text-xs text-amber-800">Save the draft before publishing these changes.</p>
        ) : null}
        {activeRelease?.configuration ? (
          <p className="text-xs text-slate-500">
            Published record fingerprint: {activeRelease.configurationDigest}
          </p>
        ) : null}
      </div>
    </div>
  );
}
