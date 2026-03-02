"use client";

import { useState, useEffect } from "react";
import { Key, Plus, Trash2, Check, X, Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";
import { credentialsService, CredentialItem } from "@/lib/api/services/credentialsService";

interface CredentialPickerProps {
  /** Called with the normalised credential name when user selects one, e.g. "my_stripe_key" */
  onSelect: (credName: string) => void;
  onClose: () => void;
  /** If provided, that credential row will be highlighted as "currently selected" */
  currentValue?: string;
}

export default function CredentialPicker({ onSelect, onClose, currentValue }: CredentialPickerProps) {
  const [creds, setCreds] = useState<CredentialItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New credential form state
  const [showForm, setShowForm] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newValue, setNewValue] = useState("");
  const [showNewValue, setShowNewValue] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingName, setDeletingName] = useState<string | null>(null);

  useEffect(() => {
    credentialsService.list()
      .then(setCreds)
      .catch(() => setError("Failed to load credentials"))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!newLabel.trim() || !newValue.trim()) return;
    setSaving(true);
    try {
      const item = await credentialsService.save(newLabel.trim(), newValue.trim());
      setCreds(prev => {
        const idx = prev.findIndex(c => c.name === item.name);
        return idx >= 0 ? prev.map((c, i) => i === idx ? item : c) : [...prev, item];
      });
      setNewLabel("");
      setNewValue("");
      setShowForm(false);
    } catch {
      setError("Failed to save credential");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (name: string) => {
    setDeletingName(name);
    try {
      await credentialsService.delete(name);
      setCreds(prev => prev.filter(c => c.name !== name));
    } catch {
      setError("Failed to delete credential");
    } finally {
      setDeletingName(null);
    }
  };

  // Extract the name from {{$creds.xxx}} if that's the current value
  const currentCredName = currentValue?.startsWith("{{$creds.")
    ? currentValue.replace("{{$creds.", "").replace("}}", "").trim()
    : null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[80vh]">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#FF6900]/10 border border-[#FF6900]/20 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-[#FF6900]" />
            </div>
            <div>
              <h3 className="text-white font-semibold text-sm">Saved Credentials</h3>
              <p className="text-zinc-500 text-xs">Select one or add a new secret</p>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Credential list */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 text-zinc-500 animate-spin" />
            </div>
          )}

          {!loading && creds.length === 0 && !showForm && (
            <div className="text-center py-8 space-y-2">
              <Key className="w-8 h-8 text-zinc-600 mx-auto" />
              <p className="text-zinc-500 text-sm">No credentials saved yet</p>
              <p className="text-zinc-600 text-xs">Add one below to reference it in any node</p>
            </div>
          )}

          {creds.map(cred => {
            const isSelected = currentCredName === cred.name;
            return (
              <div
                key={cred.name}
                onClick={() => onSelect(cred.name)}
                className={`group flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  isSelected
                    ? "border-[#FF6900]/60 bg-[#FF6900]/10"
                    : "border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/60"
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
                  <Key className="w-3.5 h-3.5 text-zinc-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-white text-sm font-medium truncate">{cred.label || cred.name}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-[#FF6900] shrink-0" />}
                  </div>
                  <div className="text-zinc-500 text-xs font-mono">{cred.hint}</div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(cred.name); }}
                  disabled={deletingName === cred.name}
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-400/10 transition-all disabled:opacity-50"
                >
                  {deletingName === cred.name
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <Trash2 className="w-3.5 h-3.5" />
                  }
                </button>
              </div>
            );
          })}

          {error && (
            <p className="text-red-400 text-xs text-center py-2">{error}</p>
          )}
        </div>

        {/* Add new credential form */}
        {showForm ? (
          <div className="border-t border-zinc-800 p-4 space-y-3">
            <p className="text-white text-xs font-medium">New Credential</p>
            <input
              value={newLabel}
              onChange={e => setNewLabel(e.target.value)}
              placeholder="Label  e.g. My Stripe Key"
              className="w-full h-8 px-3 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-xs placeholder:text-zinc-500 focus:outline-none focus:border-[#FF6900]"
            />
            <div className="relative">
              <input
                type={showNewValue ? "text" : "password"}
                value={newValue}
                onChange={e => setNewValue(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") handleSave(); }}
                placeholder="Secret value"
                className="w-full h-8 pl-3 pr-8 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-xs placeholder:text-zinc-500 focus:outline-none focus:border-[#FF6900] font-mono"
              />
              <button
                type="button"
                onClick={() => setShowNewValue(v => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
              >
                {showNewValue ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { setShowForm(false); setNewLabel(""); setNewValue(""); }}
                className="flex-1 h-8 rounded-lg border border-zinc-700 text-zinc-400 text-xs hover:bg-zinc-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !newLabel.trim() || !newValue.trim()}
                className="flex-1 h-8 rounded-lg bg-[#FF6900] hover:bg-[#E55D00] disabled:opacity-50 text-white text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Save
              </button>
            </div>
          </div>
        ) : (
          <div className="border-t border-zinc-800 p-3">
            <button
              onClick={() => setShowForm(true)}
              className="w-full h-9 rounded-xl border border-dashed border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-600 text-xs flex items-center justify-center gap-2 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add new credential
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
