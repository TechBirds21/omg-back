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
      <section className="relative h-screen bg-stone-50">
        <div className="absolute inset-0 animate-pulse bg-stone-100"></div>
      </section>
    );
  }

  return (
    <section className="relative min-h-screen w-full overflow-hidden bg-white">
      <div className="container mx-auto px-6 md:px-12 lg:px-20">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center min-h-screen py-20 lg:py-0">

          {/* Left Content */}
          <div className="space-y-8 text-center lg:text-left order-2 lg:order-1">
            {/* Subtitle */}
            <p className="text-sm md:text-base tracking-[0.3em] uppercase text-stone-500 font-light">
              {heroData.subtitle}
            </p>

            {/* Main Title */}
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-light text-stone-900 tracking-tight leading-tight">
              {heroData.title}
            </h1>

            {/* Description */}
            <p className="text-lg md:text-xl text-stone-600 font-light leading-relaxed max-w-xl mx-auto lg:mx-0">
              {heroData.description}
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start pt-4">
              <Link to="/collections">
                <Button
                  size="lg"
                  className="bg-stone-900 hover:bg-stone-800 text-white px-10 py-6 text-sm tracking-wider uppercase font-light border-0 transition-all duration-300"
                >
                  {heroData.cta_primary_text}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Right Image */}
          <div className="order-1 lg:order-2">
            <div className="relative w-full aspect-[3/4] lg:aspect-[4/5] overflow-hidden bg-stone-100">
              {heroData.image ? (
                <img
                  src={heroData.image}
                  alt={heroData.title}
                  className="w-full h-full object-cover"
                  loading="eager"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-stone-100 to-stone-200">
                  <span className="text-stone-400 text-sm tracking-wider uppercase font-light">
                    No Image Available
                  </span>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce hidden lg:block">
        <div className="w-6 h-10 border-2 border-stone-400 rounded-full flex justify-center">
          <div className="w-1 h-3 bg-stone-400 rounded-full mt-2"></div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
