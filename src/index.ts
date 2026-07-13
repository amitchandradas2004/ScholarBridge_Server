import cors from "cors";
import dotenv from "dotenv";
import express, { Request, Response } from "express";
dotenv.config();
const app = express();
const PORT = process.env.PORT;

app.use(cors());
app.use(express.json());
const { MongoClient, ServerApiVersion } = require("mongodb");
const uri = process.env.MONGODB_URI as string;

app.get("/", (req: Request, res: Response) => {
  res.send("Welcome to the ScholarBridge API!");
});

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    const db = client.db(process.env.DB_NAME as string);
    const scholarships = db.collection("scholarships");
    // const collection = db.collection("user"); // or "users"
    // app.get("/api/user", async (req: Request, res: Response) => {
    //   const users = await collection.find({}).toArray();
    //   res.json(users);
    // });

    // Post scholarship api
    app.post("/api/scholarship", async (req: Request, res: Response) => {
      const scholarship = req.body;
      const result = await scholarships.insertOne(scholarship);
      res.json(result);
    });
    //get all scholarships
    app.get("/api/scholarship", async (req: Request, res: Response) => {
      const scholarship = req.query;
      const result = await scholarships.find(scholarship).toArray();
      res.json(result);
    });
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!",
    );
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
