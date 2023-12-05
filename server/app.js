const express = require('express')
const app = express()
const port = 3000
const sql = require('mysql2')
const bcrypt = require('bcrypt')
app.use(express.json())
app.use(require('cors')())
const { findUserById, updateUserBalance, saveTransaction } = require('./mysqlUtility');

const saltRounds = 10

const conn = sql.createConnection({
  host: 'localhost',
  password: '',
  user: 'root',
  database: 'epitaka-db'
})

const checkUsername = (username) => {
  return new Promise((resolve, reject) => {
    conn.query("SELECT * FROM `account` WHERE `Username` = ?", [username], (err, data) => {
      if (err) {
        console.error("Error Checking Username:", err);
        reject(err);
        return
      }
      resolve(data.length > 0)
    })
  })
}

app.post('/sign-up', async (req, res) => {
  // const [firstName, lastName, username, password] = req.body
  const firstName = req.body.fname
  const lastName = req.body.lname
  const username = req.body.username
  const password = req.body.password
  const userExists = await checkUsername(username)
  const hashedPassword = await bcrypt.hash(password, saltRounds)
  if (userExists) {
    return ({ error: "User already Exists" })
  }
  conn.query(
    "INSERT INTO `account` (`Username`, `Password`, `FName`, `LName`) VALUES (?, ?, ?, ?)",
    [username, hashedPassword, firstName, lastName],
    (err, data) => {
      if (err) {
        console.error("Error inserting into 'user' table:", err)
        return;
      }
      console.log("Inserted Successfully")
    }
  )
  console.log(req.body);
  res.json(req.body);
});

app.get('/check-username/:username', (req, res) => {
  const username = req.params.username;
  conn.query(
    "SELECT * FROM `account` WHERE `Username` = ?", [username], (err, data) => {
      if (err) {
        console.error("Failed to Check for Username:", err);
        return;
      }
      const usernameExists = data.length > 0;
      const userInfo = usernameExists
        ? {
          id: data[0].Account_ID,
          username: data[0].Username,
          password: data[0].Password,
          balance: data[0].Balance,
          firstName: data[0].FName,
          lastName: data[0].LName
        }
        : null;
      
      console.log(userInfo)
      res.json({ usernameExists, userInfo })
    }
  )
})

app.post('/check-username/:username', async (req, res) => {
  const username = req.params.username;
  const passwordInput = req.body.password;

  conn.query(
    "SELECT * FROM `account` WHERE `Username` = ?", [username], async (err, data) => {
      if (err) {
        console.error("Failed to Check for Username:", err);
        return res.status(500).json({ error: "Failed to check for username." });
      }

      if (data.length > 0) {
        const storedHashedPassword = data[0].Password;
        const passwordMatch = await bcrypt.compare(passwordInput, storedHashedPassword);
        const usernameExists = true;
        const userInfo = usernameExists
          ? { username: data[0].Username, password: data[0].Password }
          : null;

        if (passwordMatch) {
          console.log("Password is correct");
          res.json({ usernameExists, userInfo });
        } else {
          console.log("Incorrect password");
          res.json({ usernameExists: false, userInfo: null });
        }
      } else {
        console.log("User not found");
        res.json({ usernameExists: false, userInfo: null });
      }
    }
  );
});

app.get('/user-balance/:username', (req, res) => {
  const username = req.params.username;
  conn.query(
    "SELECT `Balance` FROM `account` WHERE `Username` = ?", [username], (err, data) => {
      if (err) {
        console.error("Failed to retrieve User Balance:", err);
        return res.status(500).json({ error: "Failed to retrieve User Balance." });
      }
      const userBalance = data.length > 0 ? data[0].Balance : null;
      res.json({ userBalance })
    }
  )
})

app.post("/api/transfer", async (req, res) => {
  const { senderID, receiverID, amount } = req.body;
  
  try {
    const sender = await findUserById(senderID);
    const receiver = await findUserById(receiverID);

    if (!sender || !receiver) {
      return res.status(400).json({error: "Invalid sender or receiver ID"})
    }

    if (sender.Balance < amount) {
      return res.status(400).json({error: "Insufficient Balance"})
    }

    await updateUserBalance(senderID, parseFloat(sender.balance) - parseFloat(amount));
    await updateUserBalance(receiverID, parseFloat(receiver.balance) + parseFloat(amount));

    await saveTransaction(senderID, receiverID, amount);

    return res.status(200).json({ success: true })
  } catch (err) {
    console.error("Error Processing Money Transaction:", err);
    res.send({ error: "Internal Server Error" })
  }
})

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})