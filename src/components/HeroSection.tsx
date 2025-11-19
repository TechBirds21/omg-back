import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { fetchSettings } from '@/lib/api-storefront';
import { ArrowRight } from 'lucide-react';

const HeroSection = () => {
  const [heroData, setHeroData] = useState({
    title: 'O Maguva',
    subtitle: 'Timeless Sarees',
    description: 'Experience the finest handcrafted sarees',
    cta_primary_text: 'Shop Now',
    cta_secondary_text: 'View Collection',
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
            subtitle: heroSection.subtitle || 'Timeless Sarees',
            description: heroSection.description || 'Experience the finest handcrafted sarees',
            cta_primary_text: heroSection.cta_primary_text || 'Shop Now',
            cta_secondary_text: heroSection.cta_secondary_text || 'View Collection',
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
      <section className="relative h-[60vh] md:h-screen bg-stone-50">
        <div className="absolute inset-0 animate-pulse bg-stone-100"></div>
      </section>
    );
  }

  return (
    <section className="relative h-[60vh] md:h-screen w-full overflow-hidden bg-stone-50">
      {/* Background Image - Full Width */}
      {heroData.image && (
        <div className="absolute inset-0">
          <img
            src={heroData.image}
            alt={heroData.title}
            className="w-full h-full object-cover"
            loading="eager"
          />
          {/* Dark Overlay for better text readability */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/50"></div>
        </div>
      )}

      {/* Content Overlay */}
      <div className="relative z-10 h-full flex items-center justify-center">
        <div className="container mx-auto px-6 md:px-12 lg:px-20">
          <div className="max-w-4xl mx-auto text-center space-y-6 md:space-y-8">
            {/* Subtitle */}
            <p className="text-xs md:text-sm tracking-[0.3em] uppercase text-white/90 font-light">
              {heroData.subtitle}
            </p>

            {/* Main Title */}
            <h1 className="text-4xl md:text-6xl lg:text-8xl font-light text-white tracking-tight">
              {heroData.title}
            </h1>

            {/* Description */}
            <p className="text-base md:text-lg lg:text-xl text-white/90 font-light max-w-2xl mx-auto leading-relaxed">
              {heroData.description}
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Link to="/collections">
                <Button
                  size="lg"
                  className="bg-white hover:bg-stone-100 text-stone-900 px-8 md:px-10 py-5 md:py-6 text-xs md:text-sm tracking-wider uppercase font-light border-0 transition-all duration-300 w-full sm:w-auto"
                >
                  {heroData.cta_primary_text}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-6 md:bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
        <div className="w-5 h-8 md:w-6 md:h-10 border-2 border-white/60 rounded-full flex justify-center">
          <div className="w-1 h-2 md:h-3 bg-white/60 rounded-full mt-2"></div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
