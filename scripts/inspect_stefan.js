import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://lsuxzfblbkqpcolujdlo.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzdXh6ZmJsYmtxcGNvbHVqZGxvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYwNTA1ODksImV4cCI6MjEwMTYyNjU4OX0.YWO1JIeEuXTdtm-MAWFdKNHSYb4YPcOOEPmllMu02sU'
);

async function testMembers() {
  const { data: stefan } = await supabase
    .from('members')
    .select('*')
    .or('username.eq.stan.stefan,id.eq.M061');
  console.log('Stefan records in members:', stefan);

  const { data: members, error } = await supabase.from('members').select('id, name, username, role');
  console.log('Total members in DB:', members ? members.length : 0);
}

testMembers();
