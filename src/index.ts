import cors from "cors";
import dotenv from "dotenv";
import express, { Request, Response } from "express";
import { ObjectId } from "mongodb";
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
    const scholarshipCollection = db.collection("scholarships");
    const userCollection = db.collection("user");
    // app.get("/api/user", async (req: Request, res: Response) => {
    //   const users = await userCollection.find({}).toArray();
    //   res.json(users);
    // });

    //get specfic user
    app.get("/api/user/:email", async (req: Request, res: Response) => {
      try {
        const email = req.params.email;
        const user = await userCollection.findOne({ email });
        if (!user) {
          return res.status(404).json({
            message: "User not found",
          });
        }
        res.status(200).json(user);
      } catch (error) {
        res.status(500).json({
          message: "Something went wrong",
        });
      }
    });
    // Post scholarship api
    app.post("/api/scholarship", async (req: Request, res: Response) => {
      const scholarship = req.body;
      const result = await scholarshipCollection.insertOne(scholarship);
      res.json(result);
    });
    //get all scholarships
    app.get("/api/scholarship", async (req: Request, res: Response) => {
      const scholarship = req.query;
      const result = await scholarshipCollection.find(scholarship).toArray();
      res.json(result);
    });

    //get scholarship details
    app.get("/api/scholarship/:id", async (req: Request, res: Response) => {
      const id = req.params.id;
      const query = {
        _id: new ObjectId(id as string),
      };
      const result = await scholarshipCollection.findOne(query);
      res.json(result);
    });

    //my scholarships
    app.get("/api/scholarship/user/:email", async (req, res) => {
      try {
        const email = req.params.email;

        const scholarships = await scholarshipCollection
          .find({ postedBy: email })
          .toArray();

        res.status(200).json(scholarships);
      } catch (error) {
        res.status(500).json({
          message: "Something went wrong",
        });
      }
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
