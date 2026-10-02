export interface IKingsChatJwtPayload {
  id: string;
  name?: string;
}

export interface IKingsChatApiRes {
  profile: IKingsChatProfile;
}

export interface IKingsChatProfile {
  user: IKingsChatProfileUser;
  gender: string;
  email: IKingsChatProfileEmail;
  phone_number: string;
  country_code: string;
  has_password: boolean;
  birth_date_in_millis: number;
  connected_to_facebook: boolean;
  facebook_name: string;
  blocked_user_ids: string[];
  hidden_user_ids: string[];
  followed_superuser_ids: string[];
  subscribed_superuser_ids: string[];
  barcode_id: string;
  barcode_color: string;
  church: string;
  cloud_space: number;
  used_space: number;
}

export interface IKingsChatProfileUser {
  name: string;
  user_id: string;
  superuser: string;
  avatar_url: string;
  username: string;
  is_blogger: boolean;
  presence: IKingsChatProfilePresence;
  private_account: boolean;
  posts_count: number;
  user_bio: string;
  avatar_main_color: string;
  badge_ids: string[];
}

export interface IKingsChatProfilePresence {
  presence: [string, IKingsChatProfilePresence2];
}

export interface IKingsChatProfilePresence2 {
  last_seen_in_millis: number;
}

export interface IKingsChatProfileEmail {
  address: string;
  verified: boolean;
}

export interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
  token_type: string;
}

export interface GoogleUserProfile {
  id: string;
  email: string;
  verified_email: boolean;
  name: string;
  picture: string;
  locale?: string;
  given_name?: string;
  family_name?: string;
}
