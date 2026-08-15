import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, CheckCircle2, AlertCircle, Calendar as CalendarIcon, FileText, 
  Phone, RotateCcw, TrendingUp, Award, User, Trash2,
  Edit3, PlusCircle, CreditCard, Sparkles
} from 'lucide-react';
import { toast } from '../ui/Toast';
import { calculateDebt, calculateQualification, generateMemberLedger, COTIZATIE_LUNARA } from '../../utils/finance';
import { computeMemberMilestones } from '../../utils/milestones';
import { updateMemberFields, applyMemberScoreAdjustment, revertLatestTreasuryPayment, deleteMemberFromDB, TreasuryPayment, MAX_SCORE_ADJUSTMENT, MIN_SCORE_ADJUSTMENT, logScoreAudit } from '../../utils/supabaseService';
import { PaymentModal } from '../finance/PaymentModal';
import { ScoringReferenceGuide, ScoringPreset } from '../dashboard/views/ScoringReferenceGuide';
import { supabase } from '../../supabase';

interface MemberDrawerProps {
  member: any;
  onClose: () => void;
  onUpdateMember: (updatedMember: any) => void;
  isAdmin: boolean;
  currentUserObj?: any;
}

export function MemberDrawer({ member, onClose, onUpdateMember, isAdmin, currentUserObj }: MemberDrawerProps) {
  const [activeTab, setActiveTab] = useState<'finance' | 'activity' | 'profile' | 'achievements'>('finance');
  const [isEditing, setIsEditing] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<TreasuryPayment | null>(null);

  // Score Adjustment Modal states
  const [isScoreModalOpen, setIsScoreModalOpen] = useState(false);
  const [scoreAdjustValue, setScoreAdjustValue] = useState('');
  const [scoreAdjustReason, setScoreAdjustReason] = useState('');
  const [isSubmittingScore, setIsSubmittingScore] = useState(false);

  // AlertDialog state for Revert Payment
  const [receiptToRevert, setReceiptToRevert] = useState<TreasuryPayment | null>(null);

  const [payments, setPayments] = useState<any[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(true);
  const [memberKudosCount, setMemberKudosCount] = useState(0);

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

  // Load kudos count for achievements tab
  useEffect(() => {
    async function loadKudos() {
      try {
        const { data } = await supabase.from('kudos').select('*');
        if (data) {
          const count = data.filter((k: any) => {
            const targetId = k.toId || k.to_id || k.recipient_id;
            const targetName = k.toName || k.to_name || k.recipient_name;
            return (
              (targetId && String(targetId).toLowerCase() === String(member.id).toLowerCase()) ||
              (targetName && member.name && targetName.toLowerCase() === member.name.toLowerCase())
            );
          }).length;
          setMemberKudosCount(count);
        }
      } catch (err) {
        console.error("Failed to load kudos count", err);
      }
    }
    loadKudos();
  }, [member.id, member.name]);

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
  const [nickname, setNickname] = useState(member.nickname || '');
  const [hours, setHours] = useState<number>(member.stats?.hours ?? member.hours ?? (member.presences ? member.presences * 2 : 0));
  const [presences, setPresences] = useState(member.presences || 0);
  const [excusedAbsences, setExcusedAbsences] = useState(member.excusedAbsences || 0);
  const [unexcusedAbsences, setUnexcusedAbsences] = useState(member.unexcusedAbsences || 0);
  const [customMilestones, setCustomMilestones] = useState<any[]>(member.customMilestones || member.stats?.customMilestones || []);
  const [joinDate, setJoinDate] = useState(() => member.joinDate ? member.joinDate.split('T')[0] : new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState(member.status || 'active');
  const [boardPosition, setBoardPosition] = useState(member.boardPosition || '');
  const [adminNewPassword, setAdminNewPassword] = useState('');

  // Add Custom Milestone form states
  const [showAddMilestone, setShowAddMilestone] = useState(false);
  const [newMilestoneTitle, setNewMilestoneTitle] = useState('');
  const [newMilestoneDesc, setNewMilestoneDesc] = useState('');
  const [newMilestoneBadge, setNewMilestoneBadge] = useState('');
  const [newMilestoneIcon, setNewMilestoneIcon] = useState('🏆');

  // Delete member confirmation modal state
  const [isDeletingMember, setIsDeletingMember] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    setName(member.name);
    setPhone(member.phone || '');
    setRole(member.role || 'member');
    setUsername(member.username || '');
    setNickname(member.nickname || '');
    setHours(member.stats?.hours ?? member.hours ?? (member.presences ? member.presences * 2 : 0));
    setPresences(member.presences || 0);
    setExcusedAbsences(member.excusedAbsences || 0);
    setUnexcusedAbsences(member.unexcusedAbsences || 0);
    setCustomMilestones(member.customMilestones || member.stats?.customMilestones || []);
    setJoinDate(member.joinDate ? member.joinDate.split('T')[0] : new Date().toISOString().split('T')[0]);
    setStatus(member.status || 'active');
    setBoardPosition(member.boardPosition || '');
  }, [member]);

  const handleDeleteMember = async () => {
    setIsDeletingMember(true);
    try {
      const adminName = currentUserObj?.name || currentUserObj?.username || 'Admin';
      const adminUsername = currentUserObj?.username;

      await logScoreAudit({
        adminId: currentUserObj?.id,
        adminName,
        adminUsername,
        targetMemberId: member.id,
        targetMemberName: member.name,
        action: 'MEMBER_DELETE',
        reason: `ȘTERGERE MEMBRU: Definitiv din baza de date ${member.name} (ID: ${member.id})`
      });

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
      nickname,
      hours: Number(hours),
      stats: { ...(member.stats || {}), hours: Number(hours), customMilestones },
      presences: Number(presences),
      excusedAbsences: Number(excusedAbsences),
      unexcusedAbsences: Number(unexcusedAbsences),
      customMilestones,
      joinDate: new Date(joinDate).toISOString(),
      status,
      boardPosition: role === 'admin' ? boardPosition.trim() : null,
      attendanceRate: rate,
      qualification
    };
    const updatedMember = { ...member, ...profileFields };

    try {
      const adminName = currentUserObj?.name || currentUserObj?.username || 'Admin';
      const adminUsername = currentUserObj?.username;

      await updateMemberFields(member.id, profileFields);

      // Dacă s-a introdus o parolă nouă pentru membru de către admin
      if (adminNewPassword && adminNewPassword.trim().length > 0) {
        const { data: passRes, error: passErr } = await supabase.rpc('admin_set_member_password', {
          p_admin_member_id: currentUserObj?.id || currentUserObj?.username || 'stan.stefan',
          p_target_member_id: member.id,
          p_new_password: adminNewPassword.trim()
        });

        if (passErr || (passRes && !passRes.success)) {
          toast.error(passRes?.error || passErr?.message || 'Eroare la setarea noii parole.');
        } else {
          toast.success(`Parola pentru ${member.name} a fost actualizată!`);
          setAdminNewPassword('');
        }
      }
      
      await logScoreAudit({
        adminId: currentUserObj?.id,
        adminName,
        adminUsername,
        targetMemberId: member.id,
        targetMemberName: member.name,
        action: 'MEMBER_EDIT',
        reason: `EDITARE PROFIL: Modificare date cont pentru ${member.name}`
      });

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
    if (isSubmittingScore) return; // Prevent double submission
    const val = parseInt(scoreAdjustValue, 10);
    if (isNaN(val) || val === 0) return toast.error('Introdu o valoare numerică diferită de zero.');
    if (val > MAX_SCORE_ADJUSTMENT || val < MIN_SCORE_ADJUSTMENT) {
      return toast.error(`Punctajul la o singură ajustare trebuie să fie între ${MIN_SCORE_ADJUSTMENT} și +${MAX_SCORE_ADJUSTMENT} puncte.`);
    }
    const cleanReason = scoreAdjustReason.trim();
    if (!cleanReason) return toast.error('Motivul este obligatoriu.');

    const adminName = currentUserObj?.name || currentUserObj?.username || 'Admin';
    const adminUsername = currentUserObj?.username;
    const adminId = currentUserObj?.id;

    const newAdjustment = {
      id: `adj_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      points: val,
      reason: cleanReason,
      date: new Date().toISOString(),
      adminName,
      adminUsername,
      adminId,
      targetMemberId: member.id,
      targetMemberName: member.name || 'Membru'
    };

    const newScore = (member.score || 0) + val;

    const updatedMember = {
      ...member,
      score: newScore,
      scoreAdjustments: [...(member.scoreAdjustments || []), newAdjustment]
    };

    setIsSubmittingScore(true);
    try {
      await applyMemberScoreAdjustment(member.id, val, newAdjustment);
      onUpdateMember(updatedMember);
      setIsScoreModalOpen(false);
      setScoreAdjustValue('');
      setScoreAdjustReason('');
      if (val > 0) {
        toast.success(`✅ Ai acordat +${val} puncte pentru ${member.name} (Acțiune: "${cleanReason}").`);
      } else {
        toast.success(`⚠️ Ai scăzut ${Math.abs(val)} puncte pentru ${member.name} (Motiv: "${cleanReason}").`);
      }
    } catch (err: any) {
      toast.error(err.message || 'Eroare la ajustarea scorului.');
    } finally {
      setIsSubmittingScore(false);
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

  const dynamicMonths = generateMemberLedger(member.joinDate, member.totalPaid || 0);
  const debt = calculateDebt(member.joinDate, member.totalPaid || 0);
  const isClear = debt === 0;
  const computedStatus = isClear ? 'active' : 'debtor';

  const { rate, qualification, percentage } = calculateQualification(
    member.presences || 0,
    member.excusedAbsences || 0,
    member.unexcusedAbsences || 0,
    member.status,
    member.role
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
        className="relative w-full max-w-4xl max-h-[94vh] sm:max-h-[90vh] bg-white dark:bg-[#161B22] text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-800 shadow-2xl rounded-[2px] z-[151] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-6 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            {/* Square Initials or Photo Avatar */}
            {(member.avatar || member.photo_url || member.photoUrl) ? (
              <img
                src={member.avatar || member.photo_url || member.photoUrl}
                alt={member.name}
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-[2px] object-cover border border-slate-300 dark:border-slate-700 shrink-0 shadow-xs"
              />
            ) : (
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-[2px] bg-slate-900 text-white font-bold text-base sm:text-lg flex items-center justify-center shrink-0 font-title">
                {initials}
              </div>
            )}

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight font-anthropicSerif truncate">{member.name}</h2>
                {member.nickname && (
                  <span className="text-sm text-slate-500 dark:text-slate-400 font-normal font-data">({member.nickname})</span>
                )}
              </div>

              <div className="flex items-center gap-2 sm:gap-2.5 mt-1.5 flex-wrap">
                {/* Role Badge */}
                <span className="px-2.5 py-0.5 rounded-[2px] text-xs sm:text-sm font-semibold bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 font-title">
                  {member.role === 'admin' ? (member.boardPosition || 'Board') : 'Voluntar'}
                </span>

                {/* Financial Status Badge */}
                <span className={`px-2.5 py-0.5 rounded-[2px] text-xs sm:text-sm font-semibold border font-title ${
                  computedStatus === 'active' 
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800' 
                    : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800 font-bold'
                }`}>
                  {computedStatus === 'active' ? 'La zi' : `Restanțier (${debt} Lei)`}
                </span>

                {/* Attendance Qualification Badge */}
                <span className="px-2.5 py-0.5 rounded-[2px] text-xs sm:text-sm font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 flex items-center gap-1.5 font-title">
                  <Award size={14} /> {qualification} ({rate})
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons & Close */}
          <div className="flex items-center gap-2 shrink-0">
            {isAdmin && (
              <>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-3 sm:px-3.5 py-2 text-xs sm:text-sm font-bold rounded-[2px] bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 transition-colors flex items-center gap-1.5 font-title cursor-pointer"
                  title="Șterge Membru"
                >
                  <Trash2 size={14} />
                  <span className="hidden sm:inline">Șterge</span>
                </button>
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="px-3 sm:px-3.5 py-2 text-xs sm:text-sm font-bold rounded-[2px] bg-slate-900 hover:bg-slate-800 text-white transition-colors flex items-center gap-1.5 font-title cursor-pointer"
                >
                  <Edit3 size={14} />
                  <span className="hidden sm:inline">{isEditing ? 'Vizualizează' : 'Editează Profil'}</span>
                  <span className="sm:hidden">{isEditing ? 'Vezi' : 'Editează'}</span>
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-[2px] bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-700 transition-colors cursor-pointer"
              aria-label="Închide"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Tab Navigation (Scrollable Horizontally on Small Screens) */}
        {!isEditing && (
          <div className="px-4 sm:px-6 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex gap-4 sm:gap-8 text-sm font-semibold text-slate-600 dark:text-slate-400 font-title overflow-x-auto no-scrollbar whitespace-nowrap">
            <button
              onClick={() => setActiveTab('finance')}
              className={`py-3 sm:py-3.5 border-b-2 transition-colors flex items-center gap-2 shrink-0 cursor-pointer ${
                activeTab === 'finance'
                  ? 'border-slate-900 dark:border-slate-100 text-slate-900 dark:text-slate-100 font-bold'
                  : 'border-transparent hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <CreditCard size={16} />
              Sinteză Financiară
            </button>

            <button
              onClick={() => setActiveTab('activity')}
              className={`py-3 sm:py-3.5 border-b-2 transition-colors flex items-center gap-2 shrink-0 cursor-pointer ${
                activeTab === 'activity'
                  ? 'border-slate-900 dark:border-slate-100 text-slate-900 dark:text-slate-100 font-bold'
                  : 'border-transparent hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <TrendingUp size={16} />
              Activitate & Prezențe
            </button>

            <button
              onClick={() => setActiveTab('achievements')}
              className={`py-3 sm:py-3.5 border-b-2 transition-colors flex items-center gap-2 shrink-0 cursor-pointer ${
                activeTab === 'achievements'
                  ? 'border-slate-900 dark:border-slate-100 text-slate-900 dark:text-slate-100 font-bold'
                  : 'border-transparent hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <Sparkles size={16} className="text-amber-500" />
              Pașaport & Insigne
            </button>

            <button
              onClick={() => setActiveTab('profile')}
              className={`py-3 sm:py-3.5 border-b-2 transition-colors flex items-center gap-2 shrink-0 cursor-pointer ${
                activeTab === 'profile'
                  ? 'border-slate-900 dark:border-slate-100 text-slate-900 dark:text-slate-100 font-bold'
                  : 'border-transparent hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <User size={16} />
              Date Contact & Profil
            </button>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 sm:space-y-6 bg-white dark:bg-[#161B22] font-anthropic">
          {isEditing ? (
            /* Edit Form */
            <form onSubmit={handleSaveProfile} className="space-y-5 max-w-2xl mx-auto font-anthropic">
              <div className="pb-3 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 font-title">Editează Profilul Membrului</h3>
                <button type="button" onClick={() => setIsEditing(false)} className="text-xs sm:text-sm text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 font-title cursor-pointer">
                  Anulează
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1 font-title">Nume Complet</label>
                  <input type="text" value={name} onChange={e => setName(e.target.value)} required className="w-full px-3.5 py-2 border border-slate-300 dark:border-slate-700 rounded-[2px] text-sm text-slate-900 dark:text-slate-100 focus:border-slate-900 dark:focus:border-slate-100 focus:outline-none font-anthropic bg-white dark:bg-slate-900" />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1 font-title">Poreclă (Nickname)</label>
                  <input type="text" value={nickname} onChange={e => setNickname(e.target.value)} className="w-full px-3.5 py-2 border border-slate-300 dark:border-slate-700 rounded-[2px] text-sm text-slate-900 dark:text-slate-100 focus:border-slate-900 dark:focus:border-slate-100 focus:outline-none font-anthropic bg-white dark:bg-slate-900" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1 font-title">Username</label>
                  <input type="text" value={username} onChange={e => setUsername(e.target.value)} required className="w-full px-3.5 py-2 border border-slate-300 dark:border-slate-700 rounded-[2px] text-sm text-slate-900 dark:text-slate-100 focus:border-slate-900 dark:focus:border-slate-100 focus:outline-none font-anthropic bg-white dark:bg-slate-900" />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 font-title">
                      Resetează Parola (Opțional)
                    </label>
                    <button
                      type="button"
                      onClick={() => setAdminNewPassword(role === 'admin' ? `Camena-Admin-${Math.floor(1000 + Math.random() * 9000)}!` : `Camena-Vol-${Math.floor(1000 + Math.random() * 9000)}!`)}
                      className="text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline font-title cursor-pointer"
                    >
                      Generează automată
                    </button>
                  </div>
                  <input
                    type="text"
                    value={adminNewPassword}
                    onChange={e => setAdminNewPassword(e.target.value)}
                    placeholder="Introdu o parolă nouă sau lasă gol"
                    className="w-full px-3.5 py-2 border border-slate-300 dark:border-slate-700 rounded-[2px] text-sm text-slate-900 dark:text-slate-100 focus:border-slate-900 dark:focus:border-slate-100 focus:outline-none font-data bg-white dark:bg-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1 font-title">Telefon</label>
                <input type="text" value={phone} onChange={e => setPhone(e.target.value)} className="w-full px-3.5 py-2 border border-slate-300 dark:border-slate-700 rounded-[2px] text-sm text-slate-900 dark:text-slate-100 focus:border-slate-900 dark:focus:border-slate-100 focus:outline-none font-anthropic bg-white dark:bg-slate-900" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1 font-title">Rol</label>
                  <select value={role} onChange={e => setRole(e.target.value)} className="w-full px-3.5 py-2 border border-slate-300 dark:border-slate-700 rounded-[2px] text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:border-slate-900 dark:focus:border-slate-100 focus:outline-none font-anthropic cursor-pointer">
                    <option value="member">Voluntar</option>
                    <option value="admin">Board</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1 font-title">Status</label>
                  <select value={status} onChange={e => setStatus(e.target.value)} className="w-full px-3.5 py-2 border border-slate-300 dark:border-slate-700 rounded-[2px] text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:border-slate-900 dark:focus:border-slate-100 focus:outline-none font-anthropic cursor-pointer">
                    <option value="active">Activ</option>
                    <option value="passive">Pasiv</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1 font-title">Data Intrării</label>
                  <input type="date" value={joinDate} onChange={e => setJoinDate(e.target.value)} required className="w-full px-3.5 py-2 border border-slate-300 dark:border-slate-700 rounded-[2px] text-sm text-slate-900 dark:text-slate-100 focus:border-slate-900 dark:focus:border-slate-100 focus:outline-none font-anthropic bg-white dark:bg-slate-900 cursor-pointer" />
                </div>
              </div>

              {role === 'admin' && (
                <div>
                  <label className="block text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1 font-title">Funcție Board (ex: Secretar, Trezorier)</label>
                  <input type="text" value={boardPosition} onChange={e => setBoardPosition(e.target.value)} placeholder="Introdu funcția" required className="w-full px-3.5 py-2 border border-slate-300 dark:border-slate-700 rounded-[2px] text-sm text-slate-900 dark:text-slate-100 focus:border-slate-900 dark:focus:border-slate-100 focus:outline-none font-anthropic bg-white dark:bg-slate-900" />
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div>
                  <label className="block text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1 font-title">Ore Voluntariat</label>
                  <input type="number" min="0" value={hours} onChange={e => setHours(Number(e.target.value))} className="w-full px-3.5 py-2 border border-slate-300 dark:border-slate-700 rounded-[2px] text-sm text-slate-900 dark:text-slate-100 focus:border-slate-900 dark:focus:border-slate-100 focus:outline-none font-data bg-white dark:bg-slate-900" />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1 font-title">Prezențe</label>
                  <input type="number" min="0" value={presences} onChange={e => setPresences(Number(e.target.value))} className="w-full px-3.5 py-2 border border-slate-300 dark:border-slate-700 rounded-[2px] text-sm text-slate-900 dark:text-slate-100 focus:border-slate-900 dark:focus:border-slate-100 focus:outline-none font-data bg-white dark:bg-slate-900" />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1 font-title">Motivate</label>
                  <input type="number" min="0" value={excusedAbsences} onChange={e => setExcusedAbsences(Number(e.target.value))} className="w-full px-3.5 py-2 border border-slate-300 dark:border-slate-700 rounded-[2px] text-sm text-slate-900 dark:text-slate-100 focus:border-slate-900 dark:focus:border-slate-100 focus:outline-none font-data bg-white dark:bg-slate-900" />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1 font-title">Nemotivate</label>
                  <input type="number" min="0" value={unexcusedAbsences} onChange={e => setUnexcusedAbsences(Number(e.target.value))} className="w-full px-3.5 py-2 border border-slate-300 dark:border-slate-700 rounded-[2px] text-sm text-slate-900 dark:text-slate-100 focus:border-slate-900 dark:focus:border-slate-100 focus:outline-none font-data bg-white dark:bg-slate-900" />
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
                    <div className={`p-4 sm:p-5 rounded-[2px] border flex flex-col justify-between h-32 ${
                      isClear 
                        ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800' 
                        : 'bg-rose-50/60 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800'
                    }`}>
                      <div className="flex justify-between items-center">
                        <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 font-title">Datorie Totală</span>
                        {isClear ? <CheckCircle2 size={18} className="text-emerald-700 dark:text-emerald-400" /> : <AlertCircle size={18} className="text-rose-700 dark:text-rose-400" />}
                      </div>
                      <div>
                        <span className={`text-2xl sm:text-3xl font-bold font-data ${isClear ? 'text-emerald-800 dark:text-emerald-300' : 'text-rose-800 dark:text-rose-300'}`}>
                          {debt} Lei
                        </span>
                        <span className="block text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1 font-anthropic">
                          {isClear ? 'La zi cu plățile' : `${Math.floor(debt / COTIZATIE_LUNARA)} luni restante`}
                        </span>
                      </div>
                    </div>

                    {/* Total Cotizații */}
                    <div className="p-4 sm:p-5 rounded-[2px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col justify-between h-32">
                      <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 font-title">Cotizații Achitate</span>
                      <div>
                        <span className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 font-data">
                          {member.totalPaid || 0} Lei
                        </span>
                        <span className="block text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 font-anthropic">
                          Total plătit în club
                        </span>
                      </div>
                    </div>

                    {/* Ultima Plată */}
                    <div className="p-4 sm:p-5 rounded-[2px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col justify-between h-32">
                      <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 font-title">Ultima Încasare</span>
                      <div>
                        {lastReceipt ? (
                          <>
                            <span className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 font-data">
                              {lastReceipt.amount} Lei
                            </span>
                            <span className="block text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 font-anthropic">
                              {lastReceipt.month} ({new Date(lastReceipt.date).toLocaleDateString('ro-RO')})
                            </span>
                          </>
                        ) : (
                          <span className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-anthropic">Nicio plată înregistrată</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Restanțe Alert Banner */}
                  {!isClear && (
                    <div className="p-4 sm:p-5 rounded-[2px] bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 flex items-center justify-between flex-wrap gap-4">
                      <div>
                        <h4 className="text-sm font-bold text-rose-900 dark:text-rose-200 font-title">Restanțe Cotizație Detectate</h4>
                        <p className="text-xs sm:text-sm text-rose-700 dark:text-rose-300 mt-1 font-anthropic">
                          Luna restantă: <span className="font-bold">{unpaidBreakdown[0]?.name || ''} 2026</span> ({COTIZATIE_LUNARA} Lei)
                        </p>
                      </div>

                      {isAdmin && (
                        <button
                          onClick={() => setIsPaymentModalOpen(true)}
                          className="px-4 py-2 rounded-[2px] btn-civic-primary font-bold text-xs sm:text-sm uppercase tracking-wider transition-colors flex items-center gap-1.5 font-title cursor-pointer"
                        >
                          <PlusCircle size={16} />
                          Încasează Cotizație
                        </button>
                      )}
                    </div>
                  )}

                  {/* 12-Month Matrix */}
                  <div className="p-4 sm:p-5 rounded-[2px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 font-title">
                        <CalendarIcon size={16} className="text-slate-700 dark:text-slate-300" />
                        Calendar Cotizații 2026
                      </h4>
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-anthropic">Click pe lună restantă pentru încasare</span>
                    </div>

                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
                      {dynamicMonths.map((m) => {
                        const isPaid = m.status === 'Achitat';
                        const isUnpaid = m.status === 'Neachitat';

                        return (
                          <button
                            key={m.monthIndex}
                            disabled={!isUnpaid || !isAdmin}
                            onClick={() => setIsPaymentModalOpen(true)}
                            className={`p-3 rounded-[2px] border text-center transition-colors font-anthropic ${
                              isPaid 
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 cursor-default'
                                : isUnpaid
                                ? 'bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 font-bold cursor-pointer'
                                : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 cursor-default'
                            }`}
                          >
                            <span className="text-sm block font-bold font-title">{m.shortName}</span>
                            <span className="text-xs block mt-1 font-semibold font-data">
                              {isPaid ? 'Achitat' : isUnpaid ? 'Restanță' : 'Viitor'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Istoric Chitanțe Table */}
                  <div className="p-4 sm:p-5 rounded-[2px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 font-title">
                        <FileText size={16} className="text-slate-700 dark:text-slate-300" />
                        Istoric Chitanțe Electronice
                      </h4>
                      <span className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-data">{validReceipts.length} înregistrate</span>
                    </div>

                    {loadingPayments ? (
                      <div className="text-center py-6 text-sm text-slate-500 font-anthropic">
                        Se încarcă chitanțele...
                      </div>
                    ) : validReceipts.length > 0 ? (
                      <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-[2px]">
                        <table className="w-full text-left text-sm text-slate-800 dark:text-slate-200 font-anthropic">
                          <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700 font-title text-xs uppercase tracking-wider">
                            <tr>
                              <th className="py-2.5 px-3.5">ID Chitanță</th>
                              <th className="py-2.5 px-3.5">Dată</th>
                              <th className="py-2.5 px-3.5">Lună</th>
                              <th className="py-2.5 px-3.5 text-right">Sumă</th>
                              <th className="py-2.5 px-3.5 text-right">Acțiuni</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-data text-sm">
                            {validReceipts.map((r: any, idx: number) => {
                              const isLatest = idx === 0;
                              return (
                                <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                  <td className="py-2.5 px-3.5 font-mono font-medium text-slate-900 dark:text-slate-100">{r.id}</td>
                                  <td className="py-2.5 px-3.5 text-slate-600 dark:text-slate-400">{new Date(r.date).toLocaleDateString('ro-RO')}</td>
                                  <td className="py-2.5 px-3.5 font-semibold text-slate-800 dark:text-slate-200">{r.month}</td>
                                  <td className="py-2.5 px-3.5 text-right font-bold text-emerald-700 dark:text-emerald-400">{r.amount} Lei</td>
                                  <td className="py-2.5 px-3.5 text-right font-title">
                                    <div className="flex items-center justify-end gap-2">
                                      <button
                                        onClick={() => setSelectedReceipt(r)}
                                        className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 underline hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer"
                                      >
                                        Vezi
                                      </button>
                                      {isAdmin && isLatest && (
                                        <button
                                          onClick={() => setReceiptToRevert(r)}
                                          className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                                          title="Anulează Plata"
                                        >
                                          <RotateCcw size={14} />
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
                      <div className="text-center py-6 text-sm text-slate-500 font-anthropic">
                        Nicio chitanță înregistrată.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: ACTIVITATE & PREZENȚE */}
              {activeTab === 'activity' && (
                <div className="space-y-6 font-anthropic">
                  {/* Score Card */}
                  <div className="p-4 sm:p-5 rounded-[2px] border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-between">
                    <div>
                      <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 block mb-1 font-title">
                        Scor Total Voluntar
                      </span>
                      <span className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 font-data">
                        {member.score || 0} Puncte
                      </span>
                    </div>

                    {isAdmin && (
                      <button
                        onClick={() => setIsScoreModalOpen(true)}
                        className="px-4 py-2 rounded-[2px] btn-civic-primary text-xs sm:text-sm uppercase tracking-wider font-bold transition-colors font-title cursor-pointer"
                      >
                        Ajustează Scor
                      </button>
                    )}
                  </div>

                  {/* Prezențe */}
                  <div className="p-4 sm:p-5 rounded-[2px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 font-title">
                        Prezențe Evenimente
                      </h4>
                      <span className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-200 font-data">{rate}</span>
                    </div>

                    {/* Progress Bar */}
                    <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-[2px] overflow-hidden border border-slate-200 dark:border-slate-700">
                      <div
                        className="h-full bg-slate-900 dark:bg-sky-500 transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>

                    {/* Breakdown */}
                    <div className="grid grid-cols-3 gap-3 pt-2 text-center text-sm font-anthropic">
                      <div className="p-3 rounded-[2px] bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                        <span className="text-slate-500 dark:text-slate-400 block font-bold text-xs uppercase tracking-wider font-title">Prezențe</span>
                        <span className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 font-data">{member.role === 'admin' ? '—' : (member.presences || 0)}</span>
                      </div>
                      <div className="p-3 rounded-[2px] bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                        <span className="text-slate-500 dark:text-slate-400 block font-bold text-xs uppercase tracking-wider font-title">Motivate</span>
                        <span className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 font-data">{member.role === 'admin' ? '—' : (member.excusedAbsences || 0)}</span>
                      </div>
                      <div className="p-3 rounded-[2px] bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                        <span className="text-slate-500 dark:text-slate-400 block font-bold text-xs uppercase tracking-wider font-title">Nemotivate</span>
                        <span className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 font-data">{member.role === 'admin' ? '—' : (member.unexcusedAbsences || 0)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Senioritate */}
                  <div className="p-4 sm:p-5 rounded-[2px] border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 space-y-1.5">
                    <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 block font-title">
                      Vechime În Club
                    </span>
                    <span className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 block font-data">
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
                    <span className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 block font-anthropic">
                      Data intrării: {member.joinDate ? new Date(member.joinDate).toLocaleDateString('ro-RO') : 'N/A'}
                    </span>
                  </div>
                </div>
              )}

              {/* TAB 3: PROFIL & CONTACT */}
              {activeTab === 'profile' && (
                <div className="space-y-6 font-anthropic">
                  <div className="p-4 sm:p-5 rounded-[2px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
                    <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 pb-2 border-b border-slate-200 dark:border-slate-800 font-title">
                      Date de Contact
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                      <div className="p-3.5 rounded-[2px] bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block font-title">Telefon</span>
                        <span className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2 mt-1 text-sm sm:text-base font-data">
                          <Phone size={15} className="text-slate-600 dark:text-slate-400" />
                          {member.phone || 'Nespecificat'}
                        </span>
                      </div>

                      <div className="p-3.5 rounded-[2px] bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block font-title">Username</span>
                        <span className="font-mono font-semibold text-slate-900 dark:text-slate-100 mt-1 block text-sm sm:text-base font-data">
                          {member.username || '—'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 sm:p-5 rounded-[2px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3 font-anthropic">
                    <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 pb-2 border-b border-slate-200 dark:border-slate-800 font-title">
                      Detalii Organizaționale
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-3.5 rounded-[2px] bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block font-title">Rol</span>
                        <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm sm:text-base block mt-1 font-anthropic">{member.role === 'admin' ? 'Board Member' : 'Voluntar'}</span>
                      </div>
                      <div className="p-3.5 rounded-[2px] bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block font-title">Data Înregistrării</span>
                        <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm sm:text-base block mt-1 font-data">{member.joinDate ? new Date(member.joinDate).toLocaleDateString('ro-RO') : 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 4. TAB ACHIEVEMENTS & MILESTONES */}
              {activeTab === 'achievements' && (() => {
                const hours = Number(member.stats?.hours ?? member.hours ?? (member.presences ? member.presences * 2 : 0));
                const { allMilestones: milestones, tier, unlockedCount } = computeMemberMilestones(member, memberKudosCount);

                return (
                  <div className="space-y-6 font-anthropic">
                    {/* Tier Banner */}
                    <div className={`p-5 sm:p-6 rounded-[2px] border flex items-center justify-between gap-4 ${tier.color}`}>
                      <div className="flex items-center gap-4">
                        <div className="text-4xl">{tier.icon}</div>
                        <div>
                          <span className="text-xs font-bold uppercase tracking-wider opacity-75 block font-title">Nivel Voluntar</span>
                          <h3 className="text-xl sm:text-2xl font-bold tracking-tight font-anthropicSerif">{tier.title}</h3>
                          <p className="text-xs sm:text-sm opacity-90 mt-1 font-anthropic">{tier.desc}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xs font-bold uppercase tracking-wider opacity-75 block font-title">Ore Voluntariat</span>
                        <div className="text-3xl sm:text-4xl font-bold font-data">{hours} <span className="text-sm font-normal">ore</span></div>
                      </div>
                    </div>

                    {/* Progress Overview Bar */}
                    <div className="p-4 sm:p-5 rounded-[2px] border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 space-y-2.5">
                      <div className="flex justify-between items-center text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 font-title">
                        <span>Progres Total Pașaport Voluntar</span>
                        <span className="font-data">{unlockedCount} din {milestones.length} deblocate ({Math.round((unlockedCount / milestones.length) * 100)}%)</span>
                      </div>
                      <div className="w-full h-3 bg-slate-200 dark:bg-slate-700 rounded-[1px] overflow-hidden">
                        <div 
                          className="h-full bg-slate-900 dark:bg-slate-100 transition-all duration-500 rounded-[1px]" 
                          style={{ width: `${(unlockedCount / milestones.length) * 100}%` }}
                        />
                      </div>
                    </div>

                    {/* Milestones Grid */}
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3.5 font-title">
                        Insigne & Obiective
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        {milestones.map(m => {
                          const pct = Math.round((m.current / m.target) * 100);
                          return (
                            <div
                              key={m.id}
                              className={`p-4 sm:p-5 rounded-[2px] border transition-all ${
                                m.unlocked 
                                  ? 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 shadow-xs' 
                                  : 'bg-slate-50/70 dark:bg-slate-900/40 border-dashed border-slate-200 dark:border-slate-800 opacity-70'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2.5 mb-2.5">
                                <div className="flex items-center gap-3">
                                  <span className="text-3xl">{m.icon}</span>
                                  <div>
                                    <h5 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 font-anthropic">{m.title}</h5>
                                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-anthropic mt-0.5">{m.desc}</p>
                                  </div>
                                </div>
                                <span className={`px-2.5 py-1 rounded-[2px] text-xs font-bold uppercase font-title shrink-0 ${
                                  m.unlocked ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                }`}>
                                  {m.unlocked ? 'Obținut' : `${pct}%`}
                                </span>
                              </div>

                              <div className="mt-3.5 space-y-1.5">
                                <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-[1px] overflow-hidden">
                                  <div 
                                    className={`h-full transition-all rounded-[1px] ${m.unlocked ? 'bg-emerald-600' : 'bg-slate-400'}`}
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                                <div className="text-xs text-right font-bold text-slate-500 dark:text-slate-400 font-data">
                                  {m.current} / {m.target} {m.unit || ''}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Custom Registered Milestones */}
                    <div className="pt-6 border-t border-slate-200 dark:border-slate-800 space-y-4 font-anthropic">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 font-title flex items-center gap-2">
                          <Sparkles size={16} className="text-amber-500" />
                          Milestone-uri Personalizate înregistrate ({customMilestones.length})
                        </h4>
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => setShowAddMilestone(!showAddMilestone)}
                            className="px-3.5 py-1.5 text-xs sm:text-sm font-bold rounded-[2px] bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors flex items-center gap-1.5 font-title cursor-pointer"
                          >
                            <PlusCircle size={14} />
                            Adaugă Milestone
                          </button>
                        )}
                      </div>

                      {showAddMilestone && isAdmin && (
                        <div className="p-4 sm:p-5 rounded-[2px] border border-amber-300 dark:border-amber-800 bg-amber-50/60 dark:bg-amber-950/30 space-y-3.5 font-anthropic">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                            <div>
                              <label className="block text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1 font-title">Titlu Milestone</label>
                              <input
                                type="text"
                                placeholder="ex: Coordonator Campanie Ecologizare"
                                value={newMilestoneTitle}
                                onChange={e => setNewMilestoneTitle(e.target.value)}
                                className="w-full px-3.5 py-2 border border-slate-300 dark:border-slate-700 rounded-[2px] text-sm text-slate-900 dark:text-slate-100 focus:outline-none bg-white dark:bg-slate-900 font-anthropic"
                              />
                            </div>
                            <div>
                              <label className="block text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1 font-title">Badge / Insignă</label>
                              <input
                                type="text"
                                placeholder="ex: RECORD DE VITEZĂ, AMBASADOR"
                                value={newMilestoneBadge}
                                onChange={e => setNewMilestoneBadge(e.target.value)}
                                className="w-full px-3.5 py-2 border border-slate-300 dark:border-slate-700 rounded-[2px] text-sm text-slate-900 dark:text-slate-100 focus:outline-none bg-white dark:bg-slate-900 font-anthropic"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1 font-title">Descriere Detaliată</label>
                            <input
                              type="text"
                              placeholder="ex: A organizat campania de strângere fonduri pentru comunitate."
                              value={newMilestoneDesc}
                              onChange={e => setNewMilestoneDesc(e.target.value)}
                              className="w-full px-3.5 py-2 border border-slate-300 dark:border-slate-700 rounded-[2px] text-sm text-slate-900 dark:text-slate-100 focus:outline-none bg-white dark:bg-slate-900 font-anthropic"
                            />
                          </div>
                          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                            <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-title">
                              <span>Iconiță:</span>
                              {['🏆', '👑', '🚀', '🔥', '⚡', '🌟', '🎯'].map(ico => (
                                <button
                                  key={ico}
                                  type="button"
                                  onClick={() => setNewMilestoneIcon(ico)}
                                  className={`p-1.5 rounded-[2px] text-base cursor-pointer ${newMilestoneIcon === ico ? 'bg-amber-200 dark:bg-amber-900 border border-amber-400 font-bold' : 'hover:bg-slate-200 dark:hover:bg-slate-800'}`}
                                >
                                  {ico}
                                </button>
                              ))}
                            </div>
                            <button
                              type="button"
                              onClick={async () => {
                                if (!newMilestoneTitle.trim()) return toast.error('Introdu un titlu.');
                                const item = {
                                  id: `ms_${Date.now()}`,
                                  title: newMilestoneTitle.trim(),
                                  desc: newMilestoneDesc.trim(),
                                  badge: newMilestoneBadge.trim() || 'RECORD VALIDAT',
                                  icon: newMilestoneIcon,
                                  date: new Date().toISOString()
                                };
                                const updated = [...customMilestones, item];
                                setCustomMilestones(updated);
                                setNewMilestoneTitle('');
                                setNewMilestoneDesc('');
                                setNewMilestoneBadge('');
                                setShowAddMilestone(false);

                                try {
                                  const profileFields = {
                                    customMilestones: updated,
                                    stats: { ...(member.stats || {}), customMilestones: updated }
                                  };
                                  await updateMemberFields(member.id, profileFields);
                                  onUpdateMember({ ...member, ...profileFields });
                                  toast.success('Milestone înregistrat cu succes!');
                                } catch (err) {
                                  toast.error('Eroare la salvarea milestone-ului.');
                                }
                              }}
                              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-[2px] font-bold text-xs sm:text-sm uppercase tracking-wider transition-colors font-title cursor-pointer"
                            >
                              Salvează Milestone
                            </button>
                          </div>
                        </div>
                      )}

                      {customMilestones.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                          {customMilestones.map((cm: any) => (
                            <div key={cm.id} className="p-4 sm:p-5 rounded-[2px] border border-amber-300 dark:border-amber-800 bg-amber-50/40 dark:bg-amber-950/20 flex items-start justify-between gap-3 shadow-xs font-anthropic">
                              <div className="flex items-start gap-3">
                                <span className="text-2xl sm:text-3xl">{cm.icon || '🏆'}</span>
                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h5 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 font-title">{cm.title}</h5>
                                    <span className="px-2 py-0.5 rounded-[2px] text-xs font-bold uppercase bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200 font-title">
                                      {cm.badge}
                                    </span>
                                  </div>
                                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1 font-anthropic">{cm.desc}</p>
                                  <span className="text-xs text-slate-400 dark:text-slate-500 font-data block mt-1.5">
                                    Acordat: {new Date(cm.date).toLocaleDateString('ro-RO')}
                                  </span>
                                </div>
                              </div>
                              {isAdmin && (
                                <button
                                  type="button"
                                  onClick={async () => {
                                    const filtered = customMilestones.filter((m: any) => m.id !== cm.id);
                                    setCustomMilestones(filtered);
                                    try {
                                      const profileFields = {
                                        customMilestones: filtered,
                                        stats: { ...(member.stats || {}), customMilestones: filtered }
                                      };
                                      await updateMemberFields(member.id, profileFields);
                                      onUpdateMember({ ...member, ...profileFields });
                                      toast.success('Milestone șters.');
                                    } catch (e) {
                                      toast.error('Eroare la ștergerea milestone-ului.');
                                    }
                                  }}
                                  className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                                  title="Șterge acest milestone"
                                >
                                  <Trash2 size={15} />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs sm:text-sm text-slate-400 italic">Niciun milestone personalizat înregistrat.</p>
                      )}
                    </div>
                  </div>
                );
              })()}
            </>
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
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm font-anthropic">
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              className="relative w-full max-w-md bg-white dark:bg-[#161B22] border border-slate-300 dark:border-slate-800 rounded-[2px] shadow-2xl p-6 z-[201] text-slate-900 dark:text-slate-100 space-y-4 font-anthropic"
            >
              <div className="flex justify-between items-start pb-3 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100 font-anthropicSerif">Chitanță Electronică</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5 font-data">{selectedReceipt.id}</p>
                </div>
                <button
                  onClick={() => setSelectedReceipt(null)}
                  className="p-1.5 rounded-[2px] hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-2.5 text-sm font-anthropic">
                <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500 dark:text-slate-400 font-title font-bold text-xs uppercase tracking-wider">Status:</span>
                  <span className="font-bold text-emerald-700 dark:text-emerald-400 font-data">Validă</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500 dark:text-slate-400 font-title font-bold text-xs uppercase tracking-wider">Data încasării:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 font-data">{new Date(selectedReceipt.date).toLocaleDateString('ro-RO')}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500 dark:text-slate-400 font-title font-bold text-xs uppercase tracking-wider">Lună acoperită:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 font-data">{selectedReceipt.month}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500 dark:text-slate-400 font-title font-bold text-xs uppercase tracking-wider">Membru:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 font-anthropic">{selectedReceipt.memberName}</span>
                </div>
                <div className="flex justify-between py-2.5 text-base font-bold">
                  <span className="text-slate-800 dark:text-slate-200 font-title">Sumă Încasată:</span>
                  <span className="text-emerald-700 dark:text-emerald-400 font-mono font-data text-lg">{selectedReceipt.amount} Lei</span>
                </div>
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="space-y-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 block font-title">Semnătură Membru</span>
                  <div className="bg-slate-50 dark:bg-slate-900 rounded-[2px] p-2 h-24 flex items-center justify-center border border-slate-300 dark:border-slate-700">
                    {selectedReceipt.memberSignature ? (
                      <img src={selectedReceipt.memberSignature} alt="Semnătură membru" className="max-h-full max-w-full object-contain" />
                    ) : <span className="text-xs text-slate-400 font-data">-</span>}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 block font-title">Semnătură Trezorier</span>
                  <div className="bg-slate-50 dark:bg-slate-900 rounded-[2px] p-2 h-24 flex items-center justify-center border border-slate-300 dark:border-slate-700">
                    {selectedReceipt.treasurerSignature ? (
                      <img src={selectedReceipt.treasurerSignature} alt="Semnătură trezorier" className="max-h-full max-w-full object-contain" />
                    ) : <span className="text-xs text-slate-400 font-data">-</span>}
                  </div>
                </div>
              </div>

              <button 
                onClick={() => setSelectedReceipt(null)}
                className="w-full py-2.5 btn-civic-secondary text-xs sm:text-sm font-title uppercase tracking-wider cursor-pointer"
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
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm font-anthropic">
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto bg-white dark:bg-[#161B22] border border-slate-300 dark:border-slate-800 rounded-[2px] shadow-2xl p-6 z-[201] text-slate-900 dark:text-slate-100 space-y-4 font-anthropic"
            >
              <div>
                <h3 className="font-bold text-lg sm:text-xl text-slate-900 dark:text-slate-100 font-anthropicSerif">Ajustare Scor Voluntar</h3>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 font-anthropic">Acordare sau scădere puncte de activitate</p>
              </div>

              <form onSubmit={handleAdjustScore} className="space-y-4 font-anthropic">
                <div>
                  <label className="block text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1 font-title">Puncte (ex: 5 sau -2)</label>
                  <input
                    type="number"
                    value={scoreAdjustValue}
                    onChange={e => setScoreAdjustValue(e.target.value)}
                    required
                    placeholder="0"
                    className="w-full px-3.5 py-2 border border-slate-300 dark:border-slate-700 rounded-[2px] text-sm text-slate-900 dark:text-slate-100 focus:border-slate-900 dark:focus:border-slate-100 focus:outline-none font-data bg-white dark:bg-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1 font-title">Motiv / Justificare</label>
                  <input
                    type="text"
                    value={scoreAdjustReason}
                    onChange={e => setScoreAdjustReason(e.target.value)}
                    required
                    placeholder="Ex: Implicare proiect / Lider activitate"
                    className="w-full px-3.5 py-2 border border-slate-300 dark:border-slate-700 rounded-[2px] text-sm text-slate-900 dark:text-slate-100 focus:border-slate-900 dark:focus:border-slate-100 focus:outline-none font-anthropic bg-white dark:bg-slate-900"
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
                    disabled={isSubmittingScore}
                    className="flex-1 py-2.5 btn-civic-secondary text-xs sm:text-sm font-title uppercase tracking-wider cursor-pointer"
                  >
                    Anulează
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingScore}
                    className="flex-1 py-2.5 btn-civic-primary text-xs sm:text-sm font-title uppercase tracking-wider cursor-pointer"
                  >
                    {isSubmittingScore ? 'Se salvează...' : 'Salvează'}
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
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm font-anthropic">
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              className="relative w-full max-w-sm bg-white dark:bg-[#161B22] border border-slate-300 dark:border-slate-800 rounded-[2px] shadow-2xl p-6 z-[201] text-slate-900 dark:text-slate-100 space-y-4 font-anthropic"
            >
              <div className="flex items-center gap-2.5 text-rose-700 dark:text-rose-400">
                <AlertCircle size={22} />
                <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100 font-anthropicSerif">Anulare Plată</h3>
              </div>

              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-anthropic">
                Sigur doriți să anulați chitanța <span className="font-mono font-semibold text-slate-900 dark:text-slate-100 font-data">{receiptToRevert.id}</span> ({receiptToRevert.amount} Lei)?
                Luna stinsă va deveni din nou neachitată.
              </p>

              <div className="flex gap-3 pt-2 font-title">
                <button
                  onClick={() => setReceiptToRevert(null)}
                  className="flex-1 py-2.5 btn-civic-secondary text-xs sm:text-sm font-title uppercase tracking-wider cursor-pointer"
                >
                  Anulează
                </button>
                <button
                  onClick={handleConfirmRevert}
                  className="flex-1 py-2.5 btn-civic-danger text-xs sm:text-sm font-title uppercase tracking-wider cursor-pointer"
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
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm font-anthropic">
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              className="relative w-full max-w-sm bg-white dark:bg-[#161B22] border border-slate-300 dark:border-slate-800 rounded-[2px] shadow-2xl p-6 z-[201] text-slate-900 dark:text-slate-100 space-y-4 font-anthropic"
            >
              <div className="flex items-center gap-2.5 text-rose-700 dark:text-rose-400">
                <AlertCircle size={24} />
                <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100 font-anthropicSerif">Confirmare Ștergere Membru</h3>
              </div>

              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-anthropic">
                Ești sigur că dorești să ștergi definitiv membrul <strong className="text-slate-900 dark:text-slate-100 font-bold">{member.name}</strong>? Această acțiune va elimina contul și înregistrările sale și este ireversibilă.
              </p>

              <div className="flex gap-3 pt-2 font-title">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-2.5 btn-civic-secondary text-xs sm:text-sm font-title uppercase tracking-wider cursor-pointer"
                >
                  Anulează
                </button>
                <button
                  onClick={handleDeleteMember}
                  disabled={isDeletingMember}
                  className="flex-1 py-2.5 btn-civic-danger text-xs sm:text-sm font-title uppercase tracking-wider cursor-pointer"
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
