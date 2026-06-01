const { Pool } = require('pg');

const pool = new Pool({

    connectionString:
    'postgresql://neondb_owner:npg_wur45tlYBadA@ep-flat-silence-aqgzasey-pooler.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',

    ssl: {
        rejectUnauthorized: false
    }

});

module.exports = pool;
