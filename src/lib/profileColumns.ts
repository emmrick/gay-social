/**
 * Safe (cross-user readable) columns on the `profiles` table.
 * Sensitive columns (first_name, last_name, phone_number, latitude, longitude,
 * location_updated_at) are revoked from `authenticated` role at SQL level
 * and must be fetched via dedicated RPCs:
 *   - get_my_private_profile()        → owner reads their own private data
 *   - admin_get_full_profile(user_id) → admin/moderator reads any profile
 *   - admin_search_profiles(query)    → admin/moderator search by name/phone
 */
export const PROFILE_SAFE_COLUMNS = [
  'id',
  'user_id',
  'username',
  'avatar_url',
  'region',
  'bio',
  'is_online',
  'last_seen',
  'created_at',
  'updated_at',
  'age',
  'sexual_position',
  'looking_for',
  'body_type',
  'height',
  'weight',
  'ethnicity',
  'relationship_status',
  'hiv_status',
  'tribes',
  'accepts_nsfw',
  'show_face',
  'endowment',
  'position_detail',
  'is_verified',
  'is_premium',
  'hide_online_status',
  'hide_last_seen',
  'theme_preference',
  'birth_date',
  'show_birthday',
  'first_verified_at',
  'couple_account_id',
  'couple_role',
].join(', ');
