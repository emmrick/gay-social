import { useEffect, useState } from 'react';
import { useSearchParams, useOutletContext } from 'react-router-dom';
import UserManagementPanel from '@/components/admin/UserManagementPanel';
import type { AdminOutletContext } from '../AdminLayout';

const MembersPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialUserId = searchParams.get('user');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(initialUserId);

  // Sync URL ↔ state
  useEffect(() => {
    if (selectedUserId !== initialUserId) {
      const next = new URLSearchParams(searchParams);
      if (selectedUserId) next.set('user', selectedUserId);
      else next.delete('user');
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUserId]);

  return (
    <UserManagementPanel
      initialUserId={selectedUserId}
      onUserSelected={setSelectedUserId}
    />
  );
};

export default MembersPage;
