const express = require('express')
const app = express()
const port = 3000
const fs = require("fs")

// Set up express server for GeoJSON
app.get('/data/:file', (req, res) => {
  const file = `./data/${req.params.file}`
  fs.access(file, (err) => {
      if (err) {
        return res.status(404).send({ message: `File ${file} not found.` });
      } else {
        res.setHeader("content-type", "application/json");
        fs.createReadStream(file).pipe(res);
      }
  })
})
app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})
