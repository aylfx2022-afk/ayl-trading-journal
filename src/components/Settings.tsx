import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { Key, Save, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';

export default function Settings() {
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  useEffect(() => {
    const fetchSettings = async () => {
      if (!auth.currentUser) return;
      try {
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (userDoc.exists()) {
          setApiKey(userDoc.data().geminiApiKey || '');
        }
      } catch (error) {
        console.error("Error fetching settings:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleSave = async () => {
    if (!auth.currentUser) return;
    setSaving(true);
    setStatus('idle');
    try {
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        geminiApiKey: apiKey
      });
      setStatus('success');
      setTimeout(() => setStatus('idle'), 3000);
    } catch (error) {
      console.error("Error saving settings:", error);
      setStatus('error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="w-8 h-8 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="bg-[#0F0F0F] border border-white/5 rounded-3xl p-8">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
            <Key className="text-emerald-500 w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Gemini API Configuration</h2>
            <p className="text-zinc-500 text-sm">Provide your own API key to power AI insights.</p>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">
              Google Gemini API Key
            </label>
            <div className="relative">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your API key..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500/50 transition-all text-zinc-200"
              />
            </div>
            <p className="mt-3 text-xs text-zinc-600 leading-relaxed">
              Your API key is stored securely in your private profile. It is used to analyze your trades and provide personalized suggestions. 
              Get your key from the <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-emerald-500 hover:underline">Google AI Studio</a>.
            </p>
          </div>

          <div className="pt-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 text-black font-bold hover:bg-emerald-400 transition-all disabled:opacity-50"
            >
              {saving ? (
                <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin"></div>
              ) : (
                <>
                  <Save size={18} />
                  Save Settings
                </>
              )}
            </button>
          </div>

          {status === 'success' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 text-emerald-500 text-sm font-medium"
            >
              <CheckCircle2 size={16} />
              Settings saved successfully!
            </motion.div>
          )}

          {status === 'error' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 text-red-500 text-sm font-medium"
            >
              <AlertCircle size={16} />
              Failed to save settings. Please try again.
            </motion.div>
          )}
        </div>
      </div>

      <div className="bg-blue-500/5 border border-blue-500/10 rounded-3xl p-8">
        <h3 className="text-blue-400 font-bold mb-2">Why use your own key?</h3>
        <p className="text-zinc-500 text-sm leading-relaxed">
          Using your own API key ensures that you have higher rate limits and can access the latest models as they become available. 
          If you don't provide a key, the application will use a shared default key with limited capacity.
        </p>
      </div>
    </div>
  );
}
