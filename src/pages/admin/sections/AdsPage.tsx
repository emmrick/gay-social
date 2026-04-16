import { useOutletContext } from 'react-router-dom';
import AdsManagementPanel from '@/components/admin/AdsManagementPanel';
import type { AdminOutletContext } from '../AdminLayout';

const AdsPage = () => {
  const { taskEntityId } = useOutletContext<AdminOutletContext>();
  return <AdsManagementPanel initialAdId={taskEntityId || undefined} />;
};

export default AdsPage;
