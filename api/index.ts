import cors from "cors";
import dotenv from "dotenv";
import express, { Request, Response, NextFunction } from "express";
import { MongoClient, ServerApiVersion, ObjectId } from "mongodb";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const uri = process.env.MONGODB_URI as string;

// --- Connection caching for serverless ---
let client: MongoClient | null = null;
let db: ReturnType<MongoClient["db"]> | null = null;

async function connectToDatabase() {
  if (db) {
    return db; // reuse existing connection on warm invocations
  }

  client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
  });

  await client.connect();
  console.log("Connected to MongoDB");

  db = client.db(process.env.DB_NAME as string);
  return db;
}

// Ensure DB is connected before any route handler runs
app.use(async (req: Request, res: Response, next: NextFunction) => {
  try {
    await connectToDatabase();
    next();
  } catch (err) {
    console.error("DB connection error:", err);
    res.status(500).json({ message: "Database connection failed" });
  }
});

app.get("/", (req: Request, res: Response) => {
  res.send("Welcome to the ScholarBridge API!");
});

// Get specific user
app.get("/api/user/:email", async (req: Request, res: Response) => {
  try {
    const database = await connectToDatabase();
    const userCollection = database.collection("user");
    const email = req.params.email;
    const user = await userCollection.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: "Something went wrong" });
  }
});

// Post scholarship
app.post("/api/scholarship", async (req: Request, res: Response) => {
  try {
    const database = await connectToDatabase();
    const scholarshipCollection = database.collection("scholarships");
    const scholarship = req.body;
    const result = await scholarshipCollection.insertOne(scholarship);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: "Failed to create scholarship." });
  }
});

// Get all scholarships (pagination + search + sort)
app.get("/api/scholarship", async (req: Request, res: Response) => {
  try {
    const database = await connectToDatabase();
    const scholarshipCollection = database.collection("scholarships");

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
        { scholarshipName: { $regex: search, $options: "i" } },
        { universityName: { $regex: search, $options: "i" } },
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
        { $match: query },
        { $addFields: { amountNumber: { $toDouble: "$amount" } } },
        { $sort: sortOption },
        { $skip: skip },
        { $limit: pageSize },
        { $project: { amountNumber: 0 } },
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
    res.status(500).json({ message: "Failed to fetch scholarships." });
  }
});

// Delete scholarship
app.delete("/api/scholarship/:id", async (req: Request, res: Response) => {
  try {
    const database = await connectToDatabase();
    const scholarshipCollection = database.collection("scholarships");
    const { id } = req.params;
    const result = await scholarshipCollection.deleteOne({
      _id: new ObjectId(id as string),
    });
    res.send(result);
  } catch (error) {
    res.status(500).send({ message: "Failed to delete scholarship" });
  }
});

// Get scholarship details
app.get("/api/scholarship/:id", async (req: Request, res: Response) => {
  try {
    const database = await connectToDatabase();
    const scholarshipCollection = database.collection("scholarships");
    const id = req.params.id;
    const result = await scholarshipCollection.findOne({
      _id: new ObjectId(id as string),
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch scholarship." });
  }
});

// My scholarships
app.get("/api/scholarship/user/:email", async (req: Request, res: Response) => {
  try {
    const database = await connectToDatabase();
    const scholarshipCollection = database.collection("scholarships");
    const email = req.params.email;
    const scholarships = await scholarshipCollection
      .find({ postedBy: email })
      .toArray();
    res.status(200).json(scholarships);
  } catch (error) {
    res.status(500).json({ message: "Something went wrong" });
  }
});

// Only listen locally — Vercel handles invocation itself for serverless
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

export default app;