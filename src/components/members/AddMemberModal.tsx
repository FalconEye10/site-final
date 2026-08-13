import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { toast } from '../ui/Toast';
import { calculateDebt } from '../../utils/finance';
import { updateMemberInDB, logScoreAudit } from '../../utils/supabaseService';

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
  const [password, setPassword] = useState('parola123');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('member');
  const [status, setStatus] = useState('active');
  const [boardPosition, setBoardPosition] = useState('');
  const [joinDate, setJoinDate] = useState(() => new Date().toISOString().split('T')[0]);

  const handleNameChange = (val: string) => {
    setName(val);
    const generated = val.toLowerCase()
      .replace(/\s+/g, '.')
      .replace(/ț/g, 't')
      .replace(/ș/g, 's')
      .replace(/ă/g, 'a')
      .replace(/î/g, 'i')
      .replace(/â/g, 'a')
      .replace(/[^a-z0-9.]/g, '');
    setUsername(generated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Numele complet este obligatoriu.');
      return;
    }
    
    let maxIdNum = 0;
    members.forEach(m => {
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

    const newMember = {
      id: newId,
      name: name.trim(),
      nickname: nickname.trim() || firstWord,
      username: username.trim(),
      password: password || 'parola123',
      phone: phone.trim(),
      role: role,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name.trim())}&background=001f26&color=FAF9F5`,
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
      scoreAdjustments: []
    };

    try {
      await updateMemberInDB(newMember);
      await logScoreAudit({
        adminId: currentUserObj?.id,
        adminName: currentUserObj?.name || currentUserObj?.username || 'Admin',
        adminUsername: currentUserObj?.username,
        targetMemberId: newMember.id,
        targetMemberName: newMember.name,
        action: 'MEMBER_CREATE',
        reason: `Adăugat membru nou: ${newMember.name} (Rol: ${newMember.role === 'admin' ? 'Board - ' + (newMember.boardPosition || 'Admin') : 'Voluntar'})`
      });
      onAddMember(newMember);
      onClose();
      // Reset form states
      setName('');
      setNickname('');
      setUsername('');
      setPassword('parola123');
      setPhone('');
      setRole('member');
      setStatus('active');
      setBoardPosition('');
      setJoinDate(new Date().toISOString().split('T')[0]);
      toast.success(`Membrul ${newMember.name} a fost înregistrat cu succes!`);
    } catch (err) {
      console.error(err);
      toast.error('Eroare la înregistrarea membrului.');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-brand-accent/60 backdrop-blur-md"
            onClick={onClose}
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3, ease: easeOut }}
            className="relative w-full max-w-3xl bg-white rounded-t-3xl sm:rounded-3xl shadow-[0_40px_100px_rgba(0,0,0,0.3)] p-4 sm:p-8 overflow-y-auto overflow-x-hidden max-h-[94vh] sm:max-h-[92vh] scrollbar-thin"
          >
            <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] bg-brand-primary/30 blur-[60px] rounded-full pointer-events-none" />
            
            <div className="flex justify-between items-center mb-6 relative z-10 border-b border-brand-muted/5 pb-4">
              <div>
                <h2 className="text-2xl font-bold text-brand-accent">Adaugă Membru Nou</h2>
                <p className="text-xs text-brand-accent/60 mt-1 font-['Manrope']">Creează un profil nou și generează contul de acces.</p>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-[#FAF9F5] rounded-full transition-colors active:scale-90">
                <X size={20} />
              </button>
            </div>
            
            <form className="space-y-4 relative z-10" onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider opacity-60 mb-1">Nume Complet (Obligatoriu)</label>
                  <input 
                    type="text" 
                    value={name}
                    onChange={e => handleNameChange(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-[#FAF9F5] border border-brand-muted/10 rounded-xl text-sm focus:outline-none focus:border-brand-primary transition-colors font-['Manrope']" 
                    placeholder="Ion Popescu" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider opacity-60 mb-1">Poreclă / Nickname</label>
                  <input 
                    type="text" 
                    value={nickname}
                    onChange={e => setNickname(e.target.value)}
                    className="w-full px-4 py-3 bg-[#FAF9F5] border border-brand-muted/10 rounded-xl text-sm focus:outline-none focus:border-brand-primary transition-colors font-['Manrope']" 
                    placeholder="Ionuț" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider opacity-60 mb-1">Username (Cont platformă)</label>
                  <input 
                    type="text" 
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    className="w-full px-4 py-3 bg-[#FAF9F5] border border-brand-muted/10 rounded-xl text-sm focus:outline-none focus:border-brand-primary transition-colors font-['Manrope']" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider opacity-60 mb-1">Parolă (Implicit: parola123)</label>
                  <input 
                    type="text" 
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-[#FAF9F5] border border-brand-muted/10 rounded-xl text-sm focus:outline-none focus:border-brand-primary transition-colors font-['Manrope']" 
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider opacity-60 mb-1">Telefon</label>
                <input 
                  type="text" 
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full px-4 py-3 bg-[#FAF9F5] border border-brand-muted/10 rounded-xl text-sm focus:outline-none focus:border-brand-primary transition-colors font-['Manrope']" 
                  placeholder="07XX..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider opacity-60 mb-1">Rol</label>
                  <select 
                    value={role}
                    onChange={e => setRole(e.target.value)}
                    className="w-full px-4 py-3 bg-[#FAF9F5] border border-brand-muted/10 rounded-xl text-sm focus:outline-none focus:border-brand-primary transition-colors font-['Manrope']"
                  >
                    <option value="member">Voluntar</option>
                    <option value="admin">Board</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider opacity-60 mb-1">Status Membru</label>
                  <select 
                    value={status}
                    onChange={e => setStatus(e.target.value)}
                    className="w-full px-4 py-3 bg-[#FAF9F5] border border-brand-muted/10 rounded-xl text-sm focus:outline-none focus:border-brand-primary transition-colors font-['Manrope']"
                  >
                    <option value="active">Activ</option>
                    <option value="passive">Pasiv</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider opacity-60 mb-1">Data Intrării (Datorii)</label>
                  <input 
                    type="date" 
                    value={joinDate}
                    onChange={e => setJoinDate(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-[#FAF9F5] border border-brand-muted/10 rounded-xl text-sm focus:outline-none focus:border-brand-primary transition-colors font-['Manrope']" 
                  />
                </div>
              </div>

              {role === 'admin' && (
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider opacity-60 mb-1">Funcție Board (ex: Secretar, Trezorier)</label>
                  <input 
                    type="text" 
                    value={boardPosition} 
                    onChange={e => setBoardPosition(e.target.value)} 
                    required
                    placeholder="Trezorier"
                    className="w-full px-4 py-3 bg-[#FAF9F5] border border-brand-muted/10 rounded-xl text-sm focus:outline-none focus:border-brand-primary transition-colors font-['Manrope']" 
                  />
                </div>
              )}

              <div className="pt-6">
                <button type="submit" className="w-full ios26-btn py-4 rounded-xl font-bold uppercase tracking-wider text-sm">Validare și Creare Profil</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
