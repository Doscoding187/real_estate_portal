"""Read-only, bounded B12 production observation; no authenticated mutations."""
import datetime
import json
import pathlib
import time
import urllib.error
import urllib.request

OUTPUT = pathlib.Path(__file__).with_name('fresh-readiness-samples.json')
EXPECTED_SHA = '7756376c9ec604b352595b4e4ba8ced73f18562b'
samples = []
for index in range(48):
    started = datetime.datetime.now(datetime.timezone.utc).isoformat()
    before = time.monotonic()
    sample = {'index': index + 1, 'startedAt': started}
    try:
        request = urllib.request.Request('https://api.propertylistifysa.co.za/api/readiness', headers={'Cache-Control': 'no-cache'})
        try:
            response = urllib.request.urlopen(request, timeout=8)
        except urllib.error.HTTPError as error:
            response = error
        with response:
            sample.update(status=response.status, body=json.load(response))
    except Exception as error:
        sample['error'] = str(error)
    sample['durationMs'] = round((time.monotonic() - before) * 1000)
    body = sample.get('body', {})
    sample['passed'] = (sample.get('status') == 200 and sample['durationMs'] <= 8000 and body.get('ok') is True and body.get('build', {}).get('sha') == EXPECTED_SHA and body.get('cache') == {'ok': True, 'mode': 'redis'})
    samples.append(sample)
    OUTPUT.write_text(json.dumps(samples, indent=2) + '\n')
    if not sample['passed']:
        print(json.dumps({'stopped': sample['index'], 'status': sample.get('status'), 'durationMs': sample['durationMs']}), flush=True)
        raise SystemExit(1)
    if index < 47:
        time.sleep(3)
print(json.dumps({'samples': len(samples), 'minMs': min(x['durationMs'] for x in samples), 'maxMs': max(x['durationMs'] for x in samples), 'distinctCompletedAssessments': len(set(x['body']['db']['checkedAt'] for x in samples))}), flush=True)
