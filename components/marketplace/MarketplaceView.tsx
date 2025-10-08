"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Search, Star, Grid3x3, List, ArrowUpRight, Eye, Plug } from "lucide-react";
import Link from "next/link";
import { 
  SiGoogle, 
  SiGmail, 
  SiShopify, 
  SiSlack, 
  SiOpenai, 
  SiGooglemaps 
} from "react-icons/si";
import { 
  VscJson 
} from "react-icons/vsc";
import { 
  TbFileExcel 
} from "react-icons/tb";

export interface NexaItem {
  id: string;
  name: string;
  category: string;
  rating: number;
  installs: number; // treat as integrations count for now
  author: string;
  price: string;
  updated: string;
  description: string;
  image: string;
  tools?: string[]; // identifiers of tools used (e.g., 'google', 'json', 'excel')
}

export default function MarketplaceView({ nexas }: { nexas: NexaItem[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [view, setView] = useState<"grid" | "list">("grid");

  const categories = useMemo(() => [
    "All",
    ...Array.from(new Set(nexas.map(n => n.category)))
  ], [nexas]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return nexas.filter(n =>
      (category === "All" || n.category === category) &&
      (q === "" || n.name.toLowerCase().includes(q) || n.description.toLowerCase().includes(q))
    );
  }, [nexas, query, category]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl lg:text-4xl font-bold text-white">Marketplace</h1>
          <p className="text-white/70 text-lg mt-1">Discover and integrate enterprise-grade NEXA (workflows)</p>
        </div>
        <Link href="/workflows/new">
          <Button className="bg-[#FF6900] hover:bg-[#E55D00] text-white px-5">
            List Your Nexa
            <ArrowUpRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
          <input
            placeholder="Search NEXA..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full h-10 pl-10 pr-3 rounded-lg bg-white/5 border border-white/15 text-white placeholder:text-white/50 focus:outline-none focus:border-[#FF6900]"
          />
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="h-10 rounded-lg bg-white/5 border border-white/15 text-white px-3 focus:border-[#FF6900]"
        >
          {categories.map((c) => (
            <option key={c} value={c} className="bg-black">{c}</option>
          ))}
        </select>
        <div className="inline-flex rounded-lg border border-white/15 bg-white/5 overflow-hidden">
          <button
            onClick={() => setView("grid")}
            className={`px-3 py-2 ${view === 'grid' ? 'bg-white/10 text-white' : 'text-white/80 hover:bg-white/10'}`}
            title="Grid view"
          >
            <Grid3x3 className="w-4 h-4" />
          </button>
        <button
            onClick={() => setView("list")}
            className={`px-3 py-2 border-l border-white/15 ${view === 'list' ? 'bg-white/10 text-white' : 'text-white/80 hover:bg-white/10'}`}
            title="List view"
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Listings */}
      {view === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((nx) => (
            <NexaCard key={nx.id} nx={nx} variant="portrait" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((nx) => (
            <NexaRow key={nx.id} nx={nx} />
          ))}
        </div>
      )}
    </div>
  );
}

function ToolIcon({ keyName, size = 20 }: { keyName: string; size?: number }) {
  const iconProps = { size, className: "flex-shrink-0" };
  
  switch (keyName) {
    case 'google':
      return <SiGoogle {...iconProps} color="#4285F4" />;
    case 'gmail':
      return <SiGmail {...iconProps} color="#EA4335" />;
    case 'json':
      return <VscJson {...iconProps} color="#F59E0B" />;
    case 'excel':
      return <TbFileExcel {...iconProps} color="#107C41" />;
    case 'maps':
      return <SiGooglemaps {...iconProps} color="#EA4335" />;
    case 'shopify':
      return <SiShopify {...iconProps} color="#95BF47" />;
    case 'slack':
      return <SiSlack {...iconProps} color="#4A154B" />;
    case 'openai':
      return <SiOpenai {...iconProps} color="#10B981" />;
    default:
      return (
        <div 
          className="flex-shrink-0 bg-gray-600 rounded" 
          style={{ width: size, height: size }}
        />
      );
  }
}

function NexaCard({ nx }: { nx: NexaItem; variant: 'portrait' }) {
  return (
    <div className="group relative bg-white/5 border border-white/10 hover:border-white/20 hover:ring-1 hover:ring-[#FF6900]/20 transition-all rounded-xl overflow-hidden backdrop-blur-xl h-[420px] flex flex-col hover:-translate-y-0.5">
      {/* Image header */}
      <div className="relative h-44 w-full overflow-hidden">
        <img src={nx.image} alt={nx.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute top-2 left-2 inline-flex items-center gap-2 text-[11px] px-2 py-1 rounded-full border border-white/20 bg-black/50 text-white/80 backdrop-blur">
          {nx.category}
        </div>
        <div className="absolute top-2 right-2 inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full border border-white/20 bg-black/50 text-white/90 backdrop-blur">
          {nx.price}
        </div>
        <div className="absolute bottom-2 left-2 inline-flex items-center gap-2 text-[11px] px-2 py-1 rounded-full border border-white/20 bg-black/40 text-white/80 backdrop-blur">
          <span className="inline-flex items-center gap-1"><Star className="w-3 h-3 text-yellow-400" /> {nx.rating}</span>
          <span className="opacity-50">•</span>
          <span className="inline-flex items-center gap-1"><Plug className="w-3 h-3" /> {nx.installs.toLocaleString()} integrations</span>
        </div>
      </div>
      {/* Card body */}
      <div className="p-5 flex-1 flex flex-col">
        <h3 className="text-white font-semibold line-clamp-2" title={nx.name}>{nx.name}</h3>
        <p className="text-white/70 text-sm line-clamp-3 mt-2">{nx.description}</p>
        <div className="mt-auto pt-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-white/10 text-[10px] text-white/70 flex items-center justify-center">{nx.author.split(' ').map(w => w[0]).join('').slice(0,2)}</div>
            <div className="text-xs text-white/60">{nx.author}</div>
          </div>
          <div className="flex flex-col items-end gap-2">
            {nx.tools && nx.tools.length > 0 && (
              <div className="flex gap-2">
                {nx.tools.slice(0,6).map((t, i) => (
                  <ToolIcon key={`${t}-${i}`} keyName={t} size={24} />
                ))}
              </div>
            )}
            <div className="flex items-center gap-2">
              <button className="px-2.5 py-1.5 text-xs rounded-md border border-white/15 bg-white/5 text-white/80 hover:bg-white/10 inline-flex items-center gap-1">
                <Eye className="w-3.5 h-3.5" /> Preview
              </button>
              <button className="px-2.5 py-1.5 text-xs rounded-md bg-[#FF6900] hover:bg-[#E55D00] text-white inline-flex items-center gap-1">
                <Plug className="w-3.5 h-3.5" /> Integrate
              </button>
            </div>
          </div>
        </div>
      </div>
      {/* Accent footer bar */}
      <div className="h-0.5 bg-gradient-to-r from-[#FF6900]/60 via-transparent to-transparent" />
    </div>
  );
}

function NexaRow({ nx }: { nx: NexaItem }) {
  return (
    <div className="group bg-white/5 border border-white/10 hover:border-white/20 rounded-xl overflow-hidden backdrop-blur-xl p-3 flex gap-4 items-stretch">
      <div className="relative w-40 h-28 shrink-0 overflow-hidden rounded-md">
        <img src={nx.image} alt={nx.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        <div className="absolute bottom-1 left-1 inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full border border-white/20 bg-black/50 text-white/80 backdrop-blur">
          <Plug className="w-3 h-3" /> {nx.installs.toLocaleString()}
        </div>
      </div>
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-white font-semibold truncate" title={nx.name}>{nx.name}</h3>
            <div className="mt-1 flex items-center gap-2 text-xs">
              <span className="px-2 py-0.5 rounded-full border border-white/15 bg-white/5 text-white/70">{nx.category}</span>
              <span className="text-white/40">Updated {nx.updated}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="inline-flex items-center gap-1 text-white/80"><Star className="w-4 h-4 text-yellow-400" /> {nx.rating}</div>
            <div className="text-xs text-white/60 mt-1">{nx.price}</div>
          </div>
        </div>
        <p className="text-white/70 text-sm line-clamp-2 mt-2">{nx.description}</p>
        <div className="mt-auto pt-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-white/10 text-[10px] text-white/70 flex items-center justify-center">{nx.author.split(' ').map(w => w[0]).join('').slice(0,2)}</div>
            <div className="text-xs text-white/60">{nx.author}</div>
          </div>
          <div className="flex flex-col items-end gap-2">
            {nx.tools && nx.tools.length > 0 && (
              <div className="flex gap-2">
                {nx.tools.slice(0,8).map((t, i) => (
                  <ToolIcon key={`${t}-${i}`} keyName={t} size={22} />
                ))}
              </div>
            )}
            <div className="flex items-center gap-2">
              <button className="px-2.5 py-1.5 text-xs rounded-md border border-white/15 bg-white/5 text-white/80 hover:bg-white/10 inline-flex items-center gap-1">
                <Eye className="w-3.5 h-3.5" /> Preview
              </button>
              <button className="px-2.5 py-1.5 text-xs rounded-md bg-[#FF6900] hover:bg-[#E55D00] text-white inline-flex items-center gap-1">
                <Plug className="w-3.5 h-3.5" /> Integrate
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
