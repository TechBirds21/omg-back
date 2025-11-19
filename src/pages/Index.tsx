import { useEffect } from 'react';
import Header from '@/components/Header';
import HeroSection from '@/components/HeroSection';
import NewCollections from '@/components/NewCollections';
import FeaturedCollections from '@/components/FeaturedCollections';
import CategorySection from '@/components/CategorySection';
import Footer from '@/components/Footer';

const Index = () => {
  useEffect(() => {
    document.documentElement.style.scrollBehavior = 'smooth';
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <HeroSection />
      <NewCollections />
      <FeaturedCollections />
      <CategorySection />
      <Footer />
    </div>
  );
};

export default Index;
