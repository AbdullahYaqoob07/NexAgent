import { Navbar, Hero, Features, AboutUs, Workflow, Pricing, DocsPreview, Testimonials, Footer }
  from "@/components/landing";

export default function HomePage() {
  // Firebase console test
  if (typeof window !== 'undefined') {
    import('@/lib/firebase').then(({ auth, db }) => {
      console.log('🔥 Firebase Test Starting...');
      console.log('Auth:', auth);
      console.log('Database:', db);
      console.log('✅ Firebase imported successfully!');
    }).catch(err => {
      console.error('❌ Firebase import failed:', err);
    });
  }

  return (
   <main className="bg-black text-white scroll-smooth overflow-x-hidden min-h-screen">
      <Navbar />
      <Hero />
      <Features />
      <AboutUs />
      <Workflow />
      <Pricing />
      <DocsPreview />
      <Testimonials />
      <Footer />
    </main>
  );
}
