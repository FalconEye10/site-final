import { supabase } from '../supabase';

const rawMembers = [
  "Andraș Andreea (Role: member)",
  "Popa Ioana (Role: admin)",
  "Abiculesei Alessia (Role: member)",
  "Paisa Anastasia (Role: member)",
  "Dorneanu Mădălina (Role: member)",
  "Amatioaiei Ioana (Role: member)",
  "Apetrei Sofia (Role: member)",
  "Beșu Ioana (Role: member)",
  "Cacciola Anastasia (Role: admin)",
  "Căruntu Ruxandra (Role: admin)",
  "Ciurea Alex (Role: member)",
  "Crușitu Mihnea (Role: member)",
  "Enache Diana (Role: member)",
  "Filimon Teodora (Role: member)",
  "Ifrim Luca (Role: member)",
  "Ioniță Daria (Role: member)",
  "Marunțelu Alex (Role: member)",
  "Măzare Sofia (Role: admin)",
  "Miron Maya (Role: member)",
  "Onțanu Vanessa (Role: member)",
  "Orcheanu Maria (Role: member)",
  "Pascaru Rareș (Role: admin)",
  "Radu Sabin (Role: member)",
  "Radu Teodora (Role: member)",
  "Răducanu Maya (Role: member)",
  "Zugravu Rareș (Role: member)",
  "Alungulesei Darius (Role: member)",
  "Ariton Bogdan (Role: member)",
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
  "Timofte Teodora (Role: admin)",
  "Timoscov Roxana (Role: member)",
  "Ursache Stefania (Role: member)",
  "Mihalache Mara (Role: member)",
  "Corfă Tudor (Role: member)",
  "Mancas Ilinca (Role: member)",
  "Stan Stefan (Role: admin)",
  "Enache Denisa (Role: member)",
  "Sandu Emilia (Role: member)",
  "Solomon Luiza Ștefania (Role: member)",
  "Rusei Catrina (Role: member)",
  "Mocanu Matei (Role: member)",
  "Raduc Riana (Role: member)",
  "Tatomir Bianca (Role: member)",
  "Alexa Dragoș (Role: member)",
  "Diac Evelina (Role: member)",
  "Vicol Amalia (Role: member)",
  "Beca Rareș (Role: member)",
  "Mihut Călin (Role: member)",
  "Chetreanu Olivia (Role: member)",
  "Pascali Roberto (Role: member)",
  "Filimon Ianis (Role: member)",
  "Ududec Răzvan (Role: member)",
  "Mocanu Mihai (Role: member)",
  "Luncanu Iustin (Role: member)",
  "Ștefan Jucan (Role: member)",
  "Crăciun Eric (Role: member)",
  "Ciobanu Karina (Role: member)",
  "Bour Nicole (Role: member)",
  "Mitrea Matei (Role: member)",
  "Cociorba Ștefan (Role: member)",
  "Moroșanu Ana Francesca (Role: member)",
  "Pascaru Alexandra (Role: member)",
  "Baboi Maya (Role: member)",
  "Mihnea Matei (Role: member)"
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
        payments: []
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
