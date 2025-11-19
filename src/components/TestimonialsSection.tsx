// @ts-nocheck
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Star, ChevronLeft, ChevronRight } from 'lucide-react';
import { fetchTestimonials, Testimonial } from '@/lib/api-storefront';

const TestimonialsSection = () => {
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTestimonials = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchTestimonials();
        setTestimonials(data);
      } catch (error) {
        
        setError('Failed to load testimonials');
      } finally {
        setLoading(false);
      }
    };

    fetchTestimonials();
  }, []);

  const nextTestimonial = useCallback(() => {
    if (!testimonials || testimonials.length === 0) return;
    setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
  }, [testimonials]);

  const prevTestimonial = useCallback(() => {
    if (!testimonials || testimonials.length === 0) return;
    setCurrentTestimonial((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  }, [testimonials]);

  // Memoize testimonial content and related computed values to prevent unnecessary re-renders
  const currentTestimonialContent = useMemo(() => {
    if (!testimonials || !Array.isArray(testimonials) || testimonials.length === 0) return null;
    return testimonials[currentTestimonial];
  }, [testimonials, currentTestimonial]);

  const stars = useMemo(() => {
    return Array(currentTestimonialContent?.rating || 5).fill(0);
  }, [currentTestimonialContent?.rating]);

  const initials = useMemo(() => {
    const name = currentTestimonialContent?.customer_name || '';
    return name ? name.split(' ').map(n => n[0]).join('') : '';
  }, [currentTestimonialContent?.customer_name]);
  if (loading) {
    return (
      <section className="py-16 bg-secondary/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-serif font-bold text-foreground mb-4">
              What Our Customers Say
            </h2>
            <p className="text-muted-foreground">
              Loading testimonials...
            </p>
          </div>
        </div>
      </section>
    );
  }

  if (error || testimonials.length === 0) {
    return (
      <section className="py-16 bg-secondary/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-serif font-bold text-foreground mb-4">
              What Our Customers Say
            </h2>
            <p className="text-muted-foreground">
              {error || 'No testimonials available'}
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-12 bg-slate-50 relative overflow-hidden">
      <div className="container mx-auto px-4 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-8">
          <h2 className="text-3xl md:text-4xl font-bold mb-3 text-slate-900">
            What Our Customers Say
          </h2>
          <p className="text-slate-600 text-sm">
            Hear from our satisfied customers about their experience with O Maguva
          </p>
        </div>

        {/* Testimonial Card */}
        <div className="max-w-4xl mx-auto">
          <Card className="p-8 text-center shadow-sm bg-white border border-gray-200 rounded-lg">
            <div className="relative z-10">
              <div className="flex justify-center mb-6">
                {stars.map((_, i) => (
                  <Star key={i} className="w-5 h-5 text-yellow-400 fill-yellow-400 mx-1" />
                ))}
              </div>
              
              <blockquote className="text-lg text-slate-800 mb-6 leading-relaxed" style={{ whiteSpace: 'pre-wrap' }}>
                "{currentTestimonialContent?.content}"
              </blockquote>

              <div className="flex items-center justify-center space-x-4 mb-6">
                {currentTestimonialContent?.image_url ? (
                  <div className="relative">
                    <img 
                      src={currentTestimonialContent.image_url} 
                      alt={currentTestimonialContent.customer_name}
                      className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                ) : (
                  <div className="relative">
                    <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center">
                      <span className="text-slate-700 font-semibold text-sm">
                        {initials}
                      </span>
                    </div>
                  </div>
                )}
                <div className="text-left">
                  <div className="font-semibold text-base text-slate-900">
                    {currentTestimonialContent?.customer_name}
                  </div>
                  {currentTestimonialContent?.customer_location && (
                    <div className="text-sm text-slate-600">
                      {currentTestimonialContent.customer_location}
                    </div>
                  )}
                </div>
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-center space-x-4 mt-6">
                <Button
                  size="icon"
                  onClick={prevTestimonial}
                  disabled={testimonials.length <= 1}
                  className="rounded-full bg-white hover:bg-slate-50 text-slate-700 border border-gray-200 shadow-sm hover:scale-110 transition-all duration-300 w-10 h-10"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                
                <div className="flex space-x-2">
                  {testimonials.map((_, index) => (
                    <button
                      key={index}
                      className={`w-2 h-2 rounded-full transition-all duration-300 ${
                        index === currentTestimonial 
                          ? 'bg-slate-900 scale-125' 
                          : 'bg-gray-300 hover:bg-gray-400'
                      }`}
                      onClick={() => setCurrentTestimonial(index)}
                    />
                  ))}
                </div>

                <Button
                  size="icon"
                  onClick={nextTestimonial}
                  disabled={testimonials.length <= 1}
                  className="rounded-full bg-white hover:bg-slate-50 text-slate-700 border border-gray-200 shadow-sm hover:scale-110 transition-all duration-300 w-10 h-10"
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
