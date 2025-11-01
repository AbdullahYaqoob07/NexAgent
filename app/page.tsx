import { Navbar, Hero, Features, Workflow, Pricing, DocsPreview, Testimonials, Footer, CTA, FAQ, Selling, Marketplace, AboutUs } 
  from "@/components/landing";

export default function HomePage() {

  return (
   <main className="bg-black text-white scroll-smooth overflow-x-hidden min-h-screen">
      <Navbar />
      <Hero />
      <Features />
      <AboutUs/>
      <Workflow />
      {/* <Pricing />
      <DocsPreview />
      <Testimonials /> */}
      <Marketplace/>
      <Selling/>
      <Pricing/>
      <FAQ/>
      <CTA/>
      <Footer />
    </main>
  );
}
