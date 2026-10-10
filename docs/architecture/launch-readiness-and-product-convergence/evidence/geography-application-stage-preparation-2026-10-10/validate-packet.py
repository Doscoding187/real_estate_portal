"""Offline identity/evidence validator; no provider or database calls."""
from pathlib import Path
import datetime
import hashlib
import json
import subprocess
import sys

root = Path(__file__).resolve().parent
worktree = next(parent for parent in root.parents if (parent / ".git").exists())
checks = []


def require(condition, label):
    if not condition:
        raise AssertionError(label)
    checks.append(label)


def read(name):
    return json.loads((root / name).read_text())


def digest(path):
    with Path(path).open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


sha = '57ea5f5e98ff031a4d0f0814998e60fe27a82b2b'
tree = 'd832836d40746d36401b6fb1a3603466e6660a00'
fingerprint = 'b23d640cdf242812e80a28d10bc4079a3ff0b48a05173a392b9af47853495ced'
source = read('source-artifact.json')
require(source['sourceSha'] == sha and source['sourceTree'] == tree, 'pinned application identity')
require(not source['runtimeDifferenceFromPacketBase'], 'packet base has matching application inputs')
require(not subprocess.check_output(['git', 'diff', '--name-only', sha, 'HEAD', '--', 'server', 'client', 'shared', 'drizzle', 'scripts', 'package.json', 'pnpm-lock.yaml', 'vite.config.ts', 'railway.json', 'railway.email-worker.json', 'railway.lead-job.json'], cwd=worktree, text=True).strip(), 'current application inputs still match pinned source')
require(digest(source['bundlePath']) == source['bundleSha256'], 'private immutable source archive digest')
require(subprocess.check_output(['git', 'rev-parse', sha + '^{tree}'], cwd=worktree, text=True).strip() == tree, 'Git source tree identity')
require(subprocess.run(['git', 'merge-base', '--is-ancestor', source['protectedSchemaSource'], sha], cwd=worktree, capture_output=True).returncode == 0, 'protected schema ancestor')
ci = read('exact-source-ci.json')
require(ci['run']['head_sha'] == sha and ci['run']['conclusion'] == 'success', 'exact-source passing CI')
require(len(ci['jobs']) == 5 and all(job['conclusion'] == 'success' for job in ci['jobs']), 'all five hosted CI jobs passed')
require(all(a['digest'].startswith('sha256:') and not a['expired'] for a in ci['artifacts']), 'CI artifact identities recorded')
front = read('frontend-artifact.json')
require(front['sourceSha'] == sha and front['sourceTree'] == tree and front['buildExit'] == 0, 'offline frontend exact source successful build')
require(front['version']['gitSha'] == sha and front['version']['env'] == 'production', 'frontend production version identity')
require(front['readyForDeployment'] is False and front['providerDeploymentCreated'] is False, 'frontend candidate remains held for review')
require(digest(front['artifactPath']) == front['artifactSha256'], 'private frontend archive digest')
require(digest(front['fileDigestManifestPath']) == front['fileDigestManifestSha256'], 'frontend file inventory digest')
require(digest(front['logPath']) == front['logSha256'], 'frontend build log digest')
files = json.loads(Path(front['fileDigestManifestPath']).read_text())
built = Path(source['bundlePath']).parent / 'application-source/dist/public'
require(len(files) == front['fileCount'] and all(digest(built / name) == expected for name, expected in files.items()), 'all frontend files match inventory')
require(front['publicBuildEnvironment']['BUILD_SHA'] == sha and front['publicBuildEnvironment']['VITE_USE_MOCK_EMAILS'] == 'false', 'frontend public version and mock-email binding')
accepted = read('accepted-target.json')
require(accepted['targetFingerprintHash'] == fingerprint, 'accepted production target')
require(accepted['head'] == accepted['expectedHead'] == '0111_properties_canonical_place_reference_fk.sql', 'accepted schema head 0111')
require(accepted['manifestDigest'] == '600ccfc5ae5ddc480fe0274edc8a5e3624c2bab32aa3da65f314acd3803cef3c', 'accepted manifest digest')
require(accepted['desiredRows']['place'] == 16944 and sum(accepted['desiredRows'].values()) == 157728, 'accepted national reference cardinality')
require(accepted['heldRows']['place'] == 720 and accepted['pendingRows'] == 0 and accepted['connectionClosed'], 'held Places excluded and reference closed')
require(len(accepted['provinceIds']) == 9, 'all nine admitted provinces bound')
provider = read('provider-config-readback.json')
configs = {item['role']: item for item in provider['railway']}
values = read('configuration-value-digests.json')
require(values['providerMutationsPerformed'] is False, 'configuration readback performed no provider mutations')
for item in values['railway']:
    role = item['role']
    require(item['databaseTargetFingerprintHash'] == fingerprint, role + ' canonical DB target')
    expected_class = 'runtime' if role == 'api' else 'worker'
    require(item['nonsecretAssertions']['DATABASE_CREDENTIAL_CLASS'] == expected_class, role + ' correct credential class')
    require(item['nonsecretAssertions']['DATABASE_AUTHORITY_APPROVED_CREDENTIAL_CLASS'] == expected_class, role + ' matching approval class')
    require(item['nonsecretAssertions']['SAVED_SEARCH_SCHEDULER_ENABLED'] == 'false' and item['nonsecretAssertions']['PAID_MVP_SALES_PAUSED'] == 'true', role + ' scheduler and paid sales held')
    require(not item['databaseMigrationUrlPersisted'], role + ' has no persistent migration credential')
    require(item['currentStaticPreflight']['exit'] != 0 and item['withOnlyPlannedBuildSha']['exit'] == 0 and item['withOnlyPlannedBuildSha']['result']['buildSha'] == sha, role + ' SHA-only static preflight result')
    require(item['databaseConnectionsOpened'] is False, role + ' static preflight opened no DB')
    require(item['serviceId'] == configs[role]['service']['id'], role + ' service identity agreement')
require(len({item['redisTargetIdentitySha256'] for item in values['railway']}) == 1, 'all services agree on Redis identity')
require('cronSchedule' not in configs['lead']['config']['deploy'], 'observed lead cron is absent')
state = read('environment-status.json')
require(not state['pendingWork'] and len(state['services']) == 4, 'only existing services and no pending work observed')
require(all(s['state'] == ('online' if s['serviceName'] == 'Redis' else 'offline') for s in state['services']), 'applications offline and Redis online at observation')
closure = read('custody-closeout.json')
require(closure['state'] == 'COMPLETED_CUSTODY_ARCHIVED', 'reference custody archived')
require(digest(closure['archiveReceiptPath']) == closure['archiveReceiptSha256'], 'private archive receipt checksum')
require(digest(closure['archiveChecksumPath']) == closure['archiveChecksumSha256'], 'private archive inventory checksum')
for line in Path(closure['archiveChecksumPath']).read_text().splitlines():
    expected, name = line.split('  ', 1)
    require(digest(Path(closure['archivePath']) / name) == expected, 'archive preserved: ' + name)
require(all('ActiveState=inactive' in state for state in closure['ownUnitFinalStates'].values()), 'all own units read inactive')
require(not closure['activeOperationKilledOrDeleted'] and not closure['providerMutationsPerformed'], 'custody changed no provider or active operation')
require(len(closure['timerStoppedAtUtc']) == 3, 'actual own timer stopping times preserved')
customer = read('customer-proof-inputs.json')
require(customer['canonicalPlaceId'] == 'pl-place-01-6a145c6d642ba208a2c12de7', 'original North Riding canonical identity')
require(digest(customer['image']['privateFilePath']) == customer['image']['sha256'], 'actual licensed test image file matches provenance')
require(not customer['propertyPublicationAuthorized'] and not customer['organisationIdentityChangeAuthorized'] and not customer['productionWritePerformed'], 'customer proof remained preparation-only')
for item in read('existing-evidence-index.json'):
    require(digest(root / item['path']) == item['sha256'], 'existing evidence unchanged: ' + item['path'])
performance = read('performance-evidence-status.json')
require(performance['liveResult'] is None and performance['state'] == 'HOSTED_MEASUREMENT_NOT_RUN', 'no invented hosted performance result')
require(any(not s['budgetComparison']['readP95Within750ms'] for s in performance['localReadLatencies']), 'earlier performance failures remain visible')
script = root / 'hosted-search-probe.mjs'
require(subprocess.run(['node', '--check', str(script)], capture_output=True).returncode == 0, 'attended search probe parses')
# Only the syntax is checked: the live operator script is never run here.
require(read('database-authority-status.json')['protectedDatabaseConnectionOpened'] is False, 'local authority startup did not connect to production')
report = {'state': 'OFFLINE_PREPARATION_VALIDATED_NOT_DEPLOYED', 'validatedAtUtc': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'checksPassed': len(checks), 'checks': checks, 'hostedProbeExecuted': False, 'productionMutationPerformed': False}
if '--write-report' in sys.argv:
    (root / 'packet-validation.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps({'state': report['state'], 'checksPassed': len(checks), 'productionMutationPerformed': False}))
