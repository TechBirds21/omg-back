// Newsletter section is currently disabled

{/* const NewsletterSection = () => {
  const [email, setEmail] = useState('');
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      toast({
        title: "Subscribed Successfully!",
        description: "Thank you for subscribing to our newsletter.",
      });
      setEmail('');
    }
  };

  return (
    <section className="py-16 bg-primary text-primary-foreground">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="mb-8">
            <Mail className="w-12 h-12 mx-auto mb-4 text-accent" />
            <h2 className="text-3xl lg:text-4xl font-serif font-bold mb-4">
              Stay Updated with O Maguva
            </h2>
            <p className="text-lg text-primary-foreground/80 max-w-2xl mx-auto font-coolvetica">
              Be the first to know about our latest collections, exclusive offers, and style tips.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
            <Input
              type="email"
              placeholder="Enter your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-primary-foreground text-primary border-primary-foreground/20"
            />
            <Button 
              type="submit" 
              variant="outline" 
              className="bg-accent text-accent-foreground border-accent hover:bg-accent/90 whitespace-nowrap"
            >
              Subscribe
            </Button>
          </form>

          <p className="text-sm text-primary-foreground/60 mt-4">
            By subscribing, you agree to our Privacy Policy and Terms of Service.
          </p>
        </div>
      </div>
    </section>
  );
}; */}

const NewsletterSection = () => {
  return null;
};

export default NewsletterSection;
