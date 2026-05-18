// Single source of truth for how a barber's rating is rendered.
// Task 8: with 0 reviews we must NOT show a number (no fake fallback like
// 4.8) — show "Nuovo" instead, consistently across profile / map / list /
// preview card / booking sheet.

export interface RatingInput {
  rating?: number | null
  reviewsCount?: number | null
}

export interface RatingDisplay {
  /** Text to render where the rating number would go (e.g. "4.8" or "Nuovo"). */
  label: string
  /** True when there is at least one review (so the number is meaningful). */
  hasReviews: boolean
  /** Same as `rating` but normalized to 0 when missing — for star icons. */
  numeric: number
}

export function ratingDisplay({ rating, reviewsCount }: RatingInput): RatingDisplay {
  const count = reviewsCount ?? 0
  if (count <= 0 || typeof rating !== 'number') {
    return { label: 'Nuovo', hasReviews: false, numeric: 0 }
  }
  return { label: rating.toFixed(1), hasReviews: true, numeric: rating }
}
