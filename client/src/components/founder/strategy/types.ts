export type ObjectiveStatus = 'draft' | 'active' | 'completed' | 'cancelled';
export type ComparisonDirection = 'at_least' | 'at_most';
export type SupportedMetricKey =
  | 'active_agents'
  | 'active_agencies'
  | 'active_developers'
  | 'active_listings';

export interface PlanningPeriod {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface StrategicTarget {
  id: number;
  objectiveId: number;
  metricKey: SupportedMetricKey;
  label: string;
  targetValue: number;
  comparisonDirection: ComparisonDirection;
  evaluationDate: string;
  createdByUserId: number;
  updatedByUserId: number;
  createdAt: string;
  updatedAt: string;
}

export interface StrategicObjective {
  id: number;
  title: string;
  description: string | null;
  status: ObjectiveStatus;
  ownerUserId: number | null;
  planningPeriodId: number;
  createdByUserId: number;
  updatedByUserId: number;
  createdAt: string;
  updatedAt: string;
  targets: StrategicTarget[];
}

export interface MetricDefinition {
  key: SupportedMetricKey;
  label: string;
  description: string;
  unit: 'count';
  semanticKind: 'point_in_time_count';
}

export interface OwnerOption {
  id: number;
  displayName: string;
  email: string | null;
}

export interface TargetProgress {
  target: StrategicTarget;
  metricDefinition: MetricDefinition;
  currentActualValue: number | null;
  actualState: 'resolved' | 'unavailable';
  currentlySatisfiesComparison: boolean | null;
  resolvedAt: string;
}
