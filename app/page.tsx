import { Navbar, Hero, Features, Workflow, Pricing, DocsPreview, Testimonials, Footer } 
  from "@/components/landing";

export default function HomePage() {
  return (
   <main className="bg-black text-white scroll-smooth">
      <Navbar />
      <Hero />
      <Features />
      <Workflow />
      <Pricing />
      <DocsPreview />
      <Testimonials />
      <Footer />
    </main>
  );
}
