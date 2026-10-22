import { and, eq } from 'drizzle-orm';
import { developmentRequiredDocuments } from '../../drizzle/schema';
import { getDb } from '../db';
import { getPartnerReferralIntakeRequirements } from './distributionReferralIntakeWorkflowService';

type DbExecutor = any;

export type ProspectDocumentCategory =
  | 'consent'
  | 'privacy_notice'
  | 'information_sheet'
  | 'other';

export type ProspectDocumentDownload = {
  key: string;
  label: string;
  url: string;
  instructions: string | null;
  category: ProspectDocumentCategory;
  developmentId: number;
};

export type ProspectDocumentUpload = {
  evidenceType: 'sharing_permission' | 'privacy_notice' | 'identity_document';
  label: string;
  instructions: string | null;
};

export type ProspectDocumentPack = {
  developmentId: number;
  downloads: ProspectDocumentDownload[];
  uploads: ProspectDocumentUpload[];
  signatureMethod: string | null;
};

/**
 * The referrer needs the prospect documents before they can be signed and
 * returned: the information sheet the prospect completes, the permission to
 * share their details, and the privacy notice they must have seen. The
 * downloadable copies come from the canonical per-development sources: the
 * published intake policy and the development's required-document templates.
 * Nothing here invents a document or a URL.
 */
export async function getProspectDocumentPacks(input: {
  developmentIds: number[];
  db?: DbExecutor;
}): Promise<ProspectDocumentPack[]> {
  const db = (input.db as DbExecutor) || (await getDb());
  if (!db) throw new Error('Database not available');

  const developmentIds = Array.from(
    new Set(input.developmentIds.map(Number).filter(id => Number.isSafeInteger(id) && id > 0)),
  );
  if (!developmentIds.length) return [];

  const packs: ProspectDocumentPack[] = [];
  for (const developmentId of developmentIds) {
    const requirements = await getPartnerReferralIntakeRequirements({ developmentId, db });
    const templates = await db
      .select({
        id: developmentRequiredDocuments.id,
        documentLabel: developmentRequiredDocuments.documentLabel,
        documentCode: developmentRequiredDocuments.documentCode,
        templateFileUrl: developmentRequiredDocuments.templateFileUrl,
        templateFileName: developmentRequiredDocuments.templateFileName,
        isRequired: developmentRequiredDocuments.isRequired,
        isActive: developmentRequiredDocuments.isActive,
        sortOrder: developmentRequiredDocuments.sortOrder,
      })
      .from(developmentRequiredDocuments)
      .where(
        and(
          eq(developmentRequiredDocuments.developmentId, developmentId),
          eq(developmentRequiredDocuments.isActive, 1),
        ),
      );

    const downloads: ProspectDocumentDownload[] = [];
    const sharingPermission = requirements.sharingPermissionDocument as {
      title?: string;
      downloadUrl?: string | null;
    };
    if (sharingPermission?.downloadUrl) {
      downloads.push({
        key: `sharing_permission_${developmentId}`,
        label: sharingPermission.title || 'Permission to share their details',
        url: sharingPermission.downloadUrl,
        instructions: 'The prospect signs this before their details are shared with the developer.',
        category: 'consent',
        developmentId,
      });
    }
    const privacyNotice = requirements.privacyNoticeDocument as {
      title?: string;
      downloadUrl?: string | null;
    };
    if (privacyNotice?.downloadUrl) {
      downloads.push({
        key: `privacy_notice_${developmentId}`,
        label: privacyNotice.title || 'Privacy notice',
        url: privacyNotice.downloadUrl,
        instructions: 'The prospect reads this before their details are shared with the developer.',
        category: 'privacy_notice',
        developmentId,
      });
    }
    for (const template of templates) {
      if (!template.templateFileUrl) continue;
      downloads.push({
        key: `required_document_${template.id}`,
        label: template.documentLabel,
        url: template.templateFileUrl,
        instructions:
          template.templateFileName
            ? `Download "${template.templateFileName}", complete it, and upload the signed copy.`
            : 'Download this document, complete it, and upload the signed copy.',
        category: /info\s*sheet|information/i.test(template.documentLabel)
          ? 'information_sheet'
          : 'other',
        developmentId,
      });
    }

    packs.push({
      developmentId,
      downloads,
      uploads: [
        {
          evidenceType: 'sharing_permission',
          label: 'Permission to share their details',
          instructions: requirements.signatureMethod || null,
        },
        {
          evidenceType: 'privacy_notice',
          label: 'Privacy notice acknowledgement',
          instructions: requirements.signatureMethod || null,
        },
        {
          evidenceType: 'identity_document',
          label: 'Identity document',
          instructions: requirements.identityEvidence?.verificationInstructions || null,
        },
      ],
      signatureMethod: requirements.signatureMethod || null,
    });
  }

  return packs;
}
