const fs = require('fs')

exports.logJob = async (job, client, e = null) => {
  console.log(`Logging results for ${job}...`)

  // write to file
  logFile(job, e)

  // write to table
  await logTable(job, e, client)
}

// Log to file
function logFile(job, e) {
  fs.appendFile(
    './log.csv',
    `${new Date().toISOString()}, ${job}, ${e || 'table updated'}\r\n`,
    (err) => { if (err) console.log("Error writing log file: ", err) }
  )
}

// log to table in postgres
// CREATE TABLE etl_status(
//   table_name character varying(80),
//   update_time timestamp with time zone,
//   status character varying
// )
async function logTable(job, e, client) {
  await client.query(`
    BEGIN;
      DELETE FROM etl_status WHERE table_name = '${job}';
      INSERT INTO etl_status VALUES
        ('${job}', '${new Date().toISOString()}', '${e || 'table updated'}');
    END;
  `).catch(async e => {
    console.log(`Error writing to Postgres log table: ${e.message || e}`)
  })
}
