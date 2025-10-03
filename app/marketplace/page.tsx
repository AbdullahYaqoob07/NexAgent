import { currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import MarketplaceView, { NexaItem } from '@/components/marketplace/MarketplaceView';

export default async function MarketplacePage() {
  const user = await currentUser();
  
  if (!user) {
    redirect('/sign-in');
  }

  // Mock NEXA listings (replace with real data later)
  const nexas: NexaItem[] = [
    { id: 'nx-001', name: 'Customer Onboarding NEXA', category: 'Customer', rating: 4.8, installs: 2450, author: 'NexAgent Labs', price: 'Free', updated: '2d ago', description: 'Welcome emails, profile enrichment and CRM sync.', image: 'https://images.unsplash.com/photo-1529336953121-ad5a0d43d0d2?q=80&w=1200&auto=format&fit=crop', tools: ['google','gmail','json'] },
    { id: 'nx-002', name: 'Lead Scoring NEXA', category: 'Sales', rating: 4.6, installs: 1812, author: 'RevOps Pro', price: 'Free', updated: '4d ago', description: 'Score leads using behavior + firmographic signals.', image: 'https://images.unsplash.com/photo-1526378722484-bd91ca387e72?q=80&w=1200&auto=format&fit=crop', tools: ['shopify','json','openai'] },
    { id: 'nx-003', name: 'Invoice Automation NEXA', category: 'Finance', rating: 4.7, installs: 1320, author: 'FinSuite', price: '$19', updated: '1w ago', description: 'Generate, validate and send invoices with reminders.', image: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?q=80&w=1200&auto=format&fit=crop', tools: ['excel','json','slack'] },
    { id: 'nx-004', name: 'Social Listening NEXA', category: 'Marketing', rating: 4.5, installs: 990, author: 'BrandWatch', price: '$9', updated: '5d ago', description: 'Track mentions, classify sentiment and route tickets.', image: 'https://images.unsplash.com/photo-1485217988980-11786ced9454?q=80&w=1200&auto=format&fit=crop', tools: ['openai','slack'] },
    { id: 'nx-005', name: 'Data Ingestion NEXA', category: 'Data', rating: 4.4, installs: 1520, author: 'DataFoundry', price: 'Free', updated: '3d ago', description: 'ETL for CSV/JSON to warehouse with validation.', image: 'https://images.unsplash.com/photo-1517148815978-75f6acaaf32c?q=80&w=1200&auto=format&fit=crop', tools: ['json','excel'] },
    { id: 'nx-006', name: 'Support Triage NEXA', category: 'AI/ML', rating: 4.9, installs: 2860, author: 'HelpDesk AI', price: '$29', updated: '1d ago', description: 'Classify and summarize tickets, auto-assign to teams.', image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1200&auto=format&fit=crop', tools: ['openai','gmail','slack'] },
  ];

  const categories = ['All', 'Customer', 'Sales', 'Marketing', 'Finance', 'Data', 'AI/ML'];

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
        <MarketplaceView nexas={nexas} />
      </div>
    </DashboardLayout>
  );
}
