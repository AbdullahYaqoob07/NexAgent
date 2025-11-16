"use client";

import Image from "next/image";

const AboutUs = () => {
  const metrics = [
    {
      number: "2025",
      title: "Year of establishment",
      subtitle: "More than 03 years in the field",
      thumbs: ["/assets/about/Image1.svg"]
    },
    {
      number: "15",
      title: "Projects are launched",
      subtitle: "A lot of projects are done",
      thumbs: ["/assets/about/Image2.svg"]
    },
    {
      number: "120",
      title: "Clients are satisfied",
      subtitle: "These people love us",
      thumbs: ["/assets/about/Image3.svg"]
    },
    {
      number: "07",
      title: "Projects in work",
      subtitle: "What we do right now",
      thumbs: ["/assets/about/Image4.svg"]
    }
  ];

 

  return (
    <section id="about" className="py-20 bg-black relative">
      {/* Dot background overlay above black */}
      <div className="absolute top-10 right-10 h-full w-2/5 z-10 opacity-100 pointer-events-none">
        <Image src="/assets/about/Dot-BG.svg" alt="Background Pattern" fill className="object-cover" />
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-20">
        {/* Intro text with centered layout and dot bg behind */}
        <div className="relative text-center max-w-4xl mx-auto mb-10 md:mb-24">
          <div className="absolute top-0 right-0 h-full w-2/3 opacity-25 pointer-events-none">
            <Image src="/assets/about/Dot-BG.svg" alt="Dots" fill className="object-cover" />
          </div>
          <p className="relative text-[16px] md:text-[18px] leading-7 text-white/90" style={{ fontFamily: 'Poppins, sans-serif' }}>
            Whether you're designing for personal projects, creative teams, or large-scale campaigns, our AI-powered platform is built to bring your ideas to life—quickly, beautifully, and intelligently.<br />
            And the results? The numbers speak for themselves:
          </p>
        </div>

        {/* Metrics row */}
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12">
          {metrics.map((m, i) => (
            <div key={i} className={`${i % 2 === 0 ? 'lg:-mt-10' : 'lg:mt-10'}`}>
              {/* Number */}
              <div className="text-white font-medium" style={{ fontFamily: 'Poppins, sans-serif' }}>
                <span className="text-5xl md:text-6xl lg:text-7xl tracking-tight">{m.number}</span>
              </div>
              
              {/* Titles */}
              <div className="mt-4">
                <p className="text-white text-lg md:text-xl" style={{ fontFamily: 'Poppins, sans-serif' }}>{m.title}</p>
                <p className="text-white/60 text-sm mt-2" style={{ fontFamily: 'Poppins, sans-serif' }}>{m.subtitle}</p>
              </div>

              

  

              {/* Bottom thumbnails */}
              <div className={`${i % 2 === 0 ? 'mt-' : 'mt-6'}`}>
                {m.thumbs.map((src, idx) => (
                    <Image key={idx} src={src} alt={`thumb-${idx}`} width={280} height={180} className="rounded-lg object-cover" />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-12 text-center">
          <button className="bg-[#FF6900] hover:bg-[#e55a00] text-white px-8 py-3 rounded-md font-medium transition-colors duration-200 inline-flex items-center gap-2">
            Get Started
            <Image src="/assets/about/Arrow.svg" alt="Arrow" width={16} height={16} />
          </button>
        </div>
      </div>
    </section>
  );
};

export default AboutUs;
