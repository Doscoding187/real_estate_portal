/**
 * Developer identity compatibility boundary.
 *
 * Runtime authority is Developer Organisation + active Membership +
 * first-party Catalogue Publisher. The historical service name remains only
 * so route consumers can be moved without preserving the old `developers`
 * table as an authority.
 */
import { developerIdentityService } from './developerIdentityService';

export type DeveloperProfileResult = Awaited<
  ReturnType<typeof developerIdentityService.getDeveloperByUserId>
> extends infer T
  ? Exclude<T, null>
  : never;

export async function getDeveloperByUserId(userId: number) {
  return developerIdentityService.getDeveloperByUserId(userId);
}

export async function requireDeveloperProfileByUserId(userId: number) {
  return developerIdentityService.requireDeveloperIdentityByUserId(userId);
}
