"use client";

import { motion } from "framer-motion";
import { Github, Twitter, Linkedin, Mail, Facebook, Instagram } from "lucide-react";

const social = [
  { icon: Github, href: "#", label: "GitHub" },
  { icon: Linkedin, href: "#", label: "LinkedIn" },
  { icon: Mail, href: "mailto:nexagent1@gmail.com", label: "Email" },
  { icon: Facebook, href: "#", label: "Facebook" },
  { icon: Instagram, href: "#", label: "Instagram" },
  { icon: Twitter, href: "#", label: "Twitter" },
];

const usefulLinks = ["About", "Services", "Team", "Prices"];
const helpLinks = [
  "Customer Support",
  "Terms & Conditions",
  "Privacy Policy",
  "Contact Us",
];

const Footer = () => {
  return (
    <footer className="relative overflow-hidden">
      {/* Gradient background from top-right to bottom-left */}
      <div className="absolute inset-0 bg-gradient-to-bl from-[#340906] to-black z-0" />
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Four column layout */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-18">
          {/* About text */}
          <div>
            <h4 className="text-[#FFFFFF] text-2xl font-semibold mb-4" style={{ fontFamily: 'Poppins, sans-serif' }}>About us</h4>
            <p className="text-white/80 leading-relaxed max-w-md" style={{ fontFamily: 'Poppins, sans-serif' }}>
              We're a team of designers, engineers, and innovators building AI tools that empower anyone to turn imagination
              into stunning visuals—faster, smarter, and effortlessly.
            </p>
          </div>

          {/* Useful Links */}
          <div>
            <h4 className="text-[#FF6900] text-xl font-medium mb-4" style={{ fontFamily: 'Poppins, sans-serif' }}>Useful Links</h4>
            <ul className="space-y-3">
              {usefulLinks.map((t) => (
                <li key={t}>
                  <a className="text-white/70 hover:text-white transition-colors text-sm" href="#" style={{ fontFamily: 'Poppins, sans-serif' }}>
                    {t}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Help */}
          <div>
            <h4 className="text-[#FF6900] text-xl font-medium mb-4" style={{ fontFamily: 'Poppins, sans-serif' }}>Help</h4>
            <ul className="space-y-3">
              {helpLinks.map((t) => (
                <li key={t}>
                  <a className="text-white/70 hover:text-white transition-colors text-sm" href="#" style={{ fontFamily: 'Poppins, sans-serif' }}>
                    {t}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Connect With Us */}
          <div>
            <h4 className="text-[#FF6900] text-xl font-medium mb-4" style={{ fontFamily: 'Poppins, sans-serif' }}>Connect With Us</h4>
            <ul className="space-y-3 text-white/70 text-sm" style={{ fontFamily: 'Poppins, sans-serif' }}>
              <li>AU, Islamabad, PK</li>
              <li>+92 336 9539289</li>
              <li>
                <a href="mailto:nexagent1@gmail.com" className="hover:text-white transition-colors">
                  nexagent1@gmail.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Orange divider line */}
        <div className="mt-10 h-px w-full bg-[#FF6900]/80" />

        {/* Bottom row: copyright and social icons */}
        <div className="mt-6 flex items-center justify-between">
          <p className="text-white text-md" style={{ fontFamily: 'Poppins, sans-serif' }}>© 2025 All Right Reserved.</p>
          <div className="flex gap-3">
            {social.map((s, i) => {
              const Icon = s.icon;
              return (
                <a
                  key={i}
                  href={s.href}
                  aria-label={s.label}
                  className="w-10 h-10 rounded-full border border-[#FF6900] text-[#FF6900] flex items-center justify-center hover:bg-[#FF6900] hover:text-black transition-colors"
                >
                  <Icon className="w-4 h-4" />
                </a>
              );
            })}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
