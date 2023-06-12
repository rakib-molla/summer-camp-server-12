const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const stripe = require('stripe')(process.env.PAYMENT_SECRET_KEY);

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

// === middleware ===
function verifyJWT(req, res, next) {
  const authorization = req.headers.authorization;
  console.log(authorization);
  if (!authorization) {
    return res.status(401).send({ error: "Unauthorized Access!" });
  }
  // step- 2 
  const token = authorization.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).send({ error: "Unauthorized Access!" });
    }
    req.decoded = decoded
    next();
  })
}




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.clwxeiy.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const instructorCollection = client.db("sportsAcademy").collection("instructor");
    const classCollection = client.db("sportsAcademy").collection("class");
    const userCollection = client.db("sportsAcademy").collection("users");
    const selectedCollection = client.db("sportsAcademy").collection("selectedClass");
    const paymentCollection = client.db("sportsAcademy").collection("payments");

    // generate token jwt ====== JWT====
    app.post('/jwt', (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
      res.send({ token })
    })

    // insert user (fileName: signup jsx)
    app.post('/users', async (req, res) => {
      const user = req.body;
      const result = userCollection.insertOne(user);
      res.send(result);
      console.log(result);
    })

    // insert instructor data (fileName: AddItem jsx)
    app.post('/instructor', async (req, res) => {
      const instructorDetails = req.body;
      // console.log(instructorDetails);
      const result = instructorCollection.insertOne(instructorDetails);
      res.send(result);
    })

    // insert add class data  (fileName: AddClass jsx)
    app.post('/addclass', async (req, res) => {
      const addClassDetails = req.body;
      // console.log(addClassDetails);
      const result = classCollection.insertOne(addClassDetails);
      res.send(result);
    })

    // insert my selected class (fileName: PopularClassSection jsx)
    app.post('/selected-class', async (req, res) => {
      const data = req.body;
      const result = selectedCollection.insertOne(data);
      res.send(result);
    })

    // ======== read/view section ========

    // view all instructor  data (fileName: instructor jsx) 
    app.get('/instructor', async (req, res) => {
      const result = await instructorCollection.find().toArray();
      res.send(result);
    })

    // selected calss
    app.get('/selected-class', async (req, res) => {
      const result = await selectedCollection.find().toArray();
      res.send(result)
    })



    // DELETE selected class
    app.delete('/selected/:id', async(req, res)=>{
      const id = req.params.id;
      const query = { _id: new ObjectId(id)}
      const result =  await selectedCollection.deleteOne(query);
      res.send(result);
    })

    // delete user 
    app.delete('/users/:id', async(req, res)=>{
      const id = req.params.id;
      const query = { _id: new ObjectId(id)}
      const result =  await userCollection.deleteOne(query);
      res.send(result);
    })

    /// view user role
    app.get('/users/:email', async (req, res) => {
      const email = req.params.email;

      // if (req.decoded.email !== email) {
      //   res.send({ admin: false })
      // }

      const query = { email: email }
      const user = await userCollection.findOne(query);
      const result = { admin: user?.role === 'admin', user: user?.role === 'user', instructor: user?.role === 'instructor' }
      res.send(result);
    })

    // view all Users  data 
    app.get('/users', async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    })

    // view all class  data  (fileName: MyClasses jsx)
    app.get('/class', async (req, res) => {
      const result = await classCollection.find().toArray();
      res.send(result);
    })

    // view class data by id (fileName: payment nsx) todo verifyJWT, need to apply
    app.get('/class/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await classCollection.findOne(query);
      res.send(result);
    })

    // update  status (fileName: ManageClasses jsx)
    app.patch('/class/manage-status/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateOne = {
        $set: {
          status: 'active'
        }
      };
      const result = await classCollection.updateOne(filter, updateOne);
      res.send(result);
    })

    // update  approve (fileName: ManageClasses jsx)
    app.patch('/class/manage-approve/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateOne = {
        $set: {
          approve: 'approve'
        }
      };
      const result = await classCollection.updateOne(filter, updateOne);
      res.send(result);
    })

    // update  approve (fileName: ManageClasses jsx)
    app.patch('/class/manage-deny/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateOne = {
        $set: {
          deny: 'yes'
        }
      };
      const result = await classCollection.updateOne(filter, updateOne);
      res.send(result);
    })


    //====== update data section =========

    // update admin role field (fileName: ManageUsers jsx)
    app.patch('/users/admin/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: 'admin'
        },
      };
      const result = await userCollection.updateOne(filter, updateDoc);
      res.send(result);
    })
    // update instructor role field (fileName: ManageUsers jsx)
    app.patch('/users/instructor/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: 'instructor'
        },
      };
      const result = await userCollection.updateOne(filter, updateDoc);
      res.send(result);
    })

    // update instructor status (fileName: MyClasses jsx) 
    app.patch('/users/instructor/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          status: 'available'
        },
      };
      const result = await classCollection.updateOne(filter, updateDoc);
      res.send(result);
    })

    // ====== payment ===


    // create payment intent
    app.post('/create-payment-intent/', async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      console.log(price, amount);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_type: ['card']
      });
    
      res.send({
        clientSecret: paymentIntent.client_secret,
      });
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





app.get('/', (req, res) => {
  res.send('server is running');
})

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
})
