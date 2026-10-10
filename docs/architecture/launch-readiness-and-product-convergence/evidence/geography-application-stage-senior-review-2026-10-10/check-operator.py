"""Exercise only the mocked HTTP pipeline; cannot contact a provider or database."""
import datetime
import json
import os
from pathlib import Path
import subprocess

root = Path(__file__).resolve().parent
observations = []
for case in ['http-failure', 'semantic-failure', 'healthy']:
    env = {
        'PATH': os.environ['PATH'],
        'HOSTED_SEARCH_API_ORIGIN': 'https://api.propertylistifysa.co.za',
        'HOSTED_SEARCH_REPEATS': '1',
        'HOSTED_SEARCH_CONCURRENCY': '1',
        'OPERATOR_FIXTURE_CASE': case,
    }
    result = subprocess.run(
        ['node', '--import', str(root / 'mock-fetch.mjs'), str(root / 'hosted-search-probe.mjs')],
        cwd=root, env=env, capture_output=True, text=True, timeout=15,
    )
    if not result.stdout.strip():
        raise AssertionError(f'{case} produced no structured record: {result.stderr[:500]}')
    record = json.loads(result.stdout)
    assert record['inflightDrained'] is True
    assert record['requestEvents'] and all(e['railwayRequestId'] is not None for e in record['requestEvents'])
    if case == 'healthy':
        assert result.returncode == 0 and record['ok'] and not record['halted']
        assert record['dispatchedJobs'] == record['requestedJobs'] and record['skippedJobs'] == 0
        assert record['positiveInventoryObserved'] is False and record['fullCapacityAcceptance'] is False
    else:
        assert result.returncode == 2 and not record['ok'] and record['halted']
        assert record['dispatchedJobs'] == 1 and record['skippedJobs'] == record['requestedJobs'] - 1
    observations.append({'case': case, 'exitCode': result.returncode, 'dispatchedJobs': record['dispatchedJobs'], 'skippedJobs': record['skippedJobs'], 'issues': record['issues']})

receipt = {
    'checkedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(),
    'mockedCasesPassed': len(observations),
    'cases': observations,
    'databaseConnectionsOpened': 0,
    'providerRequests': 0,
    'hostedSearchMeasured': False,
}
(root / 'operator-validation.json').write_text(json.dumps(receipt, indent=2) + '\n')
print(json.dumps(receipt))
