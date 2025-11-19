import { useState, useEffect } from 'react';
import { fetchProducts, Product } from '@/lib/api-storefront';
import ScrollVideoPlayer from './ScrollVideoPlayer';

const ProductVideosSection = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProductsWithVideos = async () => {
      try {
        setLoading(true);
        // Fetch products that have videos
        const data = await fetchProducts({ limit: 20 });
        // Filter products that have video_url
        const productsWithVideos = data.filter(product => product.video_url);
        setProducts(productsWithVideos);
      } catch (error) {
        console.error('Error fetching products with videos:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProductsWithVideos();
  }, []);

  if (loading) {
    return (
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4 md:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl md:text-4xl font-bold mb-3 text-slate-900">
              Product Videos
            </h2>
          </div>
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
          </div>
        </div>
      </section>
    );
  }

  if (products.length === 0) {
    return null; // Don't show section if no videos
  }

  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4 md:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-3 text-slate-900">
            Product Videos
          </h2>
          <p className="text-slate-600 max-w-2xl mx-auto text-sm">
            Watch our products in action
          </p>
        </div>

        {/* Videos Grid - Scrollable */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <div key={product.id} className="space-y-3">
              <ScrollVideoPlayer
                videoUrl={product.video_url!}
                className="rounded-lg overflow-hidden"
                poster={product.images?.[product.cover_image_index || 0]}
              />
              <div className="text-center">
                <h3 className="text-sm font-medium text-slate-900 line-clamp-2">
                  {product.name}
                </h3>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProductVideosSection;

