import { supabase } from '../supabase';

const rawMembers = [
  "Abiculesei Alessia (Role: member)",
  "Alungulesei Darius (Role: member)",
  "Alungulesei Ianis (Role: member)",
  "Amatioaiei Ioana (Role: member)",
  "Andraș Andreea (Role: member)",
  "Apetrei Sofia (Role: member)",
  "Ariton Bogdan (Role: member)",
  "Beșu Ioana (Role: member)",
  "Buftea Leonardo (Role: member)",
  "Cacciola Anastasia (Role: admin)",
  "Căruntu Ruxandra (Role: admin)",
  "Ciurea Alex (Role: member)",
  "Corbu Patrick (Role: member)",
  "Corfă Tudor (Role: member)",
  "Covasan Marian (Role: member)",
  "Crușitu Mihnea (Role: member)",
  "Dorneanu Mădălina (Role: member)",
  "Enache Diana (Role: member)",
  "Filimon Teodora (Role: member)",
  "Glodeanu Tudor (Role: member)",
  "Huhulea Miruna (Role: member)",
  "Ifrim Luca (Role: member)",
  "Ifrim Tudor (Role: member)",
  "Ioniță Daria (Role: member)",
  "Lăpușneanu David (Role: member)",
  "Lupu Miruna (Role: member)",
  "Mancas Ilinca (Role: member)",
  "Manole Iustin (Role: member)",
  "Marunțelu Alex (Role: member)",
  "Măzare Sofia (Role: admin)",
  "Micu Ingrid (Role: member)",
  "Mihalache Mara (Role: member)",
  "Mihuț Alexandra (Role: member)",
  "Miron Maya (Role: member)",
  "Negru Maia (Role: member)",
  "Onțanu Vanessa (Role: member)",
  "Orcheanu Maria (Role: member)",
  "Paisa Anastasia (Role: member)",
  "Panainte Silviu (Role: member)",
  "Pascaru Rareș (Role: admin)",
  "Poenaru Cristiana (Role: member)",
  "Popa Ioana (Role: admin)",
  "Popa Matei (Role: admin)",
  "Radu Sabin (Role: member)",
  "Radu Teodora (Role: member)",
  "Răducanu Maya (Role: member)",
  "Stan Ștefan (Role: admin)",
  "Stîngaciu Mario (Role: member)",
  "Șerban Cătălin (Role: member)",
  "Tănasa Teodora (Role: member)",
  "Timofte Teodora (Role: admin)",
  "Timofte Tudor (Role: member)",
  "Timoscov Roxana (Role: member)",
  "Ursache Ștefania (Role: member)",
  "Zugravu Rareș (Role: member)"
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
