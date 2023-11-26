const express = require('express')
const app = express()
const port = 3000
const sql = require('mysql2')
app.use(express.json())
app.use(require('cors')())

const conn = sql.createConnection({
  host: 'localhost',
  password: '',
  user: 'root',
  database: 'epitaka-db'
})

app.post('/sign-up', (req, res) => {
  // const [firstName, lastName, username, password] = req.body
  const firstName = req.body.fname
  const lastName = req.body.lname
  const username = req.body.username
  const password = req.body.password
  conn.query(
    "INSERT INTO `user` (`Fname`, `Lname`) VALUES (?, ?)",
    [firstName, lastName],
    (err, data) => {
      if (err) {
        console.error("Error inserting into 'user' table:", err)
        return;
      }

      conn.query(
        "INSERT INTO `account` (`Username`, `Password`) VALUES (?, ?)",
        [username, password],
        (err, data) => {
          if (err) {
            console.error("Error inserting into 'account' table:", err)
            return;
          }
          console.log("Inserted Successfully")
        }
      )
    }
  )
  console.log(req.body);
  res.json(req.body);
});

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})