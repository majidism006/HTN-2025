import { useState, useEffect } from 'react';

interface GroupState {
  groupId: string | null;
  userId: string | null;
  userName: string | null;
  groupCode: string | null;
  groupName: string | null;
}

export function useGroup() {
  const [groupState, setGroupState] = useState<GroupState>({
    groupId: null,
    userId: null,
    userName: null,
    groupCode: null,
    groupName: null,
  });

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('synchrosched-group');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setGroupState(parsed);
        } catch (error) {
          console.error('Error parsing saved group state:', error);
          // Clear corrupted data
          localStorage.removeItem('synchrosched-group');
        }
      }
    } catch (error) {
      console.error('Error accessing localStorage:', error);
    }
  }, []);

  // Save to localStorage whenever state changes
  useEffect(() => {
    if (groupState.groupId) {
      try {
        localStorage.setItem('synchrosched-group', JSON.stringify(groupState));
      } catch (error) {
        console.error('Error saving group state to localStorage:', error);
      }
    }
  }, [groupState]);

  const setGroup = (groupId: string, userId: string, userName: string, groupCode: string, groupName?: string) => {
    setGroupState({ groupId, userId, userName, groupCode, groupName: groupName || null });
  };

  const clearGroup = () => {
    setGroupState({ groupId: null, userId: null, userName: null, groupCode: null, groupName: null });
    try {
      localStorage.removeItem('synchrosched-group');
    } catch (error) {
      console.error('Error clearing group state from localStorage:', error);
    }
  };

  const isInGroup = groupState.groupId !== null;

  return {
    ...groupState,
    setGroup,
    clearGroup,
    isInGroup,
  };
}
