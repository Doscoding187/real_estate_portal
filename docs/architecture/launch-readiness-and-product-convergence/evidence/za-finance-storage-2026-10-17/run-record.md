# D6 af-south-1 run record — 2026-10-17 (UTC)

Attended AWS CloudShell session. Edward performed every console/CloudShell
action; the agent supplied the reviewed repository artifacts and commands.
Region `af-south-1` was just enabled in the account before the run (console
showed "enabling" then active).

## 1. Operator identity readback (deployer = console session)

```
$ aws sts get-caller-identity
{
    "UserId": "914683204061",
    "Account": "914683204061",
    "Arn": "arn:aws:iam::914683204061:root"
}
```

Root deployer recorded. The reviewed template deliberately rejects root as the
`OperatorArn` parameter (allowed pattern `user|role` only), so a dedicated
non-root operator principal was created. Account root remains an automatic
exception in the generated bucket policies.

## 2. Dedicated operator user (no login, no access keys)

```
$ aws iam create-user --user-name listify-finance-operator \
    --tags Key=purpose,Value=finance-storage-operator Key=owner,Value=Edward
{
    "User": {
        "Path": "/",
        "UserName": "listify-finance-operator",
        "UserId": "AIDA5J526CHOQPJTUOJAQ",
        "Arn": "arn:aws:iam::914683204061:user/listify-finance-operator",
        "CreateDate": "2026-10-17T22:14:59+00:00",
        "Tags": [
            { "Key": "purpose", "Value": "finance-storage-operator" },
            { "Key": "owner", "Value": "Edward" }
        ]
    }
}

$ aws iam get-user --user-name listify-finance-operator \
    --query 'User.[UserName,Arn]' --output text
listify-finance-operator	arn:aws:iam::914683204061:user/listify-finance-operator
```

## 3. Template fetch and stack deploy

```
$ curl -fsSL -o finance-storage.template.json \
    https://raw.githubusercontent.com/Doscoding187/real_estate_portal/main/scripts/storage/south-african-finance-storage.template.json

$ aws cloudformation deploy --region af-south-1 \
    --stack-name listify-finance-af-south-1 \
    --template-file finance-storage.template.json \
    --parameter-overrides OperatorArn=arn:aws:iam::914683204061:user/listify-finance-operator \
    --capabilities CAPABILITY_IAM
```

Stack outputs readback:

```
$ aws cloudformation describe-stacks --region af-south-1 \
    --stack-name listify-finance-af-south-1 \
    --query 'Stacks[0].Outputs[].{Key:OutputKey,Value:OutputValue}' --output table
+-----------------------+--------------------------------------------------------+
|          Key          |                         Value                          |
+-----------------------+--------------------------------------------------------+
|  FinanceBackupBucket  |  listify-finance-af-south-1-financebackup-kce1wayc2h2e |
|  Region               |  af-south-1                                            |
|  ProofRuntimeUser     |  listify-finance-af-south-1-ProofRuntimeUser-AZx3gkrzcgMx |
|  FinancePrimaryBucket |  listify-finance-914683204061-af-south-1               |
+-----------------------+--------------------------------------------------------+
```

Stack status readback:

```
$ aws cloudformation describe-stacks --region af-south-1 \
    --stack-name listify-finance-af-south-1 \
    --query 'Stacks[0].[StackId,StackStatus]' --output text
arn:aws:cloudformation:af-south-1:914683204061:stack/listify-finance-af-south-1/4e86f630-ca78-11f1-b384-0effe60af513	CREATE_COMPLETE
```

Deployed template hash (repository copy; the deployed file was fetched from the
same public `main` raw source): SHA-256
`7845e994054c7a97af68c638d67238649484202bab1ec03d63853efb786656b7`.

## 4. Operator policy attachment

```
$ aws iam put-user-policy --user-name listify-finance-operator \
    --policy-name FinanceStorageOperator \
    --policy-document file://finance-operator-policy.json

$ aws iam get-user-policy --user-name listify-finance-operator \
    --policy-name FinanceStorageOperator --query PolicyDocument --output json
```

Readback equals [operator-policy.json](operator-policy.json): `s3:*` on the
four ARNs of the two finance buckets only.

## 5. Control-plane verification

```
$ mkdir -p ~/za-verify && cd ~/za-verify
$ curl -fsSL -o southAfricanFinanceStorage.ts \
    https://raw.githubusercontent.com/Doscoding187/real_estate_portal/main/scripts/storage/southAfricanFinanceStorage.ts
$ curl -fsSL -o verifySouthAfricanFinanceStorage.ts \
    https://raw.githubusercontent.com/Doscoding187/real_estate_portal/main/scripts/storage/verifySouthAfricanFinanceStorage.ts
$ npm install --silent @aws-sdk/client-s3
$ npx -y tsx verifySouthAfricanFinanceStorage.ts \
    listify-finance-914683204061-af-south-1 \
    listify-finance-af-south-1-financebackup-kce1wayc2h2e \
    arn:aws:iam::914683204061:user/listify-finance-af-south-1-ProofRuntimeUser-AZx3gkrzcgMx \
    arn:aws:iam::914683204061:user/listify-finance-operator
```

First attempt stopped before any AWS call: `tsx`/esbuild rejected top-level
await under the folder's default CommonJS output
(`ERROR: Top-level await is currently not supported with the "cjs" output
format`). Fixed with `npm pkg set type=module`; the failed attempt made no AWS
request.

Second run output equals [verification.json](verification.json) —
`status: control_plane_verified`, `checkedAt: 2026-10-17T22:33:32.558Z`.

Environment note emitted by the SDK during the run: Node v20.20.2 warning that
AWS SDK v3 releases published after the first week of January 2027 require
Node ≥22 — benign for this run; noted in the packet for the future
runtime-credential phase.

## 6. Explicit non-actions

- No access keys, login profiles or MFA devices were created for any identity.
- No bucket objects were written; the verifier is read-only.
- eu-north-1 resources, the media uploader identity, media bucket/CORS and all
  application/hosted configuration were not touched.
- No migration, restore or binding was attempted; the verifier flags
  `runtimePermissionsExercised`, `recoveryExercised` and `migrationCompleted`
  all `false`.
