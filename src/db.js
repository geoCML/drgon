import pgPromise from "pg-promise"

const pgp = pgPromise({})

export const db = pgp("postgres://postgres:admin@drgon-postgres:5433/drgon_db")
db.connect()
  .then((obj) => {
    console.log("Connected to database")
    obj.done()
  })
  .catch((error) => {
    console.error("ERROR:", error.message)
  })
