import { Navbar, Hero, Features, AboutUs, Workflow, Pricing, DocsPreview, Testimonials, Footer }
  from "@/components/landing";

export default function HomePage() {
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
