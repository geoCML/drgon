import pgPromise from "pg-promise"
import { wipeDB } from "./utils.js"

const pgp = pgPromise({})

export const db = pgp(`postgres://postgres:${process.env.DRGON_POSTGRES_ADMIN_PASSWORD}@drgon-postgres:5433/drgon_db`)

db.connect()
  .then(async (obj) => {
    console.log("Connected to database")
    await wipeDB()
    obj.done()
  })
  .catch((error) => {
    console.error("ERROR:", error.message)
  })
