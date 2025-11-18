const StatsSection = () => {
  const stats = [
    {
      number: "10,000+",
      label: "Happy Customers"
    },
    {
      number: "4.9/5",
      label: "Average Rating"
    },
    {
      number: "500+",
      label: "Unique Designs"
    },
    {
      number: "99%",
      label: "Customer Satisfaction"
    }
  ];

  return (
    <section className="py-12 bg-white relative overflow-hidden">
      <div className="container mx-auto px-4 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <div 
              key={index} 
              className="text-center group p-4 rounded-lg bg-slate-50 border border-gray-200 hover:shadow-sm transition-all duration-300"
            >
              <div className="text-3xl md:text-4xl font-bold mb-2 text-slate-900">
                {stat.number}
              </div>
              <div className="text-sm font-medium text-slate-600">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default StatsSection;
