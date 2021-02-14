require("dotenv").config();
const fs = require("fs");
const path = require("path")
const { performance } = require('perf_hooks')
const { Pool } = require("pg");
const { logJob } = require("./lib/log");
const jobs = "./jobs";
const args = process.argv.slice(2);
const express = require('express')
const app = express()
const port = 3000


console.log("ETL party getting started!\n\r===============================");

// Express endpoint for data
app.get('/data/:file', (req, res) => {
  const file = `./data/${req.params.file}`
  fs.access(file, (err) => {
      if (err) {
        return res.status(404).send({ message: `File ${file} not found.` });
      } else {
        res.setHeader("content-type", "application/json")
        fs.createReadStream(file).pipe(res)
      }
  })
})
const server = app.listen(port, () => {
  console.log(`GeoJSON server listening at http://localhost:${port}`)
})



// DB connection
console.log("Filling the connection pool...");
const pool = new Pool({
  host: process.env.PGHOST,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  port: process.env.PGPORT
});


// the loop
(async () => {
  const client = await pool.connect();
  const files = await fs.promises.readdir(jobs);

  for (const file of files.filter(el => el.indexOf(".sql") !== -1)) {
    // if arg passed only execute that job
    if (args.length > 0 && args.indexOf(file) === -1) continue

    const t0 = performance.now()

    console.log(`Executing ${file}...`)
    const sql = await fs.promises.readFile(path.join(jobs, file));

    await client.query(sql.toString())
      .then(async res=> {
        await logJob(file, client, 'table updated')
      })
      .catch(async e => {
        await logJob(file, client, e.message || e)
      })

    console.log(`Finished ${file} in ${new Date(performance.now() - t0).toISOString().substr(11, 8)}`)
  }

  await client.release();
  await pool.end();
  await server.close()

  console.log("\n\r===============================\n\rThe ETL party is over. Go home.")
})()
