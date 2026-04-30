import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { LogOut, Plus, X } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export default function Settings() {
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');

  useEffect(() => {
    const fetchTags = async () => {
      if (auth.currentUser) {
        const docRef = doc(db, 'userSettings', auth.currentUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setTags(docSnap.data().customTags || []);
        }
      }
    };
    fetchTags();
  }, []);

  const saveTags = async (newTags: string[]) => {
    if (auth.currentUser) {
      await setDoc(doc(db, 'userSettings', auth.currentUser.uid), { customTags: newTags }, { merge: true });
      setTags(newTags);
    }
  };

  const addTag = () => {
    if (newTag && !tags.includes(newTag)) {
      saveTags([...tags, newTag]);
      setNewTag('');
    }
  };

  const removeTag = (tag: string) => {
    saveTags(tags.filter(t => t !== tag));
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="bg-[#0F0F0F] border border-white/5 rounded-3xl p-8">
        <h2 className="text-xl font-bold mb-4">Tag Management</h2>
        <div className="flex gap-2 mb-4">
          <input 
            type="text" 
            value={newTag} 
            onChange={(e) => setNewTag(e.target.value)}
            className="flex-1 bg-zinc-900 border border-white/10 rounded-xl px-4 py-2 text-sm"
            placeholder="Add new tag..."
          />
          <button onClick={addTag} className="bg-emerald-500/10 text-emerald-500 p-2 rounded-xl">
            <Plus size={20} />
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {tags.map(tag => (
            <span key={tag} className="flex items-center gap-1 bg-zinc-800 text-zinc-300 px-3 py-1 rounded-full text-xs">
              #{tag}
              <button onClick={() => removeTag(tag)}><X size={12} /></button>
            </span>
          ))}
        </div>
      </div>

      <div className="bg-[#0F0F0F] border border-white/5 rounded-3xl p-8">
        <h2 className="text-xl font-bold mb-4">Account Settings</h2>
        <button
          onClick={() => signOut(auth)}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-red-500/10 text-red-500 font-bold hover:bg-red-500/20 transition-all"
        >
          <LogOut size={18} />
          Sign Out
        </button>
      </div>
    </div>
  );
}
