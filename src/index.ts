
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import type { NextFunction, Request, Response } from "express";
import { MongoClient, ServerApiVersion, ObjectId } from "mongodb";

dotenv.config();

const app = express();
const port =process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get("/", (req: Request, res: Response) => {
  res.json({
    message: "FeetMate API is running"})
})


app.listen(port, () => {
  console.log(`Server running on ${port}`);
});

const uri = process.env.MONGO_DB_URI
if(!uri){throw new Error("Mongodb variable is not set")}

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

interface AuthRequest extends Request {
    user?: any;
}

async function run() {
  try {

    await client.connect();


    // Connect the client to the server	(optional starting in v4.7
    const database= client.db("EventHive")
    const eventCollection = database.collection('events')
    const sessionCollection = database.collection('session');
    const userCollection= database.collection("user");


        const verifyToken = async (req:AuthRequest, res:Response, next:NextFunction) => {

            const authHeader = req.headers?.authorization;
            if (!authHeader) {
                return res.status(401).send({ message: 'unauthorized access' })
            }

            const token = authHeader.split(' ')[1]

            if (!token) {
                return res.status(401).send({ message: 'unauthorized access' })
            }

            const query = { token: token }
            const session = await sessionCollection.findOne(query);

            if (!session) {
                return res.status(401).send({ message: 'unauthorized access' })
            }

            const userId = session.userId;


            const userQuery = {
                _id: userId
            }

            const user = await userCollection.findOne(userQuery);
            if (!user) {
                return res.status(401).send({ message: 'unauthorized access' })
            }
            // set data in the req object
            req.user = user;
            next();
        }

        app.post('/api/listings',verifyToken, async (req:AuthRequest, res:Response)=>{

        try {
          console.log("route reached", req.body)
              const listing = req.body;

              // Logged in user from middleware
              const user = req.user;

              const result = await eventCollection.insertOne({
                ...listing,
                ownerId: user._id,
                ownerName: user.name,
                createdAt: new Date(),
              });

              res.status(201).json({
                success: true,
                insertedId: result.insertedId,
              });
            } catch (error) {
              res.status(500).json({
                message: "Failed to create listing",
              });
            }

        })




    
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);
