// Temporary in-memory stores for the OAuth dance.
// These only need to survive for the duration of a single auth flow (~minutes).

export interface PendingAuth {
  clientRedirectUri: string;
  clientState: string;
  codeChallenge: string;
  codeChallengeMethod: string;
}

export interface PendingToken {
  encryptedToken: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  clientRedirectUri: string;
}

// Contentstack state → client auth info (set in /authorize, cleared in /callback)
export const pendingAuths = new Map<string, PendingAuth>();

// Our short-lived code → encrypted token (set in /callback, cleared in /token)
export const pendingTokens = new Map<string, PendingToken>();
