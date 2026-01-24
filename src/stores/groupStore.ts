import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Group, CreateGroupInput, UpdateGroupInput } from '../types/index.js';

/**
 * Normalized state structure for groups
 */
interface GroupState {
  /** Groups indexed by ID for O(1) lookup */
  byId: Record<string, Group>;
  /** Ordered array of all group IDs */
  allIds: string[];
}

/**
 * Group store actions
 */
interface GroupActions {
  /** Add a new group to the store */
  addGroup: (input: CreateGroupInput) => Group;
  /** Update an existing group */
  updateGroup: (input: UpdateGroupInput) => Group | null;
  /** Delete a group by ID */
  deleteGroup: (id: string) => boolean;
  /** Get a group by ID */
  getGroupById: (id: string) => Group | undefined;
  /** Get all groups as an array */
  getAllGroups: () => Group[];
}

/**
 * Combined group store type
 */
export type GroupStore = GroupState & GroupActions;

/**
 * Generate a unique ID for new groups
 */
function generateId(): string {
  return `group_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Initial state for the group store
 */
const initialState: GroupState = {
  byId: {},
  allIds: [],
};

/**
 * Group store with CRUD operations and localStorage persistence
 * Uses normalized data structure for efficient lookups and updates
 * Persists to localStorage key 'doto-groups'
 */
export const useGroupStore = create<GroupStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      addGroup: (input: CreateGroupInput): Group => {
        const id = generateId();

        const group: Group = {
          id,
          name: input.name,
          color: input.color,
        };

        set((state) => ({
          byId: { ...state.byId, [id]: group },
          allIds: [...state.allIds, id],
        }));

        return group;
      },

      updateGroup: (input: UpdateGroupInput): Group | null => {
        const { id, ...updates } = input;
        const existingGroup = get().byId[id];

        if (!existingGroup) {
          return null;
        }

        const updatedGroup: Group = {
          ...existingGroup,
          ...updates,
        };

        set((state) => ({
          byId: { ...state.byId, [id]: updatedGroup },
        }));

        return updatedGroup;
      },

      deleteGroup: (id: string): boolean => {
        const exists = id in get().byId;

        if (!exists) {
          return false;
        }

        set((state) => {
          const { [id]: _removed, ...remainingById } = state.byId;
          return {
            byId: remainingById,
            allIds: state.allIds.filter((groupId) => groupId !== id),
          };
        });

        return true;
      },

      getGroupById: (id: string): Group | undefined => {
        return get().byId[id];
      },

      getAllGroups: (): Group[] => {
        const state = get();
        return state.allIds.map((id) => state.byId[id]);
      },
    }),
    {
      name: 'doto-groups',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        byId: state.byId,
        allIds: state.allIds,
      }),
    }
  )
);
