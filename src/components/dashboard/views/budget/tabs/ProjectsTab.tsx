import React, { useMemo, useState } from 'react';
import {
  Calendar,
  Check,
  ChevronDown,
  ChevronUp,
  Download,
  FileCheck,
  FileSpreadsheet,
  FileText,
  FolderKanban,
  Image as ImageIcon,
  Lock,
  Pencil,
  Plus,
  Printer,
  Sparkles,
  Trash2,
  TrendingDown,
  TrendingUp,
  Upload,
  X,
} from 'lucide-react';
import {
  Badge,
  EmptyState,
  Field,
  Modal,
  MoneyInput,
  Panel,
  Select,
  TextArea,
  TextInput,
} from '../ui';
import {
  BudgetProject,
  PAYMENT_METHODS,
  PROJECT_STATUS_LABELS,
  ProjectStatus,
  Transaction,
  TxType,
  categoriesFor,
  formatRON,
  isProjectLocked,
  roundRON,
} from '../types';
import { ProjectRow, nextTransactionCode, projectRows } from '../selectors';
import { EventData } from '../../../../../utils/supabaseService';
import { processReceiptFile } from '../receiptUtils';
import { downloadXlsx } from '../../../../../utils/xlsx';
import { toast } from '../../../../ui/Toast';

interface ProjectsTabProps {
  projects: BudgetProject[];
  transactions: Transaction[];
  events?: EventData[];
  currentUserName?: string;
  onSave: (project: BudgetProject, previous?: BudgetProject) => Promise<void>;
  onDelete: (project: BudgetProject) => Promise<void>;
  onSaveTransaction: (tx: Transaction, previous?: Transaction) => Promise<void>;
}

const STATUS_COLORS: Record<ProjectStatus, string> = {
  planuit: 'var(--adm-acc-blue)',
  derulare: 'var(--adm-acc-amber)',
  finalizat: 'var(--adm-acc-emerald)',
};

export const ProjectsTab: React.FC<ProjectsTabProps> = ({
  projects,
  transactions,
  events = [],
  currentUserName = 'Board',
  onSave,
  onDelete,
  onSaveTransaction,
}) => {
  // Modal State for Project Creation/Editing
  const [draft, setDraft] = useState<BudgetProject | null>(null);
  const [original, setOriginal] = useState<BudgetProject | undefined>();
  const [sourceType, setSourceType] = useState<'calendar' | 'custom'>('calendar');
  const [showAllEvents, setShowAllEvents] = useState(false);
  const [saving, setSaving] = useState(false);

  // Expanded project accordion (to see transactions list)
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({});

  // Quick Transaction Modal from Project Card
  const [quickTxDraft, setQuickTxDraft] = useState<{
    project: BudgetProject;
    tx: Transaction;
  } | null>(null);
  const [quickTxErrors, setQuickTxErrors] = useState<Record<string, string>>({});
  const [savingQuickTx, setSavingQuickTx] = useState(false);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);

  // Delete Project Confirmation
  const [pendingDelete, setPendingDelete] = useState<BudgetProject | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Lightbox Modal for Receipts
  const [lightboxTx, setLightboxTx] = useState<Transaction | null>(null);

  // Official Project Financial Report Modal
  const [reportProject, setReportProject] = useState<ProjectRow | null>(null);

  const rows = projectRows(projects, transactions, events);

  // Filter available calendar events
  const projectEvents = useMemo(() => {
    return events.filter(e => showAllEvents || e.type === 'project');
  }, [events, showAllEvents]);

  // Map of existing eventIds already added to budget
  const existingEventIds = useMemo(() => {
    return new Set(projects.map(p => p.eventId).filter(Boolean));
  }, [projects]);

  const toggleExpand = (projectId: string) => {
    setExpandedProjects(prev => ({
      ...prev,
      [projectId]: !prev[projectId],
    }));
  };

  const openCreate = () => {
    setOriginal(undefined);
    setSourceType('calendar');
    setDraft({
      id: `prj-${Date.now()}`,
      name: '',
      status: 'planuit',
      estimatedIncome: 0,
      estimatedExpense: 0,
      eventId: undefined,
      date: new Date().toISOString().slice(0, 10),
    });
  };

  const openEdit = (project: BudgetProject) => {
    if (isProjectLocked(project, events)) {
      toast.error('Acest proiect este încheiat (data a trecut și prezența este închisă). Nu mai poate fi editat.');
      return;
    }
    setOriginal(project);
    setSourceType(project.eventId ? 'calendar' : 'custom');
    setDraft({ ...project });
  };

  const handleSelectCalendarEvent = (eventId: string) => {
    const ev = events.find(e => e.id === eventId);
    if (!ev || !draft) return;
    setDraft({
      ...draft,
      eventId: ev.id,
      name: ev.title,
      date: ev.date || draft.date,
    });
  };

  const submitProject = async () => {
    if (!draft || !draft.name.trim()) return;
    setSaving(true);
    try {
      await onSave(
        {
          ...draft,
          name: draft.name.trim(),
          estimatedIncome: roundRON(draft.estimatedIncome),
          estimatedExpense: roundRON(draft.estimatedExpense),
        },
        original
      );
      toast.success(`Proiectul „${draft.name}” a fost salvat cu succes.`);
      setDraft(null);
    } catch (err) {
      toast.error('Eroare la salvarea proiectului.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRequest = (project: BudgetProject) => {
    if (isProjectLocked(project, events)) {
      toast.error('Acest proiect este încheiat și arhivat. Nu poate fi șters din evidența financiară.');
      return;
    }
    setPendingDelete(project);
  };

  const handleDeleteConfirm = async () => {
    if (!pendingDelete) return;
    if (isProjectLocked(pendingDelete, events)) {
      toast.error('Acest proiect este blocat și nu poate fi șters.');
      setPendingDelete(null);
      return;
    }
    setDeleting(true);
    try {
      await onDelete(pendingDelete);
      toast.success(`Proiectul „${pendingDelete.name}” a fost eliminat.`);
      setPendingDelete(null);
    } catch (err) {
      toast.error('Eroare la ștergerea proiectului.');
    } finally {
      setDeleting(false);
    }
  };

  // Open Quick Transaction Modal for a project
  const openQuickTx = (project: BudgetProject, type: TxType) => {
    if (isProjectLocked(project, events)) {
      toast.error('Acest proiect este încheiat și arhivat. Nu se mai pot adăuga sau modifica operațiuni financiare pe el.');
      return;
    }
    setQuickTxErrors({});
    const newTx: Transaction = {
      id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      code: nextTransactionCode(transactions),
      date: new Date().toISOString().slice(0, 10),
      type,
      category: categoriesFor(type)[0],
      projectId: project.id,
      amount: 0,
      status: 'platit',
      source: '',
      documentUrl: '',
      receiptImage: '',
      receiptType: 'url',
      paymentMethod: 'Transfer Bancar',
      approvedBy: currentUserName || 'Board',
      notes: `Asociat la proiectul „${project.name}”`,
    };
    setQuickTxDraft({ project, tx: newTx });
  };

  const handleQuickTxFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !quickTxDraft) return;

    setUploadingReceipt(true);
    try {
      const processed = await processReceiptFile(file);
      setQuickTxDraft({
        ...quickTxDraft,
        tx: {
          ...quickTxDraft.tx,
          receiptImage: processed.receiptImage,
          receiptType: 'image',
          documentUrl: processed.documentUrl,
        },
      });
      toast.success(`Bonul a fost optimizat și atașat (${processed.sizeKb} KB).`);
    } catch (err) {
      toast.error('A apărut o eroare la optimizarea bonului.');
    } finally {
      setUploadingReceipt(false);
    }
  };

  const submitQuickTx = async () => {
    if (!quickTxDraft) return;
    const { tx, project } = quickTxDraft;
    const errs: Record<string, string> = {};

    if (!tx.date) errs.date = 'Data este obligatorie.';
    if (!tx.category.trim()) errs.category = 'Alege o categorie.';
    if (roundRON(tx.amount) <= 0) errs.amount = 'Suma trebuie să fie mai mare decât 0 RON.';
    if (!tx.source.trim()) errs.source = 'Specifică sursa, membrul sau beneficiarul.';

    setQuickTxErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSavingQuickTx(true);
    try {
      const normalizedTx: Transaction = {
        ...tx,
        amount: roundRON(tx.amount),
        notes: tx.notes.trim(),
        source: tx.source.trim(),
        projectId: project.id,
      };
      await onSaveTransaction(normalizedTx);
      toast.success(
        `${normalizedTx.type === 'venit' ? 'Venitul' : 'Plata'} de ${formatRON(
          normalizedTx.amount
        )} RON a fost înregistrată pentru „${project.name}”.`
      );
      setQuickTxDraft(null);
    } catch (err) {
      toast.error('Eroare la salvarea tranzacției.');
    } finally {
      setSavingQuickTx(false);
    }
  };

  // Export Project Excel (.xlsx) using project-specific structure
  const handleExportProjectXLSX = (project: ProjectRow) => {
    const projectTxs = transactions
      .filter(t => t.projectId === project.id && t.status !== 'respins' && t.status !== 'anulata')
      .sort((a, b) => b.date.localeCompare(a.date));

    const rowsData = projectTxs.map((tx, idx) => [
      idx + 1,
      tx.code,
      tx.date,
      tx.type === 'venit' ? 'Venit' : 'Cheltuială',
      tx.category,
      tx.source,
      tx.paymentMethod || '—',
      tx.amount,
      tx.status === 'platit' ? 'Confirmat / Plătit' : tx.status,
      tx.approvedBy || 'Board',
      tx.notes || '—',
    ]);

    downloadXlsx(
      `Raport_Financiar_${project.name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}`,
      [
        {
          name: 'Sumar Executiv',
          header: ['Indicator', 'Valoare'],
          widths: [36, 24],
          rows: [
            ['Nume Proiect', project.name],
            ['Status Proiect', PROJECT_STATUS_LABELS[project.status]],
            ['Dată Proiect / Calendar', project.date || '—'],
            ['Total Venituri Realizate (RON)', project.realizedIncome],
            ['Total Cheltuieli Reale (RON)', project.realizedExpense],
            ['Profit Net Caritabil Generat (RON)', project.netCharitable],
            ['Eficiență / ROI (%)', project.roi !== null ? `${project.roi}%` : '—'],
            ['Venit Estimat / Țintă (RON)', project.estimatedIncome],
            ['Cheltuieli Estimative / Plafon (RON)', project.estimatedExpense],
            ['Total Tranzacții Înregistrate', projectTxs.length],
            ['Document Generat La', new Date().toLocaleString('ro-RO')],
            ['Trezorier Responsabil', 'Stan Rareș-Ștefan'],
          ],
        },
        {
          name: 'Registru Plăți & Bonuri',
          header: [
            'Nr. Crt',
            'Cod TX',
            'Dată',
            'Tip',
            'Categorie',
            'Sursă / Beneficiar',
            'Metodă Plată',
            'Sumă (RON)',
            'Status',
            'Aprobator',
            'Observații / Justificare',
          ],
          widths: [8, 14, 14, 14, 22, 28, 18, 16, 16, 18, 36],
          rows: rowsData,
        },
      ]
    );

    toast.success(`Dosarul Excel pentru „${project.name}” a fost descărcat.`);
  };

  // Generate Print / PDF Dossier Window
  const handlePrintOfficialDossier = (project: ProjectRow) => {
    const projectTxs = transactions
      .filter(t => t.projectId === project.id && t.status !== 'respins' && t.status !== 'anulata')
      .sort((a, b) => a.date.localeCompare(b.date));

    const receiptTxs = projectTxs.filter(t => Boolean(t.receiptImage));

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Browserul a blocat fereastra pop-up pentru printare. Te rugăm să permiți pop-up-urile.');
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="ro">
      <head>
        <meta charset="utf-8" />
        <title>Raport Financiar Oficial — ${project.name}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 14mm 12mm 16mm 12mm;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #0f172a;
            margin: 0;
            padding: 0;
            font-size: 11pt;
            line-height: 1.4;
          }
          .header {
            border-bottom: 2px solid #0284c7;
            padding-bottom: 12px;
            margin-bottom: 16px;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
          }
          .title {
            font-size: 16pt;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #0369a1;
            margin: 0 0 4px 0;
          }
          .subtitle {
            font-size: 10pt;
            font-weight: 600;
            color: #64748b;
            margin: 0;
          }
          .kpi-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 10px;
            margin-bottom: 20px;
          }
          .kpi-box {
            background: #f8fafc;
            border: 1px solid #cbd5e1;
            border-radius: 4px;
            padding: 10px;
          }
          .kpi-label {
            font-size: 8pt;
            font-weight: 700;
            text-transform: uppercase;
            color: #64748b;
          }
          .kpi-value {
            font-size: 14pt;
            font-weight: 800;
            margin-top: 4px;
            color: #0f172a;
          }
          .green { color: #047857; }
          .red { color: #b91c1c; }
          .blue { color: #0369a1; }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 9pt;
            margin-bottom: 24px;
          }
          th {
            background: #f1f5f9;
            border: 1px solid #cbd5e1;
            padding: 6px 8px;
            text-align: left;
            font-weight: 700;
            text-transform: uppercase;
            font-size: 8pt;
            color: #475569;
          }
          td {
            border: 1px solid #e2e8f0;
            padding: 6px 8px;
          }
          .total-row {
            background: #f8fafc;
            font-weight: 800;
          }
          .annex-title {
            font-size: 13pt;
            font-weight: 800;
            text-transform: uppercase;
            border-bottom: 1.5px solid #cbd5e1;
            padding-bottom: 6px;
            margin: 28px 0 16px 0;
            color: #1e293b;
            page-break-before: always;
          }
          .receipts-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
          }
          .receipt-card {
            border: 1px solid #cbd5e1;
            border-radius: 4px;
            padding: 8px;
            page-break-inside: avoid;
            background: #fff;
          }
          .receipt-header {
            font-size: 8.5pt;
            font-weight: 700;
            color: #334155;
            margin-bottom: 6px;
            padding-bottom: 4px;
            border-bottom: 1px dashed #cbd5e1;
          }
          .receipt-img {
            max-width: 100%;
            max-height: 280px;
            display: block;
            margin: 0 auto;
            object-contain: contain;
          }
          .signatures {
            margin-top: 36px;
            display: flex;
            justify-content: space-between;
            page-break-inside: avoid;
          }
          .sig-box {
            width: 45%;
            border-top: 1px solid #475569;
            padding-top: 8px;
            text-align: center;
            font-size: 9.5pt;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="title">Interact Club Piatra Neamț Camena</h1>
            <p class="subtitle">RAPORT FINANCIAR ȘI DE AUDIT AL PROIECTULUI: <strong>${project.name}</strong></p>
          </div>
          <div style="text-align: right; font-size: 8.5pt; color: #64748b;">
            <div>Data Emiterii: <strong>${new Date().toLocaleDateString('ro-RO')}</strong></div>
            <div>Data Calendar: <strong>${project.date || 'Mandat Activ'}</strong></div>
            <div>Status: <strong>${PROJECT_STATUS_LABELS[project.status]}</strong></div>
          </div>
        </div>

        <div class="kpi-grid">
          <div class="kpi-box">
            <div class="kpi-label">Venituri Realizate</div>
            <div class="kpi-value green">+${formatRON(project.realizedIncome)} RON</div>
            <div style="font-size: 8pt; color: #64748b;">Estimat: ${formatRON(project.estimatedIncome)} RON</div>
          </div>
          <div class="kpi-box">
            <div class="kpi-label">Cheltuieli Reale</div>
            <div class="kpi-value red">−${formatRON(project.realizedExpense)} RON</div>
            <div style="font-size: 8pt; color: #64748b;">Plafon: ${formatRON(project.estimatedExpense)} RON</div>
          </div>
          <div class="kpi-box">
            <div class="kpi-label">Profit Net Caritabil</div>
            <div class="kpi-value ${project.netCharitable >= 0 ? 'green' : 'red'}">
              ${project.netCharitable >= 0 ? '+' : ''}${formatRON(project.netCharitable)} RON
            </div>
            <div style="font-size: 8pt; color: #64748b;">Eficiență (ROI): ${project.roi !== null ? project.roi + '%' : '—'}</div>
          </div>
          <div class="kpi-box">
            <div class="kpi-label">Documente Justificative</div>
            <div class="kpi-value blue">${projectTxs.length} TX</div>
            <div style="font-size: 8pt; color: #64748b;">${receiptTxs.length} bonuri atașate în anexă</div>
          </div>
        </div>

        <h3 style="font-size: 11pt; text-transform: uppercase; margin: 16px 0 8px 0; color: #1e293b;">
          Centralizatorul Operațiunilor Financiare
        </h3>
        <table>
          <thead>
            <tr>
              <th style="width: 40px;">Nr.</th>
              <th style="width: 75px;">Cod</th>
              <th style="width: 80px;">Data</th>
              <th style="width: 70px;">Tip</th>
              <th>Categorie</th>
              <th>Sursă / Beneficiar</th>
              <th style="width: 90px;">Metodă</th>
              <th style="text-align: right; width: 95px;">Sumă (RON)</th>
            </tr>
          </thead>
          <tbody>
            ${projectTxs
              .map(
                (tx, i) => `
              <tr>
                <td>${i + 1}</td>
                <td><strong>${tx.code}</strong></td>
                <td>${tx.date}</td>
                <td style="font-weight: 700; color: ${tx.type === 'venit' ? '#047857' : '#b91c1c'};">
                  ${tx.type === 'venit' ? 'Venit' : 'Plată'}
                </td>
                <td>${tx.category}</td>
                <td>${tx.source || '—'}</td>
                <td>${tx.paymentMethod || '—'}</td>
                <td style="text-align: right; font-weight: 800;">
                  ${tx.type === 'venit' ? '+' : '−'}${formatRON(tx.amount)}
                </td>
              </tr>
            `
              )
              .join('')}
            <tr class="total-row">
              <td colspan="7" style="text-align: right; text-transform: uppercase;">Rezultat Net Proiect:</td>
              <td style="text-align: right; font-size: 10pt; color: ${
                project.netCharitable >= 0 ? '#047857' : '#b91c1c'
              };">
                ${project.netCharitable >= 0 ? '+' : ''}${formatRON(project.netCharitable)} RON
              </td>
            </tr>
          </tbody>
        </table>

        ${
          receiptTxs.length > 0
            ? `
          <div class="annex-title">Anexa Foto: Bonuri Fiscale &amp; Chitanțe Justificative (${receiptTxs.length})</div>
          <div class="receipts-grid">
            ${receiptTxs
              .map(
                tx => `
              <div class="receipt-card">
                <div class="receipt-header">
                  ANEXA [${tx.code}] • Data: ${tx.date} • Suma: ${formatRON(tx.amount)} RON
                  <br /><span style="font-weight: normal; color: #64748b;">${tx.source || tx.category}</span>
                </div>
                <img src="${tx.receiptImage}" class="receipt-img" alt="Bon ${tx.code}" />
              </div>
            `
              )
              .join('')}
          </div>
        `
            : ''
        }

        <div class="signatures">
          <div class="sig-box">
            <strong>Trezorier</strong><br />
            Stan Rareș-Ștefan<br />
            <span style="font-size: 8pt; color: #64748b;">Verificat &amp; Aprobat</span>
          </div>
          <div class="sig-box">
            <strong>Președinte de Club</strong><br />
            Interact Club Piatra Neamț Camena<br />
            <span style="font-size: 8pt; color: #64748b;">Semnătură &amp; Ștampilă</span>
          </div>
        </div>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 600);
  };

  return (
    <div className="space-y-6 font-anthropic">
      {/* Header Action Bar */}
      <div className="flex items-center justify-between gap-3 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h3 className="text-base sm:text-lg font-bold font-title text-slate-900 dark:text-white">
            Proiecte &amp; Evenimente Bugetate
          </h3>
          <p className="text-xs text-slate-500 font-data">
            {rows.length} {rows.length === 1 ? 'proiect monitorizat' : 'proiecte monitorizate'}
          </p>
        </div>
        <button
          type="button"
          className="adm-btn-primary text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 py-2 px-3.5 shrink-0 shadow-xs cursor-pointer"
          onClick={openCreate}
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Proiect Nou</span>
        </button>
      </div>

      {/* Projects List / Cards */}
      {rows.length === 0 ? (
        <Panel bodyClassName="p-0">
          <EmptyState
            icon={<FolderKanban className="h-12 w-12" />}
            title="Niciun proiect înregistrat în buget"
            description="Alege un proiect din Calendarul clubului sau creează o campanie financiară dedicată."
            action={
              <button type="button" className="adm-btn-primary text-xs font-bold uppercase tracking-wider" onClick={openCreate}>
                <Plus className="h-4 w-4" /> Adaugă Primul Proiect
              </button>
            }
          />
        </Panel>
      ) : (
        <div className="space-y-5">
          {rows.map(project => {
            const isExpanded = Boolean(expandedProjects[project.id]);
            const projectTxs = transactions.filter(t => t.projectId === project.id);
            const isNetPositive = project.netCharitable >= 0;

            return (
              <div
                key={project.id}
                className="bg-white dark:bg-[#161B22] rounded-[2px] border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden transition-all duration-200 hover:border-slate-300 dark:hover:border-slate-700"
              >
                {/* Project Header */}
                <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800/80">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h3 className="text-base sm:text-lg font-bold font-title text-slate-900 dark:text-white">
                        {project.name}
                      </h3>
                      <Badge
                        label={PROJECT_STATUS_LABELS[project.status]}
                        color={STATUS_COLORS[project.status]}
                      />
                      {project.eventId && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[2px] bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 text-[11px] font-bold font-data">
                          <Calendar className="h-3 w-3" /> Calendar
                        </span>
                      )}
                      {project.isLocked && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[2px] bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 text-[11px] font-bold font-title uppercase tracking-wider" title="Proiectul are prezența închisă și data a trecut — protejat împotriva editărilor">
                          <Lock className="h-3 w-3 text-amber-600 dark:text-amber-400" /> Încheiat &amp; Arhivat
                        </span>
                      )}
                    </div>
                    {project.date && (
                      <p className="text-xs text-slate-500 font-data">
                        Dată programată: <strong className="text-slate-700 dark:text-slate-300">{project.date}</strong>
                      </p>
                    )}
                  </div>

                  {/* Actions for this project */}
                  <div className="flex items-center gap-2 self-start md:self-center flex-wrap">
                    {!project.isLocked && (
                      <>
                        <button
                          type="button"
                          onClick={() => openQuickTx(project, 'venit')}
                          className="px-2.5 py-1.5 rounded-[2px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 text-xs font-bold font-title uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-colors"
                          title="Înregistrează o încasare pe acest proiect"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>+ Venit</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => openQuickTx(project, 'cheltuiala')}
                          className="px-2.5 py-1.5 rounded-[2px] bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800 text-xs font-bold font-title uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-colors"
                          title="Înregistrează o plată sau decont cu bon pe acest proiect"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>− Cheltuială / Bon</span>
                        </button>
                      </>
                    )}

                    <button
                      type="button"
                      onClick={() => setReportProject(project)}
                      className="px-3 py-1.5 rounded-[2px] bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 text-xs font-bold font-title uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-colors"
                      title="Generează dosarul financiar complet"
                    >
                      <FileCheck className="h-3.5 w-3.5 text-sky-500" />
                      <span>Raport Oficial</span>
                    </button>

                    {!project.isLocked ? (
                      <>
                        <button
                          type="button"
                          onClick={() => openEdit(project)}
                          className="p-1.5 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer"
                          title="Editează detaliile proiectului"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteRequest(project)}
                          className="p-1.5 text-rose-500 hover:text-rose-700 cursor-pointer"
                          title="Șterge proiectul din evidență"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    ) : (
                      <span
                        className="p-1.5 text-slate-400 dark:text-slate-600 cursor-not-allowed"
                        title="Proiect blocat: prezența a fost finalizată și data a trecut."
                      >
                        <Lock className="h-4 w-4" />
                      </span>
                    )}
                  </div>
                </div>

                {/* 3 Financial Boxes */}
                <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 dark:divide-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
                  {/* Box 1: Venituri */}
                  <div className="p-4 sm:p-5">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-title flex items-center gap-1.5">
                      <TrendingUp className="h-3.5 w-3.5 text-emerald-800 dark:text-emerald-300" /> Venituri Realizate
                    </span>
                    <div className="mt-1.5 text-xl sm:text-2xl font-bold font-data text-emerald-800 dark:text-emerald-300">
                      +{formatRON(project.realizedIncome)} RON
                    </div>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-data block mt-0.5">
                      Estimat / Țintă: <strong>{formatRON(project.estimatedIncome)} RON</strong>
                    </span>
                  </div>

                  {/* Box 2: Cheltuieli */}
                  <div className="p-4 sm:p-5">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-title flex items-center gap-1.5">
                      <TrendingDown className="h-3.5 w-3.5 text-rose-800 dark:text-rose-300" /> Cheltuieli Reale
                    </span>
                    <div className="mt-1.5 text-xl sm:text-2xl font-bold font-data text-rose-800 dark:text-rose-300">
                      −{formatRON(project.realizedExpense)} RON
                    </div>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-data block mt-0.5">
                      Plafon Maxim: <strong>{formatRON(project.estimatedExpense)} RON</strong>
                    </span>
                  </div>

                  {/* Box 3: Profit Net Caritabil & ROI */}
                  <div className="p-4 sm:p-5 bg-white dark:bg-[#161B22]/50">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-title flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-amber-500" /> Profit Net Caritabil
                    </span>
                    <div
                      className={`mt-1.5 text-xl sm:text-2xl font-black font-data ${
                        isNetPositive ? 'text-emerald-800 dark:text-emerald-300' : 'text-rose-800 dark:text-rose-300'
                      }`}
                    >
                      {isNetPositive ? '+' : ''}
                      {formatRON(project.netCharitable)} RON
                    </div>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-data block mt-0.5">
                      Eficiență (ROI):{' '}
                      <strong className={isNetPositive ? 'text-emerald-800 dark:text-emerald-300' : 'text-rose-800 dark:text-rose-300'}>
                        {project.roi !== null ? `${project.roi}%` : '—'}
                      </strong>
                    </span>
                  </div>
                </div>

                {/* Footer Bar: Expand transactions toggle */}
                <div className="px-4 py-2.5 bg-slate-100/60 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium font-data">
                    {projectTxs.length} tranzacții asociate ·{' '}
                    {projectTxs.filter(t => Boolean(t.receiptImage || t.documentUrl)).length} bonuri justificative
                  </span>

                  <button
                    type="button"
                    onClick={() => toggleExpand(project.id)}
                    className="inline-flex items-center gap-1 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-bold font-title uppercase tracking-wider cursor-pointer"
                  >
                    <span>{isExpanded ? 'Ascunde Tranzacții' : `Vezi Tranzacții & Bonuri (${projectTxs.length})`}</span>
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                </div>

                {/* Expanded Transactions Accordion Table */}
                {isExpanded && (
                  <div className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#12161C] p-3 sm:p-4">
                    {projectTxs.length === 0 ? (
                      <p className="text-xs text-slate-500 text-center py-4">
                        Nicio tranzacție asociată încă acestui proiect. Folosește butoanele de mai sus pentru a adăuga venituri sau cheltuieli.
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs font-anthropic border-collapse">
                          <thead>
                            <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase tracking-wider font-title">
                              <th className="px-3 py-2 text-left">Cod</th>
                              <th className="px-3 py-2 text-left">Data</th>
                              <th className="px-3 py-2 text-left">Tip</th>
                              <th className="px-3 py-2 text-left">Categorie</th>
                              <th className="px-3 py-2 text-left">Sursă / Beneficiar</th>
                              <th className="px-3 py-2 text-center">Bon / Dovadă</th>
                              <th className="px-3 py-2 text-right">Sumă</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-data">
                            {projectTxs.map(tx => {
                              const hasProof = Boolean(tx.receiptImage || tx.documentUrl);
                              return (
                                <tr key={tx.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                                  <td className="px-3 py-2 font-bold text-slate-900 dark:text-white">{tx.code}</td>
                                  <td className="px-3 py-2 text-slate-500">{tx.date}</td>
                                  <td className="px-3 py-2 font-bold">
                                    <span
                                      className={
                                        tx.type === 'venit' ? 'text-emerald-800 dark:text-emerald-300' : 'text-rose-800 dark:text-rose-300'
                                      }
                                    >
                                      {tx.type === 'venit' ? 'Venit' : 'Cheltuială'}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{tx.category}</td>
                                  <td className="px-3 py-2 text-slate-600 dark:text-slate-400 truncate max-w-[140px]">
                                    {tx.source || '—'}
                                  </td>
                                  <td className="px-3 py-2 text-center">
                                    {hasProof ? (
                                      <button
                                        type="button"
                                        onClick={() => setLightboxTx(tx)}
                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[2px] bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 text-[11px] font-bold font-title hover:brightness-105 cursor-pointer"
                                      >
                                        {tx.receiptImage ? <ImageIcon className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
                                        <span>Vezi Bon</span>
                                      </button>
                                    ) : (
                                      <span className="text-slate-400">—</span>
                                    )}
                                  </td>
                                  <td className="px-3 py-2 text-right font-bold text-slate-900 dark:text-white">
                                    {tx.type === 'venit' ? '+' : '−'}
                                    {formatRON(tx.amount)} RON
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. Modal: Adaugă / Editează Proiect                                       */}
      {/* ========================================================================= */}
      {draft && (
        <Modal
          open={Boolean(draft)}
          title={original ? `Editează Proiectul „${draft.name}”` : 'Adaugă Proiect în Buget'}
          subtitle="Conectează un proiect din Calendar sau creează o inițiativă financiară dedicată."
          onClose={() => setDraft(null)}
          width="max-w-xl"
          footer={
            <>
              <button
                type="button"
                className="adm-btn-ghost text-xs font-bold uppercase tracking-wider"
                onClick={() => setDraft(null)}
              >
                Anulează
              </button>
              <button
                type="button"
                className="adm-btn-primary text-xs font-bold uppercase tracking-wider flex items-center gap-1.5"
                onClick={submitProject}
                disabled={saving || !draft.name.trim()}
              >
                <Check className="h-4 w-4" />
                {saving ? 'Se salvează…' : 'Salvează Proiectul'}
              </button>
            </>
          }
        >
          <div className="space-y-4 font-anthropic">
            {/* Source Type Selector if creating new */}
            {!original && (
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-[2px] border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setSourceType('calendar')}
                  className={`py-2 px-3 text-xs font-bold font-title uppercase tracking-wider rounded-[2px] flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    sourceType === 'calendar'
                      ? 'bg-white dark:bg-[#1C2128] text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <Calendar className="h-3.5 w-3.5 text-sky-500" />
                  <span>Din Calendar</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSourceType('custom')}
                  className={`py-2 px-3 text-xs font-bold font-title uppercase tracking-wider rounded-[2px] flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    sourceType === 'custom'
                      ? 'bg-white dark:bg-[#1C2128] text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <FolderKanban className="h-3.5 w-3.5 text-amber-500" />
                  <span>Proiect Custom</span>
                </button>
              </div>
            )}

            {/* Option 1: Pick from Calendar Events */}
            {sourceType === 'calendar' && !original && (
              <div className="p-3 bg-sky-50/70 dark:bg-sky-950/30 rounded-[2px] border border-sky-200 dark:border-sky-800/60 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold font-title text-slate-900 dark:text-white uppercase tracking-wider">
                    Selectează Evenimentul din Calendar
                  </span>
                  <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showAllEvents}
                      onChange={e => setShowAllEvents(e.target.checked)}
                      className="rounded text-sky-500"
                    />
                    <span>Arată toate tipurile</span>
                  </label>
                </div>

                <Select
                  value={draft.eventId || ''}
                  onChange={e => handleSelectCalendarEvent(e.target.value)}
                  className="font-medium"
                >
                  <option value="">-- Alege un eveniment --</option>
                  {projectEvents.map(ev => {
                    const alreadyAdded = existingEventIds.has(ev.id);
                    return (
                      <option key={ev.id} value={ev.id}>
                        {ev.title} ({ev.date || 'Fără dată'}) {alreadyAdded ? '• [Deja în buget]' : ''}
                      </option>
                    );
                  })}
                </Select>
              </div>
            )}

            <Field label="Nume Proiect / Campanie" required>
              <TextInput
                value={draft.name}
                onChange={e => setDraft({ ...draft, name: e.target.value })}
                placeholder="ex. Gala Interact Camena, Smash Rally, EcoAct…"
              />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Data Proiectului">
                <TextInput
                  type="date"
                  value={draft.date || ''}
                  onChange={e => setDraft({ ...draft, date: e.target.value })}
                />
              </Field>

              <Field label="Status">
                <Select
                  value={draft.status}
                  onChange={e => setDraft({ ...draft, status: e.target.value as ProjectStatus })}
                >
                  <option value="planuit">Plănuit</option>
                  <option value="derulare">În Derulare</option>
                  <option value="finalizat">Finalizat</option>
                </Select>
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Venit Estimat / Țintă (RON)" hint="Bilete, donații, sponsorizări planificate">
                <MoneyInput
                  value={draft.estimatedIncome}
                  onChangeValue={val => setDraft({ ...draft, estimatedIncome: val })}
                  placeholder="0"
                />
              </Field>

              <Field label="Plafon Cheltuieli Estimativ (RON)" hint="Limita maximă de cheltuieli aprobată">
                <MoneyInput
                  value={draft.estimatedExpense}
                  onChangeValue={val => setDraft({ ...draft, estimatedExpense: val })}
                  placeholder="0"
                />
              </Field>
            </div>
          </div>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* 2. Modal: Quick Transaction pe Proiect (+ Venit sau - Cheltuială)         */}
      {/* ========================================================================= */}
      {quickTxDraft && (
        <Modal
          open={Boolean(quickTxDraft)}
          title={
            quickTxDraft.tx.type === 'venit'
              ? `Înregistrează Venit • ${quickTxDraft.project.name}`
              : `Înregistrează Plată / Bon • ${quickTxDraft.project.name}`
          }
          subtitle={`Adaugă operațiunea direct în registrul financiar al proiectului (Cod: ${quickTxDraft.tx.code}).`}
          onClose={() => setQuickTxDraft(null)}
          width="max-w-xl"
          footer={
            <>
              <button
                type="button"
                className="adm-btn-ghost text-xs font-bold uppercase tracking-wider"
                onClick={() => setQuickTxDraft(null)}
              >
                Anulează
              </button>
              <button
                type="button"
                className="adm-btn-primary text-xs font-bold uppercase tracking-wider flex items-center gap-1.5"
                onClick={submitQuickTx}
                disabled={savingQuickTx || uploadingReceipt}
              >
                <Check className="h-4 w-4" />
                {savingQuickTx ? 'Se salvează…' : 'Înregistrează Tranzacția'}
              </button>
            </>
          }
        >
          <div className="space-y-4 font-anthropic">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Data Tranzacției" required error={quickTxErrors.date}>
                <TextInput
                  type="date"
                  value={quickTxDraft.tx.date}
                  onChange={e =>
                    setQuickTxDraft({
                      ...quickTxDraft,
                      tx: { ...quickTxDraft.tx, date: e.target.value },
                    })
                  }
                />
              </Field>

              <Field label="Sumă (RON întregi)" required error={quickTxErrors.amount}>
                <MoneyInput
                  value={quickTxDraft.tx.amount}
                  onChangeValue={val =>
                    setQuickTxDraft({
                      ...quickTxDraft,
                      tx: { ...quickTxDraft.tx, amount: val },
                    })
                  }
                  placeholder="0"
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Categorie" required error={quickTxErrors.category}>
                <Select
                  value={quickTxDraft.tx.category}
                  onChange={e =>
                    setQuickTxDraft({
                      ...quickTxDraft,
                      tx: { ...quickTxDraft.tx, category: e.target.value },
                    })
                  }
                >
                  {categoriesFor(quickTxDraft.tx.type).map(cat => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="Metodă de Plată">
                <Select
                  value={quickTxDraft.tx.paymentMethod || PAYMENT_METHODS[0]}
                  onChange={e =>
                    setQuickTxDraft({
                      ...quickTxDraft,
                      tx: { ...quickTxDraft.tx, paymentMethod: e.target.value },
                    })
                  }
                >
                  {PAYMENT_METHODS.map(m => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            <Field label="Sursă / Membru / Beneficiar" required error={quickTxErrors.source}>
              <TextInput
                value={quickTxDraft.tx.source}
                onChange={e =>
                  setQuickTxDraft({
                    ...quickTxDraft,
                    tx: { ...quickTxDraft.tx, source: e.target.value },
                  })
                }
                placeholder="ex. Popa Andrei (Decont print), Sponsor SRL, Vânzare bilete..."
              />
            </Field>

            {/* Bon Upload Box */}
            <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-[2px] border border-slate-200 dark:border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Bon Fiscal / Factură / Chitanță
                </span>
                {quickTxDraft.tx.type === 'cheltuiala' && (
                  <span className="text-[11px] text-rose-500 font-semibold">* Recomandat pentru decont</span>
                )}
              </div>

              <label className="flex items-center justify-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 border border-dashed border-slate-300 dark:border-slate-700 rounded-[2px] text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                <Upload className="h-4 w-4 text-sky-500" />
                <span>
                  {uploadingReceipt
                    ? 'Se optimizează bonul…'
                    : quickTxDraft.tx.receiptImage
                    ? 'Înlocuiește bonul'
                    : 'Fă poză la bon / Încarcă fișier'}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleQuickTxFileUpload}
                  disabled={uploadingReceipt}
                  className="hidden"
                />
              </label>

              {quickTxDraft.tx.receiptImage && (
                <div className="relative inline-flex items-center gap-3 p-2 bg-white dark:bg-slate-800 rounded-[2px] border border-slate-200 dark:border-slate-700">
                  <img
                    src={quickTxDraft.tx.receiptImage}
                    alt="Preview Bon"
                    className="h-16 w-auto max-w-[120px] object-cover rounded-[2px] border border-slate-200 dark:border-slate-700"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-emerald-800 dark:text-emerald-300 block">Bon atașat cu succes</span>
                    <span className="text-[11px] text-slate-500">Gata de includere în raportul oficial</span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setQuickTxDraft({
                        ...quickTxDraft,
                        tx: { ...quickTxDraft.tx, receiptImage: '' },
                      })
                    }
                    className="p-1 bg-rose-600 hover:bg-rose-700 text-white rounded-full ml-auto"
                    title="Elimină bonul"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>

            <Field label="Observații / Notă justificativă">
              <TextArea
                rows={2}
                value={quickTxDraft.tx.notes}
                onChange={e =>
                  setQuickTxDraft({
                    ...quickTxDraft,
                    tx: { ...quickTxDraft.tx, notes: e.target.value },
                  })
                }
              />
            </Field>
          </div>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* 3. Modal: Lightbox Bon Fiscal Mărit                                       */}
      {/* ========================================================================= */}
      {lightboxTx && (
        <Modal
          open={Boolean(lightboxTx)}
          title={`Bon Fiscal • ${lightboxTx.code}`}
          subtitle={`${lightboxTx.type === 'venit' ? 'Venit' : 'Plată'} • ${formatRON(lightboxTx.amount)} RON`}
          onClose={() => setLightboxTx(null)}
          width="max-w-2xl"
          footer={
            <div className="flex items-center justify-between w-full">
              <span className="text-xs text-slate-500 font-data">Dată: {lightboxTx.date}</span>
              <div className="flex items-center gap-2">
                {lightboxTx.receiptImage && (
                  <button
                    type="button"
                    className="adm-btn-ghost text-xs font-bold uppercase tracking-wider flex items-center gap-1.5"
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = lightboxTx.receiptImage!;
                      link.download = `Bon_${lightboxTx.code}.jpg`;
                      link.click();
                    }}
                  >
                    <Download className="h-3.5 w-3.5" /> Descarcă Bonul
                  </button>
                )}
                <button
                  type="button"
                  className="adm-btn-primary text-xs font-bold uppercase tracking-wider"
                  onClick={() => setLightboxTx(null)}
                >
                  Închide
                </button>
              </div>
            </div>
          }
        >
          <div className="space-y-3 font-anthropic">
            {lightboxTx.receiptImage ? (
              <div className="flex flex-col items-center justify-center p-3 bg-slate-900/10 dark:bg-slate-950/50 rounded-[2px] border border-slate-200 dark:border-slate-800">
                <img
                  src={lightboxTx.receiptImage}
                  alt={`Bon ${lightboxTx.code}`}
                  className="max-h-[60vh] w-auto max-w-full object-contain rounded-[2px] shadow-sm cursor-zoom-in"
                  onClick={() => window.open(lightboxTx.receiptImage, '_blank')}
                  title="Fă clic pentru a deschide la rezoluție maximă"
                />
              </div>
            ) : (
              <div className="p-6 text-center text-slate-500">
                {lightboxTx.documentUrl || 'Chitanță fizică înregistrată la dosar.'}
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* 4. Modal: Previzualizare Raport Financiar Oficial al Proiectului          */}
      {/* ========================================================================= */}
      {reportProject && (
        <Modal
          open={Boolean(reportProject)}
          title={`Dosar Financiar Oficial • ${reportProject.name}`}
          subtitle="Document executiv de audit cu centralizator, KPI, grafice și anexa bonurilor fiscale."
          onClose={() => setReportProject(null)}
          width="max-w-4xl"
          footer={
            <div className="flex flex-wrap items-center justify-between gap-3 w-full">
              <span className="text-xs text-slate-500 font-data">
                Mandat: 2026/2027 · Trezorier: Stan Rareș-Ștefan
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleExportProjectXLSX(reportProject)}
                  className="adm-btn-ghost text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 py-2 px-3 cursor-pointer"
                >
                  <FileSpreadsheet className="h-4 w-4 text-emerald-800 dark:text-emerald-300" />
                  <span>Descarcă Excel (.xlsx)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handlePrintOfficialDossier(reportProject)}
                  className="adm-btn-primary text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 py-2 px-4 shadow-xs cursor-pointer"
                >
                  <Printer className="h-4 w-4" />
                  <span>Generează Dosar PDF / Print (A4)</span>
                </button>
              </div>
            </div>
          }
        >
          <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-1 font-anthropic">
            {/* Header Oficial Camena */}
            <div className="p-4 rounded-[2px] bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-sky-800 dark:text-sky-300 font-title">
                  Interact Club Piatra Neamț Camena
                </span>
                <h2 className="text-lg font-bold font-title text-slate-900 dark:text-white mt-0.5">
                  Raport Financiar: {reportProject.name}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Data: {reportProject.date || 'În derulare'} · Status: {PROJECT_STATUS_LABELS[reportProject.status]}
                </p>
              </div>
              <div className="text-right text-xs font-data">
                <span className="text-slate-400 block">Trezorier Responsabil</span>
                <strong className="text-slate-800 dark:text-slate-200">Stan Rareș-Ștefan</strong>
              </div>
            </div>

            {/* 4 KPI Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-data">
              <div className="p-3 bg-white dark:bg-[#161B22] rounded-[2px] border border-slate-200 dark:border-slate-800">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Total Venituri</span>
                <span className="text-lg font-bold text-emerald-800 dark:text-emerald-300 block mt-1">
                  +{formatRON(reportProject.realizedIncome)} RON
                </span>
              </div>
              <div className="p-3 bg-white dark:bg-[#161B22] rounded-[2px] border border-slate-200 dark:border-slate-800">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Total Cheltuieli</span>
                <span className="text-lg font-bold text-rose-800 dark:text-rose-300 block mt-1">
                  −{formatRON(reportProject.realizedExpense)} RON
                </span>
              </div>
              <div className="p-3 bg-white dark:bg-[#161B22] rounded-[2px] border border-slate-200 dark:border-slate-800">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Profit Net Caritabil</span>
                <span
                  className={`text-lg font-black block mt-1 ${
                    reportProject.netCharitable >= 0 ? 'text-emerald-800 dark:text-emerald-300' : 'text-rose-800 dark:text-rose-300'
                  }`}
                >
                  {reportProject.netCharitable >= 0 ? '+' : ''}
                  {formatRON(reportProject.netCharitable)} RON
                </span>
              </div>
              <div className="p-3 bg-white dark:bg-[#161B22] rounded-[2px] border border-slate-200 dark:border-slate-800">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Eficiență (ROI)</span>
                <span className="text-lg font-bold text-slate-900 dark:text-white block mt-1">
                  {reportProject.roi !== null ? `${reportProject.roi}%` : '—'}
                </span>
              </div>
            </div>

            {/* Centralized Transactions Table */}
            <div>
              <h4 className="text-xs font-bold font-title text-slate-900 dark:text-white uppercase tracking-wider mb-2">
                Centralizator Operațiuni ({transactions.filter(t => t.projectId === reportProject.id).length})
              </h4>
              <div className="overflow-x-auto rounded-[2px] border border-slate-200 dark:border-slate-800">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase tracking-wider font-title">
                      <th className="px-3 py-2 text-left">Cod</th>
                      <th className="px-3 py-2 text-left">Data</th>
                      <th className="px-3 py-2 text-left">Tip</th>
                      <th className="px-3 py-2 text-left">Categorie</th>
                      <th className="px-3 py-2 text-left">Sursă / Beneficiar</th>
                      <th className="px-3 py-2 text-left">Metodă</th>
                      <th className="px-3 py-2 text-right">Sumă</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-data">
                    {transactions
                      .filter(t => t.projectId === reportProject.id)
                      .map(tx => (
                        <tr key={tx.id}>
                          <td className="px-3 py-2 font-bold text-slate-900 dark:text-white">{tx.code}</td>
                          <td className="px-3 py-2 text-slate-500">{tx.date}</td>
                          <td className="px-3 py-2 font-bold">
                            <span className={tx.type === 'venit' ? 'text-emerald-800 dark:text-emerald-300' : 'text-rose-800 dark:text-rose-300'}>
                              {tx.type === 'venit' ? 'Venit' : 'Plată'}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{tx.category}</td>
                          <td className="px-3 py-2 text-slate-600 dark:text-slate-400">{tx.source || '—'}</td>
                          <td className="px-3 py-2 text-slate-500">{tx.paymentMethod || '—'}</td>
                          <td className="px-3 py-2 text-right font-bold text-slate-900 dark:text-white">
                            {tx.type === 'venit' ? '+' : '−'}
                            {formatRON(tx.amount)} RON
                          </td>
                        </tr>
                      ))}
                    <tr className="bg-slate-50/70 dark:bg-slate-900/40 font-bold border-t border-slate-300 dark:border-slate-700">
                      <td colSpan={6} className="px-3 py-2.5 text-right uppercase tracking-wider font-title">
                        Rezultat Net Proiect:
                      </td>
                      <td
                        className={`px-3 py-2.5 text-right text-sm ${
                          reportProject.netCharitable >= 0 ? 'text-emerald-800 dark:text-emerald-300' : 'text-rose-800 dark:text-rose-300'
                        }`}
                      >
                        {reportProject.netCharitable >= 0 ? '+' : ''}
                        {formatRON(reportProject.netCharitable)} RON
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Anexa Foto Bonuri Fiscale */}
            {(() => {
              const projectReceipts = transactions.filter(
                t => t.projectId === reportProject.id && Boolean(t.receiptImage)
              );
              if (projectReceipts.length === 0) return null;

              return (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold font-title text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                    <ImageIcon className="h-4 w-4 text-sky-500" />
                    <span>Anexa Foto: Bonuri Fiscale și Chitanțe Justificative ({projectReceipts.length})</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {projectReceipts.map(tx => (
                      <div
                        key={tx.id}
                        className="p-3 bg-white dark:bg-[#161B22] rounded-[2px] border border-slate-200 dark:border-slate-800 space-y-2"
                      >
                        <div className="flex items-center justify-between text-xs font-data border-b border-slate-100 dark:border-slate-800 pb-1.5">
                          <span className="font-bold text-slate-900 dark:text-white">{tx.code}</span>
                          <span className="text-slate-500">{tx.date}</span>
                          <span className="font-bold text-rose-800 dark:text-rose-300">−{formatRON(tx.amount)} RON</span>
                        </div>
                        <img
                          src={tx.receiptImage}
                          alt={`Bon ${tx.code}`}
                          className="h-48 w-full object-contain rounded-[2px] bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800 cursor-zoom-in"
                          onClick={() => setLightboxTx(tx)}
                        />
                        <div className="text-[11px] text-slate-500 truncate">{tx.source || tx.notes}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* 5. Modal: Delete Confirmation                                             */}
      {/* ========================================================================= */}
      {pendingDelete && (
        <Modal
          open={Boolean(pendingDelete)}
          title="Confirmă Ștergerea Proiectului"
          onClose={() => setPendingDelete(null)}
          width="max-w-md"
          footer={
            <>
              <button
                type="button"
                className="adm-btn-ghost text-xs font-bold uppercase tracking-wider"
                onClick={() => setPendingDelete(null)}
                disabled={deleting}
              >
                Anulează
              </button>
              <button
                type="button"
                className="adm-btn-danger text-xs font-bold uppercase tracking-wider flex items-center gap-1.5"
                onClick={handleDeleteConfirm}
                disabled={deleting}
              >
                <Trash2 className="h-3.5 w-3.5" />
                {deleting ? 'Se șterge…' : 'Șterge Proiectul'}
              </button>
            </>
          }
        >
          <div className="space-y-3 font-anthropic">
            <p className="text-sm font-medium leading-relaxed" style={{ color: 'var(--adm-ink-dim)' }}>
              Ești sigur că vrei să elimini proiectul <strong style={{ color: 'var(--adm-ink)' }}>{pendingDelete.name}</strong> din evidența financiară?
            </p>
            <p className="text-xs text-slate-500">
              Tranzacțiile deja asociate vor rămâne în registru, dar nu vor mai fi grupate sub acest proiect.
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
};
