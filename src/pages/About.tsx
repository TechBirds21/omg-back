import { Heart, Award, Shield, Users } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
// @ts-nocheck
import { useState, useEffect } from 'react';
import { getSettings } from '@/lib/supabase';

// Import saree image for deployment fallback
import sareeMaroon from '@/assets/saree-maroon.jpg';

const About = () => {
  const [aboutData, setAboutData] = useState({
    title: 'Our Story',
    subtitle: 'O Maguva is born from a passion for preserving the timeless art of saree weaving while bringing it to the modern world.',
    description: 'Every thread tells a story, every pattern holds tradition, and every saree is a celebration of Indian heritage.',
    story_title: 'Weaving Dreams into Reality',
    story_content: [
      'Founded with the vision to bridge the gap between traditional craftsmanship and contemporary fashion, O Maguva represents the perfect harmony of heritage and modernity. Our name itself reflects our commitment to quality and elegance.',
      'We work directly with skilled artisans from across India, ensuring that every saree is not just a garment, but a piece of art. Our collections celebrate the rich textile traditions of different regions while incorporating modern design sensibilities.',
      'From the intricate work of Banarasi silks to the delicate handloom cottons, each piece in our collection is carefully curated to meet the highest standards of quality and craftsmanship.'
    ],
    mission_title: 'Our Mission',
    mission_content: 'To make authentic, high-quality sarees accessible to women worldwide while supporting traditional artisans and preserving the rich heritage of Indian textiles. We believe that every woman deserves to feel beautiful, confident, and connected to her roots.',
    values: [
      {
        title: 'Passion',
        description: 'Every saree is crafted with love and dedication to preserve our rich textile heritage.'
      },
      {
        title: 'Quality',
        description: 'We never compromise on quality, ensuring every piece meets the highest standards.'
      },
      {
        title: 'Authenticity',
        description: 'All our products are 100% authentic, sourced directly from skilled artisans.'
      },
      {
        title: 'Community',
        description: 'We support local artisans and contribute to the preservation of traditional crafts.'
      }
    ],
    stats: [
      { number: '500+', label: 'Unique Designs' },
      { number: '50+', label: 'Partner Artisans' },
      { number: '10,000+', label: 'Happy Customers' }
    ],
    cta_title: 'Experience the O Maguva Difference',
    cta_subtitle: 'Discover our exquisite collection and become part of our story',
    cta_button_text: 'Shop Our Collections',
    hero_image: sareeMaroon,
    title_font_size: '32px',
    title_font_weight: '600',
    title_color: '#000000',
    subtitle_font_size: '18px',
    subtitle_color: '#666666',
    description_font_size: '16px',
    description_color: '#888888'
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAboutData = async () => {
      try {
        const settings = await getSettings('about_section');
        if (settings?.value) {
          setAboutData(settings.value);
        }
      } catch (error) {
        
      } finally {
        setLoading(false);
      }
    };

    fetchAboutData();
  }, []);

  const getIconComponent = (title: string) => {
    switch (title.toLowerCase()) {
      case 'passion':
        return Heart;
      case 'quality':
        return Award;
      case 'authenticity':
        return Shield;
      case 'community':
        return Users;
      default:
        return Heart;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="py-16">
          <div className="container mx-auto px-4 text-center">
            <div className="animate-pulse">
              <div className="h-8 bg-muted rounded w-48 mx-auto mb-4"></div>
              <div className="h-4 bg-muted rounded w-96 mx-auto"></div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />
      
      <main>
        {/* Page Header */}
        <section className="py-16 bg-hero-gradient">
          <div className="container mx-auto px-4 text-center">
            <h1 
              className="font-serif font-bold mb-6"
              style={{
                fontSize: aboutData.title_font_size || '48px',
                fontWeight: aboutData.title_font_weight || '700',
                color: aboutData.title_color || '#000000'
              }}
            >
              {aboutData.title}
            </h1>
            <p 
              className="max-w-3xl mx-auto leading-relaxed"
              style={{
                fontSize: aboutData.subtitle_font_size || '18px',
                color: aboutData.subtitle_color || '#666666',
                whiteSpace: 'pre-wrap'
              }}
            >
              {aboutData.subtitle}
            </p>
            {aboutData.description && (
              <p 
                className="max-w-3xl mx-auto leading-relaxed mt-4"
                style={{
                  fontSize: aboutData.description_font_size || '16px',
                  color: aboutData.description_color || '#888888',
                  whiteSpace: 'pre-wrap'
                }}
              >
                {aboutData.description}
              </p>
            )}
          </div>
        </section>

        {/* Story Section */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-6">
                <h2 className="text-3xl font-serif font-bold text-foreground">
                  {aboutData.story_title}
                </h2>
                <div className="space-y-4 text-muted-foreground">
                  {aboutData.story_content.map((paragraph, index) => (
                    <p key={index} style={{ whiteSpace: 'pre-wrap' }}>{paragraph}</p>
                  ))}
                </div>
              </div>
              <div className="relative">
                <div className="aspect-[4/5] rounded-lg overflow-hidden">
                  <img
                    src={aboutData.hero_image}
                    alt="Traditional artisan at work"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Values Section */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-serif font-bold text-foreground mb-4">
                Our Values
              </h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {aboutData.values.map((value, index) => {
                const IconComponent = getIconComponent(value.title);
                return (
                  <div key={index} className="text-center space-y-4">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                      <IconComponent className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="text-xl font-serif font-semibold text-foreground">
                      {value.title}
                    </h3>
                    <p className="text-muted-foreground leading-relaxed" style={{ whiteSpace: 'pre-wrap' }}>
                      {value.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Mission Section */}
        <section className="py-16">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-serif font-bold text-foreground mb-6">
              {aboutData.mission_title}
            </h2>
            <p className="text-lg text-muted-foreground max-w-4xl mx-auto leading-relaxed" style={{ whiteSpace: 'pre-wrap' }}>
              {aboutData.mission_content}
            </p>
          </div>
        </section>

        {/* Statistics Section */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
              {aboutData.stats.map((stat, index) => (
                <div key={index} className="space-y-2">
                  <div className="text-4xl md:text-5xl font-bold text-primary">
                    {stat.number}
                  </div>
                  <div className="text-muted-foreground font-medium">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 bg-primary text-primary-foreground">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-serif font-bold mb-4">
              {aboutData.cta_title}
            </h2>
            <p className="text-lg text-primary-foreground/90 mb-8 max-w-2xl mx-auto">
              {aboutData.cta_subtitle}
            </p>
            <Button 
              size="lg" 
              variant="secondary"
              className="bg-accent text-accent-foreground hover:bg-accent/90"
            >
              {aboutData.cta_button_text}
            </Button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default About;
