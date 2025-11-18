import { useEffect } from 'react';
import Header from '@/components/Header';
import HeroSection from '@/components/HeroSection';
import NewCollections from '@/components/NewCollections';
import ProductVideosSection from '@/components/ProductVideosSection';
import FeaturedCollections from '@/components/FeaturedCollections';
import CategorySection from '@/components/CategorySection';
import Footer from '@/components/Footer';

const Index = () => {
  useEffect(() => {
    // Smooth scroll behavior
    document.documentElement.style.scrollBehavior = 'smooth';
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      {/* Hero Section */}
      <HeroSection />

      {/* New Arrivals / Fresh Arrivals */}
      <NewCollections />

      {/* Product Videos Section */}
      <ProductVideosSection />

      {/* Featured Collections */}
      <FeaturedCollections />

      {/* Shop by Category */}
      <CategorySection />

      <Footer />
    </div>
  );
};

export default Index;
