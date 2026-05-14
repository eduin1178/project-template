export const COMMENT_EDIT_WINDOW_MINUTES = 60;

const COMMENT_EDIT_WINDOW_MS = COMMENT_EDIT_WINDOW_MINUTES * 60 * 1000;

export function isWithinEditWindow(
  createdAt: Date,
  now: Date = new Date(),
): boolean {
  return now.getTime() - createdAt.getTime() < COMMENT_EDIT_WINDOW_MS;
}
