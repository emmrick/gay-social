import { useState } from 'react';
import Hero from '@/components/landing/Hero';
import RegionSelector from '@/components/landing/RegionSelector';
import ChatRoom from '@/components/chat/ChatRoom';
import { regions } from '@/data/mockData';

type AppView = 'landing' | 'regions' | 'chat';

const Index = () => {
  const [currentView, setCurrentView] = useState<AppView>('landing');
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);

  const handleGetStarted = () => {
    setCurrentView('regions');
  };

  const handleSelectRegion = (regionCode: string) => {
    setSelectedRegion(regionCode);
    setCurrentView('chat');
  };

  const handleBackToRegions = () => {
    setSelectedRegion(null);
    setCurrentView('regions');
  };

  const selectedRegionData = regions.find(r => r.code === selectedRegion);

  if (currentView === 'chat' && selectedRegion && selectedRegionData) {
    return (
      <ChatRoom
        regionCode={selectedRegion}
        regionName={selectedRegionData.name}
        memberCount={selectedRegionData.memberCount}
        onBack={handleBackToRegions}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {currentView === 'landing' && (
        <Hero onGetStarted={handleGetStarted} />
      )}
      
      {currentView === 'regions' && (
        <>
          {/* Simple header for regions view */}
          <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-lg">
            <div className="container flex items-center justify-between h-16 px-4">
              <h1 className="font-display text-xl font-bold gradient-text">GayConnect</h1>
            </div>
          </header>
          <RegionSelector onSelectRegion={handleSelectRegion} />
        </>
      )}
    </div>
  );
};

export default Index;
