import { Shield, Award, Heart } from 'lucide-react';

const WhyChooseUs = () => {
  const features = [
    {
      icon: Shield,
      title: "Authentic Craftsmanship",
      description: "Each saree is handcrafted by skilled artisans using traditional techniques, preserving our rich heritage and ensuring unmatched quality."
    },
    {
      icon: Award,
      title: "Premium Quality",
      description: "We source only the finest materials and use the latest technologies along with time-tested methods to deliver products of exceptional quality."
    },
    {
      icon: Heart,
      title: "Timeless Designs",
      description: "Our collections feature classic designs that transcend trends, making each piece a timeless addition to your wardrobe."
    }
  ];

  return (
    <section className="py-12 bg-white relative overflow-hidden">
      <div className="container mx-auto px-4 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-8">
          <h2 className="text-3xl md:text-4xl font-bold mb-3 text-slate-900">
            Why Choose O Maguva?
          </h2>
          <p className="text-slate-600 max-w-2xl mx-auto text-sm">
            Experience the perfect blend of tradition and modernity
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div 
              key={index} 
              className="text-center group relative p-6 rounded-lg bg-white border border-gray-200 hover:shadow-md transition-all duration-300"
            >
              <div className="mx-auto w-16 h-16 bg-slate-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-slate-200 transition-all duration-300">
                <feature.icon className="w-8 h-8 text-slate-700" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                {feature.title}
              </h3>
              <p className="text-slate-600 leading-relaxed text-sm">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhyChooseUs;
