/**
 * Canonical keys for get-or-create thread uniqueness.
 * Listing: unique per (listing_id, user1_id, user2_id) with user1 < user2.
 * Wanted: unique per (wanted_request_id, user1_id, user2_id) with user1 < user2.
 * Direct: unique per (user1_id, user2_id) with user1 < user2.
 */

export function listingThreadKey(
  listingId: string,
  buyerId: string,
  sellerId: string
): string {
  const [u1, u2] = buyerId < sellerId ? [buyerId, sellerId] : [sellerId, buyerId];
  return `listing:${listingId}:${u1}:${u2}`;
}

export function wantedThreadKey(
  wantedId: string,
  offererId: string,
  ownerId: string
): string {
  const [u1, u2] = offererId < ownerId ? [offererId, ownerId] : [ownerId, offererId];
  return `wanted:${wantedId}:${u1}:${u2}`;
}

export function directThreadKey(userA: string, userB: string): string {
  const [u1, u2] = userA < userB ? [userA, userB] : [userB, userA];
  return `direct:${u1}:${u2}`;
}
