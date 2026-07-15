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

    //get all scholarships  : pagination added

    app.get("/api/scholarship", async (req: Request, res: Response) => {
      try {
        const {
          page = "1",
          limit = "12",
          search = "",
          sort = "",
          ...filters
        } = req.query;

        const currentPage = Number(page);
        const pageSize = Number(limit);
        const skip = (currentPage - 1) * pageSize;

        const query: any = {};

        if (search) {
          query.$or = [
            {
              scholarshipName: {
                $regex: search,
                $options: "i",
              },
            },
            {
              universityName: {
                $regex: search,
                $options: "i",
              },
            },
          ];
        }

        Object.assign(query, filters);

        let sortOption: any = {};

        switch (sort) {
          case "latest":
            sortOption = { _id: -1 };
            break;

          case "oldest":
            sortOption = { _id: 1 };
            break;

          case "amount-desc":
            sortOption = { amountNumber: -1 };
            break;

          case "amount-asc":
            sortOption = { amountNumber: 1 };
            break;

          case "deadline-asc":
            sortOption = { deadline: 1 };
            break;

          case "name-asc":
            sortOption = { scholarshipName: 1 };
            break;

          default:
            sortOption = { _id: -1 };
        }

        const total = await scholarshipCollection.countDocuments(query);

        const result = await scholarshipCollection
          .aggregate([
            {
              $match: query,
            },

            {
              $addFields: {
                amountNumber: {
                  $toDouble: "$amount",
                },
              },
            },

            {
              $sort: sortOption,
            },

            {
              $skip: skip,
            },

            {
              $limit: pageSize,
            },

            {
              $project: {
                amountNumber: 0,
              },
            },
          ])
          .toArray();

        const totalPages = Math.ceil(total / pageSize);

        res.json({
          data: result,
          currentPage,
          totalPages,
          total,
        });
      } catch (error) {
        console.error(error);

        res.status(500).json({
          message: "Failed to fetch scholarships.",
        });
      }
    });
    //delete scholarship
    app.delete("/api/scholarship/:id", async (req: Request, res: Response) => {
      try {
        const { id } = req.params;
        const result = await scholarshipCollection.deleteOne({
          _id: new ObjectId(id as string),
        });
        res.send(result);
      } catch (error) {
        res.status(500).send({
          message: "Failed to delete startup",
        });
      }
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

    // await client.db("admin").command({ ping: 1 });
    // console.log(
    //   "Pinged your deployment. You successfully connected to MongoDB!",
    // );
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
