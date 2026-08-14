import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Key, Copy, Check, ShieldCheck, RefreshCw } from 'lucide-react';
import { toast } from '../ui/Toast';
import { calculateDebt } from '../../utils/finance';
import { updateMemberInDB, logScoreAudit } from '../../utils/supabaseService';
import { supabase } from '../../supabase';

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: any[];
  onAddMember: (newMember: any) => void;
  currentUserObj?: any;
}

const easeOut: [number, number, number, number] = [0.23, 1, 0.32, 1];

export function AddMemberModal({ isOpen, onClose, members, onAddMember, currentUserObj }: AddMemberModalProps) {
  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('member');
  const [status, setStatus] = useState('active');
  const [boardPosition, setBoardPosition] = useState('');
  const [joinDate, setJoinDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [tempPassword, setTempPassword] = useState('');
  const [createdCredentials, setCreatedCredentials] = useState<{ name: string; username: string; pass: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const generateAutoPassword = (selectedRole: string) => {
    const randomCode = Math.floor(1000 + Math.random() * 9000);
    if (selectedRole === 'admin') {
      return `Camena-Admin-${randomCode}!`;
    }
    return `Camena-Vol-${randomCode}!`;
  };

  useEffect(() => {
    if (isOpen) {
      setTempPassword(generateAutoPassword(role));
      setCreatedCredentials(null);
      setCopied(false);
    }
  }, [isOpen, role]);

  const handleNameChange = (val: string) => {
    setName(val);
    const generated = val
      .toLowerCase()
      .replace(/\s+/g, '.')
      .replace(/ț/g, 't')
      .replace(/ș/g, 's')
      .replace(/ă/g, 'a')
      .replace(/î/g, 'i')
      .replace(/â/g, 'a')
      .replace(/[^a-z0-9.]/g, '');
    setUsername(generated);
  };

  const handleRoleChange = (newRole: string) => {
    setRole(newRole);
    setTempPassword(generateAutoPassword(newRole));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Numele complet este obligatoriu.');
      return;
    }

    setIsSubmitting(true);

    let maxIdNum = 0;
    members.forEach((m) => {
      if (m.id && m.id.startsWith('M')) {
        const num = parseInt(m.id.substring(1), 10);
        if (!isNaN(num) && num > maxIdNum) {
          maxIdNum = num;
        }
      }
    });
    const nextNum = maxIdNum + 1;
    const newId = `M${nextNum.toString().padStart(3, '0')}`;

    const calculatedDebtVal = calculateDebt(joinDate, 0);
    const firstWord = name.trim().split(' ')[0] || name.trim();
    const finalPassword = tempPassword.trim() || generateAutoPassword(role);

    const newMember = {
      id: newId,
      name: name.trim(),
      nickname: nickname.trim() || firstWord,
      username: username.trim() || `voluntar.${nextNum}`,
      email: `${(username.trim() || `voluntar.${nextNum}`).toLowerCase()}@club.ro`,
      phone: phone.trim(),
      role: role,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name.trim())}&background=101D34&color=FAF9F5`,
      joinDate: new Date(joinDate).toISOString(),
      presences: 0,
      excusedAbsences: 0,
      unexcusedAbsences: 0,
      totalPaid: 0,
      totalDebt: calculatedDebtVal,
      status: status,
      boardPosition: role === 'admin' ? boardPosition.trim() : null,
      attendanceRate: '100%',
      qualification: status === 'passive' ? 'Pasiv' : 'Excelent',
      payments: [],
      score: 0,
      scoreAdjustments: [],
    };

    try {
      // 1. Inserare profil membru
      await updateMemberInDB(newMember);

      // 2. Setare parolă securizată în tabela de credențiale
      const { error: passErr } = await supabase.rpc('admin_set_member_password', {
        p_admin_member_id: currentUserObj?.id || newMember.id,
        p_target_member_id: newMember.id,
        p_new_password: finalPassword,
      });

      if (passErr) {
        console.warn('Eroare la setarea parolei inițiale:', passErr.message);
      }

      // 3. Audit Log
      await logScoreAudit({
        adminId: currentUserObj?.id,
        adminName: currentUserObj?.name || currentUserObj?.username || 'Admin',
        adminUsername: currentUserObj?.username,
        targetMemberId: newMember.id,
        targetMemberName: newMember.name,
        action: 'MEMBER_CREATE',
        reason: `Adăugat membru nou: ${newMember.name} (Rol: ${newMember.role === 'admin' ? 'Board - ' + (newMember.boardPosition || 'Admin') : 'Voluntar'})`,
      });

      onAddMember(newMember);
      setCreatedCredentials({
        name: newMember.name,
        username: newMember.username,
        pass: finalPassword,
      });

      toast.success(`Membrul ${newMember.name} a fost creat cu succes!`);
    } catch (err: any) {
      console.error(err);
      toast.error('Eroare la înregistrarea membrului.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyCredentials = () => {
    if (!createdCredentials) return;
    const textToCopy = `Salut ${createdCredentials.name}!\nDatele tale de conectare pe platforma Interact Camena sunt:\n👤 Utilizator: ${createdCredentials.username}\n🔑 Parolă temporară: ${createdCredentials.pass}\n🌐 Link: https://interact-camena.ro\n(La prima conectare îți poți schimba parola din profil).`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    toast.success('Datele de conectare au fost copiate în clipboard!');
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: easeOut }}
            className="relative w-full max-w-3xl bg-white dark:bg-[#161B22] rounded-[2px] shadow-2xl p-5 sm:p-8 overflow-y-auto overflow-x-hidden max-h-[94vh] sm:max-h-[92vh] scrollbar-thin font-anthropic border border-slate-300 dark:border-slate-700"
          >
            <div className="flex justify-between items-center mb-6 relative z-10 border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold font-anthropicSerif text-slate-900 dark:text-slate-100">Adaugă Membru Nou</h2>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 font-anthropic">
                  Creează profilul și generează automat parola temporară distinctă.
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-[2px] transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {createdCredentials ? (
              <div className="space-y-5 py-3 animate-in fade-in zoom-in-95 duration-200 font-anthropic">
                <div className="p-6 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-[2px] text-center space-y-3">
                  <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 rounded-[2px] flex items-center justify-center mx-auto shadow-xs">
                    <ShieldCheck size={26} />
                  </div>
                  <h3 className="text-lg font-bold font-title text-emerald-900 dark:text-emerald-200">
                    Cont Creat și Activat cu Succes!
                  </h3>
                  <p className="text-xs sm:text-sm text-emerald-700 dark:text-emerald-300 max-w-md mx-auto font-anthropic">
                    Trimite mesajul de mai jos voluntarului pe WhatsApp.
                  </p>

                  <div className="bg-white dark:bg-slate-900 p-4 rounded-[2px] border border-emerald-200 dark:border-emerald-800 text-left font-data text-xs sm:text-sm text-slate-800 dark:text-slate-200 space-y-1.5 mt-4 select-all shadow-xs">
                    <p>👤 <strong>Utilizator:</strong> {createdCredentials.username}</p>
                    <p>🔑 <strong>Parolă:</strong> {createdCredentials.pass}</p>
                  </div>
                </div>

                <div className="flex gap-3 font-title">
                  <button
                    type="button"
                    onClick={handleCopyCredentials}
                    className="flex-1 py-3 btn-civic-primary font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer uppercase tracking-wider"
                  >
                    {copied ? <Check size={17} /> : <Copy size={17} />}
                    {copied ? 'Copiat în Clipboard!' : 'Copiază Mesaj WhatsApp'}
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-6 py-3 btn-civic-secondary text-xs sm:text-sm uppercase tracking-wider font-bold transition-all cursor-pointer"
                  >
                    Închide
                  </button>
                </div>
              </div>
            ) : (
              <form className="space-y-4 relative z-10 font-anthropic" onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 font-title">
                      Nume Complet (Obligatoriu)
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => handleNameChange(e.target.value)}
                      required
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-[2px] text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600 transition-colors font-anthropic"
                      placeholder="Ion Popescu"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 font-title">
                      Poreclă / Nickname
                    </label>
                    <input
                      type="text"
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-[2px] text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600 transition-colors font-anthropic"
                      placeholder="Ionuț"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 font-title">
                      Username (Autentificare)
                    </label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-[2px] text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600 transition-colors font-anthropic"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 font-title">
                        Parolă Inițială Temporară
                      </label>
                      <button
                        type="button"
                        onClick={() => setTempPassword(generateAutoPassword(role))}
                        className="text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline flex items-center gap-1 font-title cursor-pointer"
                      >
                        <RefreshCw size={11} /> Generează alta
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        value={tempPassword}
                        onChange={(e) => setTempPassword(e.target.value)}
                        required
                        className="w-full px-4 py-2.5 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-[2px] text-xs sm:text-sm font-mono font-bold text-amber-900 dark:text-amber-200 focus:outline-none focus:border-amber-400 transition-colors"
                      />
                      <Key size={15} className="absolute right-3.5 top-3 text-amber-600 dark:text-amber-400 pointer-events-none" />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 font-title">
                    Telefon
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-[2px] text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600 transition-colors font-anthropic"
                    placeholder="07XX..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 font-title">
                      Rol
                    </label>
                    <select
                      value={role}
                      onChange={(e) => handleRoleChange(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-[2px] text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600 transition-colors font-anthropic cursor-pointer"
                    >
                      <option value="member">Voluntar</option>
                      <option value="admin">Board</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 font-title">
                      Status Membru
                    </label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-[2px] text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600 transition-colors font-anthropic cursor-pointer"
                    >
                      <option value="active">Activ</option>
                      <option value="passive">Pasiv</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 font-title">
                      Data Intrării (Datorii)
                    </label>
                    <input
                      type="date"
                      value={joinDate}
                      onChange={(e) => setJoinDate(e.target.value)}
                      required
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-[2px] text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600 transition-colors font-anthropic cursor-pointer"
                    />
                  </div>
                </div>

                {role === 'admin' && (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 font-title">
                      Funcție Board (ex: Secretar, Trezorier)
                    </label>
                    <input
                      type="text"
                      value={boardPosition}
                      onChange={(e) => setBoardPosition(e.target.value)}
                      required
                      placeholder="Trezorier"
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-[2px] text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600 transition-colors font-anthropic"
                    />
                  </div>
                )}

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3.5 btn-civic-primary rounded-[2px] font-bold uppercase tracking-wider text-xs sm:text-sm font-title disabled:opacity-50 shadow-xs cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? 'Se creează contul...' : 'Validare și Creare Profil + Parolă'}
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
