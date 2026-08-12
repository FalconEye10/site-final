import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, CheckCircle2, AlertCircle, Calendar as CalendarIcon, FileText, 
  Phone, RotateCcw, TrendingUp, Award, User, Trash2,
  Edit3, PlusCircle, CreditCard, Sparkles, Users2, Target, Check
} from 'lucide-react';
import { toast } from '../ui/Toast';
import { calculateDebt, calculateQualification, generateMemberLedger, COTIZATIE_LUNARA } from '../../utils/finance';
import { updateMemberFields, applyMemberScoreAdjustment, revertLatestTreasuryPayment, deleteMemberFromDB, TreasuryPayment } from '../../utils/supabaseService';
import { PaymentModal } from '../finance/PaymentModal';
import { ScoringReferenceGuide, ScoringPreset } from '../dashboard/views/ScoringReferenceGuide';
import { supabase } from '../../supabase';

interface MemberDrawerProps {
  member: any;
  onClose: () => void;
  onUpdateMember: (updatedMember: any) => void;
  isAdmin: boolean;
}

export function MemberDrawer({ member, onClose, onUpdateMember, isAdmin }: MemberDrawerProps) {
  const [activeTab, setActiveTab] = useState<'finance' | 'activity' | 'profile' | 'achievements' | 'committees'>('finance');
  const [isEditing, setIsEditing] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<TreasuryPayment | null>(null);

  // Committee preferences state
  const [userCommittees, setUserCommittees] = useState<string[]>(member.committeePreferences || []);
  const [userSkills, setUserSkills] = useState<string[]>(member.skills || []);
  const [isSavingCommittees, setIsSavingCommittees] = useState(false);

  // Score Adjustment Modal states
  const [isScoreModalOpen, setIsScoreModalOpen] = useState(false);
  const [scoreAdjustValue, setScoreAdjustValue] = useState('');
  const [scoreAdjustReason, setScoreAdjustReason] = useState('');

  // AlertDialog state for Revert Payment
  const [receiptToRevert, setReceiptToRevert] = useState<TreasuryPayment | null>(null);

  const [payments, setPayments] = useState<any[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(true);

  // Listen to escape key for closing modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isPaymentModalOpen && !selectedReceipt && !isScoreModalOpen && !receiptToRevert) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, isPaymentModalOpen, selectedReceipt, isScoreModalOpen, receiptToRevert]);

  useEffect(() => {
    setLoadingPayments(true);
    const loadPayments = async () => {
      try {
        const { data, error } = await supabase
          .from('payments')
          .select('*')
          .eq('memberId', member.id.toString());
        if (error) throw error;
        const list = (data || [])
          .filter((p: any) => p.status !== 'Anulat')
          .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setPayments(list);
      } catch (err) {
        console.error("Failed to load payments for member", err);
      } finally {
        setLoadingPayments(false);
      }
    };

    loadPayments();

    const channel = supabase
      .channel(`payments_${member.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments', filter: `memberId=eq.${member.id}` }, () => {
        loadPayments();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [member.id]);

  // Edit profile form states
  const [name, setName] = useState(member.name);
  const [phone, setPhone] = useState(member.phone || '');
  const [role, setRole] = useState(member.role || 'member');
  const [username, setUsername] = useState(member.username || '');
  const [password, setPassword] = useState(member.password || 'parola123');
  const [nickname, setNickname] = useState(member.nickname || '');
  const [presences, setPresences] = useState(member.presences || 0);
  const [excusedAbsences, setExcusedAbsences] = useState(member.excusedAbsences || 0);
  const [unexcusedAbsences, setUnexcusedAbsences] = useState(member.unexcusedAbsences || 0);
  const [joinDate, setJoinDate] = useState(() => member.joinDate ? member.joinDate.split('T')[0] : new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState(member.status || 'active');
  const [boardPosition, setBoardPosition] = useState(member.boardPosition || '');

  // Delete member confirmation modal state
  const [isDeletingMember, setIsDeletingMember] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    setName(member.name);
    setPhone(member.phone || '');
    setRole(member.role || 'member');
    setUsername(member.username || '');
    setPassword(member.password || 'parola123');
    setNickname(member.nickname || '');
    setPresences(member.presences || 0);
    setExcusedAbsences(member.excusedAbsences || 0);
    setUnexcusedAbsences(member.unexcusedAbsences || 0);
    setJoinDate(member.joinDate ? member.joinDate.split('T')[0] : new Date().toISOString().split('T')[0]);
    setStatus(member.status || 'active');
    setBoardPosition(member.boardPosition || '');
  }, [member]);

  const handleDeleteMember = async () => {
    setIsDeletingMember(true);
    try {
      await deleteMemberFromDB(member.id);
      toast.success(`Membrul ${member.name} a fost șters cu succes.`);
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Eroare la ștergerea membrului.');
    } finally {
      setIsDeletingMember(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const { rate, qualification } = calculateQualification(Number(presences), Number(excusedAbsences), Number(unexcusedAbsences), status);

    const profileFields = {
      name,
      phone,
      role,
      username,
      password,
      nickname,
      presences: Number(presences),
      excusedAbsences: Number(excusedAbsences),
      unexcusedAbsences: Number(unexcusedAbsences),
      joinDate: new Date(joinDate).toISOString(),
      status,
      boardPosition: role === 'admin' ? boardPosition.trim() : null,
      attendanceRate: rate,
      qualification
    };
    const updatedMember = { ...member, ...profileFields };

    try {
      await updateMemberFields(member.id, profileFields);
      onUpdateMember(updatedMember);
      setIsEditing(false);
      toast.success('Profilul a fost salvat cu succes.');
    } catch (err) {
      console.error(err);
      toast.error('Eroare la salvarea profilului.');
    }
  };

  const handleAdjustScore = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseInt(scoreAdjustValue);
    if (isNaN(val)) return toast.error('Introdu o valoare numerică.');
    if (!scoreAdjustReason.trim()) return toast.error('Motivul este obligatoriu.');

    const newAdjustment = {
      id: `adj_${Date.now()}`,
      points: val,
      reason: scoreAdjustReason.trim(),
      date: new Date().toISOString(),
      adminName: 'Admin'
    };

    const newScore = (member.score || 0) + val;

    const updatedMember = {
      ...member,
      score: newScore,
      scoreAdjustments: [...(member.scoreAdjustments || []), newAdjustment]
    };

    try {
      await applyMemberScoreAdjustment(member.id, val, newAdjustment);
      onUpdateMember(updatedMember);
      setIsScoreModalOpen(false);
      setScoreAdjustValue('');
      setScoreAdjustReason('');
      toast.success('Scor ajustat cu succes!');
    } catch (err) {
      toast.error('Eroare la ajustarea scorului.');
    }
  };

  const handleConfirmRevert = async () => {
    if (!receiptToRevert) return;

    const isLatest = payments.length > 0 && payments[0].id === receiptToRevert.id;
    if (!isLatest) {
      toast.error("Doar ultima plată înregistrată poate fi anulată.");
      return;
    }

    try {
      const { newTotalPaid, newStatus } = await revertLatestTreasuryPayment(
        member.id,
        receiptToRevert.id,
        receiptToRevert.amount
      );

      onUpdateMember({ ...member, totalPaid: newTotalPaid, status: newStatus });
      setReceiptToRevert(null);
      toast.success(`Plata ${receiptToRevert.id} a fost anulată.`);
    } catch (err) {
      console.error(err);
      toast.error("Eroare la anularea plății.");
    }
  };

  const handleSaveCommittees = async () => {
    setIsSavingCommittees(true);
    try {
      await updateMemberFields(member.id, {
        committeePreferences: userCommittees,
        skills: userSkills
      });
      onUpdateMember({
        ...member,
        committeePreferences: userCommittees,
        skills: userSkills
      });
      toast.success('Preferințele de comitete și competențe au fost salvate! ✓');
    } catch (err) {
      console.error(err);
      toast.error('Eroare la salvarea preferințelor.');
    } finally {
      setIsSavingCommittees(false);
    }
  };

  const dynamicMonths = generateMemberLedger(member.joinDate, member.totalPaid || 0);
  const debt = calculateDebt(member.joinDate, member.totalPaid || 0);
  const isClear = debt === 0;
  const computedStatus = isClear ? 'active' : 'debtor';

  const { rate, qualification, percentage } = calculateQualification(
    member.presences || 0,
    member.excusedAbsences || 0,
    member.unexcusedAbsences || 0,
    member.status
  );

  const validReceipts = payments.filter((r: any) => r.status !== 'Anulat');
  const lastReceipt = validReceipts[0];
  const unpaidBreakdown = dynamicMonths.filter(m => m.status === 'Neachitat');

  // Initials for avatar
  const initials = member.name
    ? member.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'M';

  return createPortal(
    <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-sm font-data">
      {/* Backdrop overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0"
        onClick={onClose}
      />

      {/* Centered White Modal (Bottom Sheet on mobile, centered modal on sm+) */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: 16 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className="relative w-full max-w-4xl max-h-[94vh] sm:max-h-[90vh] bg-white text-slate-900 border border-slate-300 shadow-2xl rounded-t-3xl sm:rounded-xl z-[151] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-3.5 sm:p-5 bg-slate-50 border-b border-slate-200 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            {/* Square Initials or Photo Avatar */}
            {member.avatar ? (
              <img
                src={member.avatar}
                alt={member.name}
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl object-cover border border-slate-300 shrink-0 shadow-sm"
              />
            ) : (
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-slate-900 text-white font-bold text-sm sm:text-base flex items-center justify-center shrink-0 font-title">
                {initials}
              </div>
            )}

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight font-title truncate">{member.name}</h2>
                {member.nickname && (
                  <span className="text-xs text-slate-500 font-normal font-data">({member.nickname})</span>
                )}
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2 mt-1 flex-wrap">
                {/* Role Badge */}
                <span className="px-2 py-0.5 rounded-sm text-[11px] sm:text-xs font-medium bg-slate-200 text-slate-800 border border-slate-300 font-title">
                  {member.role === 'admin' ? (member.boardPosition || 'Board') : 'Voluntar'}
                </span>

                {/* Financial Status Badge */}
                <span className={`px-2 py-0.5 rounded-sm text-[11px] sm:text-xs font-medium border font-title ${
                  computedStatus === 'active' 
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300' 
                    : 'bg-rose-50 text-rose-800 border-rose-300 font-semibold'
                }`}>
                  {computedStatus === 'active' ? 'La zi' : `Restanțier (${debt} Lei)`}
                </span>

                {/* Attendance Qualification Badge */}
                <span className="px-2 py-0.5 rounded-sm text-[11px] sm:text-xs font-medium bg-slate-100 text-slate-700 border border-slate-300 flex items-center gap-1 font-title">
                  <Award size={12} /> {qualification} ({rate})
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons & Close */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {isAdmin && (
              <>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors flex items-center gap-1 font-title"
                  title="Șterge Membru"
                >
                  <Trash2 size={13} />
                  <span className="hidden sm:inline">Șterge</span>
                </button>
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors flex items-center gap-1 font-title"
                >
                  <Edit3 size={13} />
                  <span className="hidden sm:inline">{isEditing ? 'Vizualizează' : 'Editează Profil'}</span>
                  <span className="sm:hidden">{isEditing ? 'Vezi' : 'Editează'}</span>
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 border border-slate-300 transition-colors"
              aria-label="Închide"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Tab Navigation (Scrollable Horizontally on Small Screens) */}
        {!isEditing && (
          <div className="px-3 sm:px-5 bg-slate-50 border-b border-slate-200 flex gap-4 sm:gap-6 text-xs font-medium text-slate-600 font-title overflow-x-auto no-scrollbar whitespace-nowrap">
            <button
              onClick={() => setActiveTab('finance')}
              className={`py-2.5 sm:py-3 border-b-2 transition-colors flex items-center gap-1.5 shrink-0 ${
                activeTab === 'finance'
                  ? 'border-slate-900 text-slate-900 font-bold'
                  : 'border-transparent hover:text-slate-900'
              }`}
            >
              <CreditCard size={14} />
              Sinteză Financiară
            </button>

            <button
              onClick={() => setActiveTab('activity')}
              className={`py-2.5 sm:py-3 border-b-2 transition-colors flex items-center gap-1.5 shrink-0 ${
                activeTab === 'activity'
                  ? 'border-slate-900 text-slate-900 font-bold'
                  : 'border-transparent hover:text-slate-900'
              }`}
            >
              <TrendingUp size={14} />
              Activitate & Prezențe
            </button>

            <button
              onClick={() => setActiveTab('achievements')}
              className={`py-2.5 sm:py-3 border-b-2 transition-colors flex items-center gap-1.5 shrink-0 ${
                activeTab === 'achievements'
                  ? 'border-slate-900 text-slate-900 font-bold'
                  : 'border-transparent hover:text-slate-900'
              }`}
            >
              <Sparkles size={14} className="text-amber-500" />
              Pașaport & Insigne
            </button>

            <button
              onClick={() => setActiveTab('profile')}
              className={`py-2.5 sm:py-3 border-b-2 transition-colors flex items-center gap-1.5 shrink-0 ${
                activeTab === 'profile'
                  ? 'border-slate-900 text-slate-900 font-bold'
                  : 'border-transparent hover:text-slate-900'
              }`}
            >
              <User size={14} />
              Date Contact & Profil
            </button>

            <button
              onClick={() => setActiveTab('committees')}
              className={`py-2.5 sm:py-3 border-b-2 transition-colors flex items-center gap-1.5 shrink-0 ${
                activeTab === 'committees'
                  ? 'border-slate-900 text-slate-900 font-bold'
                  : 'border-transparent hover:text-slate-900'
              }`}
            >
              <Users2 size={14} className="text-indigo-600" />
              Abilități & Competențe
            </button>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-6 space-y-5 sm:space-y-6 bg-white font-data">
          {isEditing ? (
            /* Edit Form */
            <form onSubmit={handleSaveProfile} className="space-y-5 max-w-2xl mx-auto font-data">
              <div className="pb-3 border-b border-slate-200 flex justify-between items-center">
                <h3 className="text-sm font-bold text-slate-900 font-title">Editează Profilul Membrului</h3>
                <button type="button" onClick={() => setIsEditing(false)} className="text-xs text-slate-500 hover:text-slate-900 font-data">
                  Anulează
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 font-title">Nume Complet</label>
                  <input type="text" value={name} onChange={e => setName(e.target.value)} required className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm text-slate-900 focus:border-slate-900 focus:outline-none font-data" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 font-title">Poreclă (Nickname)</label>
                  <input type="text" value={nickname} onChange={e => setNickname(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm text-slate-900 focus:border-slate-900 focus:outline-none font-data" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 font-title">Username</label>
                  <input type="text" value={username} onChange={e => setUsername(e.target.value)} required className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm text-slate-900 focus:border-slate-900 focus:outline-none font-data" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 font-title">Parolă</label>
                  <input type="text" value={password} onChange={e => setPassword(e.target.value)} required className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm text-slate-900 focus:border-slate-900 focus:outline-none font-data" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 font-title">Telefon</label>
                <input type="text" value={phone} onChange={e => setPhone(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm text-slate-900 focus:border-slate-900 focus:outline-none font-data" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 font-title">Rol</label>
                  <select value={role} onChange={e => setRole(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm bg-white text-slate-900 focus:border-slate-900 focus:outline-none font-data">
                    <option value="member">Voluntar</option>
                    <option value="admin">Board</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 font-title">Status</label>
                  <select value={status} onChange={e => setStatus(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm bg-white text-slate-900 focus:border-slate-900 focus:outline-none font-data">
                    <option value="active">Activ</option>
                    <option value="passive">Pasiv</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 font-title">Data Intrării</label>
                  <input type="date" value={joinDate} onChange={e => setJoinDate(e.target.value)} required className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm text-slate-900 focus:border-slate-900 focus:outline-none font-data" />
                </div>
              </div>

              {role === 'admin' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 font-title">Funcție Board (ex: Secretar, Trezorier)</label>
                  <input type="text" value={boardPosition} onChange={e => setBoardPosition(e.target.value)} placeholder="Introdu funcția" required className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm text-slate-900 focus:border-slate-900 focus:outline-none font-data" />
                </div>
              )}

              <div className="grid grid-cols-3 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 font-title">Prezențe</label>
                  <input type="number" min="0" value={presences} onChange={e => setPresences(Number(e.target.value))} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm text-slate-900 focus:border-slate-900 focus:outline-none font-data" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 font-title">Motivate</label>
                  <input type="number" min="0" value={excusedAbsences} onChange={e => setExcusedAbsences(Number(e.target.value))} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm text-slate-900 focus:border-slate-900 focus:outline-none font-data" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 font-title">Nemotivate</label>
                  <input type="number" min="0" value={unexcusedAbsences} onChange={e => setUnexcusedAbsences(Number(e.target.value))} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm text-slate-900 focus:border-slate-900 focus:outline-none font-data" />
                </div>
              </div>

              <div className="pt-2">
                <button type="submit" className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-md font-semibold text-xs transition-colors font-title">
                  Salvează Profilul
                </button>
              </div>
            </form>
          ) : (
            <>
              {/* TAB 1: SINTEZĂ FINANCIARĂ */}
              {activeTab === 'finance' && (
                <div className="space-y-6">
                  {/* Stat Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Datorie */}
                    <div className={`p-4 rounded-md border flex flex-col justify-between h-28 ${
                      isClear ? 'bg-emerald-50/50 border-emerald-200' : 'bg-rose-50/50 border-rose-200'
                    }`}>
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-700 font-title">Datorie Totală</span>
                        {isClear ? <CheckCircle2 size={16} className="text-emerald-700" /> : <AlertCircle size={16} className="text-rose-700" />}
                      </div>
                      <div>
                        <span className={`text-2xl font-bold font-data ${isClear ? 'text-emerald-800' : 'text-rose-800'}`}>
                          {debt} Lei
                        </span>
                        <span className="block text-xs text-slate-600 mt-0.5 font-data">
                          {isClear ? 'La zi cu plățile' : `${Math.floor(debt / COTIZATIE_LUNARA)} luni restante`}
                        </span>
                      </div>
                    </div>

                    {/* Total Cotizații */}
                    <div className="p-4 rounded-md bg-slate-50 border border-slate-200 flex flex-col justify-between h-28">
                      <span className="text-xs font-bold text-slate-700 font-title">Cotizații Achitate</span>
                      <div>
                        <span className="text-2xl font-bold text-slate-900 font-data">
                          {member.totalPaid || 0} Lei
                        </span>
                        <span className="block text-xs text-slate-500 mt-0.5 font-data">
                          Total plătit în club
                        </span>
                      </div>
                    </div>

                    {/* Ultima Plată */}
                    <div className="p-4 rounded-md bg-slate-50 border border-slate-200 flex flex-col justify-between h-28">
                      <span className="text-xs font-bold text-slate-700 font-title">Ultima Încasare</span>
                      <div>
                        {lastReceipt ? (
                          <>
                            <span className="text-2xl font-bold text-slate-900 font-data">
                              {lastReceipt.amount} Lei
                            </span>
                            <span className="block text-xs text-slate-500 mt-0.5 font-data">
                              {lastReceipt.month} ({new Date(lastReceipt.date).toLocaleDateString('ro-RO')})
                            </span>
                          </>
                        ) : (
                          <span className="text-xs text-slate-500 font-data">Nicio plată înregistrată</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Restanțe Alert Banner */}
                  {!isClear && (
                    <div className="p-4 rounded-md bg-rose-50 border border-rose-200 flex items-center justify-between flex-wrap gap-4">
                      <div>
                        <h4 className="text-xs font-bold text-rose-900 font-title">Restanțe Cotizație Detectate</h4>
                        <p className="text-xs text-rose-700 mt-0.5 font-data">
                          Luna restantă: <span className="font-semibold">{unpaidBreakdown[0]?.name || ''} 2026</span> ({COTIZATIE_LUNARA} Lei)
                        </p>
                      </div>

                      {isAdmin && (
                        <button
                          onClick={() => setIsPaymentModalOpen(true)}
                          className="px-3.5 py-2 rounded-md bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 font-title"
                        >
                          <PlusCircle size={14} />
                          Încasează Cotizație
                        </button>
                      )}
                    </div>
                  )}

                  {/* 12-Month Matrix */}
                  <div className="p-4 rounded-md border border-slate-200 bg-white space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 font-title">
                        <CalendarIcon size={14} className="text-slate-700" />
                        Calendar Cotizații 2026
                      </h4>
                      <span className="text-[11px] text-slate-500 font-data">Click pe lună restantă pentru încasare</span>
                    </div>

                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                      {dynamicMonths.map((m) => {
                        const isPaid = m.status === 'Achitat';
                        const isUnpaid = m.status === 'Neachitat';

                        return (
                          <button
                            key={m.monthIndex}
                            disabled={!isUnpaid || !isAdmin}
                            onClick={() => setIsPaymentModalOpen(true)}
                            className={`p-2.5 rounded-sm border text-center transition-colors font-data ${
                              isPaid 
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-800 cursor-default'
                                : isUnpaid
                                ? 'bg-rose-50 hover:bg-rose-100 border-rose-300 text-rose-800 font-semibold cursor-pointer'
                                : 'bg-slate-50 border-slate-200 text-slate-400 cursor-default'
                            }`}
                          >
                            <span className="text-xs block font-bold font-title">{m.shortName}</span>
                            <span className="text-[10px] block mt-0.5 font-medium font-data">
                              {isPaid ? 'Achitat' : isUnpaid ? 'Restanță' : 'Viitor'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Istoric Chitanțe Table */}
                  <div className="p-4 rounded-md border border-slate-200 bg-white space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 font-title">
                        <FileText size={14} className="text-slate-700" />
                        Istoric Chitanțe Electronice
                      </h4>
                      <span className="text-xs text-slate-500 font-data">{validReceipts.length} înregistrate</span>
                    </div>

                    {loadingPayments ? (
                      <div className="text-center py-6 text-xs text-slate-500 font-data">
                        Se încarcă chitanțele...
                      </div>
                    ) : validReceipts.length > 0 ? (
                      <div className="overflow-x-auto border border-slate-200 rounded-sm">
                        <table className="w-full text-left text-xs text-slate-800 font-data">
                          <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200 font-title">
                            <tr>
                              <th className="py-2 px-3">ID Chitanță</th>
                              <th className="py-2 px-3">Dată</th>
                              <th className="py-2 px-3">Lună</th>
                              <th className="py-2 px-3 text-right">Sumă</th>
                              <th className="py-2 px-3 text-right">Acțiuni</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-data">
                            {validReceipts.map((r: any, idx: number) => {
                              const isLatest = idx === 0;
                              return (
                                <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                                  <td className="py-2 px-3 font-mono font-medium text-slate-900 font-data">{r.id}</td>
                                  <td className="py-2 px-3 text-slate-600 font-data">{new Date(r.date).toLocaleDateString('ro-RO')}</td>
                                  <td className="py-2 px-3 font-medium text-slate-800 font-data">{r.month}</td>
                                  <td className="py-2 px-3 text-right font-bold text-emerald-700 font-data">{r.amount} Lei</td>
                                  <td className="py-2 px-3 text-right font-title">
                                    <div className="flex items-center justify-end gap-2">
                                      <button
                                        onClick={() => setSelectedReceipt(r)}
                                        className="text-xs font-semibold text-slate-900 underline hover:text-blue-600"
                                      >
                                        Vezi
                                      </button>
                                      {isAdmin && isLatest && (
                                        <button
                                          onClick={() => setReceiptToRevert(r)}
                                          className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                                          title="Anulează Plata"
                                        >
                                          <RotateCcw size={13} />
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-6 text-xs text-slate-500 font-medium font-data">
                        Nicio chitanță înregistrată.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: ACTIVITATE & PREZENȚE */}
              {activeTab === 'activity' && (
                <div className="space-y-6 font-data">
                  {/* Score Card */}
                  <div className="p-4 rounded-md border border-slate-200 bg-slate-50 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-600 block mb-0.5 font-title">
                        Scor Total Voluntar
                      </span>
                      <span className="text-2xl font-bold text-slate-900 font-data">
                        {member.score || 0} Puncte
                      </span>
                    </div>

                    {isAdmin && (
                      <button
                        onClick={() => setIsScoreModalOpen(true)}
                        className="px-3.5 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors font-title"
                      >
                        Ajustează Scor
                      </button>
                    )}
                  </div>

                  {/* Prezențe */}
                  <div className="p-4 rounded-md border border-slate-200 bg-white space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-900 font-title">
                        Prezențe Evenimente
                      </h4>
                      <span className="text-xs font-bold text-slate-800 font-data">{rate}</span>
                    </div>

                    {/* Progress Bar */}
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                      <div
                        className="h-full bg-slate-900 transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>

                    {/* Breakdown */}
                    <div className="grid grid-cols-3 gap-3 pt-2 text-center text-xs font-data">
                      <div className="p-2.5 rounded-sm bg-slate-50 border border-slate-200">
                        <span className="text-slate-500 block font-title">Prezențe</span>
                        <span className="text-base font-bold text-slate-900 font-data">{member.presences || 0}</span>
                      </div>
                      <div className="p-2.5 rounded-sm bg-slate-50 border border-slate-200">
                        <span className="text-slate-500 block font-title">Motivate</span>
                        <span className="text-base font-bold text-slate-900 font-data">{member.excusedAbsences || 0}</span>
                      </div>
                      <div className="p-2.5 rounded-sm bg-slate-50 border border-slate-200">
                        <span className="text-slate-500 block font-title">Nemotivate</span>
                        <span className="text-base font-bold text-slate-900 font-data">{member.unexcusedAbsences || 0}</span>
                      </div>
                    </div>
                  </div>

                  {/* Senioritate */}
                  <div className="p-4 rounded-md border border-slate-200 bg-slate-50 space-y-1">
                    <span className="text-xs font-bold text-slate-600 block font-title">
                      Vechime În Club
                    </span>
                    <span className="text-lg font-bold text-slate-900 block font-data">
                      {(() => {
                        if (!member.joinDate) return 'N/A';
                        try {
                          const join = new Date(member.joinDate);
                          const now = new Date();
                          const diffDays = Math.ceil(Math.abs(now.getTime() - join.getTime()) / (1000 * 60 * 60 * 24));
                          return diffDays < 30 ? `${diffDays} Zile` : `${Math.floor(diffDays / 30)} Luni`;
                        } catch { return 'N/A'; }
                      })()}
                    </span>
                    <span className="text-xs text-slate-500 block font-data">
                      Data intrării: {member.joinDate ? new Date(member.joinDate).toLocaleDateString('ro-RO') : 'N/A'}
                    </span>
                  </div>
                </div>
              )}

              {/* TAB 3: PROFIL & CONTACT */}
              {activeTab === 'profile' && (
                <div className="space-y-6 font-data">
                  <div className="p-4 rounded-md border border-slate-200 bg-white space-y-3">
                    <h4 className="text-xs font-bold text-slate-900 pb-2 border-b border-slate-200 font-title">
                      Date de Contact
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="p-3 rounded-sm bg-slate-50 border border-slate-200 font-data">
                        <span className="text-slate-500 block font-title">Telefon</span>
                        <span className="font-semibold text-slate-900 flex items-center gap-1.5 mt-0.5 font-data">
                          <Phone size={13} className="text-slate-600" />
                          {member.phone || 'Nespecificat'}
                        </span>
                      </div>

                      <div className="p-3 rounded-sm bg-slate-50 border border-slate-200 font-data">
                        <span className="text-slate-500 block font-title">Username</span>
                        <span className="font-mono font-semibold text-slate-900 mt-0.5 block font-data">
                          {member.username || '—'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-md border border-slate-200 bg-white space-y-2 text-xs font-data">
                    <h4 className="font-bold text-slate-900 pb-2 border-b border-slate-200 font-title">
                      Detalii Organizaționale
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-slate-500 block font-title">Rol</span>
                        <span className="font-semibold text-slate-900 font-data">{member.role === 'admin' ? 'Board Member' : 'Voluntar'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block font-title">Data Înregistrării</span>
                        <span className="font-semibold text-slate-900 font-data">{member.joinDate ? new Date(member.joinDate).toLocaleDateString('ro-RO') : 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 4. TAB ACHIEVEMENTS & MILESTONES */}
              {activeTab === 'achievements' && (() => {
                const p = Number(member.presences || 0);
                const tp = Number(member.totalPaid || 0);
                const isDebtFree = debt === 0;
                const hours = p * 2;

                const tier = p >= 25 
                  ? { title: 'Ambasador Camena', icon: '👑', desc: 'Lider de opinie și pilon de bază al clubului', color: 'bg-amber-50 text-amber-900 border-amber-300' }
                  : p >= 10
                  ? { title: 'Senior Voluntar', icon: '🌟', desc: 'Implicare remarcabilă și experiență confirmată', color: 'bg-purple-50 text-purple-900 border-purple-300' }
                  : p >= 4
                  ? { title: 'Voluntar Activ', icon: '⚡', desc: 'Participare activă și dedicare constantă', color: 'bg-emerald-50 text-emerald-900 border-emerald-300' }
                  : { title: 'Recrut Nou', icon: '🌱', desc: 'La început de drum în călătoria Interact', color: 'bg-blue-50 text-blue-900 border-blue-300' };

                const scoreNum = Number(member.score || member.totalScore || 0);
                const hasLogisticOrTechnical = userCommittees.includes('Organizare & Logistică') || userSkills.some(s => s.toLowerCase().includes('logistic') || s.toLowerCase().includes('tehnic'));
                const hasPROrCreative = userCommittees.includes('Imagine Publică & PR') || userSkills.some(s => s.toLowerCase().includes('foto') || s.toLowerCase().includes('video') || s.toLowerCase().includes('design'));
                const hasFundraising = userCommittees.includes('Finanțe & Fundraising') || userSkills.some(s => s.toLowerCase().includes('sponsor') || s.toLowerCase().includes('vanzari'));

                const milestones = [
                  {
                    id: 'm1',
                    title: 'Primii Pași',
                    desc: 'Participă la minim 3 ședințe sau acțiuni',
                    current: Math.min(p, 3),
                    target: 3,
                    icon: '🎯',
                    unlocked: p >= 3
                  },
                  {
                    id: 'm2',
                    title: 'Pilonul Echipei',
                    desc: 'Atinge 10 prezențe validate în club',
                    current: Math.min(p, 10),
                    target: 10,
                    icon: '🏛️',
                    unlocked: p >= 10
                  },
                  {
                    id: 'm3',
                    title: 'Legendă Activă',
                    desc: 'Peste 25 de participări și devotament de lungă durată',
                    current: Math.min(p, 25),
                    target: 25,
                    icon: '🔥',
                    unlocked: p >= 25
                  },
                  {
                    id: 'm4',
                    title: 'Disciplină Financiară',
                    desc: 'Balanță la zi (fără restanțe la cotizație)',
                    current: isDebtFree ? 1 : 0,
                    target: 1,
                    icon: '💎',
                    unlocked: isDebtFree
                  },
                  {
                    id: 'm5',
                    title: 'Sponsor Fidel',
                    desc: 'Achită minim 6 luni de cotizație (90 RON)',
                    current: Math.min(tp, 90),
                    target: 90,
                    unit: 'RON',
                    icon: '🛡️',
                    unlocked: tp >= 90
                  },
                  {
                    id: 'm6',
                    title: 'Calificativ de Excelență',
                    desc: 'Rată de prezență de peste 85%',
                    current: (rate === '100%' || qualification === 'Excelent' || qualification === 'Maxim') ? 1 : 0,
                    target: 1,
                    icon: '⭐',
                    unlocked: (rate === '100%' || qualification === 'Excelent' || qualification === 'Maxim')
                  },
                  {
                    id: 'm7',
                    title: '🏗️ Salahor Desăvârșit',
                    desc: 'Manipulare greutăți, cărat echipamente & forță brută pe teren',
                    current: Math.min(scoreNum, 12),
                    target: 12,
                    unit: 'pct',
                    icon: '🏗️',
                    unlocked: scoreNum >= 12 || hasLogisticOrTechnical
                  },
                  {
                    id: 'm8',
                    title: '🔨 Inginer Constructor',
                    desc: 'Montat standuri, structuri decor, bormașină & meșterit tehnic',
                    current: hasLogisticOrTechnical ? 1 : 0,
                    target: 1,
                    icon: '🔨',
                    unlocked: hasLogisticOrTechnical || p >= 5
                  },
                  {
                    id: 'm9',
                    title: '🎤 Vocea & Imaginea',
                    desc: 'Prezentare pe scenă, MC, social media, foto sau video de impact',
                    current: hasPROrCreative ? 1 : 0,
                    target: 1,
                    icon: '🎤',
                    unlocked: hasPROrCreative || scoreNum >= 15
                  },
                  {
                    id: 'm10',
                    title: '🏆 Centurion Camena',
                    desc: 'Peste 30 de ore de voluntariat validate pe teren',
                    current: Math.min(hours, 30),
                    target: 30,
                    unit: 'ore',
                    icon: '🏆',
                    unlocked: hours >= 30
                  },
                  {
                    id: 'm11',
                    title: '💰 Rechin Financiar',
                    desc: 'Atragere fonduri, vânzări bilete & sponsorizări obținute',
                    current: hasFundraising ? 1 : 0,
                    target: 1,
                    icon: '💰',
                    unlocked: hasFundraising || scoreNum >= 20
                  },
                  {
                    id: 'm12',
                    title: '❤️ Inima Echipei',
                    desc: 'Energie pozitivă, spirit colegial și implicare constantă',
                    current: p >= 4 ? 1 : 0,
                    target: 1,
                    icon: '❤️',
                    unlocked: p >= 4
                  }
                ];

                const unlockedCount = milestones.filter(m => m.unlocked).length;

                return (
                  <div className="space-y-6">
                    {/* Tier Banner */}
                    <div className={`p-5 rounded-2xl border-2 flex items-center justify-between gap-4 ${tier.color}`}>
                      <div className="flex items-center gap-3.5">
                        <div className="text-3xl">{tier.icon}</div>
                        <div>
                          <span className="text-[10px] font-black uppercase tracking-wider opacity-70 block">Nivel Voluntar</span>
                          <h3 className="text-lg font-bold tracking-tight">{tier.title}</h3>
                          <p className="text-xs opacity-80 mt-0.5">{tier.desc}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[10px] font-black uppercase tracking-wider opacity-70 block">Ore Voluntariat</span>
                        <div className="text-2xl font-black">{hours} <span className="text-xs font-normal">ore</span></div>
                      </div>
                    </div>

                    {/* Progress Overview Bar */}
                    <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                      <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                        <span>Progres Total Pașaport Voluntar</span>
                        <span>{unlockedCount} din {milestones.length} deblocate ({Math.round((unlockedCount / milestones.length) * 100)}%)</span>
                      </div>
                      <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-slate-900 transition-all duration-500 rounded-full" 
                          style={{ width: `${(unlockedCount / milestones.length) * 100}%` }}
                        />
                      </div>
                    </div>

                    {/* Milestones Grid */}
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                        Insigne & Obiective
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {milestones.map(m => {
                          const pct = Math.round((m.current / m.target) * 100);
                          return (
                            <div
                              key={m.id}
                              className={`p-4 rounded-xl border transition-all ${
                                m.unlocked 
                                  ? 'bg-white border-slate-300 shadow-sm' 
                                  : 'bg-slate-50/70 border-dashed border-slate-200 opacity-70'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <div className="flex items-center gap-2.5">
                                  <span className="text-2xl">{m.icon}</span>
                                  <div>
                                    <h5 className="text-sm font-bold text-slate-900">{m.title}</h5>
                                    <p className="text-[11px] text-slate-500">{m.desc}</p>
                                  </div>
                                </div>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                  m.unlocked ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                                }`}>
                                  {m.unlocked ? 'Obținut' : `${pct}%`}
                                </span>
                              </div>

                              <div className="mt-3 space-y-1">
                                <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full transition-all ${m.unlocked ? 'bg-emerald-600' : 'bg-slate-400'}`}
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                                <div className="text-[10px] text-right font-bold text-slate-400">
                                  {m.current} / {m.target} {m.unit || ''}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </>
          )}

          {/* TAB 5: COMMITTEES & SKILLS PREFERENCES */}
          {activeTab === 'committees' && (
            <div className="space-y-6 max-w-3xl mx-auto font-['Hanken_Grotesk']">
              {/* Informative Banner */}
              <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-900 flex items-start gap-3">
                <Users2 className="shrink-0 mt-0.5 text-indigo-600" size={18} />
                <div className="text-xs font-['Manrope']">
                  <strong>Preferințe de Comitet & Roluri</strong>: Selectarea comitetelor reprezintă o declarație de interes pentru coordonatori și board, facilitând distribuirea optimă a sarcinilor la proiecte fără a garanta sau bloca automat o poziție.
                </div>
              </div>

              {/* Committee Options */}
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
                  <Target size={14} className="text-indigo-600" />
                  <span>Comitete de Interes (Alege 1-2 comitete)</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { id: 'Imagine Publică & PR', title: 'Imagine Publică & PR', icon: '🎨', desc: 'Design grafic, Social Media & Reels, Foto/Video, comunicare externă' },
                    { id: 'Servicii Comunitare & Proiecte', title: 'Servicii Comunitare & Proiecte', icon: '🤝', desc: 'Organizare acțiuni caritabile, voluntariat direct, proiecte sociale' },
                    { id: 'Finanțe & Fundraising', title: 'Finanțe & Fundraising', icon: '💼', desc: 'Atragere sponsori, bugetare, campanii de strângere de fonduri' },
                    { id: 'Leadership & Dezvoltare', title: 'Leadership & Dezvoltare', icon: '🎯', desc: 'Workshop-uri, teambuilding, formare și dezvoltare personală' },
                    { id: 'Organizare & Logistică', title: 'Organizare & Logistică', icon: '⚙️', desc: 'Planificare tehnică, achiziții materiale, transport și amenajare locații' },
                  ].map(comm => {
                    const isSelected = userCommittees.includes(comm.id);
                    return (
                      <div
                        key={comm.id}
                        onClick={() => {
                          if (isSelected) {
                            setUserCommittees(prev => prev.filter(c => c !== comm.id));
                          } else {
                            if (userCommittees.length >= 2) {
                              setUserCommittees([userCommittees[1], comm.id]);
                            } else {
                              setUserCommittees(prev => [...prev, comm.id]);
                            }
                          }
                        }}
                        className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-indigo-50/70 border-indigo-600 shadow-sm'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <span className="text-2xl">{comm.icon}</span>
                            <div>
                              <h5 className="text-sm font-bold text-slate-900">{comm.title}</h5>
                              <p className="text-[11px] text-slate-500 font-['Manrope'] mt-0.5 leading-snug">{comm.desc}</p>
                            </div>
                          </div>
                          <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                            isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300'
                          }`}>
                            {isSelected && <Check size={12} />}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Skills & Talents */}
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
                  <Sparkles size={14} className="text-amber-500" />
                  <span>Abilități & Pasiuni Practice</span>
                </h4>

                <div className="flex flex-wrap gap-2">
                  {[
                    'Design Canva / Adobe',
                    'Foto & Editare Video',
                    'Social Media & Reels',
                    'Public Speaking & Prezentare',
                    'Copywriting & Redactare',
                    'Atragere Sponsori & Pitching',
                    'Management Evenimente',
                    'Logistică & Transport (Permis)',
                    'Muzică / DJ / Artă',
                    'Programare & Web'
                  ].map(skill => {
                    const isSelected = userSkills.includes(skill);
                    return (
                      <button
                        type="button"
                        key={skill}
                        onClick={() => {
                          if (isSelected) {
                            setUserSkills(prev => prev.filter(s => s !== skill));
                          } else {
                            setUserSkills(prev => [...prev, skill]);
                          }
                        }}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
                          isSelected
                            ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {isSelected && <Check size={12} className="text-emerald-400" />}
                        <span>{skill}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Save Button */}
              <div className="pt-4 border-t border-slate-200 flex justify-end">
                <button
                  type="button"
                  disabled={isSavingCommittees}
                  onClick={handleSaveCommittees}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/20 flex items-center gap-2"
                >
                  <Check size={14} />
                  <span>{isSavingCommittees ? 'Se salvează...' : 'Salvează Preferințele'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Payment Modal */}
      <AnimatePresence>
        {isPaymentModalOpen && (
          <PaymentModal
            memberId={member.id}
            memberName={member.name}
            totalPaid={member.totalPaid || 0}
            joinDateStr={member.joinDate}
            onClose={() => setIsPaymentModalOpen(false)}
            onSuccess={(newTotalPaid, newStatus) => {
              setIsPaymentModalOpen(false);
              onUpdateMember({ ...member, totalPaid: newTotalPaid, status: newStatus });
            }}
          />
        )}
      </AnimatePresence>

      {/* Receipt View Modal */}
      <AnimatePresence>
        {selectedReceipt && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm font-data">
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              className="relative w-full max-w-md bg-white border border-slate-300 rounded-md shadow-2xl p-6 z-[201] text-slate-900 space-y-4 font-data"
            >
              <div className="flex justify-between items-start pb-3 border-b border-slate-200">
                <div>
                  <h3 className="font-bold text-base text-slate-900 font-title">Chitanță Electronică</h3>
                  <p className="text-xs text-slate-500 font-mono mt-0.5 font-data">{selectedReceipt.id}</p>
                </div>
                <button
                  onClick={() => setSelectedReceipt(null)}
                  className="p-1 rounded-sm hover:bg-slate-100 text-slate-500 hover:text-slate-900"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-2 text-xs font-data">
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500 font-title">Status:</span>
                  <span className="font-semibold text-emerald-700 font-data">Validă</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500 font-title">Data încasării:</span>
                  <span className="font-medium text-slate-800 font-data">{new Date(selectedReceipt.date).toLocaleDateString('ro-RO')}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500 font-title">Lună acoperită:</span>
                  <span className="font-medium text-slate-800 font-data">{selectedReceipt.month}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500 font-title">Membru:</span>
                  <span className="font-medium text-slate-800 font-data">{selectedReceipt.memberName}</span>
                </div>
                <div className="flex justify-between py-2 text-sm font-bold">
                  <span className="text-slate-800 font-title">Sumă Încasată:</span>
                  <span className="text-emerald-700 font-mono font-data">{selectedReceipt.amount} Lei</span>
                </div>
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-slate-600 block font-title">Semnătură Membru</span>
                  <div className="bg-white rounded-sm p-2 h-24 flex items-center justify-center border border-slate-300">
                    {selectedReceipt.memberSignature ? (
                      <img src={selectedReceipt.memberSignature} alt="Semnătură membru" className="max-h-full max-w-full object-contain" />
                    ) : <span className="text-xs text-slate-400 font-data">-</span>}
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-slate-600 block font-title">Semnătură Trezorier</span>
                  <div className="bg-white rounded-sm p-2 h-24 flex items-center justify-center border border-slate-300">
                    {selectedReceipt.treasurerSignature ? (
                      <img src={selectedReceipt.treasurerSignature} alt="Semnătură trezorier" className="max-h-full max-w-full object-contain" />
                    ) : <span className="text-xs text-slate-400 font-data">-</span>}
                  </div>
                </div>
              </div>

              <button 
                onClick={() => setSelectedReceipt(null)}
                className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-semibold transition-colors mt-2 font-title"
              >
                Închide
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Score Adjustment Modal */}
      <AnimatePresence>
        {isScoreModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm font-data">
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto bg-white border border-slate-300 rounded-2xl shadow-2xl p-6 z-[201] text-slate-900 space-y-4"
            >
              <div>
                <h3 className="font-bold text-base text-slate-900 font-title">Ajustare Scor Voluntar</h3>
                <p className="text-xs text-slate-500 mt-0.5 font-data">Acordare sau scădere puncte de activitate</p>
              </div>

              <form onSubmit={handleAdjustScore} className="space-y-3 font-data">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 font-title">Puncte (ex: 5 sau -2)</label>
                  <input
                    type="number"
                    value={scoreAdjustValue}
                    onChange={e => setScoreAdjustValue(e.target.value)}
                    required
                    placeholder="0"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm text-slate-900 focus:border-slate-900 focus:outline-none font-data"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 font-title">Motiv / Justificare</label>
                  <input
                    type="text"
                    value={scoreAdjustReason}
                    onChange={e => setScoreAdjustReason(e.target.value)}
                    required
                    placeholder="Ex: Implicare proiect / Lider activitate"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm text-slate-900 focus:border-slate-900 focus:outline-none font-data"
                  />
                </div>

                {/* Interactive Scoring Reference Guide */}
                <ScoringReferenceGuide
                  selectedAction={scoreAdjustReason}
                  onSelectPreset={(preset: ScoringPreset) => {
                    setScoreAdjustValue(String(preset.points));
                    setScoreAdjustReason(preset.action);
                  }}
                />

                <div className="pt-2 flex gap-3 font-title">
                  <button
                    type="button"
                    onClick={() => setIsScoreModalOpen(false)}
                    className="flex-1 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-xs font-semibold text-slate-700"
                  >
                    Anulează
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-white"
                  >
                    Salvează
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Revert Payment Modal */}
      <AnimatePresence>
        {receiptToRevert && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm font-data">
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              className="relative w-full max-w-sm bg-white border border-slate-300 rounded-md shadow-2xl p-6 z-[201] text-slate-900 space-y-4"
            >
              <div className="flex items-center gap-2.5 text-rose-700">
                <AlertCircle size={20} />
                <h3 className="font-bold text-base text-slate-900 font-title">Anulare Plată</h3>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed font-data">
                Sigur doriți să anulați chitanța <span className="font-mono font-semibold text-slate-900">{receiptToRevert.id}</span> ({receiptToRevert.amount} Lei)?
                Luna stinsă va deveni din nou neachitată.
              </p>

              <div className="flex gap-3 pt-2 font-title">
                <button
                  onClick={() => setReceiptToRevert(null)}
                  className="flex-1 py-2 rounded-md bg-slate-100 hover:bg-slate-200 border border-slate-300 text-xs font-semibold text-slate-700"
                >
                  Anulează
                </button>
                <button
                  onClick={handleConfirmRevert}
                  className="flex-1 py-2 rounded-md bg-rose-700 hover:bg-rose-800 text-xs font-semibold text-white"
                >
                  Confirmă Anularea
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Member Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm font-data">
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              className="relative w-full max-w-sm bg-white border border-slate-300 rounded-2xl shadow-2xl p-6 z-[201] text-slate-900 space-y-4 font-data"
            >
              <div className="flex items-center gap-2.5 text-rose-700">
                <AlertCircle size={22} />
                <h3 className="font-bold text-base text-slate-900 font-title">Confirmare Ștergere Membru</h3>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed font-data">
                Ești sigur că dorești să ștergi definitiv membrul <strong className="text-slate-900 font-bold">{member.name}</strong>? Această acțiune va elimina contul și înregistrările sale și este ireversibilă.
              </p>

              <div className="flex gap-3 pt-2 font-title">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-xs font-semibold text-slate-700"
                >
                  Anulează
                </button>
                <button
                  onClick={handleDeleteMember}
                  disabled={isDeletingMember}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-bold text-white shadow-md shadow-rose-600/20"
                >
                  {isDeletingMember ? 'Se șterge...' : 'Șterge Definitiv'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>,
    document.body
  );
}
