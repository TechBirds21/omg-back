import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { fetchSettings } from '@/lib/api-storefront';
import { ArrowRight } from 'lucide-react';

const HeroSection = () => {
  const [heroData, setHeroData] = useState({
    title: 'O Maguva',
    subtitle: 'Timeless Elegance',
    description: 'Discover the finest collection of handcrafted sarees that blend traditional artistry with contemporary grace.',
    cta_primary_text: 'Shop Now',
    cta_secondary_text: 'Explore Collections',
    image: null as string | null,
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHeroData = async () => {
      try {
        const settings = await fetchSettings();
        const heroSection = settings?.hero_section;
        
        if (heroSection) {
          setHeroData({
            title: heroSection.title || 'O Maguva',
            subtitle: heroSection.subtitle || 'Timeless Elegance',
            description: heroSection.description || 'Discover the finest collection of handcrafted sarees.',
            cta_primary_text: heroSection.cta_primary_text || 'Shop Now',
            cta_secondary_text: heroSection.cta_secondary_text || 'Explore Collections',
            image: heroSection.images && heroSection.images.length > 0 
              ? heroSection.images[0] 
              : heroSection.image_url || null,
          });
        }
      } catch (error) {
        console.error('Error fetching hero data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHeroData();
  }, []);

  if (loading) {
    return (
      <section className="relative h-[500px] md:h-[600px] bg-gray-100">
        <div className="absolute inset-0 animate-pulse bg-gray-200"></div>
      </section>
    );
  }

  return (
    <section className="relative h-[500px] md:h-[600px] lg:h-[700px] overflow-hidden bg-gray-50">
      {/* Hero Image */}
      <div className="absolute inset-0">
        {heroData.image ? (
          <img
            src={heroData.image}
            alt={heroData.title}
            className="w-full h-full object-cover"
            loading="eager"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-slate-200 via-slate-100 to-slate-200"></div>
        )}
        {/* Overlay */}
        <div className="absolute inset-0 bg-black/30"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 h-full flex items-center">
        <div className="container mx-auto px-4 md:px-6 lg:px-8">
          <div className="max-w-2xl">
            <div className="mb-4">
              <p className="text-white/90 text-sm md:text-base font-medium mb-2 tracking-wider uppercase">
                {heroData.subtitle}
              </p>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight">
                {heroData.title}
              </h1>
              <p className="text-white/90 text-base md:text-lg mb-8 leading-relaxed max-w-xl">
                {heroData.description}
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Link to="/collections">
                <Button 
                  size="lg" 
                  className="bg-white text-slate-900 hover:bg-slate-100 px-6 py-3 text-sm font-medium rounded shadow-sm transition-all duration-300"
                >
                  {heroData.cta_primary_text}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link to="/collections">
                <Button 
                  size="lg" 
                  variant="outline"
                  className="bg-white/10 backdrop-blur-sm border-white/30 text-white hover:bg-white/20 px-6 py-3 text-sm font-medium rounded shadow-sm transition-all duration-300"
                >
                  {heroData.cta_secondary_text}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
