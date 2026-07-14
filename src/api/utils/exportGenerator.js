const { createClient } = require('@supabase/supabase-js');
const archiver = require('archiver');
const { Writable } = require('stream');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Define tables to fetch data from
const TABLES_TO_EXPORT = [
  'messages',
  'sai_diary',
  'sai_memories',
  'sai_dreams',
  'sai_wellness',
  'sai_moods',
  'study_roadmaps',
  'study_tasks'
];

exports.generateUserExportZip = async (userId) => {
  return new Promise(async (resolve, reject) => {
    try {
      const chunks = [];
      const stream = new Writable({
        write(chunk, encoding, callback) {
          chunks.push(chunk);
          callback();
        }
      });

      const archive = new archiver.ZipArchive({
        zlib: { level: 9 }
      });

      archive.on('error', err => reject(err));
      archive.pipe(stream);

      // Fetch user profile metadata
      const { data: userObj, error: userError } = await supabase.auth.admin.getUserById(userId);
      if (!userError && userObj?.user) {
        archive.append(JSON.stringify(userObj.user, null, 2), { name: 'user_profile.json' });
      }

      // Fetch data from tables
      for (const table of TABLES_TO_EXPORT) {
        const { data, error } = await supabase.from(table).select('*').eq('user_id', userId);
        if (!error && data && data.length > 0) {
          archive.append(JSON.stringify(data, null, 2), { name: `${table}.json` });
        }
      }

      stream.on('finish', () => {
        resolve(Buffer.concat(chunks));
      });

      await archive.finalize();
    } catch (err) {
      reject(err);
    }
  });
};
