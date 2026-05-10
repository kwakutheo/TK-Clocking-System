const { DataSource } = require('typeorm');
const bcrypt = require('bcrypt');

const ds = new DataSource({
  type: 'postgres',
  host: 'dpg-d802fgu7r5hc73b85qcg-a.frankfurt-postgres.render.com',
  port: 5432,
  username: 'theo',
  password: 'Tbxtx3at4yicnVKPZksGEdTCLSn92GC5',
  database: 'tk_clocking',
  ssl: { rejectUnauthorized: false },
  entities: [__dirname + '/dist/**/*.entity.js'],
  synchronize: true, // This will create the tables!
});

async function run() {
  await ds.initialize();
  console.log('Database initialized, tables created.');

  // Check if superadmin exists
  const userRepo = ds.getRepository('User');
  const existing = await userRepo.findOne({ where: { role: 'super_admin' } });
  
  if (!existing) {
    const hashedPassword = await bcrypt.hash('Admin@1234', 12);
    const superAdmin = userRepo.create({
      identifier: 'kwame@tkclocking.dev',
      full_name: 'Super Admin Kwame',
      phone_number: '0550000000',
      password: hashedPassword,
      role: 'super_admin',
    });
    await userRepo.save(superAdmin);
    console.log('Seeded Super Admin user: kwame@tkclocking.dev / Admin@1234');
  } else {
    console.log('Superadmin already exists.');
  }

  process.exit(0);
}

run().catch(console.error);
