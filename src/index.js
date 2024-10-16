import { db } from "./db.js"
import { checkForBannedWords, email, key, orderBy, searchByTag, url } from "./utils.js"
import express from "express"
import { generateApiKey } from "generate-api-key"

const app = express()
const port = 8000

app.use(express.json())

app.get("/", (req, res) => {
  res.json({
    "message": "Welcome to DRGON! See our documentation to learn how to use our REST API: https://geocml.github.io/docs/",
  })
})

app.get("/registry", async (req, res) => {
    const orderByVal = orderBy(req.body)
    const searchByTagVal = searchByTag(req.body)

    const deployments = await db.manyOrNone(`SELECT id, url, title, description, owner, tags FROM registry WHERE ${searchByTagVal} ORDER BY ${orderByVal} ASC`)

    res.json({
        "message": "Done.",
        deployments
    })
})

app.post("/registry", async (req, res) => {
    const keyVal = await key(req.body)
    const urlVal = url(req.body)
    const titleVal = checkForBannedWords(req.body, "title")
    const descriptionVal = checkForBannedWords(req.body, "description")
    const ownerVal = checkForBannedWords(req.body, "owner")
    const tagsVal = checkForBannedWords(req.body, "tags")

    if (keyVal === "" || urlVal === "" || titleVal === "" || descriptionVal === "" || ownerVal === "" || tagsVal === "") {
      res.json({
        "message": "Invalid request body.",
      })
      return
    }

    try {
      const id = (await db.result("SELECT * FROM registry", null, r => r.rowCount)) + 1
      await db.none(`INSERT INTO registry (id, url, title, description, owner, tags, key) VALUES (${id}, '${urlVal}', '${titleVal}', '${descriptionVal}', '${ownerVal}', '${tagsVal}', '${keyVal}')`)
    } catch {
      res.json({
        "message": "Deployment is already registered on DRGON."
      })
      return
    }
    res.json({
        "message": "Done.",
    })
})

app.get("/apikey", async (req, res) => {
  const key = generateApiKey()
  const emailVal = email(req.body)

  if (emailVal === "") {
      res.json({
        "message": "Invalid request body.",
      })
      return
  }

  try {
    await db.none(`INSERT INTO users (email, key) VALUES ('${emailVal}', '${key}')`)
  } catch {
    res.json({
      "message": "You already registered for an api key."
    })
    return
  }

  res.json({
    "message": "Done.",
    key,
    "note": "Store this api key in a safe place. You will only be able to view it once."
  })
})

app.listen(port, () => {
  console.log(`DRGON is listening on port ${port}`)
})
