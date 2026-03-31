export interface JwtPayload {
  sub: number;
  email: string;
  iat?: number;
  exp?: number;
}

export interface PublicUser {
  id: number;
  email: string;
  name: string;
  avatar: string | null;
  provider: string;
}

export interface OAuthProfile {
  id: string;
  displayName?: string;
  username?: string;
  emails?: Array<{ value: string }>;
  photos?: Array<{ value: string }>;
  name?: {
    givenName?: string;
    familyName?: string;
  };
}
