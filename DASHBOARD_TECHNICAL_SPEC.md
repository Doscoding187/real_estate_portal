# Dashboard Integration Technical Specification

## Component Migration Plan

### 1. Top Navigation Bar

**Source**: `Dashboard/superadmin/src/components/layout/TopNavigationBar.tsx`
**Target**: `client/src/components/admin/TopNavigationBar.tsx`

**Required Changes**:
- Replace `react-router-dom` imports with `wouter`
- Replace `useNavigate()` with `useLocation()` from wouter
- Update logout functionality to work with main app's auth system

### 2. Sidebar Navigation

**Source**: `Dashboard/superadmin/src/components/layout/SidebarNavigation.tsx`
**Target**: `client/src/components/admin/SidebarNavigation.tsx`

**Required Changes**:
- Replace `react-router-dom` imports with `wouter`
- Replace `useLocation()` from react-router with `useLocation()` from wouter
- Replace `<Link>` components with button elements that use `setLocation`
- Update route paths to match main app's structure (`/admin/overview` instead of `/`)

### 3. Main Dashboard Component

**Source**: Combine elements from separate dashboard with current implementation
**Target**: `client/src/pages/admin/SuperAdminDashboard.tsx`

**Required Changes**:
- Integrate new TopNavigationBar and SidebarNavigation components
- Maintain authentication logic using `useAuth` hook
- Ensure mobile responsiveness works correctly
- Update styling to match main app's design system

## Routing Adaptation Examples

### Before (react-router-dom):
```tsx
import { Link, useLocation } from 'react-router-dom';

const SidebarNavigation = () => {
  const location = useLocation();
  
  return (
    <Link to="/agencies" className="...">
      Agencies
    </Link>
  );
};
```

### After (wouter):
```tsx
import { useLocation } from 'wouter';

const SidebarNavigation = () => {
  const [location, setLocation] = useLocation();
  
  return (
    <button 
      onClick={() => setLocation('/admin/agencies')} 
      className="..."
    >
      Agencies
    </button>
  );
};
```

## Authentication Alignment

### Before (localStorage):
```tsx
useEffect(() => {
  const isAuthenticated = localStorage.getItem('isAuthenticated');
  if (!isAuthenticated) {
    navigate('/login');
  }
}, [navigate]);
```

### After (useAuth hook):
```tsx
const { user, isAuthenticated, loading } = useAuth();

useEffect(() => {
  if (loading) return;
  
  if (!isAuthenticated || user?.role !== 'super_admin') {
    setLocation('/login');
  }
}, [isAuthenticated, user, loading, setLocation]);
```

## File Migration List

### Components to Create:
1. `client/src/components/admin/TopNavigationBar.tsx`
2. `client/src/components/admin/SidebarNavigation.tsx`

### Pages to Migrate:
1. `Dashboard/superadmin/src/pages/OverviewPage.tsx` → `client/src/pages/admin/OverviewPage.tsx`
2. `Dashboard/superadmin/src/pages/AgenciesPage.tsx` → `client/src/pages/admin/AgenciesPage.tsx`
3. `Dashboard/superadmin/src/pages/UsersPage.tsx` → `client/src/pages/admin/UsersPage.tsx`
4. `Dashboard/superadmin/src/pages/DevelopersPage.tsx` → `client/src/pages/admin/DevelopersPage.tsx`
5. Continue with remaining pages as needed

### Main Component to Update:
- `client/src/pages/admin/SuperAdminDashboard.tsx`

## Route Path Mapping

| Separate Dashboard Path | Main App Path        | Notes                         |
|-------------------------|----------------------|-------------------------------|
| `/`                     | `/admin/overview`    | Overview page                 |
| `/agencies`             | `/admin/agencies`    | Add /admin prefix             |
| `/users`                | `/admin/users`       | Add /admin prefix             |
| `/developers`           | `/admin/developers`  | Add /admin prefix             |
| All other routes        | `/admin/[route]`     | Add /admin prefix to all      |

## Styling Considerations

1. **Color Scheme**: 
   - Use main app's color palette (background, foreground, muted, etc.)
   - Replace hardcoded colors with Tailwind classes from main app

2. **Component Library**:
   - Use existing UI components: Button, Card, Badge, etc.
   - Maintain consistent spacing and typography

3. **Responsive Design**:
   - Ensure mobile navigation works correctly
   - Test sidebar toggle functionality

## Authentication Integration Points

1. **Dashboard Layout**: Check authentication on mount
2. **Individual Pages**: Each page should verify super_admin role
3. **Navigation**: Redirect to login when not authenticated
4. **Logout**: Integrate with main app's logout functionality

## Testing Checklist

### Component Level:
- [ ] TopNavigationBar renders correctly
- [ ] SidebarNavigation renders correctly
- [ ] Navigation links work with wouter
- [ ] Authentication checks function properly

### Page Level:
- [ ] OverviewPage displays correctly
- [ ] AgenciesPage displays correctly
- [ ] UsersPage displays correctly
- [ ] DevelopersPage displays correctly

### Integration Level:
- [ ] Dashboard layout renders properly
- [ ] Authentication flow works correctly
- [ ] All navigation paths function
- [ ] Mobile responsiveness works

## Dependencies to Verify

Ensure the main project has compatible versions of:
- `lucide-react`
- `recharts`
- Other UI dependencies used in the separate dashboard

If version conflicts exist, either:
1. Update main project dependencies
2. Modify separate dashboard components to work with existing versions