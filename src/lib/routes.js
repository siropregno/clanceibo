// The admin panel lives behind an obscured path so it isn't guessable from
// the sitemap. It is NOT the security boundary (that's the is_admin check in
// Admin.jsx plus RLS on the players table), but keeping the literal in one
// place means the route and the navbar link can never drift apart.
export const ADMIN_PATH = '/panel-ceibo-7f2ac9';
