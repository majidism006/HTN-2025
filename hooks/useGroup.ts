import { useState, useEffect } from 'react';

interface GroupState {
  groupId: string | null;
  userId: string | null;
  userName: string | null;
  groupCode: string | null;
}

export function useGroup() {
  const [groupState, setGroupState] = useState<GroupState>({
    groupId: null,
    userId: null,
    userName: null,
    groupCode: null,
  });

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('synchrosched-group');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setGroupState(parsed);
      } catch (error) {
        console.error('Error parsing saved group state:', error);
      }
    }
  }, []);

  // Save to localStorage whenever state changes
  useEffect(() => {
    if (groupState.groupId) {
      localStorage.setItem('synchrosched-group', JSON.stringify(groupState));
    }
  }, [groupState]);

  const setGroup = (groupId: string, userId: string, userName: string, groupCode: string) => {
    setGroupState({ groupId, userId, userName, groupCode });
  };

  const clearGroup = () => {
    setGroupState({ groupId: null, userId: null, userName: null, groupCode: null });
    localStorage.removeItem('synchrosched-group');
  };

  const isInGroup = groupState.groupId !== null;

  return {
    ...groupState,
    setGroup,
    clearGroup,
    isInGroup,
  };
}
