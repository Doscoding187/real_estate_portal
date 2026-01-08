# Launch Service

Manages the phased launch process for the Explore Partner Marketplace, including phase transitions, content quota tracking, and launch metrics monitoring.

## Requirements

- **16.13**: Track current phase (pre_launch, launch_period, ramp_up, ecosystem_maturity)
- **16.19**: Store phase configuration (ratios, weights)
- **16.3, 16.5**: Track progress toward 200+ content pieces
- **16.6**: Validate all quotas are met before launch
- **16.17, 16.22, 16.31**: Track topic engagement, partner content watch rate, save/share rate
- **16.32**: Trigger recovery mode when metrics underperform

## Launch Phases

### 1. Pre-Launch (Weeks 1-8)
- **Primary Content Ratio**: 80%
- **Algorithm Weight**: 0% (fully editorial)
- **Editorial Weight**: 100%
- **Focus**: Partner recruitment, content seeding

### 2. Launch Period (Weeks 9-12)
- **Primary Content Ratio**: 80%
- **Algorithm Weight**: 0% (fully editorial)
- **Editorial Weight**: 100%
- **Focus**: Public launch, user onboarding

### 3. Ramp-Up (Weeks 13-20)
- **Primary Content Ratio**: 70%
- **Algorithm Weight**: 50% (hybrid mode)
- **Editorial Weight**: 50%
- **Focus**: Algorithm training, metric monitoring

### 4. Ecosystem Maturity (Week 21+)
- **Primary Content Ratio**: 70%
- **Algorithm Weight**: 100% (fully algorithmic)
- **Editorial Weight**: 0%
- **Focus**: Sustainable growth, monetization

## Content Quotas

Minimum content required before public launch:

| Content Type | Required Count |
|-------------|----------------|
| Property Tours | 50 |
| Neighbourhood Guides | 30 |
| Expert Tips | 50 |
| Market Insights | 20 |
| Service Showcases | 30 |
| Inspiration Pieces | 20 |
| **Total** | **200+** |

## Launch Metrics

Target metrics for successful launch:

| Metric | Target | Recovery Threshold |
|--------|--------|-------------------|
| Topic Engagement Rate | 60% | 48% (20% below) |
| Partner Content Watch Rate | 40% | 32% |
| Save/Share Rate | 30% | 24% |
| Weekly Visits Per User | 3+ | 2.4+ |
| Algorithm Confidence Score | 75% | - |

## Usage Examples

### Check Launch Readiness

```typescript
import { launchService } from './launchService';

const readiness = await launchService.checkLaunchReadiness();

if (readiness.isReady) {
  console.log('Ready to launch!');
} else {
  console.log('Missing quotas:', readiness.missingQuotas);
  console.log(`Content: ${readiness.totalContentCount}/${readiness.requiredContentCount}`);
}
```

### Get Current Phase

```typescript
const phase = await launchService.getCurrentPhase();

if (phase) {
  console.log(`Current phase: ${phase.phase}`);
  console.log(`Primary ratio: ${phase.primaryContentRatio}`);
  console.log(`Algorithm weight: ${phase.algorithmWeight}`);
}
```

### Transition to New Phase

```typescript
const result = await launchService.transitionPhase('launch_period');

console.log(result.message);
// "Successfully transitioned from pre_launch to launch_period"
```

### Track Content Progress

```typescript
// Increment quota when content is created
await launchService.incrementContentQuota('property_tours');

// Get all quotas
const quotas = await launchService.getContentQuotas();
quotas.forEach(q => {
  console.log(`${q.contentType}: ${q.currentCount}/${q.requiredCount}`);
});
```

### Record Launch Metrics

```typescript
await launchService.recordLaunchMetrics({
  metricDate: new Date(),
  topicEngagementRate: 65,
  partnerContentWatchRate: 42,
  saveShareRate: 28,
  weeklyVisitsPerUser: 3.2,
  algorithmConfidenceScore: 68
});
```

### Monitor and Recover

```typescript
// Check metrics and trigger recovery if needed
const recoveryTriggered = await launchService.checkMetricsAndRecover();

if (recoveryTriggered) {
  console.log('Recovery mode activated - increasing editorial curation');
}
```

## Recovery Mode

When any metric falls 20% below target, the system automatically:

1. Increases editorial weight by 0.2 (up to 1.0)
2. Decreases algorithm weight by 0.2 (down to 0.0)
3. Logs the recovery action

This ensures content quality is maintained during underperformance periods.

## Phase Configuration

Each phase has predefined configuration:

```typescript
const config = launchService.getPhaseConfiguration('ramp_up');
// {
//   phase: 'ramp_up',
//   primaryContentRatio: 0.70,
//   algorithmWeight: 0.50,
//   editorialWeight: 0.50
// }
```

## Database Schema

### launch_phases
- Tracks active and historical launch phases
- Stores phase-specific configuration
- Only one phase can be active at a time

### launch_content_quotas
- Tracks content quota progress
- Updated when content is created
- Used for launch readiness checks

### launch_metrics
- Daily metric snapshots
- Used for trend analysis
- Triggers recovery mode when needed

## Integration Points

- **Content Creation**: Increment quotas when content is approved
- **Feed Generation**: Use phase configuration for content ratios
- **Analytics**: Record daily metrics for monitoring
- **Admin Dashboard**: Display readiness and metrics
