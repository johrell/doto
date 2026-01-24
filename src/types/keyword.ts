/**
 * Keyword interface
 * Keywords are used to tag and categorize tasks
 */
export interface Keyword {
  /** Unique identifier for the keyword */
  id: string;
  /** Display name of the keyword */
  name: string;
  /** Color for visual representation (hex format, e.g., '#ff5733') */
  color: string;
}

/**
 * Type for creating a new keyword (without id, as it will be generated)
 */
export type CreateKeywordInput = Omit<Keyword, 'id'>;

/**
 * Type for updating an existing keyword (all fields optional except id)
 */
export type UpdateKeywordInput = Partial<Omit<Keyword, 'id'>> & { id: string };
