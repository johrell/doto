import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Keyword, CreateKeywordInput, UpdateKeywordInput } from '../types/index.js';

/**
 * Normalized state structure for keywords
 */
interface KeywordState {
  /** Keywords indexed by ID for O(1) lookup */
  byId: Record<string, Keyword>;
  /** Ordered array of all keyword IDs */
  allIds: string[];
}

/**
 * Keyword store actions
 */
interface KeywordActions {
  /** Add a new keyword to the store */
  addKeyword: (input: CreateKeywordInput) => Keyword;
  /** Update an existing keyword */
  updateKeyword: (input: UpdateKeywordInput) => Keyword | null;
  /** Delete a keyword by ID */
  deleteKeyword: (id: string) => boolean;
  /** Get a keyword by ID */
  getKeywordById: (id: string) => Keyword | undefined;
  /** Get all keywords as an array */
  getAllKeywords: () => Keyword[];
}

/**
 * Combined keyword store type
 */
export type KeywordStore = KeywordState & KeywordActions;

/**
 * Generate a unique ID for new keywords
 */
function generateId(): string {
  return `keyword_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Initial state for the keyword store
 */
const initialState: KeywordState = {
  byId: {},
  allIds: [],
};

/**
 * Keyword store with CRUD operations and localStorage persistence
 * Uses normalized data structure for efficient lookups and updates
 * Persists to localStorage key 'doto-keywords'
 */
export const useKeywordStore = create<KeywordStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      addKeyword: (input: CreateKeywordInput): Keyword => {
        const id = generateId();
        
        const keyword: Keyword = {
          id,
          name: input.name,
          color: input.color,
        };

        set((state) => ({
          byId: { ...state.byId, [id]: keyword },
          allIds: [...state.allIds, id],
        }));

        return keyword;
      },

      updateKeyword: (input: UpdateKeywordInput): Keyword | null => {
        const { id, ...updates } = input;
        const existingKeyword = get().byId[id];

        if (!existingKeyword) {
          return null;
        }

        const updatedKeyword: Keyword = {
          ...existingKeyword,
          ...updates,
        };

        set((state) => ({
          byId: { ...state.byId, [id]: updatedKeyword },
        }));

        return updatedKeyword;
      },

      deleteKeyword: (id: string): boolean => {
        const exists = id in get().byId;

        if (!exists) {
          return false;
        }

        set((state) => {
          const { [id]: _removed, ...remainingById } = state.byId;
          return {
            byId: remainingById,
            allIds: state.allIds.filter((keywordId) => keywordId !== id),
          };
        });

        return true;
      },

      getKeywordById: (id: string): Keyword | undefined => {
        return get().byId[id];
      },

      getAllKeywords: (): Keyword[] => {
        const state = get();
        return state.allIds.map((id) => state.byId[id]);
      },
    }),
    {
      name: 'doto-keywords',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        byId: state.byId,
        allIds: state.allIds,
      }),
    }
  )
);
