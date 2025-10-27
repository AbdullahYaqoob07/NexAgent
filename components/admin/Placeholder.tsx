export default function Placeholder({ title, description }: { title: string; description?: string }) {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-white">{title}</h1>
      {description && <p className="text-white/70">{description}</p>}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <p className="text-white/70 text-sm">Connect this page to backend endpoints when ready.</p>
      </div>
    </div>
  );
}
