/* 
  ShiftPlanner Prototype - Remplace les valeurs REPLACE_ME par ta configuration Firebase.
  Voir instructions fournies pour créer ton projet Firebase.
*/

import React, { useEffect, useState } from "https://esm.sh/react";
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getFirestore,
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
  deleteDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

// ---- CONFIG FIREBASE ----
const firebaseConfig = {
  apiKey: "AIzaSyDJmGn16S-DAU7kcAtnkFpx52mP8b_xOj0",
  authDomain: "horaire-fiq-dfc65.firebaseapp.com",
  projectId: "AIzaSyDJmGn16S-DAU7kcAtnkFpx52mP8b_xOj0",
  storageBucket: "horaire-fiq-dfc65.firebasestorage.app",
  messagingSenderId: "AIzaSyDJmGn16S-DAU7kcAtnkFpx52mP8b_xOj0",
  appId: "AIzaSyDJmGn16S-DAU7kcAtnkFpx52mP8b_xOj0"
};
// --------------------------

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

function niceTime(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleString();
}

function WeekGrid({ shifts, onEdit, onDelete }) {
  const startOfWeek = new Date();
  const day = startOfWeek.getDay();
  const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
  startOfWeek.setDate(diff);
  const days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    return d;
  });

  return (
    <div className="w-full p-4">
      <div className="grid grid-cols-7 gap-2">
        {days.map((d) => (
          <div key={d.toDateString()} className="border rounded p-2 bg-white shadow-sm">
            <div className="font-semibold">{d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' })}</div>
            <div className="mt-2 space-y-2">
              {shifts
                .filter((s) => {
                  const sd = new Date(s.start);
                  return sd.toDateString() === d.toDateString();
                })
                .map((s) => (
                  <div key={s.id} className="p-2 border rounded bg-gray-50">
                    <div className="text-sm font-medium">{s.title}</div>
                    <div className="text-xs">{new Date(s.start).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {new Date(s.end).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                    <div className="mt-1 flex gap-2">
                      <button onClick={() => onEdit(s)} className="text-xs px-2 py-1 rounded border">Modifier</button>
                      <button onClick={() => onDelete(s.id)} className="text-xs px-2 py-1 rounded border">Supprimer</button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ShiftPlanner() {
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [form, setForm] = useState({ title: "", start: "", end: "", id: null });

  useEffect(() => {
    signInAnonymously(auth).then((res) => {
      setUser({ uid: res.user.uid });
    });

    const q = query(collection(db, "shifts"), orderBy("start", "asc"));
    const unsub = onSnapshot(q, (snapshot) => {
      const arr = [];
      snapshot.forEach((docSnap) => {
        arr.push({ id: docSnap.id, ...docSnap.data() });
      });
      setShifts(arr);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  async function handleAddOrUpdate(e) {
    e.preventDefault();
    if (!form.title || !form.start || !form.end) return alert("Remplis tout");

    if (form.id) {
      const ref = doc(db, "shifts", form.id);
      await updateDoc(ref, {
        title: form.title,
        start: new Date(form.start).toISOString(),
        end: new Date(form.end).toISOString()
      });
      setForm({ title: "", start: "", end: "", id: null });
    } else {
      await addDoc(collection(db, "shifts"), {
        title: form.title,
        start: new Date(form.start).toISOString(),
        end: new Date(form.end).toISOString(),
        createdAt: serverTimestamp(),
        createdBy: user ? user.uid : null
      });
      setForm({ title: "", start: "", end: "", id: null });
    }
  }

  function handleEdit(s) {
    setForm({
      title: s.title,
      start: new Date(s.start).toISOString().slice(0, 16),
      end: new Date(s.end).toISOString().slice(0, 16),
      id: s.id
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleDelete(id) {
    if (!confirm("Supprimer cet horaire ?")) return;
    await deleteDoc(doc(db, "shifts", id));
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-5xl mx-auto">
        <header className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">ShiftPlanner — Planning partagé</h1>
          <div className="text-sm">Utilisateur: {user ? user.uid.slice(0,6) : '...'}</div>
        </header>

        <form onSubmit={handleAddOrUpdate} className="bg-white p-4 rounded shadow mb-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <input className="p-2 border rounded" placeholder="Titre" value={form.title} onChange={(e)=>setForm({...form, title: e.target.value})} />
            <input className="p-2 border rounded" type="datetime-local" value={form.start} onChange={(e)=>setForm({...form, start: e.target.value})} />
            <input className="p-2 border rounded" type="datetime-local" value={form.end} onChange={(e)=>setForm({...form, end: e.target.value})} />
            <div className="flex gap-2">
              <button className="px-4 py-2 rounded bg-blue-600 text-white" type="submit">{form.id ? 'Mettre à jour' : 'Ajouter'}</button>
              {form.id && <button type="button" onClick={()=>setForm({title:'', start:'', end:'', id:null})} className="px-4 py-2 rounded border">Annuler</button>}
            </div>
          </div>
        </form>

        <section className="mb-4">
          <div className="bg-white p-4 rounded shadow">
            <h2 className="font-semibold mb-2">Semaine en cours</h2>
            {loading ? <div>Chargement…</div> : <WeekGrid shifts={shifts} onEdit={handleEdit} onDelete={handleDelete} />}
          </div>
        </section>
      </div>
    </div>
  );
}
