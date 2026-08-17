import {
  isSearchAreaBoundaryKind,
  isSearchAreaId,
  isSearchAreaLifecycle,
  isSearchJourneyId,
  SEARCH_AREA_EXECUTABLE_JOURNEYS,
  type SearchAreaSummary,
  type SearchJourneyId,
} from '../../shared/searchScope';
import {
  isFactualGeographyId,
  isRuntimeNaturalKey,
  RUNTIME_SEARCH_SCOPE_KINDS,
  type RuntimeSearchScopeKind,
} from '../../shared/factualRuntimeGeographyBridge';
import {
  parseCanonicalLocationId,
  type CanonicalLocationLevel,
} from '../../shared/locationAuthority';
import { locationResolver } from './locationResolverService';
import { governedRuntimeGeographyAuthority } from './runtimeGeographyResolverService';
import type { RuntimeGeographyAuthority } from './runtimeGeographyAuthority';
import { SEARCH_AREA_DEFINITIONS, type SearchAreaDefinition } from './searchAreaDefinitions';

export interface CanonicalLocationAuthorityRecord {
  canonicalLocationId: string;
  level: CanonicalLocationLevel;
  name: string;
  slug: string;
  parentCanonicalLocationId?: string;
}

export interface CanonicalLocationAuthority {
  resolveCanonicalLocation(
    canonicalLocationId: string,
  ): Promise<CanonicalLocationAuthorityRecord | null>;
}

export type SearchAreaDefinitionValidationCode =
  | 'invalid_search_area_id'
  | 'invalid_definition_version'
  | 'invalid_label'
  | 'invalid_public_slug'
  | 'invalid_context'
  | 'invalid_parent_identity'
  | 'invalid_anchor_identity'
  | 'invalid_member_identity'
  | 'invalid_factual_identity'
  | 'invalid_member_scope'
  | 'invalid_member_resolution_state'
  | 'invalid_runtime_natural_key'
  | 'invalid_member_collection'
  | 'invalid_supported_journey'
  | 'duplicate_supported_journey'
  | 'invalid_lifecycle'
  | 'invalid_boundary'
  | 'invalid_aliases'
  | 'duplicate_member'
  | 'empty_active_definition'
  | 'unsupported_journey_configuration';

export interface SearchAreaDefinitionValidationIssue {
  code: SearchAreaDefinitionValidationCode;
  field: string;
  message: string;
}

export type SearchAreaFailureReason =
  | SearchAreaDefinitionValidationCode
  | 'unknown_search_area'
  | 'disabled'
  | 'preview_only'
  | 'unsupported_journey'
  | 'canonical_parent_unresolved'
  | 'canonical_parent_identity_mismatch'
  | 'canonical_parent_not_metro_city'
  | 'canonical_member_unresolved'
  | 'canonical_member_identity_mismatch'
  | 'canonical_member_not_locality'
  | 'canonical_member_outside_parent'
  | 'canonical_anchor_unresolved'
  | 'canonical_anchor_identity_mismatch'
  | 'canonical_anchor_not_locality'
  | 'canonical_anchor_not_member'
  | 'runtime_member_unresolved'
  | 'runtime_member_natural_key_unresolved'
  | 'runtime_member_identity_mismatch'
  | 'runtime_member_scope_mismatch'
  | 'runtime_member_factual_type_mismatch';

export interface ResolvedSearchAreaMember extends CanonicalLocationAuthorityRecord {
  factualLocationId?: string;
  factualPreferredName?: string;
  factualType?: string;
  scopeKind?: RuntimeSearchScopeKind;
  runtimeNaturalKey?: string;
  parentName?: string;
}

export interface ResolvedSearchAreaDefinition extends Omit<
  SearchAreaDefinition,
  'members' | 'memberCanonicalLocationIds'
> {
  parent?: CanonicalLocationAuthorityRecord;
  anchor?: CanonicalLocationAuthorityRecord;
  memberCanonicalLocationIds?: readonly string[];
  members: readonly ResolvedSearchAreaMember[];
  authorityKey: string;
}

export type SearchAreaResolution =
  | {
      status: 'available' | 'preview';
      definition: ResolvedSearchAreaDefinition;
      summary: SearchAreaSummary;
    }
  | {
      status: 'unavailable';
      searchAreaId: string;
      reason: SearchAreaFailureReason;
    };

export interface ResolveSearchAreaOptions {
  journey?: SearchJourneyId;
  includePreview?: boolean;
}

export type ListSearchAreaSummaryOptions = ResolveSearchAreaOptions;

export interface SearchAreaAuthorityOptions {
  definitions?: readonly SearchAreaDefinition[];
  canonicalLocationAuthority?: CanonicalLocationAuthority;
  runtimeGeographyAuthority?: RuntimeGeographyAuthority;
  /**
   * One server-owned containment switch for public Search Area discovery and
   * direct public execution. Controlled acceptance can still pass
   * includePreview so factual/runtime verification remains available while
   * customer exposure is stopped.
   */
  publicActivationEnabled?: boolean;
}

const PUBLIC_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const PUBLIC_SEARCH_AREA_ACTIVATION_ENV = 'PROPERTY_LISTIFY_PUBLIC_SEARCH_AREA_ACTIVATION';

function readPublicActivationSwitch(): boolean {
  const configured = process.env[PUBLIC_SEARCH_AREA_ACTIVATION_ENV]?.trim().toLowerCase();
  return configured === undefined || !['0', 'false', 'off', 'disabled'].includes(configured);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function hasDuplicates(values: readonly string[]): boolean {
  return new Set(values).size !== values.length;
}

function isKnownJourneyList(value: unknown): value is readonly SearchJourneyId[] {
  return Array.isArray(value) && value.length > 0 && value.every(item => isSearchJourneyId(item));
}

function isCanonicalIdentityAtLevel(
  value: unknown,
  level: CanonicalLocationLevel,
): value is string {
  const parsed = parseCanonicalLocationId(value);
  return parsed?.level === level;
}

export function validateSearchAreaDefinitionShape(
  value: unknown,
): SearchAreaDefinitionValidationIssue[] {
  if (!isRecord(value)) {
    return [
      {
        code: 'invalid_search_area_id',
        field: 'definition',
        message: 'Search Area definition must be an object.',
      },
    ];
  }

  const definition = value as Partial<SearchAreaDefinition>;
  const issues: SearchAreaDefinitionValidationIssue[] = [];

  if (!isSearchAreaId(definition.searchAreaId)) {
    issues.push({
      code: 'invalid_search_area_id',
      field: 'searchAreaId',
      message: 'Search Area ID must be a stable lowercase hyphenated identity.',
    });
  }

  if (
    typeof definition.definitionVersion !== 'number' ||
    !Number.isSafeInteger(definition.definitionVersion) ||
    definition.definitionVersion <= 0
  ) {
    issues.push({
      code: 'invalid_definition_version',
      field: 'definitionVersion',
      message: 'Definition version must be a positive integer.',
    });
  }

  if (!nonEmptyString(definition.label) || definition.label.trim().length > 160) {
    issues.push({
      code: 'invalid_label',
      field: 'label',
      message: 'Search Area label must be a non-empty string of 160 characters or fewer.',
    });
  }

  if (
    definition.publicSlug !== undefined &&
    (typeof definition.publicSlug !== 'string' || !PUBLIC_SLUG_PATTERN.test(definition.publicSlug))
  ) {
    issues.push({
      code: 'invalid_public_slug',
      field: 'publicSlug',
      message: 'Public slug must be a lowercase hyphenated identity.',
    });
  }

  if (
    definition.parentCanonicalLocationId !== undefined &&
    !isCanonicalIdentityAtLevel(definition.parentCanonicalLocationId, 'city')
  ) {
    issues.push({
      code: 'invalid_parent_identity',
      field: 'parentCanonicalLocationId',
      message: 'Legacy Search Area parent must be a canonical Metro / City identity.',
    });
  }

  if (
    definition.anchorCanonicalLocationId !== undefined &&
    !isCanonicalIdentityAtLevel(definition.anchorCanonicalLocationId, 'suburb')
  ) {
    issues.push({
      code: 'invalid_anchor_identity',
      field: 'anchorCanonicalLocationId',
      message: 'Search Area anchor must be a canonical locality identity.',
    });
  }

  if (
    definition.anchorFactualLocationId !== undefined &&
    !isFactualGeographyId(definition.anchorFactualLocationId)
  ) {
    issues.push({
      code: 'invalid_factual_identity',
      field: 'anchorFactualLocationId',
      message: 'Search Area factual anchors must use a durable Property Listify identity.',
    });
  }

  if (definition.canonicalContext !== undefined) {
    const context = definition.canonicalContext;
    if (
      !isRecord(context) ||
      context.isMembershipParent !== false ||
      !Array.isArray(context.contextNames) ||
      context.contextNames.length === 0 ||
      !context.contextNames.every(name => nonEmptyString(name))
    ) {
      issues.push({
        code: 'invalid_context',
        field: 'canonicalContext',
        message:
          'Search Area context must contain descriptive names and explicitly remain outside membership authority.',
      });
    }
  }

  const hasGovernedMembers = definition.members !== undefined;
  const hasLegacyMembers = definition.memberCanonicalLocationIds !== undefined;
  if (hasGovernedMembers && hasLegacyMembers) {
    issues.push({
      code: 'invalid_member_collection',
      field: 'members',
      message: 'Search Area definitions must use governed members or legacy members, not both.',
    });
  } else if (hasGovernedMembers) {
    if (!Array.isArray(definition.members)) {
      issues.push({
        code: 'invalid_member_collection',
        field: 'members',
        message: 'Governed Search Area members must be an array.',
      });
    } else {
      if (definition.lifecycle === 'active' && definition.members.length === 0) {
        issues.push({
          code: 'empty_active_definition',
          field: 'members',
          message: 'Active Search Areas require at least one explicit governed member.',
        });
      }

      const factualIds: string[] = [];
      const naturalKeys: string[] = [];
      for (const member of definition.members) {
        if (!isRecord(member)) {
          issues.push({
            code: 'invalid_member_collection',
            field: 'members',
            message: 'Every governed Search Area member must be an object.',
          });
          continue;
        }

        if (!isFactualGeographyId(member.factualLocationId)) {
          issues.push({
            code: 'invalid_factual_identity',
            field: 'members.factualLocationId',
            message: 'Governed Search Area members require durable factual identities.',
          });
        } else {
          factualIds.push(member.factualLocationId);
        }

        if (!RUNTIME_SEARCH_SCOPE_KINDS.includes(member.scopeKind as RuntimeSearchScopeKind)) {
          issues.push({
            code: 'invalid_member_scope',
            field: 'members.scopeKind',
            message: 'Governed Search Area members require an executable runtime scope.',
          });
        }

        if (
          member.factualPreferredName !== undefined &&
          !nonEmptyString(member.factualPreferredName)
        ) {
          issues.push({
            code: 'invalid_label',
            field: 'members.factualPreferredName',
            message: 'Governed Search Area factual names must be non-empty when supplied.',
          });
        }
        if (member.factualType !== undefined && !nonEmptyString(member.factualType)) {
          issues.push({
            code: 'invalid_member_scope',
            field: 'members.factualType',
            message: 'Governed Search Area factual types must be non-empty when supplied.',
          });
        }

        if (
          member.resolutionState !== 'projection_ready' &&
          member.resolutionState !== 'unresolved'
        ) {
          issues.push({
            code: 'invalid_member_resolution_state',
            field: 'members.resolutionState',
            message: 'Governed Search Area members must declare their resolution state.',
          });
        } else if (member.resolutionState === 'projection_ready') {
          if (!isRuntimeNaturalKey(member.runtimeNaturalKey)) {
            issues.push({
              code: 'invalid_runtime_natural_key',
              field: 'members.runtimeNaturalKey',
              message: 'Projection-ready members require a stable runtime natural key.',
            });
          } else {
            naturalKeys.push(member.runtimeNaturalKey);
          }
        } else if (member.runtimeNaturalKey !== undefined) {
          issues.push({
            code: 'invalid_runtime_natural_key',
            field: 'members.runtimeNaturalKey',
            message: 'Unresolved members must not advertise an executable natural key.',
          });
        }
      }

      if (hasDuplicates(factualIds) || hasDuplicates(naturalKeys)) {
        issues.push({
          code: 'duplicate_member',
          field: 'members',
          message: 'Governed Search Area factual members and runtime keys must be unique.',
        });
      }
    }
  } else if (!hasLegacyMembers || !Array.isArray(definition.memberCanonicalLocationIds)) {
    issues.push({
      code: 'invalid_member_collection',
      field: 'memberCanonicalLocationIds',
      message: 'Search Area requires governed members or a legacy canonical member array.',
    });
  } else {
    if (definition.parentCanonicalLocationId === undefined) {
      issues.push({
        code: 'invalid_parent_identity',
        field: 'parentCanonicalLocationId',
        message: 'Legacy Search Area definitions require their canonical city context.',
      });
    }
    if (definition.lifecycle === 'active' && definition.memberCanonicalLocationIds.length === 0) {
      issues.push({
        code: 'empty_active_definition',
        field: 'memberCanonicalLocationIds',
        message: 'Active Search Areas require at least one explicit canonical member.',
      });
    }

    if (
      !definition.memberCanonicalLocationIds.every(member =>
        isCanonicalIdentityAtLevel(member, 'suburb'),
      )
    ) {
      issues.push({
        code: 'invalid_member_identity',
        field: 'memberCanonicalLocationIds',
        message: 'Every Search Area member must be a canonical locality identity.',
      });
    }

    if (hasDuplicates(definition.memberCanonicalLocationIds)) {
      issues.push({
        code: 'duplicate_member',
        field: 'memberCanonicalLocationIds',
        message: 'Search Area members must be unique.',
      });
    }
  }

  if (!isKnownJourneyList(definition.supportedJourneys)) {
    issues.push({
      code: 'invalid_supported_journey',
      field: 'supportedJourneys',
      message: 'Supported journeys must contain known journey identities.',
    });
  } else if (hasDuplicates(definition.supportedJourneys)) {
    issues.push({
      code: 'duplicate_supported_journey',
      field: 'supportedJourneys',
      message: 'Supported journeys must be unique.',
    });
  }

  if (!isSearchAreaLifecycle(definition.lifecycle)) {
    issues.push({
      code: 'invalid_lifecycle',
      field: 'lifecycle',
      message: 'Search Area lifecycle must be active, preview or disabled.',
    });
  }

  if (!isRecord(definition.boundary) || !isSearchAreaBoundaryKind(definition.boundary.kind)) {
    issues.push({
      code: 'invalid_boundary',
      field: 'boundary',
      message: 'Search Area boundary must use canonical_members.',
    });
  }

  if (definition.aliases !== undefined) {
    if (!Array.isArray(definition.aliases)) {
      issues.push({
        code: 'invalid_aliases',
        field: 'aliases',
        message: 'Search Area aliases must be an array.',
      });
    } else {
      const aliasesAreValid = definition.aliases.every(alias => {
        if (!isRecord(alias)) return false;
        return (
          typeof alias.slug === 'string' &&
          PUBLIC_SLUG_PATTERN.test(alias.slug) &&
          isSearchAreaId(alias.redirectToSearchAreaId)
        );
      });
      if (!aliasesAreValid) {
        issues.push({
          code: 'invalid_aliases',
          field: 'aliases',
          message: 'Search Area aliases must contain valid slugs and stable targets.',
        });
      }
    }
  }

  if (
    definition.lifecycle === 'active' &&
    Array.isArray(definition.supportedJourneys) &&
    definition.supportedJourneys.some(
      journey =>
        !SEARCH_AREA_EXECUTABLE_JOURNEYS.some(executableJourney => executableJourney === journey),
    )
  ) {
    issues.push({
      code: 'unsupported_journey_configuration',
      field: 'supportedJourneys',
      message: 'Active Search Areas may only advertise executable Buy and Rent journeys.',
    });
  }

  return issues;
}

export function buildSearchAreaAuthorityKey(
  searchAreaId: string,
  definitionVersion: number,
): string {
  return `search-area:${searchAreaId}:v${definitionVersion}`;
}

async function resolveCanonicalLocationWithDefaultAuthority(
  canonicalLocationId: string,
): Promise<CanonicalLocationAuthorityRecord | null> {
  try {
    const result = await locationResolver.resolvePublicLocation({
      locationId: canonicalLocationId,
    });
    if (result.status !== 'resolved' || !result.location) return null;

    const parsed = parseCanonicalLocationId(canonicalLocationId);
    if (!parsed || result.location.level !== parsed.level) return null;

    if (result.location.level === 'province') {
      return {
        canonicalLocationId,
        level: 'province',
        name: result.location.province.name,
        slug: result.location.province.slug,
      };
    }

    if (result.location.level === 'city' && result.location.city) {
      return {
        canonicalLocationId,
        level: 'city',
        name: result.location.city.name,
        slug: result.location.city.slug,
        parentCanonicalLocationId: `province:${result.location.city.provinceId}`,
      };
    }

    if (result.location.level === 'suburb' && result.location.city && result.location.suburb) {
      return {
        canonicalLocationId,
        level: 'suburb',
        name: result.location.suburb.name,
        slug: result.location.suburb.slug,
        parentCanonicalLocationId: `city:${result.location.suburb.cityId}`,
      };
    }
  } catch {
    // Canonical authority failures are deliberately treated as unavailable.
    // Search Area resolution must never widen around a resolver failure.
  }

  return null;
}

export const defaultCanonicalLocationAuthority: CanonicalLocationAuthority = {
  resolveCanonicalLocation: resolveCanonicalLocationWithDefaultAuthority,
};

function unavailable(searchAreaId: string, reason: SearchAreaFailureReason): SearchAreaResolution {
  return { status: 'unavailable', searchAreaId, reason };
}

function buildSearchAreaSummary(input: {
  definition: SearchAreaDefinition;
  parent?: CanonicalLocationAuthorityRecord;
  status: 'available' | 'preview';
}): SearchAreaSummary {
  const { definition, parent, status } = input;
  return {
    kind: 'search_area',
    searchAreaId: definition.searchAreaId,
    label: definition.label,
    ...(definition.description ? { description: definition.description } : {}),
    ...(definition.publicSlug ? { publicSlug: definition.publicSlug } : {}),
    ...(definition.parentCanonicalLocationId
      ? { parentCanonicalLocationId: definition.parentCanonicalLocationId }
      : {}),
    ...(parent ? { parentLabel: parent.name } : {}),
    ...(definition.canonicalContext ? { canonicalContext: definition.canonicalContext } : {}),
    ...(definition.anchorFactualLocationId
      ? { anchorFactualLocationId: definition.anchorFactualLocationId }
      : {}),
    lifecycle: definition.lifecycle,
    availability: status === 'preview' ? 'preview' : 'available',
    supportedJourneys: [...definition.supportedJourneys],
    definitionVersion: definition.definitionVersion,
  };
}

export class SearchAreaAuthority {
  private readonly definitions: ReadonlyMap<string, SearchAreaDefinition>;

  private readonly structuralIssues: ReadonlyMap<
    string,
    readonly SearchAreaDefinitionValidationIssue[]
  >;

  private readonly canonicalLocationAuthority: CanonicalLocationAuthority;

  private readonly runtimeGeographyAuthority: RuntimeGeographyAuthority;

  private readonly publicActivationEnabled: boolean;

  constructor(options: SearchAreaAuthorityOptions = {}) {
    const definitions = options.definitions ?? SEARCH_AREA_DEFINITIONS;
    const definitionMap = new Map<string, SearchAreaDefinition>();
    const issues = new Map<string, SearchAreaDefinitionValidationIssue[]>();

    for (const definition of definitions) {
      const definitionIssues = validateSearchAreaDefinitionShape(definition);
      const existing = definitionMap.get(definition.searchAreaId);
      if (existing) {
        const duplicateIssue: SearchAreaDefinitionValidationIssue = {
          code: 'invalid_search_area_id',
          field: 'searchAreaId',
          message: 'Search Area IDs must be unique within the registry.',
        };
        issues.set(definition.searchAreaId, [
          ...(issues.get(definition.searchAreaId) ?? []),
          duplicateIssue,
        ]);
        continue;
      }

      definitionMap.set(definition.searchAreaId, definition);
      if (definitionIssues.length > 0) issues.set(definition.searchAreaId, definitionIssues);
    }

    this.definitions = definitionMap;
    this.structuralIssues = issues;
    this.canonicalLocationAuthority =
      options.canonicalLocationAuthority ?? defaultCanonicalLocationAuthority;
    this.runtimeGeographyAuthority =
      options.runtimeGeographyAuthority ?? governedRuntimeGeographyAuthority;
    this.publicActivationEnabled = options.publicActivationEnabled ?? readPublicActivationSwitch();
  }

  async resolveSearchArea(
    searchAreaId: string,
    options: ResolveSearchAreaOptions = {},
  ): Promise<SearchAreaResolution> {
    if (!isSearchAreaId(searchAreaId)) return unavailable(searchAreaId, 'invalid_search_area_id');

    const definition = this.definitions.get(searchAreaId);
    if (!definition) return unavailable(searchAreaId, 'unknown_search_area');

    const structuralIssues = this.structuralIssues.get(searchAreaId);
    if (structuralIssues?.length) {
      return unavailable(searchAreaId, structuralIssues[0].code);
    }

    if (definition.lifecycle === 'disabled') return unavailable(searchAreaId, 'disabled');
    if (
      !options.includePreview &&
      definition.lifecycle === 'active' &&
      !this.publicActivationEnabled
    ) {
      return unavailable(searchAreaId, 'disabled');
    }
    if (definition.lifecycle === 'preview' && !options.includePreview) {
      return unavailable(searchAreaId, 'preview_only');
    }

    if (options.journey !== undefined) {
      if (
        !isSearchJourneyId(options.journey) ||
        !definition.supportedJourneys.includes(options.journey)
      ) {
        return unavailable(searchAreaId, 'unsupported_journey');
      }
    }

    let parent: CanonicalLocationAuthorityRecord | undefined;
    if (definition.parentCanonicalLocationId) {
      const resolvedParent = await this.canonicalLocationAuthority.resolveCanonicalLocation(
        definition.parentCanonicalLocationId,
      );
      if (!resolvedParent) return unavailable(searchAreaId, 'canonical_parent_unresolved');
      parent = resolvedParent;
      if (parent.canonicalLocationId !== definition.parentCanonicalLocationId) {
        return unavailable(searchAreaId, 'canonical_parent_identity_mismatch');
      }
      if (parent.level !== 'city')
        return unavailable(searchAreaId, 'canonical_parent_not_metro_city');
    }

    const authorityKey = buildSearchAreaAuthorityKey(
      definition.searchAreaId,
      definition.definitionVersion,
    );
    const status = definition.lifecycle === 'preview' ? 'preview' : 'available';

    if (definition.members) {
      const members: ResolvedSearchAreaMember[] = [];
      for (const memberDefinition of definition.members) {
        if (
          memberDefinition.resolutionState !== 'projection_ready' ||
          !memberDefinition.runtimeNaturalKey
        ) {
          return unavailable(searchAreaId, 'runtime_member_unresolved');
        }

        const member = await this.runtimeGeographyAuthority.resolveRuntimeNaturalKey(
          memberDefinition.runtimeNaturalKey,
          memberDefinition.scopeKind,
        );
        if (!member) {
          return unavailable(searchAreaId, 'runtime_member_natural_key_unresolved');
        }
        if (
          member.runtimeNaturalKey !== memberDefinition.runtimeNaturalKey ||
          member.factualLocationId !== memberDefinition.factualLocationId
        ) {
          return unavailable(searchAreaId, 'runtime_member_identity_mismatch');
        }
        if (member.scopeKind !== memberDefinition.scopeKind) {
          return unavailable(searchAreaId, 'runtime_member_scope_mismatch');
        }
        if (memberDefinition.factualType && member.factualType !== memberDefinition.factualType) {
          return unavailable(searchAreaId, 'runtime_member_factual_type_mismatch');
        }
        if (
          memberDefinition.factualPreferredName &&
          member.factualPreferredName !== memberDefinition.factualPreferredName
        ) {
          return unavailable(searchAreaId, 'runtime_member_identity_mismatch');
        }
        members.push(member);
      }

      const summary = buildSearchAreaSummary({ definition, parent, status });
      return {
        status,
        definition: {
          ...definition,
          ...(parent ? { parent } : {}),
          members,
          authorityKey,
        },
        summary,
      };
    }

    if (!parent || !definition.memberCanonicalLocationIds) {
      return unavailable(searchAreaId, 'canonical_parent_unresolved');
    }

    const members: ResolvedSearchAreaMember[] = [];
    for (const memberCanonicalLocationId of definition.memberCanonicalLocationIds) {
      const member =
        await this.canonicalLocationAuthority.resolveCanonicalLocation(memberCanonicalLocationId);
      if (!member) return unavailable(searchAreaId, 'canonical_member_unresolved');
      if (member.canonicalLocationId !== memberCanonicalLocationId) {
        return unavailable(searchAreaId, 'canonical_member_identity_mismatch');
      }
      if (member.level !== 'suburb')
        return unavailable(searchAreaId, 'canonical_member_not_locality');
      if (member.parentCanonicalLocationId !== definition.parentCanonicalLocationId) {
        return unavailable(searchAreaId, 'canonical_member_outside_parent');
      }
      members.push(member);
    }

    let anchor: CanonicalLocationAuthorityRecord | undefined;
    if (definition.anchorCanonicalLocationId) {
      const resolvedAnchor = await this.canonicalLocationAuthority.resolveCanonicalLocation(
        definition.anchorCanonicalLocationId,
      );
      if (!resolvedAnchor) return unavailable(searchAreaId, 'canonical_anchor_unresolved');
      if (resolvedAnchor.canonicalLocationId !== definition.anchorCanonicalLocationId) {
        return unavailable(searchAreaId, 'canonical_anchor_identity_mismatch');
      }
      if (resolvedAnchor.level !== 'suburb')
        return unavailable(searchAreaId, 'canonical_anchor_not_locality');
      if (!definition.memberCanonicalLocationIds.includes(resolvedAnchor.canonicalLocationId)) {
        return unavailable(searchAreaId, 'canonical_anchor_not_member');
      }
      anchor = resolvedAnchor;
    }

    const summary = buildSearchAreaSummary({ definition, parent, status });
    return {
      status,
      definition: {
        ...definition,
        parent,
        ...(anchor ? { anchor } : {}),
        members,
        authorityKey,
      },
      summary,
    };
  }

  async getSafeSummary(
    searchAreaId: string,
    options: ResolveSearchAreaOptions = {},
  ): Promise<SearchAreaSummary | null> {
    const result = await this.resolveSearchArea(searchAreaId, options);
    return result.status === 'unavailable' ? null : result.summary;
  }

  /**
   * Returns summaries for discovery only after applying lifecycle authority.
   * Public callers see only explicitly production-activated areas; controlled
   * acceptance may opt into preview candidates without changing their stored
   * lifecycle.
   */
  async listSearchAreaSummaries(
    options: ListSearchAreaSummaryOptions = {},
  ): Promise<readonly SearchAreaSummary[]> {
    const summaries: SearchAreaSummary[] = [];

    for (const definition of this.definitions.values()) {
      const resolution = await this.resolveSearchArea(definition.searchAreaId, options);
      if (resolution.status === 'unavailable') continue;

      const controlledPreview = options.includePreview === true;
      if (!controlledPreview && !this.publicActivationEnabled) {
        continue;
      }
      if (
        !controlledPreview &&
        (definition.lifecycle !== 'active' || definition.productionActivation !== true)
      ) {
        continue;
      }

      summaries.push(resolution.summary);
    }

    return summaries.sort((left, right) => left.label.localeCompare(right.label));
  }
}

export const searchAreaAuthority = new SearchAreaAuthority();
