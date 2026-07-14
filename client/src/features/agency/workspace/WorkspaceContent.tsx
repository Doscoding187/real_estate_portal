import { AgencyCommissionWorkspace } from '../commission/AgencyCommissionWorkspace';
import { AgencyCanvassingWorkspace } from '../canvassing/AgencyCanvassingWorkspace';
import { AgencyGrowthWorkspace } from '../growth/GrowthPanels';
import { AgencyLeadsWorkspace } from '../leads/AgencyLeadsWorkspace';
import { AgencyListingsWorkspace } from '../listings/AgencyListingsWorkspace';
import { AgencyListingPerformanceWorkspace } from '../performance/AgencyListingPerformanceWorkspace';
import {
  AgencyAttentionWorkspace,
  AgencyBillingWorkspace,
  AgencyComplianceWorkspace,
  AgencyUtilityWorkspace,
} from '../operations/AgencyOperationsWorkspaces';
import { AgencyOverviewPage } from '../overview/AgencyOverviewPage';
import { AgencyReportingWorkspace } from '../reporting/AgencyReportingWorkspace';
import { AgencyTeamWorkspace } from '../team/AgencyTeamWorkspace';
import { AgencyTransactionsWorkspace } from '../transactions/AgencyTransactionsWorkspace';
import { AgencyMyDayWorkspace, AgencyViewingsWorkspace } from '../viewings/AgencyViewingsWorkspace';
import type { WorkspaceContentProps } from './types';

export function WorkspaceContent(props: WorkspaceContentProps) {
  switch (props.workspace) {
    case 'attention':
      return <AgencyAttentionWorkspace {...props} />;
    case 'my-day':
      return <AgencyMyDayWorkspace {...props} />;
    case 'leads':
      return <AgencyLeadsWorkspace {...props} />;
    case 'listings':
      return <AgencyListingsWorkspace {...props} />;
    case 'performance':
      return <AgencyListingPerformanceWorkspace {...props} />;
    case 'canvassing':
      return <AgencyCanvassingWorkspace {...props} />;
    case 'viewings':
      return <AgencyViewingsWorkspace {...props} />;
    case 'transactions':
      return <AgencyTransactionsWorkspace {...props} />;
    case 'commission':
      return <AgencyCommissionWorkspace {...props} />;
    case 'team':
      return <AgencyTeamWorkspace {...props} />;
    case 'growth':
      return <AgencyGrowthWorkspace {...props} />;
    case 'reporting':
      return <AgencyReportingWorkspace {...props} />;
    case 'compliance':
      return <AgencyComplianceWorkspace {...props} />;
    case 'billing':
      return <AgencyBillingWorkspace {...props} />;
    case 'settings':
    case 'help':
      return <AgencyUtilityWorkspace {...props} />;
    case 'overview':
    default:
      return <AgencyOverviewPage {...props} />;
  }
}
