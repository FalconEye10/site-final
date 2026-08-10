import { supabase } from '../supabase';

const rawMembers = [
  "ANDRAS ANDREEA (Role: member)",
  "POPA IOANA (Role: member)",
  "ABICULESEI ALESSIA (Role: member)",
  "PAISA ANASTASIA (Role: member)",
  "DORNEANU MADALINA (Role: member)",
  "test (Role: member)",
  "Alungulesei Ianis (Role: member)",
  "Amatioaiei Ioana (Role: member)",
  "Apetrei Sofia (Role: member)",
  "Beșu Ioana (Role: member)",
  "Buftea Leonardo (Role: member)",
  "Cacciola Anastasia (Role: member)",
  "Căruntu Ruxandra (Role: member)",
  "Ciobanu Ilinca (Role: member)",
  "Ciurea Alex (Role: member)",
  "Covasan Marian (Role: member)",
  "Crușitu Mihnea (Role: member)",
  "Enache Diana (Role: member)",
  "Filimon Teodora (Role: member)",
  "Ifrim Luca (Role: member)",
  "Ioniță Daria (Role: member)",
  "Marunțelu Alex (Role: member)",
  "Măzare Sofia (Role: member)",
  "Miron Maya (Role: member)",
  "Onțanu Vanessa (Role: member)",
  "Orcheanu Maria (Role: member)",
  "Panainte Silviu (Role: member)",
  "Pascaru Rareș (Role: member)",
  "Popa Medeea (Role: member)",
  "Radu Sabin (Role: member)",
  "Radu Teodora (Role: member)",
  "Răducanu Maya (Role: member)",
  "Șerban Catalin (Role: member)",
  "Tănasa Teodora (Role: member)",
  "Zugravu Rareș (Role: member)",
  "Alungulesei Darius (Role: member)",
  "Ariton Bogdan (Role: member)",
  "Corbu Partick (Role: member)",
  "Huhulea Miruna (Role: member)",
  "Lăpușneanu David (Role: member)",
  "Lupu Miruna (Role: member)",
  "Manole Iustin (Role: member)",
  "Micu Ingrid (Role: member)",
  "Mihuț Alexandra (Role: member)",
  "Negru Maia (Role: member)",
  "Poenaru Cristiana (Role: member)",
  "Stîngaciu Mario (Role: member)",
  "Timofte Tudor (Role: member)",
  "IFRIM TUDOR (Role: member)",
  "STAN STEFAN (Role: member)",
  "TIMOFTE TEODORA (Role: member)",
  "PADURARIU SABIN (Role: member)",
  "PASCARU RASES (Role: member)",
  "ORCHIANU MARIA (Role: member)",
  "MIHALACHE MARA (Role: member)",
  "CORFA TUDOR (Role: member)",
  "POPA MATEI (Role: member)",
  "admin (Role: admin)"
];

const generateRandomPassword = () => {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  const chars = 'abcdefghijkmnpqrstuvwxyz23456789';
  return 'cmn-' + Array.from(bytes, b => chars[b % chars.length]).join('');
};

export const seedDatabase = async () => {
  try {
    if (localStorage.getItem('db_seeded') === 'true') {
      return;
    }

    const { data: existing } = await supabase.from('members').select('id').limit(1);
    if (existing && existing.length > 0) {
      localStorage.setItem('db_seeded', 'true');
      return;
    }

    const issuedCredentials: Array<{ name: string; username: string; password: string }> = [];

    let idCounter = 1;

    for (const raw of rawMembers) {
      const match = raw.match(/(.+?)\s+\(Role:\s+(\w+)\)/);
      if (!match) continue;

      const fullName = match[1].trim();
      const role = match[2].trim() as 'member' | 'admin';
      
      const username = fullName.toLowerCase().replace(/\s+/g, '.').replace(/ț/g, 't').replace(/ș/g, 's').replace(/ă/g, 'a').replace(/î/g, 'i').replace(/â/g, 'a');
      // Every account gets a generated password — including admin. Hardcoding
      // one here would ship it inside the client bundle for anyone to read.
      const password = generateRandomPassword();
      issuedCredentials.push({ name: fullName, username, password });

      const derivedNickname = fullName.split(' ')[0] || fullName;

      // Modelul de date exact cerut
      const memberDoc = {
        id: `M${idCounter.toString().padStart(3, '0')}`,
        name: fullName,
        username,
        password,
        role,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=001f26&color=FAF9F5`,
        nickname: derivedNickname,
        email: `${username}@club.ro`,
        joinDate: '2026-05-01T00:00:00Z', // Data implicită ancoră
        presences: 0,
        excusedAbsences: 0,
        unexcusedAbsences: 0,
        attendanceRate: '100%',
        qualification: 'Maxim',
        status: 'active',
        totalPaid: 0,
        totalDebt: 0,
        payments: [],
        score: 0,
        scoreAdjustments: []
      };

      await supabase.from('members').upsert(memberDoc);
      idCounter++;
    }

    console.log(`[seed] ${issuedCredentials.length} conturi create:`);
    console.table(issuedCredentials);

  } catch (error) {
    console.error('Error in batch sync:', error);
  }
};
