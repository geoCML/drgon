import pgPromise from "pg-promise"
import { wipeDB } from "./utils"

const pgp = pgPromise({})

export const db = pgp("postgres://postgres:admin@drgon-postgres:5433/drgon_db")

db.connect()
  .then(async (obj) => {
    console.log("Connected to database")
    await wipeDB()
    obj.done()
  })
  .catch((error) => {
    console.error("ERROR:", error.message)
  })
