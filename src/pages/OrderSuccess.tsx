import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, Package, Truck, Mail } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const OrderSuccess = () => {
  useEffect(() => {
    // Scroll to top when component mounts
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen">
      <Header />
      
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto text-center">
          <div className="mb-8">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-3xl font-serif font-bold text-foreground mb-2">
              Order Placed Successfully!
            </h1>
            <p className="text-lg text-muted-foreground">
              Thank you for your purchase. Your order has been received and is being processed.
            </p>
          </div>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle>What happens next?</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                    <Mail className="h-4 w-4 text-primary-foreground" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-medium text-foreground">Order Confirmation</h3>
                    <p className="text-sm text-muted-foreground">
                      You'll receive an email confirmation with your order details shortly.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                    <Package className="h-4 w-4 text-primary-foreground" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-medium text-foreground">Order Processing</h3>
                    <p className="text-sm text-muted-foreground">
                      We'll prepare your order within 24-48 hours and perform quality checks.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                    <Truck className="h-4 w-4 text-primary-foreground" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-medium text-foreground">Shipping & Delivery</h3>
                    <p className="text-sm text-muted-foreground">
                      Your order will be shipped and you'll receive tracking information.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/collections">
                <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90">
                  Continue Shopping
                </Button>
              </Link>
              <Link to="/contact">
                <Button variant="outline" size="lg">
                  Contact Support
                </Button>
              </Link>
            </div>
            
            <p className="text-sm text-muted-foreground">
              Need help? Contact us at <a href="mailto:support@omaguva.com" className="text-primary hover:underline">support@omaguva.com</a> or call <a href="tel:+917680041607" className="text-primary hover:underline">+91 7680041607</a>
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default OrderSuccess;
