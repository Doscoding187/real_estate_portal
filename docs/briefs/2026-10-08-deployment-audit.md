# October 2–8 deployment audit

Companion to [the engineering response](2026-10-08-b12-priority-response.md). Dates below are SAST. Provider states were read October 8. REMOVED means superseded/removed, not an independently proven historical outcome. The provider JSON retains full source SHAs; abbreviated SHAs below are for readability.

## Railway production

| Date SAST | Service | Deployment ID | SHA | Current state | Outcome boundary |
|---|---|---|---|---|---|
| 10-02 14:32:33 | Lead job | `97b5939a-d3ad-4c85-9390-f8147cf65531` | `unknown` | SKIPPED | No deployed artifact; excluded from attempted-execution count |
| 10-02 14:37:38 | API | `c35c0e4c-64eb-4044-9a57-5a1e561a13ab` | `cbc18c8fd` | FAILED | Health gate failed; original 12167ms/memory diagnostic, corrected by #585 |
| 10-02 14:37:45 | Lead job | `cb7e8116-00df-4392-afd7-8cde8582349e` | `unknown` | SKIPPED | No deployed artifact; excluded from attempted-execution count |
| 10-02 14:37:55 | Email | `7c377d5a-6e42-41c9-9bf7-9fd5342b522b` | `cbc18c8fd` | REMOVED | Superseded; historical evidence candidates in JSON |
| 10-02 14:38:18 | Lead job | `4d073103-9389-4499-846a-a425d95f219f` | `cbc18c8fd` | REMOVED | Superseded; historical evidence candidates in JSON |
| 10-02 14:47:59 | API | `995e3337-bb38-4545-8e7a-92ad1daed971` | `cbc18c8fd` | FAILED | Health gate failed; original 12167ms/memory diagnostic, corrected by #585 |
| 10-02 16:11:38 | API | `41e1710e-7f88-4795-9462-be086d83c418` | `7f6c65c61` | REMOVED | Superseded; historical evidence candidates in JSON |
| 10-02 16:15:22 | Email | `969ac24a-80f8-418d-bcf0-430e4e73f809` | `7f6c65c61` | REMOVED | Superseded; historical evidence candidates in JSON |
| 10-02 16:17:43 | Lead job | `9b583e76-8c12-4495-928d-417cdbd926ba` | `7f6c65c61` | REMOVED | Superseded; historical evidence candidates in JSON |
| 10-02 18:14:50 | API | `89ffe531-1194-43cd-83ad-8872b1d14bc3` | `b34b6a0ee` | REMOVED | Superseded; historical evidence candidates in JSON |
| 10-02 18:19:28 | Email | `b5aac779-1ad5-407f-b67c-373b72343e4a` | `b34b6a0ee` | REMOVED | Superseded; historical evidence candidates in JSON |
| 10-02 18:23:17 | Lead job | `64838822-59cd-4354-8547-2f92e16b8bf8` | `b34b6a0ee` | REMOVED | Superseded; historical evidence candidates in JSON |
| 10-06 20:18:07 | API | `072491d6-0eeb-44ae-a5d1-c664134a86e9` | `90620e279` | REMOVED | Superseded; historical evidence candidates in JSON |
| 10-06 21:23:06 | API | `2be7f03e-7abf-4878-827a-61cc4ad0a3b2` | `b0bebc343` | REMOVED | Superseded; historical evidence candidates in JSON |
| 10-06 21:30:34 | Email | `58fc8a6e-ad1e-4f0a-b425-3d1379b57deb` | `b0bebc343` | REMOVED | Superseded; historical evidence candidates in JSON |
| 10-06 21:33:05 | Lead job | `53a98f77-c113-4c4c-8625-c25c4a7ce1db` | `b0bebc343` | REMOVED | Superseded; historical evidence candidates in JSON |
| 10-07 14:45:57 | API | `61194cc8-c7cb-4571-870c-e7a7ed82289f` | `c1a1b813a` | REMOVED | Superseded; historical evidence candidates in JSON |
| 10-07 14:53:25 | Email | `c1656fdf-db87-45d2-b0d7-96d227b63ad3` | `c1a1b813a` | REMOVED | Superseded; historical evidence candidates in JSON |
| 10-07 15:00:45 | Lead job | `46c33adc-24b0-4d37-9858-864c31c1860e` | `c1a1b813a` | REMOVED | Superseded; historical evidence candidates in JSON |
| 10-07 15:37:11 | API | `bf4b8ae8-df41-424e-92a3-2b286a63a70a` | `c1a1b813a` | REMOVED | Superseded; historical evidence candidates in JSON |
| 10-07 18:50:29 | API | `c01aee96-4f85-4375-8495-50843c2cbb79` | `51cfb989a` | REMOVED | Superseded; historical evidence candidates in JSON |
| 10-07 18:58:46 | Email | `286a9173-0764-43aa-a226-81f9f36d0ea2` | `51cfb989a` | REMOVED | Superseded; historical evidence candidates in JSON |
| 10-07 19:00:55 | Lead job | `bf2e3336-8842-4791-8a7f-7a445cf91eee` | `51cfb989a` | REMOVED | Superseded; historical evidence candidates in JSON |
| 10-07 21:18:17 | API | `21c29dd2-d3e4-41e3-81fa-e33aa045e867` | `3fb981cb0` | REMOVED | Superseded; historical evidence candidates in JSON |
| 10-07 21:25:33 | Email | `408b324f-f688-41c6-9adf-9d2285729ef2` | `3fb981cb0` | REMOVED | Superseded; historical evidence candidates in JSON |
| 10-07 21:29:59 | Lead job | `4fb40b84-c2f9-4cae-afc8-21b8042036d1` | `3fb981cb0` | REMOVED | Superseded; historical evidence candidates in JSON |
| 10-07 21:50:12 | API | `05f9fd70-cc26-458f-bbbb-95c0bba3e27f` | `3fb981cb0` | REMOVED | Superseded; historical evidence candidates in JSON |
| 10-08 00:15:55 | API | `495723b6-d09b-46c3-bec0-24902f289a06` | `7756376c9` | SUCCESS | Current provider success; see live-readiness limitation |
| 10-08 00:20:36 | Email | `4d18e7ce-084c-486a-87b1-39dca207bdde` | `7756376c9` | SUCCESS | Current provider success; see live-readiness limitation |
| 10-08 00:23:01 | Lead job | `19a8fac1-b750-4a8f-8f5d-1d94e725f460` | `7756376c9` | SUCCESS | Current provider success; see live-readiness limitation |

## Vercel

| Date SAST | Target | Deployment ID | SHA | State | Outcome boundary |
|---|---|---|---|---|---|
| 10-02 00:09:45 | production | `dpl_3vESWZymAuWqEKvGrYTWumWj5QeV` | `4e012b304` | READY | Artifact ready; does not establish joined runtime/customer health |
| 10-02 11:25:47 | preview | `dpl_5SZJCMZiKNSikChf22njPmkgJmYm` | `543db1ff1` | ERROR | Build failed: ENOENT / pnpm build:frontend exit 1; underlying cause not established here |
| 10-02 11:30:01 | preview | `dpl_24RZeNZtFZ7WUcrPMLu1qG9XQZX7` | `967a7afd6` | ERROR | Build failed: ENOENT / pnpm build:frontend exit 1; underlying cause not established here |
| 10-02 12:43:21 | preview | `dpl_6YZwL6KKUhF3CWBE5vST3Ydz3XcS` | `a71949094` | ERROR | Build failed: ENOENT / pnpm build:frontend exit 1; underlying cause not established here |
| 10-02 12:50:08 | preview | `dpl_CEQSim16MSdGmbzhX1ho6rbWjYnW` | `abfa79816` | ERROR | Build failed: ENOENT / pnpm build:frontend exit 1; underlying cause not established here |
| 10-02 13:19:47 | preview | `dpl_DA9C2fWwgr26p1PUV537HJSEPQ98` | `fbdfb5f68` | ERROR | Build failed: ENOENT / pnpm build:frontend exit 1; underlying cause not established here |
| 10-02 14:11:38 | production | `dpl_FPVfX7FmiSjdr4qE8Wyw98PntRYp` | `4e012b304` | READY | Artifact ready; does not establish joined runtime/customer health |
| 10-02 14:56:06 | production | `dpl_AcaCivwV83kBEuFr4G1BBWPXSQYj` | `4e012b304` | READY | Artifact ready; does not establish joined runtime/customer health |
| 10-02 15:20:27 | production | `dpl_4WGk2Y8qbEzQvQipciMaxp5uH9Gr` | `4e012b304` | READY | Artifact ready; does not establish joined runtime/customer health |
| 10-02 15:22:17 | preview | `dpl_VR28ZDeHCMNN8jdSHPZsmjYBhnvY` | `aa9519b4d` | ERROR | Build failed: ENOENT / pnpm build:frontend exit 1; underlying cause not established here |
| 10-02 15:39:27 | preview | `dpl_u4ePN4GbTgMvmy7Sk9Y3GnwSxm9n` | `3160bced9` | ERROR | Build failed: ENOENT / pnpm build:frontend exit 1; underlying cause not established here |
| 10-02 17:01:12 | production | `dpl_71XuCNhzTawfbV3PtGJnyhYGEGCh` | `7f6c65c61` | READY | Artifact ready; does not establish joined runtime/customer health |
| 10-02 17:15:50 | preview | `dpl_9rfPdHCKPPjRcsNoQ6X9wPBd1PXq` | `154f9aaa2` | ERROR | Build failed: ENOENT / pnpm build:frontend exit 1; underlying cause not established here |
| 10-02 18:29:22 | production | `dpl_9h2A4GiPTtKmJqGCWh5eCm1A6gDq` | `b34b6a0ee` | READY | Artifact ready; does not establish joined runtime/customer health |
| 10-06 19:29:43 | preview | `dpl_5nTseXCtAip3TRjMfcEwh9J72gmM` | `6a234902e` | ERROR | Build failed: ENOENT / pnpm build:frontend exit 1; underlying cause not established here |
| 10-06 20:46:31 | preview | `dpl_Gzb7m27cTjj1agHEHgbQJfeagi24` | `7440ab901` | ERROR | Build failed: ENOENT / pnpm build:frontend exit 1; underlying cause not established here |
| 10-06 21:42:42 | production | `dpl_DSvJacyvYjMuuv1VS4hWroseQ3hE` | `b34b6a0ee` | READY | Artifact ready; does not establish joined runtime/customer health |
| 10-06 21:48:18 | production | `dpl_b5rPVYhSc1FR8EUYi1AfWH2BGNh7` | `b0bebc343` | READY | Artifact ready; does not establish joined runtime/customer health |
| 10-07 09:31:28 | preview | `dpl_H4uAs5gB4AEnDDAQBR6Siavfujy8` | `421463419` | ERROR | Build failed: ENOENT / pnpm build:frontend exit 1; underlying cause not established here |
| 10-07 11:09:31 | preview | `dpl_GY9jYdv32iHxsPgkdVkNvrdCtoeC` | `b0cb48f67` | ERROR | Build failed: ENOENT / pnpm build:frontend exit 1; underlying cause not established here |
| 10-07 15:07:03 | production | `dpl_44zMyxLRt9GLPxW5Aatce51Y2DiV` | `c1a1b813a` | READY | Artifact ready; does not establish joined runtime/customer health |
| 10-07 17:50:24 | preview | `dpl_3TjN33CFiDecNQkyFknZH3V52yXk` | `cab3d5d30` | ERROR | Build failed: ENOENT / pnpm build:frontend exit 1; underlying cause not established here |
| 10-07 19:08:07 | production | `dpl_DjfcY3sQp2F72fg2biCMCfm8ZA5G` | `51cfb989a` | READY | Artifact ready; does not establish joined runtime/customer health |
| 10-07 20:27:13 | preview | `dpl_EBrboRVU12jBzv5ArWKqEhiSspy4` | `39db4c33e` | ERROR | Build failed: ENOENT / pnpm build:frontend exit 1; underlying cause not established here |
| 10-07 21:36:32 | production | `dpl_Ha9wvymftfQKE1UxdsBkpvyc4i22` | `3fb981cb0` | READY | Artifact ready; does not establish joined runtime/customer health |
| 10-07 23:51:46 | preview | `dpl_8YMMzqnZTYa27uq9jrvQi695sZzm` | `71c997a1b` | ERROR | Build failed: ENOENT / pnpm build:frontend exit 1; underlying cause not established here |
| 10-08 00:27:23 | production | `dpl_9voWXeyGQw63Un2cb6HgztUgKCyD` | `7756376c9` | READY | Artifact ready; does not establish joined runtime/customer health |
| 10-08 04:17:33 | preview | `dpl_BUnv73VSQpd2Ab8rPKRopjm7r1N2` | `e0164dd41` | ERROR | Build failed: ENOENT / pnpm build:frontend exit 1; underlying cause not established here |
| 10-08 04:47:30 | preview | `dpl_J3Xm6vX9JwGxqnMpAjUUvzjk3pkc` | `74edaeb91` | ERROR | Build failed: ENOENT / pnpm build:frontend exit 1; underlying cause not established here |
| 10-08 11:20:27 | preview | `dpl_9UVMEjgATaa1WMndsB3SdKdGfZ1C` | `499cab892` | ERROR | Build failed: ENOENT / pnpm build:frontend exit 1; underlying cause not established here |
| 10-08 12:26:07 | preview | `dpl_GpxmFpB6YUXNz2NnBN99qqwWZbZY` | `0760bbf41` | ERROR | Build failed: ENOENT / pnpm build:frontend exit 1; underlying cause not established here |
| 10-08 17:56:01 | preview | `dpl_9nuoSyUgbjN6vsgFHqseu1oZMMYC` | `9c28b3aa8` | ERROR | Build failed: ENOENT / pnpm build:frontend exit 1; underlying cause not established here |

## Evidence and scope

- [Railway records](../architecture/launch-readiness-and-product-convergence/evidence/b12-priority-audit-2026-10-08/railway-deployments.json)
- [Vercel records](../architecture/launch-readiness-and-product-convergence/evidence/b12-priority-audit-2026-10-08/vercel-deployments.json)
- 30 Railway records: 28 attempts and two skipped records. Three presently SUCCESS, 23 REMOVED, two FAILED, two SKIPPED. Do not count every removed record as verified successful just because a candidate historical file includes its ID and the word SUCCESS.
- 32 Vercel attempts: 12 READY production artifacts and 20 ERROR previews. No next pagination cursor returned. Latest recorded preview includes senior search evidence SHA 9c28b3aa8, so the earlier conversational statement that it remained unpushed is superseded by this provider observation; this audit did not push it.
- No Railway Testing/Staging records in the date window. Existing Redis deployment predates the window.
- Azure schema/reference operations and AWS configuration/object operations are not app deployments and have no invented deployment IDs. Known work is recorded in the main response. A full Azure/AWS activity-log audit was not performed.
