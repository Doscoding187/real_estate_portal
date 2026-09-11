import { Route, Switch, Redirect } from 'wouter';
import { RequireRole } from '@/components/RequireRole';
import { FounderCommandCentreLayout } from './FounderCommandCentreLayout';
import CockpitHome from './CockpitHome';
import FounderAttention from './FounderAttention';
import CompanyMap from './CompanyMap';
import Today from './Today';
import Strategy from './Strategy';

function FounderRoutes() {
  return (
    <FounderCommandCentreLayout>
      <Switch>
        <Route path="/founder" component={CockpitHome} />
        <Route path="/founder/attention" component={FounderAttention} />
        <Route path="/founder/company-map" component={CompanyMap} />
        <Route path="/founder/today" component={Today} />
        <Route path="/founder/strategy" component={Strategy} />
        <Route>
          <Redirect to="/founder" />
        </Route>
      </Switch>
    </FounderCommandCentreLayout>
  );
}

export function FounderRouteBoundary() {
  return (
    <RequireRole role="super_admin">
      <FounderRoutes />
    </RequireRole>
  );
}

export default FounderRouteBoundary;
