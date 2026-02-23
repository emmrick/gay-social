import { useIsFetching } from '@tanstack/react-query';

const BackgroundRefreshIndicator = () => {
  const isFetching = useIsFetching();

  // Only show for significant fetching (more than 2 concurrent queries)
  if (isFetching <= 2) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] h-[2px] overflow-hidden">
      <div
        className="h-full bg-primary/40 animate-pulse"
        style={{ width: '100%' }}
      />
    </div>
  );
};

export default BackgroundRefreshIndicator;
